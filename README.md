# Commerce OS — E-commerce Business Management System

A complete management system for online sellers (built for the Bangladesh
market) that brings orders, courier, inventory, landing pages, automation,
ads tracking, accounting and team management into a single dashboard.

Built as a dependency-free static app (vanilla HTML/CSS/JS, ES modules) so it
runs anywhere with no build step. Data persists in the browser via
`localStorage` and is seeded with realistic demo data on first load.

## Run it

```bash
npm run dev        # serves at http://localhost:5173
```

- Marketing site: `http://localhost:5173/index.html`
- Dashboard app:  `http://localhost:5173/app/index.html`

```bash
npm run build      # copies the site + app into dist/
npm run preview    # serves the built dist/ folder
```

## Modules

| Module | What it does |
| --- | --- |
| **Dashboard** | Revenue trend, order-status donut, profit breakdown, low-stock alerts |
| **Orders** | Manual + WooCommerce + landing-page orders, AI auto-fill from a pasted message, duplicate/fraud check, AI call verification, smart status management, courier booking, CSV export |
| **Products & Stock** | Inventory, pricing, low-stock alerts, barcode/QR, **scan-to-return** |
| **Customers** | Directory with lifetime value, return history and fraud scoring |
| **Courier & Delivery** | Pathao · Steadfast · RedX · CarryBee connect/booking/tracking + performance charts |
| **Landing Pages** | No-website selling-page builder with live preview; orders flow into the dashboard |
| **Automation** | SMS automation, AI chat auto-reply, webhooks |
| **Ads Tracking** | Facebook / TikTok / Google pixels + server-side (CAPI), ad-spend log, ROAS |
| **Accounting** | Sales, revenue, P&L, expenses, return analysis |
| **Team & Roles** | Users, Admin/Moderator/Support roles, permissions, activity log |
| **Settings & Backup** | Business profile, WooCommerce connection, JSON backup/restore/reset |

## Scope notes

- **Kept:** WordPress / WooCommerce integration, Landing Page Builder, and all
  other features from the original brief.
- **Intentionally excluded** (per request): Shopify and Laravel website
  integrations.
- The AI checks, courier booking, CAPI and WooCommerce sync are implemented as
  working UI with simulated logic. In production these connect to server-side
  APIs (courier merchant APIs, Meta/TikTok/Google CAPI, the WooCommerce REST
  API) — credentials must live on a backend, never in the browser. The store
  layer (`app/js/store.js`) is the single place to swap `localStorage` for real
  API calls.

## Structure

```
index.html            Marketing landing page (Bangla + English)
src/                  Landing page styles + script
app/index.html        Dashboard shell (sidebar, topbar, router mount)
app/styles/app.css    Dashboard styling
app/js/store.js       State, persistence, seed data, business metrics
app/js/main.js        Shell, navigation, hash router, role switching
app/js/ui.js          DOM + formatting helpers (modal, toast, tables, forms)
app/js/charts.js      Dependency-free inline-SVG charts
app/js/views/*.js     One module per dashboard section
```
