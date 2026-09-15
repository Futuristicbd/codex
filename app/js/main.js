// main.js — app shell, sidebar navigation, hash router, role switching.
import { getState, subscribe, ROLE_PERMISSIONS } from './store.js';
import { el } from './ui.js';

import renderDashboard from './views/dashboard.js';
import renderOrders from './views/orders.js';
import renderProducts from './views/products.js';
import renderCustomers from './views/customers.js';
import renderCouriers from './views/couriers.js';
import renderLanding from './views/landing.js';
import renderAutomation from './views/automation.js';
import renderAds from './views/ads.js';
import renderAccounting from './views/accounting.js';
import renderTeam from './views/team.js';
import renderSettings from './views/settings.js';

const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊', render: renderDashboard, group: 'Overview' },
  { id: 'orders', label: 'Orders', icon: '📦', render: renderOrders, group: 'Operations' },
  { id: 'products', label: 'Products & Stock', icon: '🏷️', render: renderProducts, group: 'Operations' },
  { id: 'customers', label: 'Customers', icon: '👤', render: renderCustomers, group: 'Operations' },
  { id: 'couriers', label: 'Courier & Delivery', icon: '🚚', render: renderCouriers, group: 'Operations' },
  { id: 'landing', label: 'Landing Pages', icon: '🌐', render: renderLanding, group: 'Growth' },
  { id: 'automation', label: 'Automation', icon: '⚡', render: renderAutomation, group: 'Growth' },
  { id: 'ads', label: 'Ads Tracking', icon: '🎯', render: renderAds, group: 'Growth' },
  { id: 'accounting', label: 'Accounting', icon: '💰', render: renderAccounting, group: 'Business' },
  { id: 'team', label: 'Team & Roles', icon: '👥', render: renderTeam, group: 'Business' },
  { id: 'settings', label: 'Settings & Backup', icon: '⚙️', render: renderSettings, group: 'Business' },
];

// Current signed-in role — controls which nav items are visible.
let currentRole = 'Admin';

function allowed(id) {
  const perms = ROLE_PERMISSIONS[currentRole] || [];
  return perms.includes('*') || perms.includes(id);
}

function buildSidebar() {
  const nav = document.getElementById('sidebar-nav');
  nav.innerHTML = '';
  let lastGroup = null;
  for (const item of NAV) {
    if (!allowed(item.id)) continue;
    if (item.group !== lastGroup) {
      nav.append(el('div', { class: 'nav-group', text: item.group }));
      lastGroup = item.group;
    }
    const link = el('a', {
      class: 'nav-link', href: `#${item.id}`, 'data-nav': item.id,
    }, [
      el('span', { class: 'nav-ic', text: item.icon }),
      el('span', { text: item.label }),
    ]);
    nav.append(link);
  }
}

function setActive(id) {
  document.querySelectorAll('.nav-link').forEach((l) => {
    l.classList.toggle('active', l.getAttribute('data-nav') === id);
  });
}

function currentRoute() {
  const id = location.hash.replace('#', '') || 'dashboard';
  return NAV.find((n) => n.id === id) || NAV[0];
}

function render() {
  const route = currentRoute();
  const view = document.getElementById('view');
  if (!allowed(route.id)) {
    view.innerHTML = '<div class="empty"><div class="empty-icon">🔒</div><p>Your role does not have access to this section.</p></div>';
    return;
  }
  view.innerHTML = '';
  setActive(route.id);
  // Close mobile sidebar on navigation.
  document.body.classList.remove('sidebar-open');
  try {
    view.append(route.render());
  } catch (err) {
    console.error(err);
    view.innerHTML = `<div class="empty"><div class="empty-icon">⚠️</div><p>Failed to render this view.</p><pre style="text-align:left;font-size:12px">${err.message}</pre></div>`;
  }
  view.scrollTop = 0;
}

function bindShell() {
  // role switcher
  const roleSel = document.getElementById('role-switch');
  roleSel.value = currentRole;
  roleSel.addEventListener('change', () => {
    currentRole = roleSel.value;
    buildSidebar();
    const route = currentRoute();
    if (!allowed(route.id)) location.hash = 'dashboard';
    else render();
  });

  // mobile menu toggle
  document.getElementById('menu-toggle').addEventListener('click', () => {
    document.body.classList.toggle('sidebar-open');
  });
  document.getElementById('scrim').addEventListener('click', () => {
    document.body.classList.remove('sidebar-open');
  });

  // global search jumps to orders
  const search = document.getElementById('global-search');
  search.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && search.value.trim()) {
      sessionStorage.setItem('order_search', search.value.trim());
      location.hash = 'orders';
    }
  });

  document.getElementById('brand-name').textContent = getState().settings.businessName;
}

window.addEventListener('hashchange', render);

// Re-render the current view whenever the store changes. Modals are appended
// to <body> (not inside #view), so rebuilding #view leaves any open modal
// untouched — the freshly created record shows up behind it immediately.
subscribe(() => {
  render();
  document.getElementById('brand-name').textContent = getState().settings.businessName;
});

bindShell();
buildSidebar();
render();
