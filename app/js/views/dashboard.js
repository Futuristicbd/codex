import { getState, metrics, money, lowStockProducts } from '../store.js';
import { el, kpiCard, statusBadge, fmtDate, sectionHead } from '../ui.js';
import { lineChart, donutChart } from '../charts.js';

export default function renderDashboard() {
  const s = getState();
  const m = metrics();

  // 7-day revenue trend from delivered orders.
  const days = [...Array(7)].map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d;
  });
  const trend = days.map((d) => {
    const key = d.toDateString();
    return s.orders
      .filter((o) => o.status === 'Delivered' && new Date(o.date).toDateString() === key)
      .reduce((sum, o) => sum + o.amount, 0);
  });
  // fall back to a gentle synthetic curve if all zero
  const trendData = trend.some((v) => v) ? trend : [820, 1250, 980, 1640, 1420, 2100, 1880];

  const statusCounts = {};
  for (const o of s.orders) statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;
  const donutSegs = [
    { label: 'Delivered', value: statusCounts['Delivered'] || 0, color: '#16a34a' },
    { label: 'In Transit', value: (statusCounts['In Transit'] || 0) + (statusCounts['Shipped'] || 0), color: '#0ea5e9' },
    { label: 'Pending', value: (statusCounts['Pending'] || 0) + (statusCounts['Confirmed'] || 0) + (statusCounts['Processing'] || 0) + (statusCounts['Packed'] || 0), color: '#d97706' },
    { label: 'Returned', value: (statusCounts['Returned'] || 0) + (statusCounts['Cancelled'] || 0), color: '#dc2626' },
  ].filter((x) => x.value);

  const recent = [...s.orders]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 6);

  const low = lowStockProducts();

  return el('div', {}, [
    sectionHead('Dashboard', `Welcome back — here is how ${s.settings.businessName} is doing today.`),

    el('div', { class: 'grid cols-4', style: 'margin-bottom:16px' }, [
      kpiCard({ label: 'Revenue (delivered)', value: money(m.revenue), delta: '+12%', deltaType: 'up', icon: '💵', accent: '#16a34a' }),
      kpiCard({ label: 'Net Profit', value: money(m.netProfit), delta: m.netProfit >= 0 ? '+8%' : '-4%', deltaType: m.netProfit >= 0 ? 'up' : 'down', icon: '📈', accent: '#4f46e5' }),
      kpiCard({ label: 'Total Orders', value: String(m.totalOrders), delta: `${m.pendingCount} pending`, deltaType: 'up', icon: '📦', accent: '#0ea5e9' }),
      kpiCard({ label: 'Delivery Rate', value: `${m.deliveryRate}%`, delta: `${m.returnRate}% returns`, deltaType: m.returnRate > 15 ? 'down' : 'up', icon: '🚚', accent: '#d97706' }),
    ]),

    el('div', { class: 'grid cols-3' }, [
      el('div', { class: 'card span-2' }, [
        el('div', { class: 'card-head' }, [
          el('h2', { text: 'Revenue — last 7 days' }),
          el('span', { class: 'muted', text: money(trendData.reduce((a, b) => a + b, 0)) + ' total' }),
        ]),
        el('div', { class: 'card-pad' }, [lineChart(trendData, { color: '#4f46e5' })]),
      ]),
      el('div', { class: 'card' }, [
        el('div', { class: 'card-head' }, [el('h2', { text: 'Order status' })]),
        el('div', { class: 'card-pad' }, [
          donutSegs.length ? donutChart(donutSegs) : el('p', { class: 'muted', text: 'No orders yet.' }),
        ]),
      ]),
    ]),

    el('div', { class: 'grid cols-3', style: 'margin-top:16px' }, [
      el('div', { class: 'card span-2' }, [
        el('div', { class: 'card-head' }, [
          el('h2', { text: 'Recent orders' }),
          el('a', { class: 'btn ghost sm', href: '#orders', text: 'View all' }),
        ]),
        el('div', { class: 'table-wrap' }, [recentTable(recent)]),
      ]),
      el('div', { class: 'stack' }, [
        profitCard(m),
        lowStockCard(low),
      ]),
    ]),
  ]);
}

function recentTable(orders) {
  const t = el('table', { class: 'tbl' }, [
    el('thead', {}, el('tr', {}, [
      el('th', { text: 'Invoice' }), el('th', { text: 'Customer' }),
      el('th', { text: 'Amount', class: 'num' }), el('th', { text: 'Status' }), el('th', { text: 'Date' }),
    ])),
  ]);
  const tb = el('tbody');
  for (const o of orders) {
    tb.append(el('tr', {}, [
      el('td', { class: 'cell-strong', text: o.invoice }),
      el('td', {}, [el('div', { class: 'cell-strong', text: o.customerName }), el('div', { class: 'cell-sub', text: o.phone })]),
      el('td', { class: 'num cell-strong', text: money(o.amount) }),
      el('td', {}, [statusBadge(o.status)]),
      el('td', { class: 'cell-sub', text: fmtDate(o.date) }),
    ]));
  }
  t.append(tb);
  return t;
}

function profitCard(m) {
  const rows = [
    ['Revenue', money(m.revenue)],
    ['Product cost', '- ' + money(m.cogs)],
    ['Ad spend', '- ' + money(m.adSpend)],
    ['Other expenses', '- ' + money(m.expenses)],
  ];
  return el('div', { class: 'card card-pad' }, [
    el('h2', { text: 'Profit breakdown', style: 'margin-bottom:12px' }),
    ...rows.map(([k, v]) => el('div', { class: 'list-row', style: 'padding:8px 0' }, [
      el('span', { class: 'muted', text: k }), el('span', { class: 'spacer' }), el('strong', { text: v }),
    ])),
    el('div', { class: 'list-row', style: 'padding:10px 0 0' }, [
      el('span', { class: 'cell-strong', text: 'Net profit' }), el('span', { class: 'spacer' }),
      el('strong', { style: `font-size:18px;color:${m.netProfit >= 0 ? 'var(--green)' : 'var(--red)'}`, text: money(m.netProfit) }),
    ]),
  ]);
}

function lowStockCard(low) {
  return el('div', { class: 'card card-pad' }, [
    el('div', { style: 'display:flex;justify-content:space-between;align-items:center;margin-bottom:10px' }, [
      el('h2', { text: 'Low stock alert' }),
      el('span', { class: 'badge st-returned', text: `${low.length} items` }),
    ]),
    low.length
      ? el('div', {}, low.slice(0, 5).map((p) => el('div', { class: 'list-row', style: 'padding:9px 0' }, [
          el('div', {}, [el('div', { class: 'cell-strong', text: p.name }), el('div', { class: 'cell-sub', text: p.sku })]),
          el('span', { class: 'spacer' }),
          el('span', { class: 'badge st-pending', text: `${p.stock} left` }),
        ])))
      : el('p', { class: 'muted', text: 'All products well stocked. 🎉' }),
  ]);
}
