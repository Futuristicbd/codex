// Media library: stores uploaded photos/videos on disk and tracks metadata
// in the db. Uploads are streamed straight to disk so large videos don't sit
// in memory.

import { createWriteStream } from 'node:fs';
import { unlink, stat } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { UPLOAD_DIR, updateDb, getDb, id } from './store.js';

const IMAGE_EXT = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];
const VIDEO_EXT = ['.mp4', '.mov', '.webm', '.m4v', '.avi', '.mkv'];

function kindFor(name, contentType = '') {
  const ext = extname(name).toLowerCase();
  if (IMAGE_EXT.includes(ext) || contentType.startsWith('image/')) return 'image';
  if (VIDEO_EXT.includes(ext) || contentType.startsWith('video/')) return 'video';
  return 'file';
}

function safeName(name) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-120) || 'file';
}

// Stream an incoming request body to a file, then register it in the db.
export async function saveUpload(req, { name, contentType }) {
  const clean = safeName(name || 'upload');
  const mediaId = id('media');
  const storedName = `${mediaId}_${clean}`;
  const dest = join(UPLOAD_DIR, storedName);

  await new Promise((resolve, reject) => {
    const out = createWriteStream(dest);
    req.pipe(out);
    req.on('error', reject);
    out.on('error', reject);
    out.on('finish', resolve);
  });

  const info = await stat(dest);
  const record = {
    id: mediaId,
    name: clean,
    storedName,
    kind: kindFor(clean, contentType),
    contentType: contentType || 'application/octet-stream',
    size: info.size,
    url: `/media/${storedName}`,
    uploadedAt: new Date().toISOString(),
  };
  await updateDb((db) => {
    db.media ||= [];
    db.media.unshift(record);
  });
  return record;
}

export async function listMedia() {
  const db = await getDb();
  return db.media || [];
}

export async function getMedia(mediaId) {
  const db = await getDb();
  return (db.media || []).find((m) => m.id === mediaId) || null;
}

export async function deleteMedia(mediaId) {
  const rec = await getMedia(mediaId);
  if (!rec) return false;
  try {
    await unlink(join(UPLOAD_DIR, rec.storedName));
  } catch {
    /* file may already be gone */
  }
  await updateDb((db) => {
    db.media = (db.media || []).filter((m) => m.id !== mediaId);
  });
  return true;
}

export function absolutePath(storedName) {
  return join(UPLOAD_DIR, storedName);
}
