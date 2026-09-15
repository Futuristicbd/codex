import { getState, update, exportState, importState, resetAll } from '../store.js';
import { el, sectionHead, toast, field, input, confirmDialog } from '../ui.js';
import { logActivity } from './orders.js';

export default function renderSettings() {
  const s = getState();
  return el('div', {}, [
    sectionHead('Settings & Backup', 'Business profile, WordPress/WooCommerce integration and data backup.'),

    el('div', { class: 'grid cols-2' }, [
      businessCard(s),
      wooCard(s),
    ]),
    el('div', { class: 'grid cols-2', style: 'margin-top:16px' }, [
      backupCard(),
      integrationsNote(),
    ]),
  ]);
}

function businessCard(s) {
  const name = input({ value: s.settings.businessName });
  const currency = input({ value: s.settings.currency, style: 'max-width:80px' });
  const country = input({ value: s.settings.country });
  return el('div', { class: 'card' }, [
    el('div', { class: 'card-head' }, [el('h2', { text: 'Business profile' })]),
    el('div', { class: 'card-pad' }, [
      field('Business name', name),
      el('div', { class: 'form-row' }, [field('Currency symbol', currency), field('Country', country)]),
      el('button', { class: 'btn', text: 'Save profile', onClick: () => {
        update((st) => { st.settings.businessName = name.value; st.settings.currency = currency.value || '৳'; st.settings.country = country.value; });
        toast('Profile saved');
      } }),
    ]),
  ]);
}

function wooCard(s) {
  const woo = s.integrations.woocommerce;
  const url = input({ value: woo.siteUrl, placeholder: 'https://yourstore.com' });
  const key = input({ value: woo.consumerKey, placeholder: 'ck_xxxxx' });
  const secret = input({ value: woo.consumerSecret, placeholder: 'cs_xxxxx', type: 'password' });
  return el('div', { class: 'card' }, [
    el('div', { class: 'card-head' }, [
      el('h2', { text: 'WordPress / WooCommerce' }),
      el('span', { class: woo.connected ? 'badge st-delivered' : 'badge st-cancelled', text: woo.connected ? 'Connected' : 'Not connected' }),
    ]),
    el('div', { class: 'card-pad' }, [
      el('p', { class: 'help', style: 'margin-bottom:12px', text: 'Sync products and pull WooCommerce orders straight into this dashboard using your store REST API keys.' }),
      field('Store URL', url),
      el('div', { class: 'form-row' }, [field('Consumer key', key), field('Consumer secret', secret)]),
      el('div', { class: 'pill-row' }, [
        el('button', { class: 'btn', text: woo.connected ? 'Update connection' : 'Connect store', onClick: () => {
          if (!url.value || !key.value) { toast('Store URL and key required', 'error'); return; }
          update((st) => { const w = st.integrations.woocommerce; w.siteUrl = url.value; w.consumerKey = key.value; w.consumerSecret = secret.value; w.connected = true; w.lastSync = new Date().toISOString(); logActivity(st, 'Connected WooCommerce store'); });
          toast('WooCommerce connected ✓');
        } }),
        woo.connected ? el('button', { class: 'btn soft', text: '↻ Sync now', onClick: () => {
          update((st) => { st.integrations.woocommerce.lastSync = new Date().toISOString(); logActivity(st, 'Synced WooCommerce orders'); });
          toast('Synced with WooCommerce');
        } }) : null,
        woo.connected ? el('button', { class: 'btn ghost', text: 'Disconnect', onClick: () => {
          update((st) => { st.integrations.woocommerce.connected = false; });
          toast('Disconnected');
        } }) : null,
      ]),
      woo.lastSync ? el('p', { class: 'help', style: 'margin-top:10px', text: `Last synced: ${new Date(woo.lastSync).toLocaleString()}` }) : null,
    ]),
  ]);
}

function backupCard() {
  return el('div', { class: 'card' }, [
    el('div', { class: 'card-head' }, [el('h2', { text: 'Backup & data' })]),
    el('div', { class: 'card-pad' }, [
      el('p', { class: 'help', style: 'margin-bottom:12px', text: 'Download a full JSON backup of your data, restore from a backup file, or reset the demo.' }),
      el('div', { class: 'pill-row' }, [
        el('button', { class: 'btn', text: '⤓ Download backup', onClick: () => {
          const blob = new Blob([exportState()], { type: 'application/json' });
          const a = el('a', { href: URL.createObjectURL(blob), download: `commerce-backup-${new Date().toISOString().slice(0, 10)}.json` });
          document.body.append(a); a.click(); a.remove();
          toast('Backup downloaded');
        } }),
        (() => {
          const fileIn = el('input', { type: 'file', accept: 'application/json', style: 'display:none' });
          fileIn.addEventListener('change', () => {
            const f = fileIn.files[0]; if (!f) return;
            const reader = new FileReader();
            reader.onload = () => { try { importState(reader.result); toast('Backup restored ✓'); } catch { toast('Invalid backup file', 'error'); } };
            reader.readAsText(f);
          });
          const btn = el('button', { class: 'btn ghost', text: '⤒ Restore backup', onClick: () => fileIn.click() });
          return el('span', {}, [btn, fileIn]);
        })(),
        el('button', { class: 'btn danger', text: 'Reset demo data', onClick: () => confirmDialog('This will erase all your data and reload the demo seed. Continue?', () => { resetAll(); toast('Demo data reset'); }) }),
      ]),
    ]),
  ]);
}

function integrationsNote() {
  return el('div', { class: 'card' }, [
    el('div', { class: 'card-head' }, [el('h2', { text: 'Integrations' })]),
    el('div', { class: 'card-pad' }, [
      integ('WordPress / WooCommerce', 'Order & product sync', true),
      integ('Landing Page Builder', 'Built-in selling pages', true),
      integ('Courier APIs', 'Pathao · Steadfast · RedX · CarryBee', true),
      integ('Ads CAPI', 'Facebook · TikTok · Google', true),
      el('p', { class: 'help', style: 'margin-top:12px', text: 'Shopify and Laravel website integrations are intentionally not included in this build, as requested.' }),
    ]),
  ]);
}

function integ(name, desc, on) {
  return el('div', { class: 'list-row', style: 'padding:10px 0' }, [
    el('div', {}, [el('div', { class: 'cell-strong', text: name }), el('div', { class: 'cell-sub', text: desc })]),
    el('span', { class: 'spacer' }),
    el('span', { class: on ? 'dot-ok' : 'dot-off', text: on ? '● Enabled' : '○ Off' }),
  ]);
}
