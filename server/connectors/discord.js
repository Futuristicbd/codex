// Discord connector — fully working out of the box via a channel webhook.
// Channel settings -> Integrations -> Webhooks -> New Webhook -> Copy URL.
import { readFile } from 'node:fs/promises';
import { requestJson, multipart } from '../lib/http.js';

export default {
  id: 'discord',
  name: 'Discord',
  icon: '💬',
  status: 'ready',
  summary: 'Post to a Discord channel through a webhook. Works fully once the webhook URL is added.',
  supportsMedia: true,
  mediaNote: 'Images and video are uploaded as attachments (up to Discord’s size limit).',
  docsUrl: 'https://support.discord.com/hc/en-us/articles/228383668-Intro-to-Webhooks',
  fields: [
    {
      key: 'webhookUrl',
      label: 'Webhook URL',
      type: 'password',
      placeholder: 'https://discord.com/api/webhooks/...',
      help: 'Channel Settings → Integrations → Webhooks → New Webhook → Copy Webhook URL.',
    },
    {
      key: 'username',
      label: 'Override name (optional)',
      type: 'text',
      required: false,
      placeholder: 'Studio Bot',
      help: 'Optional display name to post under.',
    },
  ],

  async publish({ text, media, credentials }) {
    const files = [];
    (media || []).slice(0, 10).forEach((m, i) => files.push({ ...m, field: `files[${i}]` }));

    const fields = { content: text || '' };
    if (credentials.username) fields.username = credentials.username;

    const fileParts = [];
    for (const f of files) {
      const data = await readFile(f.path);
      fileParts.push({ name: f.field, filename: f.name, contentType: f.contentType, data });
    }
    const { body, contentType } = multipart(fields, fileParts);
    const res = await requestJson(credentials.webhookUrl + '?wait=true', {
      method: 'POST',
      headers: { 'Content-Type': contentType, 'Content-Length': body.length },
      body,
    });
    if (res.status >= 400) throw new Error(`Discord error: ${res.text}`);
    return { id: res.json?.id || null };
  },
};
