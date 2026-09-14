# Connecting your platforms — what each one needs

LocalPost Hub never creates accounts or fetches tokens for you. For every platform
you must create the credentials yourself on that platform's side, then paste them
into the app's **Connections** page. This file lists exactly what each one requires.

Legend: ✅ fully automated · 🟡 automated once you supply API access · ✋ manual (copy-paste package)

---

## ✅ Mastodon
1. Log in to your Mastodon instance (e.g. `mastodon.social`).
2. **Preferences → Development → New application**.
3. Give it `read` and `write` scopes, save, and open it to copy the **access token**.
4. In the app, paste your **Instance URL** and **Access token**. Done — posting works.

## ✅ Bluesky
1. In the Bluesky app/website: **Settings → App Passwords → Add App Password**.
2. Copy the generated password (format `xxxx-xxxx-xxxx-xxxx`). **Do not use your main password.**
3. In the app, paste your **handle** (e.g. `you.bsky.social`) and the **app password**.

## ✅ Telegram
1. On Telegram, message **@BotFather**, send `/newbot`, and follow the prompts to get a **bot token**.
2. Decide where to post:
   - **Channel:** add your bot as an **administrator**, then use the channel `@username` as the chat ID.
   - **Group/DM:** get the numeric chat ID (e.g. via `@userinfobot` or the Bot API `getUpdates`).
3. In the app, paste the **bot token** and **chat ID**.

## ✅ Discord
1. In your Discord server: **Channel → Edit → Integrations → Webhooks → New Webhook**.
2. **Copy Webhook URL**.
3. In the app, paste the **webhook URL** (and optionally an override display name).

---

## 🟡 Facebook Page
Requires a Meta developer app and a **Page access token** (this is the part you set up manually):
1. Create an app at <https://developers.facebook.com/>.
2. Add the **Pages API** and request the `pages_manage_posts` and `pages_read_engagement` permissions.
3. Generate a **long-lived Page access token** for the Page you want to post to (Graph API Explorer → exchange for long-lived token).
4. Find your **Page ID** (Page → About, or via Graph API).
5. Paste **Page ID** and **Page access token** into the app. Text and photo posts then publish automatically. (Video uses a resumable upload flow — post videos manually.)

## 🟡 LinkedIn
Requires an approved LinkedIn app and OAuth token (manual setup):
1. Create an app at <https://www.linkedin.com/developers/>.
2. Request the **Share on LinkedIn** / `w_member_social` (or `w_organization_social` for a Page) product.
3. Complete OAuth to obtain an **access token**.
4. Find your **author URN** — `urn:li:person:XXXX` for a profile or `urn:li:organization:1234` for a Page.
5. Paste both into the app. Text updates publish automatically; media upload needs an approved app (post media manually for now).

---

## ✋ Manual platforms (copy-paste packages)

These platforms do **not** offer a posting API that can be automated without heavyweight,
approval-gated developer programs. For each, the app builds a **publish package**: your
caption (with signature) ready to copy, plus your media ready to download — so you post it
by hand in a few seconds. If you later obtain the required API access, tell the maintainer
and the connector can be upgraded to automated.

| Platform | Why manual | To automate later you'd need |
|----------|------------|------------------------------|
| ✋ Instagram | API only posts media hosted at a public URL, via an approved Meta app | Instagram Graph API + Business account + approved app |
| ✋ X / Twitter | Posting requires paid API tier + OAuth 1.0a signing | X API (paid tier) keys + tokens |
| ✋ Threads | Needs approved Meta app (Threads API) | Threads API access |
| ✋ TikTok | Content Posting API needs approved app + audited scopes | TikTok for Developers approval |
| ✋ YouTube | Uploads need OAuth with the YouTube Data API | Google Cloud project + OAuth consent |
| ✋ Pinterest | Needs approved Pinterest app | Pinterest API access |

---

## Where credentials are stored

Everything you enter is saved to **`data/credentials.json`** on your own machine
(git-ignored). You can also pre-fill it by copying `config/credentials.example.json`
to `data/credentials.json` and editing it in a text editor — the app reads it either way.
