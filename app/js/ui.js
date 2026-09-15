// ui.js — small DOM + formatting helpers shared by every view.

export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k === 'text') node.textContent = v;
    else if (k.startsWith('on') && typeof v === 'function') {
      node.addEventListener(k.slice(2).toLowerCase(), v);
    } else if (v !== null && v !== undefined && v !== false) {
      node.setAttribute(k, v);
    }
  }
  const kids = Array.isArray(children) ? children : [children];
  for (const kid of kids) {
    if (kid == null || kid === false) continue;
    node.append(kid.nodeType ? kid : document.createTextNode(kid));
  }
  return node;
}

export function fmtDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

export function fmtDateTime(iso) {
  const d = new Date(iso);
  return d.toLocaleString('en-GB', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

export function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

const STATUS_CLASS = {
  Pending: 'st-pending', Confirmed: 'st-confirmed', Processing: 'st-processing',
  Packed: 'st-packed', Shipped: 'st-shipped', 'In Transit': 'st-transit',
  Delivered: 'st-delivered', Returned: 'st-returned', Cancelled: 'st-cancelled',
  Hold: 'st-hold',
};

export function statusBadge(status) {
  return el('span', { class: `badge ${STATUS_CLASS[status] || ''}`, text: status });
}

export function fraudBadge(score) {
  let cls = 'ok';
  let label = 'Low';
  if (score >= 60) { cls = 'high'; label = 'High'; }
  else if (score >= 35) { cls = 'mid'; label = 'Medium'; }
  return el('span', { class: `fraud-pill ${cls}`, text: `${label} (${score})` });
}

// Toast notifications
export function toast(message, type = 'success') {
  let wrap = document.querySelector('.toast-wrap');
  if (!wrap) {
    wrap = el('div', { class: 'toast-wrap' });
    document.body.append(wrap);
  }
  const t = el('div', { class: `toast toast-${type}`, text: message });
  wrap.append(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => {
    t.classList.remove('show');
    setTimeout(() => t.remove(), 300);
  }, 2600);
}

// Modal dialog. `body` is a DOM node; returns close fn.
export function modal(title, body, { wide = false } = {}) {
  const backdrop = el('div', { class: 'modal-backdrop' });
  const close = () => backdrop.remove();
  const box = el('div', { class: `modal ${wide ? 'modal-wide' : ''}` }, [
    el('div', { class: 'modal-head' }, [
      el('h3', { text: title }),
      el('button', { class: 'icon-btn', text: '✕', onClick: close }),
    ]),
    el('div', { class: 'modal-body' }, [body]),
  ]);
  backdrop.append(box);
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) close();
  });
  document.body.append(backdrop);
  return close;
}

export function confirmDialog(message, onYes) {
  const body = el('div', {}, [
    el('p', { class: 'muted', text: message }),
    el('div', { class: 'form-actions' }, [
      el('button', { class: 'btn ghost', text: 'Cancel', onClick: () => close() }),
      el('button', {
        class: 'btn danger', text: 'Confirm',
        onClick: () => { close(); onYes(); },
      }),
    ]),
  ]);
  const close = modal('Please confirm', body);
}

// Simple field builder for forms.
export function field(label, input) {
  return el('label', { class: 'field' }, [
    el('span', { class: 'field-label', text: label }),
    input,
  ]);
}

export function input(attrs = {}) {
  return el('input', { class: 'input', ...attrs });
}

export function select(options, attrs = {}) {
  const s = el('select', { class: 'input', ...attrs });
  for (const opt of options) {
    const o = typeof opt === 'string' ? { value: opt, label: opt } : opt;
    const node = el('option', { value: o.value, text: o.label });
    if (o.selected) node.selected = true;
    s.append(node);
  }
  return s;
}

export function kpiCard({ label, value, delta, deltaType = 'up', icon, accent }) {
  return el('div', { class: 'kpi-card' }, [
    el('div', { class: 'kpi-top' }, [
      el('span', { class: 'kpi-icon', style: accent ? `background:${accent}1a;color:${accent}` : '', text: icon || '' }),
      delta ? el('span', { class: `kpi-delta ${deltaType}`, text: delta }) : null,
    ]),
    el('div', { class: 'kpi-value', text: value }),
    el('div', { class: 'kpi-label', text: label }),
  ]);
}

export function emptyState(text) {
  return el('div', { class: 'empty', html: `<div class="empty-icon">📭</div><p>${text}</p>` });
}

export function sectionHead(title, subtitle, actions) {
  return el('div', { class: 'view-head' }, [
    el('div', {}, [
      el('h1', { text: title }),
      subtitle ? el('p', { class: 'view-sub', text: subtitle }) : null,
    ]),
    actions ? el('div', { class: 'view-actions' }, actions) : null,
  ]);
}
