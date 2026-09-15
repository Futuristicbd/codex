// Landing page — render the full feature chip list and light scroll reveal.
const MODULES = [
  'Smart Order Status', 'Manual Order Entry', 'WooCommerce / WordPress Sync',
  'AI Auto-Fill', 'Duplicate & Fraud Check', 'AI Call Verification',
  'Pathao', 'Steadfast', 'RedX', 'CarryBee', 'Courier Tracking',
  'Landing Page Builder', 'Product & Stock Management', 'Low Stock Alert',
  'Scan to Return', 'Barcode / QR Support', 'Customer Management',
  'SMS Automation', 'AI Chat Automation', 'Webhook',
  'Facebook CAPI', 'TikTok CAPI', 'Google Server-Side Tracking',
  'Pixel & Conversion Events', 'Ads Spend Management', 'Web Order Report',
  'Sales & Revenue', 'Profit & Accounting', 'Inventory', 'Packaging',
  'Return Analysis', 'Courier Performance', 'Team Management',
  'Role & Permission', 'Activity Log', 'Backup & Settings', 'Analytics Dashboard',
];

const chips = document.getElementById('module-chips');
if (chips) {
  for (const m of MODULES) {
    const c = document.createElement('span');
    c.className = 'chip';
    c.textContent = m;
    chips.append(c);
  }
}

// Fade sections in on scroll.
const io = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (e.isIntersecting) {
      e.target.style.opacity = '1';
      e.target.style.transform = 'none';
      io.unobserve(e.target);
    }
  }
}, { threshold: 0.08 });

document.querySelectorAll('.feature-card, .problem, .price-card, .chip').forEach((node, i) => {
  node.style.opacity = '0';
  node.style.transform = 'translateY(16px)';
  node.style.transition = `opacity .5s ease ${(i % 8) * 0.04}s, transform .5s ease ${(i % 8) * 0.04}s`;
  io.observe(node);
});
