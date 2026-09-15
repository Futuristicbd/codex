import { getState, update, uid, money } from '../store.js';
import { el, sectionHead, toast, modal, field, input, select, confirmDialog } from '../ui.js';
import { logActivity } from './orders.js';

export default function renderProducts() {
  const s = getState();
  const low = s.products.filter((p) => p.stock <= p.lowStock).length;

  const wrap = el('div', {}, [
    sectionHead('Products & Stock', 'Manage inventory, pricing, low-stock alerts and barcodes.', [
      el('button', { class: 'btn ghost', text: '📷 Scan to Return', onClick: () => scanReturn() }),
      el('button', { class: 'btn', text: '＋ Add Product', onClick: () => productForm() }),
    ]),
    el('div', { class: 'grid cols-3', style: 'margin-bottom:16px' }, [
      miniStat('Total products', String(s.products.length), '🏷️'),
      miniStat('Stock value', money(s.products.reduce((a, p) => a + p.stock * p.cost, 0)), '📦'),
      miniStat('Low-stock items', String(low), '⚠️', low ? 'var(--red)' : 'var(--green)'),
    ]),
    el('div', { class: 'card' }, [el('div', { class: 'table-wrap' }, [table(s)])]),
  ]);
  return wrap;
}

function miniStat(label, value, icon, color) {
  return el('div', { class: 'card card-pad', style: 'display:flex;gap:12px;align-items:center' }, [
    el('span', { class: 'kpi-icon', style: color ? `background:${color}1a;color:${color}` : '', text: icon }),
    el('div', {}, [el('div', { class: 'kpi-value', style: 'font-size:20px', text: value }), el('div', { class: 'kpi-label', text: label })]),
  ]);
}

function table(s) {
  const t = el('table', { class: 'tbl' }, [
    el('thead', {}, el('tr', {}, [
      el('th', { text: 'Product' }), el('th', { text: 'SKU / Barcode' }), el('th', { text: 'Category' }),
      el('th', { text: 'Cost', class: 'num' }), el('th', { text: 'Price', class: 'num' }),
      el('th', { text: 'Stock', class: 'num' }), el('th', { text: '' }),
    ])),
  ]);
  const tb = el('tbody');
  for (const p of s.products) {
    const lowFlag = p.stock <= p.lowStock;
    tb.append(el('tr', {}, [
      el('td', { class: 'cell-strong', text: p.name }),
      el('td', {}, [el('div', { class: 'cell-sub', text: p.sku }), el('div', { class: 'cell-sub', style: 'font-family:monospace;letter-spacing:1px', text: `▐║▌│ ${p.barcode}` })]),
      el('td', {}, [el('span', { class: 'tag', text: p.category })]),
      el('td', { class: 'num cell-sub', text: money(p.cost) }),
      el('td', { class: 'num cell-strong', text: money(p.price) }),
      el('td', { class: 'num' }, [el('span', { class: lowFlag ? 'badge st-pending' : 'cell-strong', text: `${p.stock}${lowFlag ? ' ⚠' : ''}` })]),
      el('td', {}, [
        el('button', { class: 'btn ghost sm', text: 'Barcode', onClick: () => showBarcode(p) }),
        el('button', { class: 'btn ghost sm', text: 'Edit', style: 'margin-left:6px', onClick: () => productForm(p) }),
      ]),
    ]));
  }
  t.append(tb);
  return t;
}

function productForm(existing) {
  const name = input({ value: existing?.name || '', placeholder: 'Product name' });
  const sku = input({ value: existing?.sku || '', placeholder: 'SKU-001' });
  const category = select(['Fashion', 'Beauty', 'Gadget', 'Grocery', 'Home', 'Other'], {});
  if (existing) category.value = existing.category;
  const cost = input({ type: 'number', value: existing?.cost ?? '', placeholder: '0' });
  const price = input({ type: 'number', value: existing?.price ?? '', placeholder: '0' });
  const stock = input({ type: 'number', value: existing?.stock ?? '', placeholder: '0' });
  const lowStock = input({ type: 'number', value: existing?.lowStock ?? 10, placeholder: '10' });

  const body = el('div', {}, [
    field('Product name', name),
    el('div', { class: 'form-row' }, [field('SKU', sku), field('Category', category)]),
    el('div', { class: 'form-row' }, [field('Buy cost', cost), field('Sell price', price)]),
    el('div', { class: 'form-row' }, [field('Stock quantity', stock), field('Low-stock alert at', lowStock)]),
    el('div', { class: 'form-actions' }, [
      el('button', { class: 'btn ghost', text: 'Cancel', onClick: () => close() }),
      el('button', {
        class: 'btn', text: existing ? 'Save' : 'Add product',
        onClick: () => {
          if (!name.value) { toast('Name is required', 'error'); return; }
          update((st) => {
            if (existing) {
              const p = st.products.find((x) => x.id === existing.id);
              Object.assign(p, {
                name: name.value, sku: sku.value, category: category.value,
                cost: +cost.value || 0, price: +price.value || 0,
                stock: +stock.value || 0, lowStock: +lowStock.value || 10,
                barcode: sku.value.replace(/-/g, ''),
              });
              logActivity(st, `Edited product "${p.name}"`);
            } else {
              st.products.push({
                id: uid('prd'), name: name.value, sku: sku.value || `SKU-${st.products.length + 1}`,
                category: category.value, cost: +cost.value || 0, price: +price.value || 0,
                stock: +stock.value || 0, lowStock: +lowStock.value || 10,
                barcode: (sku.value || `SKU${st.products.length + 1}`).replace(/-/g, ''),
              });
              logActivity(st, `Added product "${name.value}"`);
            }
          });
          toast(existing ? 'Product saved' : 'Product added');
          close();
        },
      }),
    ]),
  ]);
  const close = modal(existing ? 'Edit product' : 'Add product', body);
}

// Simple visual barcode + QR-like block (decorative, print-ready style).
function showBarcode(p) {
  const bars = [...p.barcode].map((ch) => {
    const w = 1 + (ch.charCodeAt(0) % 4);
    return `<span style="display:inline-block;width:${w}px;height:70px;background:#111;margin-right:${1 + (ch.charCodeAt(0) % 2)}px"></span>`;
  }).join('');
  const body = el('div', { style: 'text-align:center' }, [
    el('h3', { text: p.name, style: 'margin-bottom:4px' }),
    el('div', { class: 'muted', style: 'margin-bottom:16px', text: `${p.sku} · ${money(p.price)}` }),
    el('div', { style: 'background:#fff;padding:18px;border:1px solid var(--line);border-radius:12px;display:inline-block' }, [
      el('div', { html: bars }),
      el('div', { style: 'font-family:monospace;letter-spacing:4px;margin-top:8px', text: p.barcode }),
    ]),
    el('p', { class: 'help', text: 'Print and stick on the parcel — scan on return to auto-match the order.' }),
    el('div', { class: 'form-actions', style: 'justify-content:center' }, [
      el('button', { class: 'btn ghost', text: 'Print', onClick: () => window.print() }),
      el('button', { class: 'btn', text: 'Close', onClick: () => close() }),
    ]),
  ]);
  const close = modal('Barcode / QR', body);
}

function scanReturn() {
  const s = getState();
  const codeIn = input({ placeholder: 'Scan or type barcode / tracking ID' });
  const result = el('div', { style: 'margin-top:12px' });
  const body = el('div', {}, [
    el('p', { class: 'help', text: 'Simulate a handheld scanner: enter a product barcode or an order tracking ID to process a return.' }),
    field('Scan code', codeIn),
    result,
    el('div', { class: 'form-actions' }, [
      el('button', { class: 'btn ghost', text: 'Close', onClick: () => close() }),
      el('button', {
        class: 'btn', text: '🔍 Match',
        onClick: () => {
          const code = codeIn.value.trim();
          const prod = s.products.find((p) => p.barcode === code || p.sku === code);
          const ord = s.orders.find((o) => o.trackingId === code);
          result.innerHTML = '';
          if (ord) {
            result.append(el('div', { class: 'card card-pad' }, [
              el('div', { class: 'cell-strong', text: `Matched order ${ord.invoice}` }),
              el('div', { class: 'cell-sub', text: `${ord.customerName} · ${money(ord.amount)}` }),
              el('button', { class: 'btn danger sm', style: 'margin-top:10px', text: 'Mark as Returned + restock', onClick: () => {
                update((st) => {
                  const o = st.orders.find((x) => x.id === ord.id);
                  o.status = 'Returned';
                  for (const it of o.items) { const pr = st.products.find((p) => p.id === it.productId); if (pr) pr.stock += it.qty; }
                  logActivity(st, `Scan-return processed for ${o.invoice}`);
                });
                toast('Return processed & stock restored');
                close();
              } }),
            ]));
          } else if (prod) {
            result.append(el('div', { class: 'card card-pad' }, [
              el('div', { class: 'cell-strong', text: prod.name }),
              el('div', { class: 'cell-sub', text: `Current stock: ${prod.stock}` }),
              el('button', { class: 'btn success sm', style: 'margin-top:10px', text: '+1 to stock (return)', onClick: () => {
                update((st) => { st.products.find((p) => p.id === prod.id).stock += 1; });
                toast('Stock +1');
              } }),
            ]));
          } else {
            result.append(el('p', { class: 'muted', text: 'No matching product or order found.' }));
          }
        },
      }),
    ]),
  ]);
  const close = modal('Scan to Return', body);
}
