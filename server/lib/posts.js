// Post lifecycle: create, publish, schedule. A post targets one or more
// connected platforms; each target gets its own result so a partial failure
// on one platform never blocks the others.
import { updateDb, getDb, getCredentials, id } from './store.js';
import { getMedia, absolutePath } from './media.js';
import { getConnector, isConfigured } from '../connectors/index.js';

async function resolveMedia(mediaIds = []) {
  const out = [];
  for (const mid of mediaIds) {
    const m = await getMedia(mid);
    if (m) out.push({ ...m, path: absolutePath(m.storedName) });
  }
  return out;
}

export async function createPost({ text = '', mediaIds = [], targets = [], scheduledFor = null }) {
  const now = new Date().toISOString();
  const post = {
    id: id('post'),
    text,
    mediaIds,
    targets,
    scheduledFor: scheduledFor || null,
    status: scheduledFor ? 'scheduled' : 'draft',
    results: {},
    createdAt: now,
    updatedAt: now,
  };
  await updateDb((db) => {
    db.posts.unshift(post);
  });
  return post;
}

export async function updatePost(postId, patch) {
  return updateDb((db) => {
    const p = db.posts.find((x) => x.id === postId);
    if (!p) return null;
    Object.assign(p, patch, { updatedAt: new Date().toISOString() });
    return p;
  });
}

export async function deletePost(postId) {
  return updateDb((db) => {
    const before = db.posts.length;
    db.posts = db.posts.filter((x) => x.id !== postId);
    return db.posts.length < before;
  });
}

// Publish a single post to all of its targets right now.
export async function publishPost(postId) {
  const db = await getDb();
  const post = db.posts.find((x) => x.id === postId);
  if (!post) throw new Error('Post not found');

  const credentials = await getCredentials();
  const media = await resolveMedia(post.mediaIds);
  const results = { ...(post.results || {}) };

  // Append the studio signature (if any) to the outgoing text.
  const signature = (db.settings && db.settings.signature) || '';
  const outgoingText = signature ? `${post.text}\n\n${signature}`.trim() : post.text;

  for (const targetId of post.targets) {
    const connector = getConnector(targetId);
    const at = new Date().toISOString();
    if (!connector) {
      results[targetId] = { status: 'error', error: 'Unknown platform', at };
      continue;
    }

    // Manual platforms, or configured-but-media-unsupported cases, become a
    // ready-to-publish package the user posts by hand.
    if (connector.status === 'manual' || !isConfigured(connector, credentials)) {
      results[targetId] = {
        status: 'manual',
        note:
          connector.status === 'manual'
            ? connector.manualReason || 'Post prepared for manual publishing.'
            : 'Add this platform’s credentials on the Connections page to automate posting. Post prepared for manual publishing.',
        at,
      };
      continue;
    }

    try {
      const creds = credentials[connector.id] || {};
      const out = await connector.publish({ text: outgoingText, media, credentials: creds });
      results[targetId] = { status: 'success', url: out?.url || null, remoteId: out?.id || null, at };
    } catch (err) {
      if (err && err.manual) {
        results[targetId] = { status: 'manual', note: err.message, at };
      } else {
        results[targetId] = { status: 'error', error: err.message || String(err), at };
      }
    }
  }

  const statuses = post.targets.map((t) => results[t]?.status);
  const anySuccess = statuses.includes('success');
  const anyError = statuses.includes('error');
  const anyManual = statuses.includes('manual');
  let status = 'published';
  if (anyError && anySuccess) status = 'partial';
  else if (anyError && !anySuccess && !anyManual) status = 'failed';
  else if (anyManual && !anyError) status = anySuccess ? 'partial' : 'needs_manual';
  else if (anyManual && anyError) status = 'partial';

  return updatePost(postId, {
    results,
    status,
    publishedAt: new Date().toISOString(),
  });
}

// Called periodically: publish any scheduled posts whose time has arrived.
export async function runDuePosts() {
  const db = await getDb();
  const now = Date.now();
  const due = db.posts.filter(
    (p) => p.status === 'scheduled' && p.scheduledFor && new Date(p.scheduledFor).getTime() <= now,
  );
  for (const p of due) {
    try {
      await publishPost(p.id);
    } catch (err) {
      await updatePost(p.id, { status: 'failed', results: { _error: String(err) } });
    }
  }
  return due.length;
}

export async function listPosts() {
  const db = await getDb();
  return db.posts;
}
