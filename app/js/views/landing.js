import { getState, update, uid, money, productById } from '../store.js';
import { el, sectionHead, toast, modal, field, input, select, confirmDialog } from '../ui.js';
import { logActivity } from './orders.js';

const TEMPLATES = ['Bold Hero', 'Minimal', 'Gradient Splash', 'Product Focus'];
const ACCENTS = ['#4f46e5', '#0ea5e9', '#16a34a', '#db2777', '#f59e0b', '#111827'];

export default function renderLanding() {
  const s = getState();
  return el('div', {}, [
    sectionHead('Landing Pages', 'Build product selling pages — no website needed. Orders flow straight into your dashboard.', [
      el('button', { class: 'btn', text: '＋ New Landing Page', onClick: () => builder() }),
    ]),
    s.landingPages.length
      ? el('div', { class: 'grid cols-3' }, s.landingPages.map((lp) => pageCard(lp)))
      : el('div', { class: 'empty', html: '<div class="empty-icon">🌐</div><p>No landing pages yet.</p>' }),
  ]);
}

function pageCard(lp) {
  const conv = lp.views ? ((lp.orders / lp.views) * 100).toFixed(1) : '0';
  return el('div', { class: 'card' }, [
    el('div', { class: 'lp-hero', style: `background:linear-gradient(135deg, ${lp.accent}, ${shade(lp.accent)})` }, [
      el('h2', { text: lp.headline }),
      el('div', { class: 'lp-price', text: money(lp.price) }),
    ]),
    el('div', { class: 'card-pad' }, [
      el('div', { style: 'display:flex;justify-content:space-between;align-items:center;margin-bottom:10px' }, [
        el('strong', { text: lp.title }),
        el('span', { class: lp.published ? 'badge st-delivered' : 'badge st-cancelled', text: lp.published ? 'Published' : 'Draft' }),
      ]),
      el('div', { class: 'muted', style: 'font-size:12px;margin-bottom:10px', text: `/${lp.slug}` }),
      el('div', { class: 'stat-inline', style: 'margin-bottom:14px' }, [
        el('div', {}, [el('span', { text: 'Views' }), el('strong', { text: String(lp.views) })]),
        el('div', {}, [el('span', { text: 'Orders' }), el('strong', { text: String(lp.orders) })]),
        el('div', {}, [el('span', { text: 'Conv.' }), el('strong', { text: `${conv}%` })]),
      ]),
      el('div', { class: 'pill-row' }, [
        el('button', { class: 'btn ghost sm', text: 'Preview', onClick: () => preview(lp) }),
        el('button', { class: 'btn ghost sm', text: 'Edit', onClick: () => builder(lp) }),
        el('button', { class: 'btn ghost sm', text: lp.published ? 'Unpublish' : 'Publish', onClick: () => {
          update((st) => { st.landingPages.find((x) => x.id === lp.id).published = !lp.published; });
          toast(lp.published ? 'Unpublished' : 'Published live ✓');
        } }),
      ]),
    ]),
  ]);
}

function builder(existing) {
  const s = getState();
  const title = input({ value: existing?.title || '', placeholder: 'Internal page title' });
  const slug = input({ value: existing?.slug || '', placeholder: 'winter-offer' });
  const prodSel = select(s.products.map((p) => ({ value: p.id, label: p.name })), {});
  if (existing) prodSel.value = existing.productId;
  const headline = input({ value: existing?.headline || '', placeholder: 'Big attention-grabbing headline' });
  const sub = el('textarea', { class: 'input', placeholder: 'Supporting sub-headline / offer details' });
  sub.value = existing?.subheadline || '';
  const price = input({ type: 'number', value: existing?.price ?? '', placeholder: '0' });
  const template = select(TEMPLATES, {});
  if (existing) template.value = existing.template;

  let accent = existing?.accent || ACCENTS[0];
  const swatches = el('div', { class: 'pill-row' }, ACCENTS.map((col) => {
    const b = el('button', { class: 'swatch', style: `width:30px;height:30px;border-radius:8px;border:2px solid ${col === accent ? '#111' : 'transparent'};background:${col};cursor:pointer` });
    b.addEventListener('click', () => { accent = col; [...swatches.children].forEach((c, i) => c.style.borderColor = ACCENTS[i] === accent ? '#111' : 'transparent'); refresh(); });
    return b;
  }));

  const previewBox = el('div', { class: 'lp-preview' });
  const refresh = () => {
    previewBox.innerHTML = '';
    previewBox.append(heroPreview({
      accent, headline: headline.value || 'Your headline here',
      subheadline: sub.value || 'Your product benefit line goes here.',
      price: +price.value || 0,
    }));
  };
  [headline, sub, price].forEach((i) => i.addEventListener('input', refresh));

  // autofill price when product changes
  prodSel.addEventListener('change', () => { const p = productById(prodSel.value); if (p && !price.value) { price.value = p.price; refresh(); } });

  const form = el('div', {}, [
    field('Page title', title),
    field('URL slug', slug),
    field('Product', prodSel),
    field('Headline', headline),
    field('Sub-headline', sub),
    el('div', { class: 'form-row' }, [field('Price', price), field('Template', template)]),
    field('Accent colour', swatches),
  ]);

  const body = el('div', { class: 'grid cols-2', style: 'gap:20px' }, [
    form,
    el('div', {}, [el('div', { class: 'field-label', style: 'margin-bottom:8px', text: 'Live preview' }), previewBox]),
  ]);
  const footer = el('div', { class: 'form-actions', style: 'margin-top:16px' }, [
    el('button', { class: 'btn ghost', text: 'Cancel', onClick: () => close() }),
    el('button', {
      class: 'btn', text: existing ? 'Save page' : 'Create page',
      onClick: () => {
        if (!title.value || !headline.value) { toast('Title and headline required', 'error'); return; }
        update((st) => {
          if (existing) {
            const lp = st.landingPages.find((x) => x.id === existing.id);
            Object.assign(lp, { title: title.value, slug: slug.value || slugify(title.value), productId: prodSel.value, headline: headline.value, subheadline: sub.value, price: +price.value || 0, template: template.value, accent });
            logActivity(st, `Edited landing page "${lp.title}"`);
          } else {
            st.landingPages.push({ id: uid('lp'), title: title.value, slug: slug.value || slugify(title.value), productId: prodSel.value, headline: headline.value, subheadline: sub.value, price: +price.value || 0, template: template.value, accent, published: false, views: 0, orders: 0 });
            logActivity(st, `Created landing page "${title.value}"`);
          }
        });
        toast(existing ? 'Landing page saved' : 'Landing page created');
        close();
      },
    }),
  ]);

  const wrap = el('div', {}, [body, footer]);
  refresh();
  const close = modal(existing ? 'Edit landing page' : 'Landing page builder', wrap, { wide: true });
}

function heroPreview({ accent, headline, subheadline, price }) {
  return el('div', {}, [
    el('div', { class: 'lp-hero', style: `background:linear-gradient(135deg, ${accent}, ${shade(accent)})` }, [
      el('h2', { text: headline }),
      el('p', { text: subheadline }),
      el('div', { class: 'lp-price', text: price ? money(price) : '' }),
      el('span', { class: 'lp-cta', text: '🛒 অর্ডার করুন (Order Now)' }),
    ]),
    el('div', { style: 'padding:16px;text-align:center' }, [
      el('div', { class: 'muted', style: 'font-size:12px', text: '✓ Cash on Delivery  ·  ✓ All over Bangladesh  ·  ✓ Easy Return' }),
    ]),
  ]);
}

function preview(lp) {
  modal(lp.title, el('div', { class: 'lp-preview' }, [heroPreview(lp)]), { wide: true });
}

function slugify(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''); }
function shade(hex) {
  // darken a hex colour for the gradient end
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, (n >> 16) - 40), g = Math.max(0, ((n >> 8) & 255) - 30), b = Math.max(0, (n & 255) - 10);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}
