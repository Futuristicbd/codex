import { getState, update, money } from '../store.js';
import { el, sectionHead, toast, modal, field, input, statusBadge, fmtDate } from '../ui.js';
import { barChart } from '../charts.js';
import { logActivity } from './orders.js';

export default function renderCouriers() {
  const s = getState();
  const shipped = s.orders.filter((o) => o.courier);

  // performance per courier
  const perf = s.couriers.map((c) => {
    const orders = shipped.filter((o) => o.courier === c.name);
    const delivered = orders.filter((o) => o.status === 'Delivered').length;
    return { ...c, total: orders.length, delivered };
  });

  return el('div', {}, [
    sectionHead('Courier & Delivery', 'Connect courier partners, book consignments, track parcels and compare performance.'),

    el('div', { class: 'grid cols-4', style: 'margin-bottom:18px' }, s.couriers.map((c) => courierCard(c))),

    el('div', { class: 'grid cols-2' }, [
      el('div', { class: 'card' }, [
        el('div', { class: 'card-head' }, [el('h2', { text: 'Delivery success rate' })]),
        el('div', { class: 'card-pad' }, [barChart(perf.map((c) => ({ label: c.name.slice(0, 4), value: c.deliveredRate })), { color: '#16a34a' })]),
      ]),
      el('div', { class: 'card' }, [
        el('div', { class: 'card-head' }, [el('h2', { text: 'Avg. delivery time (days)' })]),
        el('div', { class: 'card-pad' }, [barChart(perf.map((c) => ({ label: c.name.slice(0, 4), value: c.avgDays })), { color: '#0ea5e9' })]),
      ]),
    ]),

    el('div', { class: 'card', style: 'margin-top:16px' }, [
      el('div', { class: 'card-head' }, [el('h2', { text: 'Active consignments' })]),
      el('div', { class: 'table-wrap' }, [bookingsTable(shipped)]),
    ]),
  ]);
}

function courierCard(c) {
  return el('div', { class: 'card card-pad' }, [
    el('div', { style: 'display:flex;justify-content:space-between;align-items:center' }, [
      el('strong', { text: c.name }),
      el('span', { class: c.connected ? 'dot-ok' : 'dot-off', text: c.connected ? '● Connected' : '○ Off' }),
    ]),
    el('div', { class: 'stat-inline', style: 'margin:14px 0' }, [
      el('div', {}, [el('span', { text: 'Success' }), el('strong', { text: `${c.deliveredRate}%` })]),
      el('div', {}, [el('span', { text: 'Avg days' }), el('strong', { text: String(c.avgDays) })]),
    ]),
    el('button', {
      class: c.connected ? 'btn ghost sm' : 'btn sm',
      text: c.connected ? 'Manage' : 'Connect API',
      onClick: () => connect(c),
    }),
  ]);
}

function connect(c) {
  const key = input({ value: c.apiKey, placeholder: 'API key / access token' });
  const secret = input({ placeholder: 'API secret', type: 'password' });
  const body = el('div', {}, [
    el('p', { class: 'help', text: `Enter your ${c.name} merchant API credentials to enable automatic booking and tracking. In production these are stored server-side and never exposed to the browser.` }),
    field(`${c.name} API key`, key),
    field(`${c.name} API secret`, secret),
    el('div', { class: 'form-actions' }, [
      c.connected ? el('button', { class: 'btn danger', text: 'Disconnect', onClick: () => {
        update((st) => { const cc = st.couriers.find((x) => x.name === c.name); cc.connected = false; cc.apiKey = ''; });
        toast(`${c.name} disconnected`); close();
      } }) : null,
      el('span', { class: 'spacer' }),
      el('button', { class: 'btn ghost', text: 'Cancel', onClick: () => close() }),
      el('button', { class: 'btn success', text: 'Save & connect', onClick: () => {
        if (!key.value) { toast('API key required', 'error'); return; }
        update((st) => { const cc = st.couriers.find((x) => x.name === c.name); cc.connected = true; cc.apiKey = key.value.slice(0, 4) + '-****'; logActivity(st, `Connected ${c.name} courier`); });
        toast(`${c.name} connected ✓`); close();
      } }),
    ]),
  ]);
  const close = modal(`${c.name} integration`, body);
}

function bookingsTable(shipped) {
  if (!shipped.length) return el('div', { class: 'empty', html: '<div class="empty-icon">🚚</div><p>No consignments booked yet. Book a courier from any order.</p>' });
  const t = el('table', { class: 'tbl' }, [
    el('thead', {}, el('tr', {}, [
      el('th', { text: 'Tracking ID' }), el('th', { text: 'Invoice' }), el('th', { text: 'Customer' }),
      el('th', { text: 'Courier' }), el('th', { text: 'Amount', class: 'num' }), el('th', { text: 'Status' }), el('th', { text: 'Booked' }),
    ])),
  ]);
  const tb = el('tbody');
  for (const o of shipped.sort((a, b) => new Date(b.date) - new Date(a.date))) {
    tb.append(el('tr', {}, [
      el('td', { class: 'cell-strong', style: 'font-family:monospace', text: o.trackingId }),
      el('td', { text: o.invoice }),
      el('td', {}, [el('div', { class: 'cell-strong', text: o.customerName }), el('div', { class: 'cell-sub', text: o.city })]),
      el('td', {}, [el('span', { class: 'tag', text: o.courier })]),
      el('td', { class: 'num cell-strong', text: money(o.amount) }),
      el('td', {}, [statusBadge(o.status)]),
      el('td', { class: 'cell-sub', text: fmtDate(o.date) }),
    ]));
  }
  t.append(tb);
  return t;
}
