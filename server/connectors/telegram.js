// Telegram connector — fully working out of the box.
// Create a bot with @BotFather to get a token, then get the chat id of the
// channel/group/user you want to post to (add the bot as an admin of a channel).
import { readFile } from 'node:fs/promises';
import { requestJson, multipart } from '../lib/http.js';

export default {
  id: 'telegram',
  name: 'Telegram',
  icon: '✈️',
  status: 'ready',
  summary: 'Post to a Telegram channel, group, or chat via a bot. Works fully once configured.',
  supportsMedia: true,
  mediaNote: 'First image or video is sent with the caption; more are sent as follow-ups.',
  docsUrl: 'https://core.telegram.org/bots#how-do-i-create-a-bot',
  fields: [
    {
      key: 'botToken',
      label: 'Bot token',
      type: 'password',
      placeholder: '123456:ABC-DEF...',
      help: 'Talk to @BotFather on Telegram, create a bot, and copy the token.',
    },
    {
      key: 'chatId',
      label: 'Chat ID',
      type: 'text',
      placeholder: '@mychannel or -1001234567890',
      help: 'A channel @username, or a numeric chat id. Add the bot as an admin of the channel.',
    },
  ],

  async publish({ text, media, credentials }) {
    const base = `https://api.telegram.org/bot${credentials.botToken}`;
    const chat_id = credentials.chatId;
    const items = media || [];

    if (!items.length) {
      const payload = JSON.stringify({ chat_id, text });
      const res = await requestJson(`${base}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
        body: payload,
      });
      if (!res.json?.ok) throw new Error(`Telegram error: ${res.text}`);
      return { id: String(res.json.result.message_id) };
    }

    let firstId = null;
    for (let i = 0; i < items.length; i++) {
      const m = items[i];
      const isVideo = m.kind === 'video';
      const method = isVideo ? 'sendVideo' : 'sendPhoto';
      const field = isVideo ? 'video' : 'photo';
      const data = await readFile(m.path);
      const { body, contentType } = multipart(
        { chat_id, caption: i === 0 ? text : '' },
        [{ name: field, filename: m.name, contentType: m.contentType, data }],
      );
      const res = await requestJson(`${base}/${method}`, {
        method: 'POST',
        headers: { 'Content-Type': contentType, 'Content-Length': body.length },
        body,
      });
      if (!res.json?.ok) throw new Error(`Telegram error: ${res.text}`);
      if (i === 0) firstId = String(res.json.result.message_id);
    }
    return { id: firstId };
  },
};
