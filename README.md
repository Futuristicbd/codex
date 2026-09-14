# 🚀 LocalPost Hub

A **self-hosted social media posting platform**. Connect your accounts and pages,
compose a post once, attach photos/videos, and publish everywhere — or schedule it
for later. Everything runs **locally on your machine** with **zero npm dependencies**
(only Node.js built-in modules). Your text, media, and API keys never leave your
computer except to go directly to the platforms you connect.

![local](https://img.shields.io/badge/hosted-locally-3ecf8e) ![deps](https://img.shields.io/badge/dependencies-0-6d5efc)

## Features

- **One composer, many platforms** — write once, pick which connected platforms to post to.
- **Media library** — drag-and-drop upload of photos and videos, reused across posts, with video preview + scrubbing.
- **Scheduling** — publish now or schedule for a future time (a built-in scheduler runs due posts automatically).
- **Per-platform results** — see exactly which platforms succeeded, failed, or need manual publishing.
- **Manual publish packages** — for platforms without an automatable API, the app prepares a ready-to-paste caption + downloadable media so you can post by hand in one step.
- **Branding & defaults** — set your studio name, accent color, logo, and an auto-appended signature.
- **Private by design** — data is stored under `./data` (git-ignored). No telemetry, no cloud.

## Quick start

Requires **Node.js 18 or newer** (uses built-in modules only — nothing to install).

```bash
npm start
```

Then open **http://127.0.0.1:4000** in your browser.

To change the port or host:

```bash
PORT=8080 HOST=0.0.0.0 npm start
```

That's it — no build step, no database, no external services.

## How it works

```
public/          → the web app (HTML/CSS/vanilla JS)
server/          → the local API server (Node built-ins only)
  index.js       → HTTP server + routes + static hosting + scheduler
  lib/           → storage, media handling, post lifecycle, HTTP helpers
  connectors/    → one file per social platform
data/            → your local data (git-ignored): db.json, credentials.json, uploads/
config/          → example credentials file
```

Posts, media metadata, and settings live in `data/db.json`. Uploaded files go to
`data/uploads/`. Platform credentials live in `data/credentials.json`.

## Connecting platforms

Open the **Connections** page in the app and paste each platform's credentials.
Some platforms work **fully automatically** as soon as you add a token; others
need external API access that you set up on the platform's side first.

**Works fully out of the box** (just add a token):

| Platform | What you need |
|----------|---------------|
| 🐘 Mastodon | Instance URL + access token (Preferences → Development → New application) |
| 🦋 Bluesky | Handle + App Password (Settings → App Passwords) |
| ✈️ Telegram | Bot token from @BotFather + chat/channel ID |
| 💬 Discord | Channel webhook URL |

**Automated once you provide API access** (marked *Auto\**):

| Platform | What you need |
|----------|---------------|
| 📘 Facebook Page | Page ID + long-lived Page access token (Meta app) |
| 💼 LinkedIn | OAuth token + author URN (text posts) |

**Manual (copy-paste package)** — Instagram, X/Twitter, Threads, TikTok, YouTube,
Pinterest. These have no freely-automatable posting API, so the app prepares the
caption and media for you to post by hand. See **CONNECTIONS.md** for the full
breakdown of what each one requires if you later want to automate them.

> ⚠️ **External connections needed:** every platform above requires an account and
> credentials *you* create on that platform. The app never creates accounts or
> obtains tokens for you — you add them manually on the Connections page. See
> `CONNECTIONS.md` for step-by-step notes.

## Safety notes

- Credentials are stored in plain JSON under `data/` on your own machine. Keep that
  folder private and don't commit it (it's already git-ignored).
- The server binds to `127.0.0.1` by default so it's only reachable from your own
  computer. Only set `HOST=0.0.0.0` if you understand the exposure.
