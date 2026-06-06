const services = [
  {
    step: '01',
    title: 'AI Ads & Commercials',
    copy: 'Launch brand films, paid social hooks, and product-led commercials with generative scenes, kinetic edits, and conversion-ready cutdowns.',
    tags: ['Paid media', 'Concept films', 'Launch ads'],
    metric: '7x',
    metricLabel: 'more creative variants',
  },
  {
    step: '02',
    title: 'UGC & Social Video',
    copy: 'Synthetic presenters, creator-style scripts, scroll-stopping captions, and platform-first outputs for TikTok, Reels, Shorts, and marketplaces.',
    tags: ['UGC scripts', 'Avatars', 'Shorts'],
    metric: '48h',
    metricLabel: 'prototype turnaround',
  },
  {
    step: '03',
    title: 'Product Video Systems',
    copy: 'Turn your catalog into cinematic PDP clips, lifestyle loops, explainer shots, and visual stories without booking a studio for every SKU.',
    tags: ['PDP loops', 'Lifestyle', 'Ecommerce'],
    metric: '120+',
    metricLabel: 'assets per sprint',
  },
  {
    step: '04',
    title: 'Documentary & Story Films',
    copy: 'Blend archival direction, AI-enhanced visuals, voice workflows, and editorial craft into documentary-style narratives for modern brands.',
    tags: ['Story arcs', 'Editorial', 'Brand docs'],
    metric: '4K',
    metricLabel: 'cinematic delivery',
  },
];

const proofPoints = [
  ['Strategy', 'AI video roadmap, audience hooks, channel matrix'],
  ['Pre‑visualization', 'Mood films, scriptboards, synthetic tests'],
  ['Production', 'Generative footage, AI avatars, product worlds'],
  ['Post & Launch', 'Edit, sound, captions, ad variants, localization'],
];

const deliverables = ['AI ADS', 'UGC VIDEO', 'PRODUCT FILMS', 'DOCUMENTARIES', 'AVATARS', 'SOCIAL CUTDOWNS', '3D WORLDS'];

function tagList(tags) {
  return tags.map((tag) => `<span>${tag}</span>`).join('');
}

function signalBars() {
  return Array.from({ length: 34 }, (_, index) => {
    const height = 32 + ((index * 19) % 68);
    return `<span style="--bar-delay:${index * 0.045}s;--bar-height:${height}%"></span>`;
  }).join('');
}

function cinematicFrame() {
  return `
    <div class="frame-shell">
      <div class="hud hud-top"><span>LIVE GEN‑AI RENDER</span><span>NEURAL TIMELINE 04:12</span></div>
      <div class="video-frame">
        <div class="synthetic-scene">
          <div class="orb orb-a"></div><div class="orb orb-b"></div><div class="orb orb-c"></div>
          <div class="scanline"></div>
          <div class="product-pedestal"><span class="product-core"></span><span class="product-glow"></span></div>
          <div class="timeline-card card-one"><strong>UGC</strong><span>Voice + avatar synced</span></div>
          <div class="timeline-card card-two"><strong>AD</strong><span>12 hooks generating</span></div>
          <div class="timeline-card card-three"><strong>DOC</strong><span>Archive upscale pass</span></div>
        </div>
      </div>
      <div class="hud hud-bottom"><span>BRAND DATA LOCKED</span><span>EXPORT: 9:16 • 1:1 • 16:9</span></div>
    </div>`;
}

function serviceScene(item, index) {
  return `
    <article class="scene-card">
      <div class="scene-index">${item.step}</div>
      <div class="scene-copy">
        <p class="eyebrow">Production module</p>
        <h3>${item.title}</h3>
        <p>${item.copy}</p>
        <div class="tag-row">${tagList(item.tags)}</div>
      </div>
      <div class="scene-visual scene-visual-${index + 1}">
        <div class="metric-orbit"><strong>${item.metric}</strong><span>${item.metricLabel}</span></div>
      </div>
    </article>`;
}

function renderApp() {
  document.querySelector('#root').innerHTML = `
    <main>
      <div class="progress-rail" aria-hidden="true"><span></span></div>
      <section class="hero section-panel">
        <nav class="nav-bar" aria-label="Primary navigation">
          <a class="brand" href="https://futuristicbd.com/" aria-label="Futuristic BD home"><span>F</span> FuturisticBD</a>
          <div class="nav-links"><a href="#services">Services</a><a href="#workflow">Workflow</a><a href="#contact">Start a film</a></div>
        </nav>
        <div class="hero-grid">
          <div class="hero-copy">
            <p class="eyebrow">AI video marketing studio</p>
            <h1>Scroll into the future of <span>AI video production.</span></h1>
            <p class="hero-lede">We create cinematic AI ads, UGC campaigns, product videos, documentaries, and always-on video systems that move from idea to launch at machine speed.</p>
            <div class="cta-row"><a class="button button-primary" href="#contact">Build my video engine</a><a class="button button-secondary" href="#services">Explore capabilities</a></div>
            <div class="hero-stats" aria-label="Production highlights"><span><strong>24/7</strong> synthetic content lab</span><span><strong>4K</strong> AI-enhanced delivery</span><span><strong>10+</strong> campaign formats</span></div>
          </div>
          ${cinematicFrame()}
        </div>
        <div class="signal-bars" aria-hidden="true">${signalBars()}</div>
      </section>
      <section class="sticky-story" id="services">
        <div class="sticky-copy"><p class="eyebrow">Scroll‑choreographed production stack</p><h2>One AI video pipeline. Every marketing format.</h2><p>Inspired by high-impact generative visual systems, this landing page moves through strategy, scene generation, creative review, and final export like a cinematic production timeline.</p></div>
        <div class="scene-stack">${services.map(serviceScene).join('')}</div>
      </section>
      <section class="workflow section-panel" id="workflow">
        <div class="section-heading"><p class="eyebrow">From prompt to performance</p><h2>Human creative direction, AI production velocity.</h2></div>
        <div class="workflow-grid">${proofPoints.map(([title, copy], index) => `<div class="workflow-card"><span>${String(index + 1).padStart(2, '0')}</span><h3>${title}</h3><p>${copy}</p></div>`).join('')}</div>
      </section>
      <section class="marquee-section" aria-label="AI video deliverables"><div class="marquee-track">${[...deliverables, ...deliverables].map((item) => `<span>${item}</span>`).join('')}</div></section>
      <section class="contact section-panel" id="contact"><div><p class="eyebrow">Ready for launch</p><h2>Give your brand a video production system that never stops generating.</h2><p>Tell us your product, audience, and objective. We’ll map the scripts, scenes, AI workflows, and deliverables for an ad-ready video sprint.</p></div><a class="button button-primary" href="mailto:hello@futuristicbd.com?subject=AI%20Video%20Production%20Sprint">Start the sprint</a></section>
    </main>`;
}

function updateProgress() {
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
  const progress = maxScroll <= 0 ? 0 : Math.min(1, Math.max(0, window.scrollY / maxScroll));
  document.documentElement.style.setProperty('--scroll-progress', progress.toFixed(4));
  document.querySelector('.progress-rail span')?.style.setProperty('transform', `scaleY(${progress})`);
  document.querySelector('.frame-shell')?.style.setProperty('--frame-shift', `${progress * 36}px`);
  document.querySelectorAll('.signal-bars span').forEach((bar) => {
    bar.style.opacity = 0.18 + progress * 0.65;
  });
}

function observeScenes() {
  const observer = new IntersectionObserver(
    (entries) => entries.forEach((entry) => entry.target.classList.toggle('is-visible', entry.isIntersecting)),
    { threshold: 0.28 },
  );
  document.querySelectorAll('.scene-card').forEach((card) => observer.observe(card));
}

renderApp();
observeScenes();
updateProgress();
window.addEventListener('scroll', updateProgress, { passive: true });
window.addEventListener('resize', updateProgress);
