// Tiny JSON-file backed data store. No external dependencies.
// All persistent state (accounts, posts, settings, credentials) lives in
// plain JSON files under ./data so everything stays local and inspectable.

import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const ROOT = join(__dirname, '..', '..');
export const DATA_DIR = join(ROOT, 'data');
export const UPLOAD_DIR = join(DATA_DIR, 'uploads');

const DB_FILE = join(DATA_DIR, 'db.json');
const CRED_FILE = join(DATA_DIR, 'credentials.json');

const DEFAULT_DB = {
  accounts: [],
  posts: [],
  settings: {
    brandName: 'My Studio',
    accentColor: '#6d5efc',
    logo: null,
    signature: '',
  },
};

// Serialize writes so concurrent requests never corrupt a file.
const locks = new Map();
async function withLock(key, fn) {
  const prev = locks.get(key) || Promise.resolve();
  let release;
  const next = new Promise((r) => (release = r));
  locks.set(key, prev.then(() => next));
  await prev;
  try {
    return await fn();
  } finally {
    release();
    if (locks.get(key) === next) locks.delete(key);
  }
}

async function ensureDirs() {
  await mkdir(DATA_DIR, { recursive: true });
  await mkdir(UPLOAD_DIR, { recursive: true });
}

async function readJson(file, fallback) {
  if (!existsSync(file)) return structuredClone(fallback);
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch {
    return structuredClone(fallback);
  }
}

// Atomic write: write a temp file then rename over the target.
async function writeJson(file, data) {
  await ensureDirs();
  const tmp = `${file}.${process.pid}.tmp`;
  await writeFile(tmp, JSON.stringify(data, null, 2));
  await rename(tmp, file);
}

export async function init() {
  await ensureDirs();
  if (!existsSync(DB_FILE)) await writeJson(DB_FILE, DEFAULT_DB);
  if (!existsSync(CRED_FILE)) await writeJson(CRED_FILE, {});
}

export async function getDb() {
  const db = await readJson(DB_FILE, DEFAULT_DB);
  // Merge in any new default settings keys.
  db.settings = { ...DEFAULT_DB.settings, ...(db.settings || {}) };
  db.accounts ||= [];
  db.posts ||= [];
  return db;
}

// Read-modify-write the db under a lock.
export function updateDb(mutator) {
  return withLock('db', async () => {
    const db = await getDb();
    const result = await mutator(db);
    await writeJson(DB_FILE, db);
    return result;
  });
}

export async function getCredentials() {
  return readJson(CRED_FILE, {});
}

export function updateCredentials(mutator) {
  return withLock('cred', async () => {
    const creds = await getCredentials();
    const result = await mutator(creds);
    await writeJson(CRED_FILE, creds);
    return result;
  });
}

export function id(prefix = 'id') {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}
