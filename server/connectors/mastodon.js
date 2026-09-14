// Mastodon connector — fully working out of the box.
// Needs a personal access token from any Mastodon instance
// (Preferences -> Development -> New application, scopes: read write).
import { readFile } from 'node:fs/promises';
import { requestJson, multipart, request } from '../lib/http.js';

export default {
  id: 'mastodon',
  name: 'Mastodon',
  icon: '🐘',
  status: 'ready',
  summary: 'Post text + images/video to any Mastodon instance. Works fully once a token is added.',
  supportsMedia: true,
  mediaNote: 'Up to 4 images, or 1 video, per post.',
  docsUrl: 'https://docs.joinmastodon.org/client/token/',
  fields: [
    {
      key: 'instanceUrl',
      label: 'Instance URL',
      type: 'url',
      placeholder: 'https://mastodon.social',
      help: 'The full URL of your Mastodon server.',
    },
    {
      key: 'accessToken',
      label: 'Access token',
      type: 'password',
      placeholder: 'Preferences → Development → New application',
      help: 'Create an application with read + write scopes and copy its access token.',
    },
  ],

  async publish({ text, media, credentials }) {
    const base = credentials.instanceUrl.replace(/\/$/, '');
    const auth = { Authorization: `Bearer ${credentials.accessToken}` };
    const mediaIds = [];

    for (const m of (media || []).slice(0, 4)) {
      const data = await readFile(m.path);
      const { body, contentType } = multipart({}, [
        { name: 'file', filename: m.name, contentType: m.contentType, data },
      ]);
      const up = await requestJson(`${base}/api/v2/media`, {
        method: 'POST',
        headers: { ...auth, 'Content-Type': contentType, 'Content-Length': body.length },
        body,
      });
      if (up.status >= 400) throw new Error(`Media upload failed: ${up.text}`);
      mediaIds.push(up.json.id);
    }

    const payload = JSON.stringify({ status: text, media_ids: mediaIds });
    const res = await requestJson(`${base}/api/v1/statuses`, {
      method: 'POST',
      headers: {
        ...auth,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
      body: payload,
    });
    if (res.status >= 400) throw new Error(`Post failed: ${res.text}`);
    return { id: res.json.id, url: res.json.url };
  },
};
