import { getState, money } from '../store.js';
import { el, sectionHead, fraudBadge, statusBadge, fmtDate, modal } from '../ui.js';

export default function renderCustomers() {
  const s = getState();
  const enriched = s.customers.map((c) => {
    const orders = s.orders.filter((o) => o.customerId === c.id || o.phone === c.phone);
    const spent = orders.filter((o) => o.status === 'Delivered').reduce((a, o) => a + o.amount, 0);
    return { ...c, orderCount: orders.length, spent };
  }).sort((a, b) => b.spent - a.spent);

  return el('div', {}, [
    sectionHead('Customers', 'Customer directory with lifetime value and fraud scoring.'),
    el('div', { class: 'grid cols-3', style: 'margin-bottom:16px' }, [
      stat('Total customers', String(s.customers.length), '👤'),
      stat('Repeat buyers', String(enriched.filter((c) => c.orderCount > 1).length), '🔁'),
      stat('High-risk', String(enriched.filter((c) => c.fraudScore >= 60).length), '⚠️', 'var(--red)'),
    ]),
    el('div', { class: 'card' }, [el('div', { class: 'table-wrap' }, [table(enriched)])]),
  ]);
}

function stat(label, value, icon, color) {
  return el('div', { class: 'card card-pad', style: 'display:flex;gap:12px;align-items:center' }, [
    el('span', { class: 'kpi-icon', style: color ? `background:${color}1a;color:${color}` : '', text: icon }),
    el('div', {}, [el('div', { class: 'kpi-value', style: 'font-size:20px', text: value }), el('div', { class: 'kpi-label', text: label })]),
  ]);
}

function table(list) {
  const t = el('table', { class: 'tbl' }, [
    el('thead', {}, el('tr', {}, [
      el('th', { text: 'Customer' }), el('th', { text: 'City' }), el('th', { text: 'Orders', class: 'num' }),
      el('th', { text: 'Returns', class: 'num' }), el('th', { text: 'Lifetime value', class: 'num' }),
      el('th', { text: 'Fraud score' }), el('th', { text: '' }),
    ])),
  ]);
  const tb = el('tbody');
  for (const c of list) {
    tb.append(el('tr', {}, [
      el('td', {}, [el('div', { class: 'cell-strong', text: c.name }), el('div', { class: 'cell-sub', text: c.phone })]),
      el('td', { class: 'cell-sub', text: c.city }),
      el('td', { class: 'num cell-strong', text: String(c.orderCount) }),
      el('td', { class: 'num', text: String(c.returns || 0) }),
      el('td', { class: 'num cell-strong', text: money(c.spent) }),
      el('td', {}, [fraudBadge(c.fraudScore)]),
      el('td', {}, [el('button', { class: 'btn ghost sm', text: 'History', onClick: () => history(c) })]),
    ]));
  }
  t.append(tb);
  return t;
}

function history(c) {
  const s = getState();
  const orders = s.orders.filter((o) => o.customerId === c.id || o.phone === c.phone)
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  const body = el('div', {}, [
    el('div', { class: 'card card-pad', style: 'margin-bottom:14px' }, [
      el('div', { class: 'cell-strong', text: c.name }),
      el('div', { class: 'cell-sub', text: `${c.phone} · ${c.address}` }),
      el('div', { style: 'margin-top:8px' }, [fraudBadge(c.fraudScore)]),
    ]),
    orders.length ? el('div', { class: 'table-wrap' }, [
      (() => {
        const t = el('table', { class: 'tbl' }, [el('thead', {}, el('tr', {}, [
          el('th', { text: 'Invoice' }), el('th', { text: 'Amount', class: 'num' }), el('th', { text: 'Status' }), el('th', { text: 'Date' }),
        ]))]);
        const tb = el('tbody');
        for (const o of orders) tb.append(el('tr', {}, [
          el('td', { class: 'cell-strong', text: o.invoice }),
          el('td', { class: 'num', text: money(o.amount) }),
          el('td', {}, [statusBadge(o.status)]),
          el('td', { class: 'cell-sub', text: fmtDate(o.date) }),
        ]));
        t.append(tb);
        return t;
      })(),
    ]) : el('p', { class: 'muted', text: 'No orders yet.' }),
  ]);
  modal(`${c.name} — order history`, body, { wide: true });
}
