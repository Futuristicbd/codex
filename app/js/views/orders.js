import {
  getState, update, uid, money, ORDER_STATUSES, COURIERS, orderTotal, productById,
} from '../store.js';
import {
  el, statusBadge, fraudBadge, fmtDateTime, sectionHead, toast, modal, field, input, select, confirmDialog,
} from '../ui.js';

let filter = { status: 'All', source: 'All', q: '' };

export default function renderOrders() {
  // pick up a search handed over from the topbar
  const handed = sessionStorage.getItem('order_search');
  if (handed) { filter.q = handed; sessionStorage.removeItem('order_search'); }

  const s = getState();
  const wrap = el('div', {}, [
    sectionHead('Orders', 'All orders from manual entry, WooCommerce and landing pages in one place.', [
      el('button', { class: 'btn ghost', text: '⤓ Export CSV', onClick: () => exportCsv() }),
      el('button', { class: 'btn', text: '＋ New Order', onClick: () => orderForm() }),
    ]),
    toolbar(),
    el('div', { class: 'card' }, [el('div', { class: 'table-wrap', id: 'orders-table' })]),
  ]);
  // defer table build so #orders-table exists
  queueMicrotask(() => paintTable(wrap.querySelector('#orders-table')));
  return wrap;
}

function toolbar() {
  const statusSel = select(['All', ...ORDER_STATUSES], { value: filter.status });
  statusSel.value = filter.status;
  statusSel.addEventListener('change', () => { filter.status = statusSel.value; repaint(); });

  const srcSel = select(['All', 'manual', 'woocommerce', 'landing'], {});
  srcSel.value = filter.source;
  srcSel.addEventListener('change', () => { filter.source = srcSel.value; repaint(); });

  const q = input({ placeholder: 'Search invoice / phone / name', value: filter.q, style: 'min-width:220px' });
  q.addEventListener('input', () => { filter.q = q.value; repaint(); });

  return el('div', { class: 'toolbar' }, [
    q,
    el('span', { class: 'muted', text: 'Status' }), statusSel,
    el('span', { class: 'muted', text: 'Source' }), srcSel,
  ]);
}

function filtered() {
  const s = getState();
  return s.orders
    .filter((o) => filter.status === 'All' || o.status === filter.status)
    .filter((o) => filter.source === 'All' || o.source === filter.source)
    .filter((o) => {
      if (!filter.q) return true;
      const q = filter.q.toLowerCase();
      return [o.invoice, o.phone, o.customerName].some((v) => (v || '').toLowerCase().includes(q));
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date));
}

function repaint() {
  const holder = document.getElementById('orders-table');
  if (holder) paintTable(holder);
}

function paintTable(holder) {
  const rows = filtered();
  holder.innerHTML = '';
  if (!rows.length) {
    holder.innerHTML = '<div class="empty"><div class="empty-icon">📭</div><p>No orders match your filters.</p></div>';
    return;
  }
  const t = el('table', { class: 'tbl' }, [
    el('thead', {}, el('tr', {}, [
      el('th', { text: 'Invoice' }), el('th', { text: 'Customer' }), el('th', { text: 'Items' }),
      el('th', { text: 'Amount', class: 'num' }), el('th', { text: 'Source' }),
      el('th', { text: 'Fraud' }), el('th', { text: 'Courier' }), el('th', { text: 'Status' }), el('th', { text: '' }),
    ])),
  ]);
  const tb = el('tbody');
  for (const o of rows) {
    const itemsLabel = o.items.map((i) => `${i.name} ×${i.qty}`).join(', ');
    tb.append(el('tr', {}, [
      el('td', {}, [el('div', { class: 'cell-strong', text: o.invoice }), el('div', { class: 'cell-sub', text: fmtDateTime(o.date) })]),
      el('td', {}, [el('div', { class: 'cell-strong', text: o.customerName }), el('div', { class: 'cell-sub', text: `${o.phone} · ${o.city}` })]),
      el('td', { class: 'cell-sub', style: 'max-width:180px', text: itemsLabel }),
      el('td', { class: 'num cell-strong', text: money(o.amount) }),
      el('td', {}, [el('span', { class: `tag src-${o.source}`, text: o.source })]),
      el('td', {}, [fraudBadge(o.fraudScore)]),
      el('td', { class: 'cell-sub', text: o.courier || '—' }),
      el('td', {}, [statusBadge(o.status)]),
      el('td', {}, [el('button', { class: 'btn ghost sm', text: 'Manage', onClick: () => orderDetail(o.id) })]),
    ]));
  }
  t.append(tb);
  holder.append(t);
}

// ---------- new / edit order form with AI auto-fill ----------
function orderForm() {
  const s = getState();
  const box = el('div');

  const raw = el('textarea', { class: 'input', placeholder: 'Paste the customer message here…\ne.g. "Amar name Rahim, 01711000001, Mirpur 10 Dhaka, Panjabi 1 ta lagbe"' });
  const aiBtn = el('button', {
    class: 'btn soft', text: '🤖 AI Auto-Fill from message',
    onClick: () => aiAutofill(raw.value, { name, phone, address, city }),
  });

  const name = input({ placeholder: 'Customer name' });
  const phone = input({ placeholder: '01XXXXXXXXX' });
  const address = input({ placeholder: 'Full address' });
  const city = input({ placeholder: 'City' });

  const prodSel = select(s.products.map((p) => ({ value: p.id, label: `${p.name} — ${money(p.price)}` })));
  const qty = input({ type: 'number', value: '1', min: '1' });

  const fraudNote = el('p', { class: 'help' });
  phone.addEventListener('blur', () => {
    if (!phone.value) return;
    const dup = s.orders.filter((o) => o.phone === phone.value.trim());
    const risky = s.customers.find((c) => c.phone === phone.value.trim() && c.fraudScore >= 60);
    if (risky) fraudNote.innerHTML = `⚠️ <b style="color:var(--red)">High-risk customer</b> — ${risky.returns} previous returns.`;
    else if (dup.length) fraudNote.innerHTML = `ℹ️ ${dup.length} previous order(s) from this number.`;
    else fraudNote.textContent = '✓ No duplicate or risk flags found.';
  });

  box.append(
    field('Paste customer message (optional)', el('div', {}, [raw, el('div', { style: 'margin-top:8px' }, [aiBtn])])),
    el('div', { class: 'form-row' }, [field('Name', name), field('Phone', phone)]),
    field('Address', address),
    el('div', { class: 'form-row' }, [field('City', city), field('Product', prodSel)]),
    el('div', { class: 'form-row' }, [field('Quantity', qty), el('div')]),
    fraudNote,
    el('div', { class: 'form-actions' }, [
      el('button', { class: 'btn ghost', text: 'Cancel', onClick: () => close() }),
      el('button', {
        class: 'btn', text: 'Create Order',
        onClick: () => {
          if (!name.value || !phone.value) { toast('Name and phone are required', 'error'); return; }
          const prod = productById(prodSel.value);
          const q = Math.max(1, Number(qty.value) || 1);
          const dupCount = s.orders.filter((o) => o.phone === phone.value.trim()).length;
          const risky = s.customers.find((c) => c.phone === phone.value.trim());
          update((st) => {
            let cust = st.customers.find((c) => c.phone === phone.value.trim());
            if (!cust) {
              cust = { id: uid('cus'), name: name.value.trim(), phone: phone.value.trim(), address: address.value.trim(), city: city.value.trim(), returns: 0, fraudScore: 12 };
              st.customers.push(cust);
            }
            const order = {
              id: uid('ord'),
              invoice: `INV-${1024 + st.orders.length}`,
              date: new Date().toISOString(),
              customerId: cust.id, customerName: name.value.trim(), phone: phone.value.trim(),
              address: address.value.trim(), city: city.value.trim(),
              items: [{ productId: prod.id, name: prod.name, qty: q, price: prod.price }],
              amount: q * prod.price, source: 'manual', status: 'Pending',
              courier: null, trackingId: null,
              fraudScore: risky ? risky.fraudScore : (dupCount ? 40 : 12),
              verified: false, note: '',
            };
            st.orders.unshift(order);
            logActivity(st, `Created order ${order.invoice}`);
          });
          toast('Order created');
          close();
        },
      }),
    ]),
  );
  const close = modal('New Order', box, { wide: true });
}

// Very small heuristic "AI" parser — pulls phone, name and city from free text.
function aiAutofill(text, fields) {
  if (!text.trim()) { toast('Paste a message first', 'error'); return; }
  const phoneMatch = text.match(/(01[0-9]{9})/);
  if (phoneMatch) fields.phone.value = phoneMatch[1];
  const cities = ['Dhaka', 'Chittagong', 'Chattogram', 'Sylhet', 'Rajshahi', 'Khulna', 'Barisal', 'Rangpur', 'Mymensingh', 'Comilla', 'Cumilla', 'Narayanganj', 'Gazipur'];
  const foundCity = cities.find((c) => new RegExp(c, 'i').test(text));
  if (foundCity) fields.city.value = foundCity;
  const nameMatch = text.match(/(?:name|nam|naam)\s*[:\-]?\s*([A-Za-z][A-Za-z .]{1,30})/i);
  if (nameMatch) fields.name.value = nameMatch[1].trim();
  // address = the longest line, minus the phone
  const line = text.split(/[\n,]/).map((l) => l.trim()).filter(Boolean)
    .sort((a, b) => b.length - a.length)[0];
  if (line) fields.address.value = line.replace(/(01[0-9]{9})/, '').trim();
  toast('AI filled the fields — please review', 'info');
}

// ---------- order detail / manage ----------
function orderDetail(id) {
  const s = getState();
  const o = s.orders.find((x) => x.id === id);
  if (!o) return;

  const statusSel = select(ORDER_STATUSES, { value: o.status });
  statusSel.value = o.status;

  const courierSel = select(['— none —', ...COURIERS], {});
  courierSel.value = o.courier || '— none —';

  const note = el('textarea', { class: 'input', placeholder: 'Internal note', text: o.note });

  const verifyRow = el('div', { class: 'list-row' }, [
    el('span', {}, [el('b', { text: 'Call verification: ' }), o.verified ? el('span', { class: 'dot-ok', text: '✓ Verified' }) : el('span', { class: 'muted', text: 'Not verified' })]),
    el('span', { class: 'spacer' }),
    el('button', {
      class: 'btn soft sm', text: '📞 AI Call Verify',
      onClick: () => {
        toast('AI call placed… verifying', 'info');
        setTimeout(() => {
          update((st) => {
            const ord = st.orders.find((x) => x.id === id);
            ord.verified = true;
            if (ord.status === 'Pending') ord.status = 'Confirmed';
            logActivity(st, `AI-verified order ${ord.invoice} by call`);
          });
          toast('Order verified by AI call ✓');
          close();
          orderDetail(id);
        }, 1200);
      },
    }),
  ]);

  const body = el('div', {}, [
    el('div', { class: 'stat-inline', style: 'margin-bottom:16px' }, [
      el('div', {}, [el('span', { text: 'Invoice' }), el('strong', { text: o.invoice })]),
      el('div', {}, [el('span', { text: 'Amount' }), el('strong', { text: money(o.amount) })]),
      el('div', {}, [el('span', { text: 'Fraud risk' }), fraudBadge(o.fraudScore)]),
    ]),
    el('div', { class: 'card card-pad', style: 'margin-bottom:14px' }, [
      el('div', { class: 'cell-strong', text: o.customerName }),
      el('div', { class: 'cell-sub', text: `${o.phone} · ${o.city}` }),
      el('div', { class: 'cell-sub', text: o.address }),
      el('hr', { style: 'border:none;border-top:1px solid var(--line);margin:10px 0' }),
      ...o.items.map((i) => el('div', { class: 'list-row', style: 'padding:6px 0' }, [
        el('span', { text: `${i.name} × ${i.qty}` }), el('span', { class: 'spacer' }), el('strong', { text: money(i.qty * i.price) }),
      ])),
    ]),
    verifyRow,
    el('div', { class: 'form-row', style: 'margin-top:12px' }, [
      field('Order status', statusSel),
      field('Courier', courierSel),
    ]),
    field('Note', note),
    el('div', { class: 'form-actions' }, [
      el('button', { class: 'btn danger', text: 'Delete', onClick: () => confirmDialog('Delete this order permanently?', () => {
        update((st) => { st.orders = st.orders.filter((x) => x.id !== id); });
        toast('Order deleted'); close();
      }) }),
      el('span', { class: 'spacer' }),
      o.courier ? null : el('button', { class: 'btn soft', text: '🚚 Book Courier', onClick: () => bookCourier(id, close) }),
      el('button', {
        class: 'btn', text: 'Save changes',
        onClick: () => {
          update((st) => {
            const ord = st.orders.find((x) => x.id === id);
            ord.status = statusSel.value;
            ord.courier = courierSel.value === '— none —' ? null : courierSel.value;
            ord.note = note.value;
            if (ord.courier && !ord.trackingId) ord.trackingId = `TRK${Math.floor(100000 + Math.random() * 899999)}`;
            if (ord.status === 'Returned') {
              const cust = st.customers.find((c) => c.id === ord.customerId);
              if (cust) { cust.returns = (cust.returns || 0) + 1; cust.fraudScore = Math.min(95, cust.fraudScore + 20); }
            }
            logActivity(st, `Updated order ${ord.invoice} → ${ord.status}`);
          });
          toast('Order updated');
          close();
        },
      }),
    ]),
  ]);
  const close = modal(`Manage ${o.invoice}`, body, { wide: true });
}

function bookCourier(id, closeParent) {
  const s = getState();
  const active = s.couriers.filter((c) => c.connected);
  const sel = select(active.map((c) => ({ value: c.name, label: `${c.name} · ${c.deliveredRate}% delivered · ~${c.avgDays}d` })));
  const body = el('div', {}, [
    el('p', { class: 'help', text: 'Choose a connected courier partner to book this consignment.' }),
    field('Courier partner', sel),
    el('div', { class: 'form-actions' }, [
      el('button', { class: 'btn ghost', text: 'Cancel', onClick: () => close() }),
      el('button', {
        class: 'btn success', text: 'Confirm booking',
        onClick: () => {
          update((st) => {
            const ord = st.orders.find((x) => x.id === id);
            ord.courier = sel.value;
            ord.trackingId = `TRK${Math.floor(100000 + Math.random() * 899999)}`;
            ord.status = 'Shipped';
            logActivity(st, `Booked ${sel.value} for ${ord.invoice}`);
          });
          toast(`Booked with ${sel.value} ✓`);
          close();
          if (closeParent) closeParent();
        },
      }),
    ]),
  ]);
  const close = modal('Book courier', body);
}

function exportCsv() {
  const rows = filtered();
  const head = ['Invoice', 'Date', 'Customer', 'Phone', 'City', 'Amount', 'Source', 'Status', 'Courier'];
  const lines = [head.join(',')];
  for (const o of rows) {
    lines.push([o.invoice, new Date(o.date).toISOString().slice(0, 10), o.customerName, o.phone, o.city, o.amount, o.source, o.status, o.courier || ''].map(csv).join(','));
  }
  download('orders.csv', lines.join('\n'));
  toast(`Exported ${rows.length} orders`);
}
function csv(v) { const s = String(v ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }
function download(name, content) {
  const blob = new Blob([content], { type: 'text/csv' });
  const a = el('a', { href: URL.createObjectURL(blob), download: name });
  document.body.append(a); a.click(); a.remove();
}

export function logActivity(st, action) {
  st.team.activity.unshift({ id: uid('act'), user: 'You (Owner)', action, time: new Date().toISOString() });
  st.team.activity = st.team.activity.slice(0, 40);
}
