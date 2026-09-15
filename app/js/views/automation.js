import { getState, update, uid } from '../store.js';
import { el, sectionHead, toast, modal, field, input, select } from '../ui.js';
import { logActivity } from './orders.js';

const TYPE_META = {
  sms: { icon: '💬', label: 'SMS Automation', color: '#0ea5e9' },
  chat: { icon: '🤖', label: 'AI Chat', color: '#7c3aed' },
  webhook: { icon: '🔗', label: 'Webhook', color: '#16a34a' },
};

export default function renderAutomation() {
  const s = getState();
  const byType = (t) => s.automations.filter((a) => a.type === t);

  return el('div', {}, [
    sectionHead('Automation', 'SMS, AI chat replies and webhooks that run your repetitive work automatically.', [
      el('button', { class: 'btn', text: '＋ New Automation', onClick: () => form() }),
    ]),
    el('div', { class: 'grid cols-3', style: 'margin-bottom:18px' }, Object.keys(TYPE_META).map((t) => summary(t, byType(t)))),
    el('div', { class: 'card' }, [
      el('div', { class: 'card-head' }, [el('h2', { text: 'All automations' })]),
      el('div', {}, s.automations.map((a) => row(a))),
    ]),
  ]);
}

function summary(type, list) {
  const m = TYPE_META[type];
  const runs = list.reduce((a, x) => a + x.runs, 0);
  return el('div', { class: 'card card-pad' }, [
    el('div', { style: 'display:flex;gap:12px;align-items:center' }, [
      el('span', { class: 'kpi-icon', style: `background:${m.color}1a;color:${m.color}`, text: m.icon }),
      el('div', {}, [el('strong', { text: m.label }), el('div', { class: 'muted', style: 'font-size:12px', text: `${list.filter((x) => x.enabled).length} active` })]),
    ]),
    el('div', { style: 'margin-top:12px', class: 'muted' }, [el('span', { text: `${runs.toLocaleString()} times run this month` })]),
  ]);
}

function row(a) {
  const m = TYPE_META[a.type];
  const toggle = el('label', { class: 'switch' }, [
    (() => { const i = el('input', { type: 'checkbox' }); i.checked = a.enabled; i.addEventListener('change', () => {
      update((st) => { const au = st.automations.find((x) => x.id === a.id); au.enabled = i.checked; });
      toast(i.checked ? 'Automation enabled' : 'Automation paused');
    }); return i; })(),
    el('span', { class: 'slider' }),
  ]);
  return el('div', { class: 'list-row', style: 'padding:14px 18px' }, [
    el('span', { class: 'kpi-icon', style: `width:36px;height:36px;font-size:16px;background:${m.color}1a;color:${m.color}`, text: m.icon }),
    el('div', {}, [
      el('div', { class: 'cell-strong', text: a.name }),
      el('div', { class: 'cell-sub', text: `When ${a.trigger} → ${a.action}` }),
    ]),
    el('span', { class: 'spacer' }),
    el('span', { class: 'tag', style: 'margin-right:10px', text: `${a.runs} runs` }),
    toggle,
    el('button', { class: 'icon-btn', text: '🗑', style: 'margin-left:6px', onClick: () => {
      update((st) => { st.automations = st.automations.filter((x) => x.id !== a.id); });
      toast('Automation removed');
    } }),
  ]);
}

function form() {
  const type = select([
    { value: 'sms', label: '💬 SMS Automation' },
    { value: 'chat', label: '🤖 AI Chat Reply' },
    { value: 'webhook', label: '🔗 Webhook' },
  ], {});
  const name = input({ placeholder: 'Automation name' });
  const trigger = select([
    'New order created', 'Status: Confirmed', 'Status: Shipped', 'Status: Delivered',
    'Status: Returned', 'New Facebook/WhatsApp message', 'Abandoned checkout',
  ], {});
  const action = el('textarea', { class: 'input', placeholder: 'What should happen? e.g. Send SMS with tracking link' });
  const urlField = field('Webhook URL', input({ placeholder: 'https://…' }));
  urlField.style.display = 'none';
  type.addEventListener('change', () => { urlField.style.display = type.value === 'webhook' ? '' : 'none'; });

  const body = el('div', {}, [
    field('Type', type),
    field('Name', name),
    field('Trigger (when…)', trigger),
    field('Action (then…)', action),
    urlField,
    el('div', { class: 'form-actions' }, [
      el('button', { class: 'btn ghost', text: 'Cancel', onClick: () => close() }),
      el('button', { class: 'btn', text: 'Create', onClick: () => {
        if (!name.value) { toast('Name required', 'error'); return; }
        update((st) => {
          st.automations.push({ id: uid('auto'), type: type.value, name: name.value, trigger: trigger.value, action: action.value || 'Custom action', enabled: true, runs: 0 });
          logActivity(st, `Created automation "${name.value}"`);
        });
        toast('Automation created ✓'); close();
      } }),
    ]),
  ]);
  const close = modal('New automation', body);
}
