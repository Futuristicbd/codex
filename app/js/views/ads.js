import { getState, update, uid, money, metrics } from '../store.js';
import { el, sectionHead, toast, modal, field, input, select, kpiCard, fmtDate } from '../ui.js';
import { barChart } from '../charts.js';
import { logActivity } from './orders.js';

export default function renderAds() {
  const s = getState();
  const m = metrics();
  const totalSpend = s.ads.spend.reduce((a, x) => a + x.amount, 0);
  const totalConv = s.ads.spend.reduce((a, x) => a + x.conversions, 0);

  const byPlatform = {};
  for (const sp of s.ads.spend) byPlatform[sp.platform] = (byPlatform[sp.platform] || 0) + sp.amount;

  return el('div', {}, [
    sectionHead('Ads Tracking', 'Server-side tracking (CAPI), pixels, conversions and ad-spend ROAS in one place.', [
      el('button', { class: 'btn ghost', text: '＋ Add Spend', onClick: () => spendForm() }),
      el('button', { class: 'btn', text: '＋ Add Pixel / CAPI', onClick: () => pixelForm() }),
    ]),

    el('div', { class: 'grid cols-4', style: 'margin-bottom:18px' }, [
      kpiCard({ label: 'Total ad spend', value: money(totalSpend), icon: '💸', accent: '#db2777' }),
      kpiCard({ label: 'Attributed revenue', value: money(m.revenue), icon: '💵', accent: '#16a34a' }),
      kpiCard({ label: 'ROAS', value: `${m.roas}x`, delta: m.roas >= 2 ? 'Healthy' : 'Watch', deltaType: m.roas >= 2 ? 'up' : 'down', icon: '📈', accent: '#4f46e5' }),
      kpiCard({ label: 'Conversions', value: String(totalConv), icon: '🎯', accent: '#0ea5e9' }),
    ]),

    el('div', { class: 'grid cols-2' }, [
      el('div', { class: 'card' }, [
        el('div', { class: 'card-head' }, [el('h2', { text: 'Pixels & Server-Side (CAPI)' })]),
        el('div', {}, s.ads.pixels.map((p) => pixelRow(p))),
      ]),
      el('div', { class: 'card' }, [
        el('div', { class: 'card-head' }, [el('h2', { text: 'Spend by platform' })]),
        el('div', { class: 'card-pad' }, [barChart(Object.entries(byPlatform).map(([k, v]) => ({ label: k.slice(0, 4), value: v })), { color: '#db2777' })]),
      ]),
    ]),

    el('div', { class: 'card', style: 'margin-top:16px' }, [
      el('div', { class: 'card-head' }, [el('h2', { text: 'Campaign spend log' })]),
      el('div', { class: 'table-wrap' }, [spendTable(s)]),
    ]),
  ]);
}

function pixelRow(p) {
  return el('div', { class: 'list-row', style: 'padding:14px 18px' }, [
    el('div', {}, [
      el('div', { class: 'cell-strong', text: `${p.platform}` }),
      el('div', { class: 'cell-sub', style: 'font-family:monospace', text: p.pixelId }),
    ]),
    el('span', { class: 'spacer' }),
    el('span', { class: p.capi ? 'badge st-delivered' : 'badge st-pending', style: 'margin-right:8px', text: p.capi ? 'CAPI on' : 'CAPI off' }),
    el('span', { class: p.status === 'Active' ? 'dot-ok' : 'dot-off', text: p.status === 'Active' ? '● Active' : '○ ' + p.status }),
    el('button', { class: 'icon-btn', text: '🗑', style: 'margin-left:8px', onClick: () => {
      update((st) => { st.ads.pixels = st.ads.pixels.filter((x) => x.id !== p.id); });
      toast('Pixel removed');
    } }),
  ]);
}

function spendTable(s) {
  const t = el('table', { class: 'tbl' }, [
    el('thead', {}, el('tr', {}, [
      el('th', { text: 'Campaign' }), el('th', { text: 'Platform' }),
      el('th', { text: 'Spend', class: 'num' }), el('th', { text: 'Conversions', class: 'num' }),
      el('th', { text: 'Cost / conv.', class: 'num' }), el('th', { text: 'Date' }),
    ])),
  ]);
  const tb = el('tbody');
  for (const sp of [...s.ads.spend].sort((a, b) => new Date(b.date) - new Date(a.date))) {
    tb.append(el('tr', {}, [
      el('td', { class: 'cell-strong', text: sp.campaign }),
      el('td', {}, [el('span', { class: 'tag', text: sp.platform })]),
      el('td', { class: 'num cell-strong', text: money(sp.amount) }),
      el('td', { class: 'num', text: String(sp.conversions) }),
      el('td', { class: 'num cell-sub', text: sp.conversions ? money(Math.round(sp.amount / sp.conversions)) : '—' }),
      el('td', { class: 'cell-sub', text: fmtDate(sp.date) }),
    ]));
  }
  t.append(tb);
  return t;
}

function pixelForm() {
  const platform = select(['Facebook', 'TikTok', 'Google'], {});
  const pixelId = input({ placeholder: 'Pixel / measurement ID' });
  const capi = el('input', { type: 'checkbox' }); capi.checked = true;
  const token = input({ placeholder: 'Server-side access token (CAPI)' });
  const body = el('div', {}, [
    field('Platform', platform),
    field('Pixel ID', pixelId),
    field('CAPI access token', token),
    el('label', { class: 'list-row', style: 'padding:6px 0;cursor:pointer' }, [capi, el('span', { text: 'Enable server-side tracking (CAPI)' })]),
    el('div', { class: 'form-actions' }, [
      el('button', { class: 'btn ghost', text: 'Cancel', onClick: () => close() }),
      el('button', { class: 'btn', text: 'Add', onClick: () => {
        if (!pixelId.value) { toast('Pixel ID required', 'error'); return; }
        update((st) => { st.ads.pixels.push({ id: uid('px'), platform: platform.value, pixelId: pixelId.value, capi: capi.checked, status: token.value ? 'Active' : 'Needs setup' }); logActivity(st, `Added ${platform.value} pixel`); });
        toast('Pixel added ✓'); close();
      } }),
    ]),
  ]);
  const close = modal('Add pixel / CAPI', body);
}

function spendForm() {
  const platform = select(['Facebook', 'TikTok', 'Google'], {});
  const campaign = input({ placeholder: 'Campaign name' });
  const amount = input({ type: 'number', placeholder: 'Amount spent' });
  const conv = input({ type: 'number', placeholder: 'Conversions', value: '0' });
  const body = el('div', {}, [
    field('Platform', platform),
    field('Campaign', campaign),
    el('div', { class: 'form-row' }, [field('Spend', amount), field('Conversions', conv)]),
    el('div', { class: 'form-actions' }, [
      el('button', { class: 'btn ghost', text: 'Cancel', onClick: () => close() }),
      el('button', { class: 'btn', text: 'Add', onClick: () => {
        if (!campaign.value || !amount.value) { toast('Campaign and spend required', 'error'); return; }
        update((st) => { st.ads.spend.push({ id: uid('ad'), platform: platform.value, campaign: campaign.value, amount: +amount.value, date: new Date().toISOString(), conversions: +conv.value || 0 }); });
        toast('Spend logged'); close();
      } }),
    ]),
  ]);
  const close = modal('Add ad spend', body);
}
