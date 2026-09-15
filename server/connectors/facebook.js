// Facebook Page connector.
// Requires a Page access token (Graph API). Text and photo posts are
// implemented; video posts fall back to a manual note.
import { readFile } from 'node:fs/promises';
import { requestJson, multipart } from '../lib/http.js';

const GRAPH = 'https://graph.facebook.com/v21.0';

export default {
  id: 'facebook',
  name: 'Facebook Page',
  icon: '📘',
  status: 'beta',
  summary: 'Publish to a Facebook Page. Needs a Page access token from a Meta app.',
  supportsMedia: true,
  mediaNote: 'Photos supported. Videos should be posted manually (large uploads use a resumable API).',
  docsUrl: 'https://developers.facebook.com/docs/pages-api/getting-started',
  fields: [
    {
      key: 'pageId',
      label: 'Page ID',
      type: 'text',
      placeholder: '1234567890',
      help: 'The numeric ID of the Facebook Page.',
    },
    {
      key: 'accessToken',
      label: 'Page access token',
      type: 'password',
      placeholder: 'EAAB...',
      help: 'A long-lived Page access token with pages_manage_posts permission.',
    },
  ],

  async publish({ text, media, credentials }) {
    const { pageId, accessToken } = credentials;
    const photos = (media || []).filter((m) => m.kind === 'image');
    const hasVideo = (media || []).some((m) => m.kind === 'video');

    // Single photo: post directly with caption.
    if (photos.length === 1 && !hasVideo) {
      const data = await readFile(photos[0].path);
      const { body, contentType } = multipart(
        { caption: text || '', access_token: accessToken },
        [{ name: 'source', filename: photos[0].name, contentType: photos[0].contentType, data }],
      );
      const res = await requestJson(`${GRAPH}/${pageId}/photos`, {
        method: 'POST',
        headers: { 'Content-Type': contentType, 'Content-Length': body.length },
        body,
      });
      if (res.status >= 400) throw new Error(`Facebook error: ${res.text}`);
      return { id: res.json.post_id || res.json.id, url: `https://facebook.com/${res.json.post_id || res.json.id}` };
    }

    // Multiple photos: upload unpublished then attach to a feed post.
    if (photos.length > 1 && !hasVideo) {
      const attached = [];
      for (const p of photos) {
        const data = await readFile(p.path);
        const { body, contentType } = multipart(
          { published: 'false', access_token: accessToken },
          [{ name: 'source', filename: p.name, contentType: p.contentType, data }],
        );
        const up = await requestJson(`${GRAPH}/${pageId}/photos`, {
          method: 'POST',
          headers: { 'Content-Type': contentType, 'Content-Length': body.length },
          body,
        });
        if (up.status >= 400) throw new Error(`Facebook photo upload error: ${up.text}`);
        attached.push({ media_fbid: up.json.id });
      }
      const payload = new URLSearchParams();
      payload.set('message', text || '');
      payload.set('access_token', accessToken);
      attached.forEach((a, i) => payload.set(`attached_media[${i}]`, JSON.stringify(a)));
      const res = await requestJson(`${GRAPH}/${pageId}/feed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: payload.toString(),
      });
      if (res.status >= 400) throw new Error(`Facebook error: ${res.text}`);
      return { id: res.json.id };
    }

    if (hasVideo) {
      throw Object.assign(new Error('Video posting to Facebook is not automated — publish the video manually.'), {
        manual: true,
      });
    }

    // Text only.
    const payload = new URLSearchParams({ message: text || '', access_token: accessToken });
    const res = await requestJson(`${GRAPH}/${pageId}/feed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: payload.toString(),
    });
    if (res.status >= 400) throw new Error(`Facebook error: ${res.text}`);
    return { id: res.json.id, url: `https://facebook.com/${res.json.id}` };
  },
};
