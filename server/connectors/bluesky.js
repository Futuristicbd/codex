// Bluesky connector — fully working out of the box via the AT Protocol.
// Uses your handle + an App Password (Settings -> App Passwords). Not your
// main account password.
import { readFile } from 'node:fs/promises';
import { requestJson, request } from '../lib/http.js';

const PDS = 'https://bsky.social';

export default {
  id: 'bluesky',
  name: 'Bluesky',
  icon: '🦋',
  status: 'ready',
  summary: 'Post text + images to Bluesky using an app password. Works fully once configured.',
  supportsMedia: true,
  mediaNote: 'Up to 4 images per post. Video is not posted automatically.',
  docsUrl: 'https://bsky.app/settings/app-passwords',
  fields: [
    {
      key: 'identifier',
      label: 'Handle',
      type: 'text',
      placeholder: 'you.bsky.social',
      help: 'Your Bluesky handle (without the @).',
    },
    {
      key: 'appPassword',
      label: 'App password',
      type: 'password',
      placeholder: 'xxxx-xxxx-xxxx-xxxx',
      help: 'Settings → App Passwords → create one. Do not use your main password.',
    },
  ],

  async publish({ text, media, credentials }) {
    // 1. Create a session.
    const sessPayload = JSON.stringify({
      identifier: credentials.identifier,
      password: credentials.appPassword,
    });
    const sess = await requestJson(`${PDS}/xrpc/com.atproto.server.createSession`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(sessPayload) },
      body: sessPayload,
    });
    if (sess.status >= 400) throw new Error(`Bluesky login failed: ${sess.text}`);
    const { accessJwt, did } = sess.json;
    const auth = { Authorization: `Bearer ${accessJwt}` };

    // 2. Upload up to 4 images as blobs.
    const images = [];
    for (const m of (media || []).filter((x) => x.kind === 'image').slice(0, 4)) {
      const data = await readFile(m.path);
      const up = await requestJson(`${PDS}/xrpc/com.atproto.repo.uploadBlob`, {
        method: 'POST',
        headers: { ...auth, 'Content-Type': m.contentType, 'Content-Length': data.length },
        body: data,
      });
      if (up.status >= 400) throw new Error(`Bluesky blob upload failed: ${up.text}`);
      images.push({ alt: m.name, image: up.json.blob });
    }

    // 3. Create the post record.
    const record = {
      $type: 'app.bsky.feed.post',
      text: text || '',
      createdAt: new Date().toISOString(),
    };
    if (images.length) record.embed = { $type: 'app.bsky.embed.images', images };

    const payload = JSON.stringify({
      repo: did,
      collection: 'app.bsky.feed.post',
      record,
    });
    const res = await requestJson(`${PDS}/xrpc/com.atproto.repo.createRecord`, {
      method: 'POST',
      headers: { ...auth, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
      body: payload,
    });
    if (res.status >= 400) throw new Error(`Bluesky post failed: ${res.text}`);
    const rkey = res.json.uri?.split('/').pop();
    return {
      id: res.json.uri,
      url: rkey ? `https://bsky.app/profile/${credentials.identifier}/post/${rkey}` : undefined,
    };
  },
};
