// Connector registry.
//
// Each connector describes a social destination. Three statuses exist:
//   ready  – fully automated posting works once credentials are filled in.
//   beta   – automated posting is implemented but depends on approved API
//            access / long-lived tokens that you must obtain yourself.
//   manual – no public write API we can safely automate; the app prepares a
//            ready-to-paste "publish package" (text + downloadable media) so
//            you post it by hand in one step.
import mastodon from './mastodon.js';
import bluesky from './bluesky.js';
import telegram from './telegram.js';
import discord from './discord.js';
import facebook from './facebook.js';
import linkedin from './linkedin.js';

// Platforms without an automatable public posting API. They still get a
// composer target and a copy-paste publish package.
function manual(id, name, icon, summary, reason) {
  return {
    id,
    name,
    icon,
    status: 'manual',
    summary,
    manualReason: reason,
    supportsMedia: true,
    mediaNote: 'Media is prepared for download so you can attach it when posting.',
    fields: [],
  };
}

const MANUAL = [
  manual(
    'instagram',
    'Instagram',
    '📸',
    'Prepare a caption + media package to post from the Instagram app.',
    'Instagram’s API only publishes media hosted at a public URL through an approved Meta app. Until you connect one, posts are prepared for manual publishing.',
  ),
  manual(
    'twitter',
    'X / Twitter',
    '𝕏',
    'Prepare a tweet package. Automated posting needs paid X API access.',
    'The X API requires a paid developer tier and OAuth 1.0a signing. Add your keys later to automate; for now posts are prepared for manual publishing.',
  ),
  manual(
    'threads',
    'Threads',
    '🧵',
    'Prepare a post package for the Threads app.',
    'The Threads API needs an approved Meta app. Posts are prepared for manual publishing.',
  ),
  manual(
    'tiktok',
    'TikTok',
    '🎵',
    'Prepare a caption + video package for TikTok.',
    'TikTok’s Content Posting API needs an approved developer app and audited scopes. Posts are prepared for manual publishing.',
  ),
  manual(
    'youtube',
    'YouTube',
    '▶️',
    'Prepare a title/description + video package for YouTube.',
    'YouTube uploads need OAuth with the YouTube Data API. Posts are prepared for manual publishing.',
  ),
  manual(
    'pinterest',
    'Pinterest',
    '📌',
    'Prepare a pin package (image + description).',
    'The Pinterest API needs an approved app. Posts are prepared for manual publishing.',
  ),
];

const ALL = [mastodon, bluesky, telegram, discord, facebook, linkedin, ...MANUAL];
const BY_ID = new Map(ALL.map((c) => [c.id, c]));

export function listConnectors() {
  return ALL;
}

export function getConnector(id) {
  return BY_ID.get(id) || null;
}

// A connector is "configured" when every required field has a value.
export function isConfigured(connector, credentials = {}) {
  const creds = credentials[connector.id] || {};
  const required = (connector.fields || []).filter((f) => f.required !== false);
  if (!required.length) return connector.status !== 'manual' ? true : false;
  return required.every((f) => creds[f.key] && String(creds[f.key]).trim());
}

// Public metadata (never leaks secret values — just whether each field is set).
export function publicConnector(connector, credentials = {}) {
  const creds = credentials[connector.id] || {};
  return {
    id: connector.id,
    name: connector.name,
    icon: connector.icon,
    status: connector.status,
    summary: connector.summary,
    manualReason: connector.manualReason || null,
    supportsMedia: connector.supportsMedia,
    mediaNote: connector.mediaNote || null,
    docsUrl: connector.docsUrl || null,
    fields: (connector.fields || []).map((f) => ({
      key: f.key,
      label: f.label,
      type: f.type,
      placeholder: f.placeholder || '',
      help: f.help || '',
      required: f.required !== false,
      set: Boolean(creds[f.key]),
    })),
    configured: isConfigured(connector, credentials),
  };
}
