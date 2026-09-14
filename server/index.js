// LocalPost Hub — a self-hosted social media posting platform.
// Zero external dependencies: only Node.js built-in modules. Run with:
//   npm start   (or: node server/index.js)
import http from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { join, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

import { init, getDb, getCredentials, updateCredentials, updateDb, UPLOAD_DIR } from './lib/store.js';
import { sendJson, readJsonBody } from './lib/http.js';
import { saveUpload, listMedia, deleteMedia, absolutePath } from './lib/media.js';
import { createPost, updatePost, deletePost, publishPost, listPosts, runDuePosts } from './lib/posts.js';
import { listConnectors, getConnector, publicConnector } from './connectors/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(__dirname, '..', 'public');
const PORT = process.env.PORT || 4000;
const HOST = process.env.HOST || '127.0.0.1';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
  '.ico': 'image/x-icon',
};

function serveFile(req, res, filePath) {
  if (!existsSync(filePath) || !statSync(filePath).isFile()) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }
  const stat = statSync(filePath);
  const type = MIME[extname(filePath).toLowerCase()] || 'application/octet-stream';
  const range = req.headers.range;

  // Range support so <video> scrubbing works.
  if (range) {
    const m = /bytes=(\d*)-(\d*)/.exec(range);
    let start = m && m[1] ? parseInt(m[1], 10) : 0;
    let end = m && m[2] ? parseInt(m[2], 10) : stat.size - 1;
    if (start > end || start >= stat.size) {
      res.writeHead(416, { 'Content-Range': `bytes */${stat.size}` });
      res.end();
      return;
    }
    res.writeHead(206, {
      'Content-Type': type,
      'Content-Range': `bytes ${start}-${end}/${stat.size}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': end - start + 1,
    });
    createReadStream(filePath, { start, end }).pipe(res);
    return;
  }

  res.writeHead(200, { 'Content-Type': type, 'Content-Length': stat.size, 'Accept-Ranges': 'bytes' });
  createReadStream(filePath).pipe(res);
}

// Assemble everything the frontend needs in one request.
async function buildState() {
  const db = await getDb();
  const creds = await getCredentials();
  return {
    settings: db.settings,
    connectors: listConnectors().map((c) => publicConnector(c, creds)),
    media: db.media || [],
    posts: db.posts || [],
  };
}

async function handleApi(req, res, pathname) {
  const method = req.method;

  // Bootstrap
  if (pathname === '/api/state' && method === 'GET') {
    return sendJson(res, 200, await buildState());
  }

  // Settings / branding
  if (pathname === '/api/settings' && method === 'POST') {
    const body = await readJsonBody(req);
    await updateDb((db) => {
      db.settings = { ...db.settings, ...body };
    });
    return sendJson(res, 200, (await getDb()).settings);
  }

  // Connectors list
  if (pathname === '/api/connectors' && method === 'GET') {
    const creds = await getCredentials();
    return sendJson(res, 200, listConnectors().map((c) => publicConnector(c, creds)));
  }

  // Save / clear credentials for a connector
  let m;
  if ((m = pathname.match(/^\/api\/connectors\/([\w-]+)\/credentials$/))) {
    const connector = getConnector(m[1]);
    if (!connector) return sendJson(res, 404, { error: 'Unknown platform' });
    if (method === 'POST') {
      const body = await readJsonBody(req);
      await updateCredentials((creds) => {
        creds[connector.id] = { ...(creds[connector.id] || {}), ...body };
      });
      const creds = await getCredentials();
      return sendJson(res, 200, publicConnector(connector, creds));
    }
    if (method === 'DELETE') {
      await updateCredentials((creds) => {
        delete creds[connector.id];
      });
      const creds = await getCredentials();
      return sendJson(res, 200, publicConnector(connector, creds));
    }
  }

  // Media: list / upload / delete
  if (pathname === '/api/media' && method === 'GET') {
    return sendJson(res, 200, await listMedia());
  }
  if (pathname === '/api/media' && method === 'POST') {
    const name = decodeURIComponent(req.headers['x-filename'] || 'upload');
    const contentType = req.headers['content-type'] || 'application/octet-stream';
    const record = await saveUpload(req, { name, contentType });
    return sendJson(res, 201, record);
  }
  if ((m = pathname.match(/^\/api\/media\/([\w-]+)$/)) && method === 'DELETE') {
    const ok = await deleteMedia(m[1]);
    return sendJson(res, ok ? 200 : 404, { ok });
  }

  // Posts
  if (pathname === '/api/posts' && method === 'GET') {
    return sendJson(res, 200, await listPosts());
  }
  if (pathname === '/api/posts' && method === 'POST') {
    const body = await readJsonBody(req);
    const post = await createPost(body);
    return sendJson(res, 201, post);
  }
  if ((m = pathname.match(/^\/api\/posts\/([\w-]+)$/))) {
    if (method === 'PATCH') {
      const body = await readJsonBody(req);
      const post = await updatePost(m[1], body);
      return sendJson(res, post ? 200 : 404, post || { error: 'Not found' });
    }
    if (method === 'DELETE') {
      const ok = await deletePost(m[1]);
      return sendJson(res, ok ? 200 : 404, { ok });
    }
  }
  if ((m = pathname.match(/^\/api\/posts\/([\w-]+)\/publish$/)) && method === 'POST') {
    try {
      const post = await publishPost(m[1]);
      return sendJson(res, 200, post);
    } catch (err) {
      return sendJson(res, 400, { error: err.message });
    }
  }

  return sendJson(res, 404, { error: 'Unknown endpoint' });
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = decodeURIComponent(url.pathname);

    if (pathname.startsWith('/api/')) {
      return await handleApi(req, res, pathname);
    }

    // Uploaded media
    if (pathname.startsWith('/media/')) {
      const name = normalize(pathname.slice('/media/'.length)).replace(/^(\.\.[/\\])+/, '');
      return serveFile(req, res, absolutePath(name));
    }

    // Static frontend
    let rel = pathname === '/' ? '/index.html' : pathname;
    rel = normalize(rel).replace(/^(\.\.[/\\])+/, '');
    const filePath = join(PUBLIC_DIR, rel);
    if (existsSync(filePath) && statSync(filePath).isFile()) {
      return serveFile(req, res, filePath);
    }
    // SPA fallback
    return serveFile(req, res, join(PUBLIC_DIR, 'index.html'));
  } catch (err) {
    console.error('Request error:', err);
    if (!res.headersSent) sendJson(res, 500, { error: err.message || 'Server error' });
    else res.end();
  }
});

await init();
// Scheduler: check for due scheduled posts every 30 seconds.
setInterval(() => {
  runDuePosts().catch((e) => console.error('Scheduler error:', e));
}, 30_000);

server.listen(PORT, HOST, () => {
  console.log(`\n  LocalPost Hub running →  http://${HOST}:${PORT}\n`);
  console.log('  Data is stored locally under ./data (git-ignored).');
  console.log('  Add platform credentials on the Connections page.\n');
});
