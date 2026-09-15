import { getState, update, uid, money, metrics } from '../store.js';
import { el, sectionHead, toast, modal, field, input, select, kpiCard, fmtDate, confirmDialog } from '../ui.js';

export default function renderAccounting() {
  const s = getState();
  const m = metrics();

  return el('div', {}, [
    sectionHead('Accounting', 'Sales, revenue, profit, expenses and return analysis.', [
      el('button', { class: 'btn', text: '＋ Add Expense', onClick: () => expenseForm() }),
    ]),

    el('div', { class: 'grid cols-4', style: 'margin-bottom:16px' }, [
      kpiCard({ label: 'Revenue', value: money(m.revenue), icon: '💵', accent: '#16a34a' }),
      kpiCard({ label: 'Gross profit', value: money(m.grossProfit), icon: '📊', accent: '#4f46e5' }),
      kpiCard({ label: 'Net profit', value: money(m.netProfit), deltaType: m.netProfit >= 0 ? 'up' : 'down', delta: m.netProfit >= 0 ? 'Profit' : 'Loss', icon: '📈', accent: m.netProfit >= 0 ? '#16a34a' : '#dc2626' }),
      kpiCard({ label: 'Return rate', value: `${m.returnRate}%`, icon: '↩️', accent: '#d97706' }),
    ]),

    el('div', { class: 'grid cols-2' }, [
      el('div', { class: 'card' }, [
        el('div', { class: 'card-head' }, [el('h2', { text: 'Profit & loss statement' })]),
        el('div', { class: 'card-pad' }, [
          plRow('Gross sales revenue', m.revenue),
          plRow('Cost of goods sold', -m.cogs),
          plRow('Gross profit', m.grossProfit, true),
          plRow('Advertising spend', -m.adSpend),
          plRow('Operating expenses', -m.expenses),
          plRow('Net profit', m.netProfit, true, true),
        ]),
      ]),
      el('div', { class: 'card' }, [
        el('div', { class: 'card-head' }, [el('h2', { text: 'Return analysis' })]),
        el('div', { class: 'card-pad' }, [returnAnalysis(s, m)]),
      ]),
    ]),

    el('div', { class: 'card', style: 'margin-top:16px' }, [
      el('div', { class: 'card-head' }, [el('h2', { text: 'Expenses' })]),
      el('div', { class: 'table-wrap' }, [expensesTable(s)]),
    ]),
  ]);
}

function plRow(label, value, bold, big) {
  return el('div', { class: 'list-row', style: `padding:9px 0${bold ? ';border-top:1px solid var(--line)' : ''}` }, [
    el('span', { class: bold ? 'cell-strong' : 'muted', text: label }),
    el('span', { class: 'spacer' }),
    el('strong', { style: `${big ? 'font-size:17px;' : ''}color:${value < 0 ? 'var(--red)' : (bold ? 'var(--green)' : 'var(--ink)')}`, text: (value < 0 ? '- ' : '') + money(Math.abs(value)) }),
  ]);
}

function returnAnalysis(s, m) {
  const returned = s.orders.filter((o) => o.status === 'Returned');
  const lostValue = returned.reduce((a, o) => a + o.amount, 0);
  // returns by city
  const byCity = {};
  for (const o of returned) byCity[o.city] = (byCity[o.city] || 0) + 1;
  const topCity = Object.entries(byCity).sort((a, b) => b[1] - a[1])[0];
  return el('div', {}, [
    el('div', { class: 'stat-inline', style: 'margin-bottom:16px' }, [
      el('div', {}, [el('span', { text: 'Returned orders' }), el('strong', { text: String(returned.length) })]),
      el('div', {}, [el('span', { text: 'Lost value' }), el('strong', { style: 'color:var(--red)', text: money(lostValue) })]),
      el('div', {}, [el('span', { text: 'Return rate' }), el('strong', { text: `${m.returnRate}%` })]),
    ]),
    el('div', { class: 'progress', style: 'margin-bottom:6px' }, [el('span', { style: `width:${m.returnRate}%;background:var(--red)` })]),
    el('p', { class: 'help', text: topCity ? `Most returns from ${topCity[0]} (${topCity[1]}). Consider call-verifying orders from high-return areas before shipping.` : 'No returns recorded — great job!' }),
  ]);
}

function expensesTable(s) {
  if (!s.expenses.length) return el('div', { class: 'empty', html: '<div class="empty-icon">🧾</div><p>No expenses recorded.</p>' });
  const t = el('table', { class: 'tbl' }, [
    el('thead', {}, el('tr', {}, [
      el('th', { text: 'Title' }), el('th', { text: 'Category' }), el('th', { text: 'Amount', class: 'num' }), el('th', { text: 'Date' }), el('th', { text: '' }),
    ])),
  ]);
  const tb = el('tbody');
  for (const e of [...s.expenses].sort((a, b) => new Date(b.date) - new Date(a.date))) {
    tb.append(el('tr', {}, [
      el('td', { class: 'cell-strong', text: e.title }),
      el('td', {}, [el('span', { class: 'tag', text: e.category })]),
      el('td', { class: 'num cell-strong', text: money(e.amount) }),
      el('td', { class: 'cell-sub', text: fmtDate(e.date) }),
      el('td', {}, [el('button', { class: 'icon-btn', text: '🗑', onClick: () => {
        update((st) => { st.expenses = st.expenses.filter((x) => x.id !== e.id); });
        toast('Expense removed');
      } })]),
    ]));
  }
  t.append(tb);
  return t;
}

function expenseForm() {
  const title = input({ placeholder: 'e.g. Facebook boost, packaging' });
  const category = select(['Fixed', 'Packaging', 'Salary', 'Marketing', 'Utilities', 'Other'], {});
  const amount = input({ type: 'number', placeholder: '0' });
  const body = el('div', {}, [
    field('Title', title),
    el('div', { class: 'form-row' }, [field('Category', category), field('Amount', amount)]),
    el('div', { class: 'form-actions' }, [
      el('button', { class: 'btn ghost', text: 'Cancel', onClick: () => close() }),
      el('button', { class: 'btn', text: 'Add expense', onClick: () => {
        if (!title.value || !amount.value) { toast('Title and amount required', 'error'); return; }
        update((st) => { st.expenses.push({ id: uid('exp'), title: title.value, category: category.value, amount: +amount.value, date: new Date().toISOString() }); });
        toast('Expense added'); close();
      } }),
    ]),
  ]);
  const close = modal('Add expense', body);
}
