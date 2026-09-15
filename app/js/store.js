// store.js — central state, persistence (localStorage) and seed data.
// The whole dashboard reads/writes through this module so a real backend
// can later replace the localStorage layer without touching the views.

const KEY = 'commerce_os_state_v1';

export const ORDER_STATUSES = [
  'Pending',
  'Confirmed',
  'Processing',
  'Packed',
  'Shipped',
  'In Transit',
  'Delivered',
  'Returned',
  'Cancelled',
  'Hold',
];

export const COURIERS = ['Pathao', 'Steadfast', 'RedX', 'CarryBee'];

// Declared before state load: seed() calls uid() during module init, so
// `counter` must be initialized first (avoids a temporal-dead-zone error).
let counter = Date.now();
export function uid(prefix = 'id') {
  counter += 1;
  return `${prefix}_${counter.toString(36)}`;
}

const listeners = new Set();

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function emit() {
  for (const fn of listeners) fn(state);
}

let state = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.warn('Could not read saved state, seeding fresh.', err);
  }
  const seeded = seed();
  persist(seeded);
  return seeded;
}

function persist(next) {
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch (err) {
    console.warn('Could not persist state.', err);
  }
}

export function getState() {
  return state;
}

// Apply a mutation function to state, persist and notify listeners.
export function update(mutator) {
  mutator(state);
  persist(state);
  emit();
}

export function resetAll() {
  state = seed();
  persist(state);
  emit();
}

export function exportState() {
  return JSON.stringify(state, null, 2);
}

export function importState(json) {
  const parsed = JSON.parse(json);
  state = parsed;
  persist(state);
  emit();
}

// ---------- derived selectors ----------

export function activeCurrency() {
  return state.settings.currency || '৳';
}

export function money(n) {
  const v = Number(n || 0);
  return `${activeCurrency()}${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

export function orderTotal(order) {
  return order.items.reduce((sum, it) => sum + it.qty * it.price, 0);
}

export function productById(id) {
  return state.products.find((p) => p.id === id);
}

// Business metrics used by the dashboard + accounting views.
export function metrics() {
  const orders = state.orders;
  const delivered = orders.filter((o) => o.status === 'Delivered');
  const returned = orders.filter((o) => o.status === 'Returned');
  const pending = orders.filter((o) =>
    ['Pending', 'Confirmed', 'Processing', 'Packed'].includes(o.status),
  );
  const revenue = delivered.reduce((s, o) => s + o.amount, 0);
  const cogs = delivered.reduce((s, o) => s + estimateCost(o), 0);
  const expenses = state.expenses.reduce((s, e) => s + e.amount, 0);
  const adSpend = state.ads.spend.reduce((s, e) => s + e.amount, 0);
  const grossProfit = revenue - cogs;
  const netProfit = grossProfit - expenses - adSpend;
  const deliveryRate = orders.length
    ? Math.round((delivered.length / orders.length) * 100)
    : 0;
  const returnRate = orders.length
    ? Math.round((returned.length / orders.length) * 100)
    : 0;
  return {
    totalOrders: orders.length,
    revenue,
    cogs,
    expenses,
    adSpend,
    grossProfit,
    netProfit,
    deliveredCount: delivered.length,
    returnedCount: returned.length,
    pendingCount: pending.length,
    deliveryRate,
    returnRate,
    roas: adSpend ? +(revenue / adSpend).toFixed(2) : 0,
  };
}

export function estimateCost(order) {
  return order.items.reduce((s, it) => {
    const p = productById(it.productId);
    const cost = p ? p.cost : it.price * 0.6;
    return s + cost * it.qty;
  }, 0);
}

export function lowStockProducts() {
  return state.products.filter((p) => p.stock <= p.lowStock);
}

// ---------- seed data ----------

function seed() {
  const products = [
    p('Premium Cotton Panjabi', 'PNJ-001', 1450, 780, 42, 10, 'Fashion'),
    p('Attar Oud Perfume 12ml', 'ATR-012', 950, 420, 8, 12, 'Beauty'),
    p('Wireless Earbuds Pro', 'EAR-220', 1690, 1050, 63, 15, 'Gadget'),
    p('Kids Winter Jacket', 'KID-088', 1250, 640, 5, 8, 'Fashion'),
    p('Organic Honey 500g', 'HNY-500', 720, 380, 120, 20, 'Grocery'),
    p('Ceramic Tea Set', 'TEA-330', 2200, 1300, 3, 6, 'Home'),
    p('Smart Watch S9', 'WAT-009', 2450, 1550, 28, 10, 'Gadget'),
    p('Herbal Face Wash', 'FAC-045', 420, 190, 210, 25, 'Beauty'),
  ];

  const customers = [
    c('Rahim Uddin', '01711000001', 'Mirpur 10, Dhaka', 'Dhaka'),
    c('Sadia Islam', '01822000002', 'Nasirabad, Chittagong', 'Chittagong'),
    c('Tanvir Hasan', '01933000003', 'Zindabazar, Sylhet', 'Sylhet'),
    c('Nusrat Jahan', '01644000004', 'Uttara Sector 7, Dhaka', 'Dhaka'),
    c('Mamun Chowdhury', '01555000005', 'Rajshahi Sadar', 'Rajshahi'),
    c('Farhana Akter', '01366000006', 'Khulna New Market', 'Khulna'),
  ];
  // Mark one repeat-return customer as risky.
  customers[4].returns = 3;
  customers[4].fraudScore = 72;

  const now = Date.now();
  const day = 86400000;
  const sources = ['manual', 'woocommerce', 'landing'];
  const statuses = [
    'Delivered', 'Delivered', 'Delivered', 'In Transit', 'Shipped',
    'Confirmed', 'Pending', 'Returned', 'Delivered', 'Processing',
    'Delivered', 'Packed', 'Delivered', 'Cancelled', 'Confirmed',
  ];
  const orders = statuses.map((status, i) => {
    const cust = customers[i % customers.length];
    const prod = products[i % products.length];
    const qty = (i % 3) + 1;
    const item = { productId: prod.id, name: prod.name, qty, price: prod.price };
    const order = {
      id: uid('ord'),
      invoice: `INV-${(1024 + i).toString()}`,
      date: new Date(now - (i % 14) * day - (i * 3600000)).toISOString(),
      customerId: cust.id,
      customerName: cust.name,
      phone: cust.phone,
      address: cust.address,
      city: cust.city,
      items: [item],
      amount: qty * prod.price,
      source: sources[i % sources.length],
      status,
      courier: ['Delivered', 'In Transit', 'Shipped'].includes(status)
        ? COURIERS[i % COURIERS.length]
        : null,
      trackingId: ['Delivered', 'In Transit', 'Shipped'].includes(status)
        ? `TRK${100200 + i}`
        : null,
      fraudScore: cust.fraudScore || (i % 5 === 0 ? 48 : 12),
      verified: status !== 'Pending',
      note: '',
    };
    return order;
  });

  const spend = [
    { id: uid('ad'), platform: 'Facebook', campaign: 'Winter Panjabi', amount: 4200, date: iso(now - day), conversions: 14 },
    { id: uid('ad'), platform: 'TikTok', campaign: 'Earbuds Reels', amount: 2600, date: iso(now - 2 * day), conversions: 9 },
    { id: uid('ad'), platform: 'Google', campaign: 'Smart Watch Search', amount: 3100, date: iso(now - 3 * day), conversions: 7 },
  ];

  return {
    settings: {
      businessName: 'My Commerce Store',
      currency: '৳',
      country: 'Bangladesh',
      timezone: 'Asia/Dhaka',
      logo: '',
    },
    integrations: {
      woocommerce: { connected: false, siteUrl: '', consumerKey: '', consumerSecret: '', lastSync: null },
    },
    products,
    customers,
    orders,
    couriers: COURIERS.map((name) => ({
      name,
      connected: name === 'Pathao' || name === 'Steadfast',
      apiKey: name === 'Pathao' || name === 'Steadfast' ? 'demo-key-****' : '',
      deliveredRate: { Pathao: 92, Steadfast: 89, RedX: 84, CarryBee: 81 }[name],
      avgDays: { Pathao: 1.8, Steadfast: 2.1, RedX: 2.6, CarryBee: 2.9 }[name],
    })),
    landingPages: [
      {
        id: uid('lp'),
        title: 'Winter Panjabi Offer',
        slug: 'winter-panjabi',
        productId: products[0].id,
        headline: 'Premium Cotton Panjabi — Winter Special',
        subheadline: 'Soft, breathable, premium finish. Cash on delivery all over Bangladesh.',
        price: 1450,
        template: 'Bold Hero',
        accent: '#4f46e5',
        published: true,
        views: 1840,
        orders: 63,
      },
      {
        id: uid('lp'),
        title: 'Earbuds Pro Deal',
        slug: 'earbuds-pro',
        productId: products[2].id,
        headline: 'Wireless Earbuds Pro',
        subheadline: 'Crystal sound, 30h battery. Limited launch price!',
        price: 1690,
        template: 'Minimal',
        accent: '#0ea5e9',
        published: false,
        views: 420,
        orders: 11,
      },
    ],
    automations: [
      { id: uid('auto'), type: 'sms', name: 'Order Confirmed SMS', trigger: 'Status: Confirmed', action: 'Send confirmation SMS with invoice', enabled: true, runs: 214 },
      { id: uid('auto'), type: 'sms', name: 'Delivery Follow-up', trigger: 'Status: Delivered', action: 'Send thank-you + review request SMS', enabled: true, runs: 96 },
      { id: uid('auto'), type: 'chat', name: 'AI Order Auto-Reply', trigger: 'New Facebook/WhatsApp message', action: 'AI replies with price + collects address', enabled: true, runs: 512 },
      { id: uid('auto'), type: 'webhook', name: 'Push to Google Sheet', trigger: 'New order created', action: 'POST order JSON to webhook URL', enabled: false, runs: 0 },
    ],
    ads: {
      pixels: [
        { id: uid('px'), platform: 'Facebook', pixelId: '1093xxxxxx', capi: true, status: 'Active' },
        { id: uid('px'), platform: 'TikTok', pixelId: 'C9Axxxxxx', capi: true, status: 'Active' },
        { id: uid('px'), platform: 'Google', pixelId: 'AW-77xxxxxx', capi: false, status: 'Needs setup' },
      ],
      spend,
    },
    expenses: [
      { id: uid('exp'), title: 'Office rent', category: 'Fixed', amount: 12000, date: iso(now - 5 * day) },
      { id: uid('exp'), title: 'Packaging materials', category: 'Packaging', amount: 3400, date: iso(now - 2 * day) },
      { id: uid('exp'), title: 'Staff salary (part-time)', category: 'Salary', amount: 8000, date: iso(now - 6 * day) },
    ],
    team: {
      users: [
        { id: uid('usr'), name: 'You (Owner)', email: 'owner@store.com', role: 'Admin', active: true },
        { id: uid('usr'), name: 'Ariful (Ops)', email: 'ariful@store.com', role: 'Moderator', active: true },
        { id: uid('usr'), name: 'Mitu (Support)', email: 'mitu@store.com', role: 'Support', active: true },
      ],
      activity: [
        { id: uid('act'), user: 'Ariful (Ops)', action: 'Booked courier for INV-1029', time: iso(now - 3600000) },
        { id: uid('act'), user: 'Mitu (Support)', action: 'Verified order INV-1031 by call', time: iso(now - 7200000) },
        { id: uid('act'), user: 'You (Owner)', action: 'Added product "Smart Watch S9"', time: iso(now - 2 * day) },
      ],
    },
  };
}

function p(name, sku, price, cost, stock, lowStock, category) {
  return {
    id: uid('prd'),
    name,
    sku,
    price,
    cost,
    stock,
    lowStock,
    category,
    barcode: sku.replace(/-/g, ''),
  };
}

function c(name, phone, address, city) {
  return { id: uid('cus'), name, phone, address, city, returns: 0, fraudScore: 10 };
}

function iso(ms) {
  return new Date(ms).toISOString();
}

// Roles → allowed nav sections (permission model).
export const ROLE_PERMISSIONS = {
  Admin: ['*'],
  Moderator: ['dashboard', 'orders', 'products', 'customers', 'couriers', 'landing', 'automation', 'accounting'],
  Support: ['dashboard', 'orders', 'customers'],
};
