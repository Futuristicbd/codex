// LocalPost Hub frontend — vanilla ES modules, no framework.

const state = {
  settings: {},
  connectors: [],
  media: [],
  posts: [],
  view: 'dashboard',
  composer: { text: '', mediaIds: [], targets: [], scheduledFor: '', editingId: null },
};

const $ = (sel, root = document) => root.querySelector(sel);
const esc = (s = '') =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const VIEW_TITLES = {
  dashboard: 'Dashboard',
  compose: 'Compose',
  media: 'Media Library',
  connections: 'Connections',
  settings: 'Settings',
};

// ---- API ----
async function api(path, opts = {}) {
  const res = await fetch(path, opts);
  if (!res.ok) {
    let msg = res.statusText;
    try { msg = (await res.json()).error || msg; } catch {}
    throw new Error(msg);
  }
  return res.status === 204 ? null : res.json();
}

async function refresh() {
  const s = await api('/api/state');
  Object.assign(state, s);
  applyBranding();
  render();
}

function applyBranding() {
  const { brandName, accentColor, logo } = state.settings || {};
  if (accentColor) document.documentElement.style.setProperty('--accent', accentColor);
  $('#brand-name').textContent = brandName || 'LocalPost Hub';
  const mark = $('#brand-mark');
  if (logo) mark.innerHTML = `<img src="${esc(logo)}" alt="logo" />`;
  else mark.textContent = '🚀';
}

// ---- Toast ----
let toastTimer;
function toast(msg, kind = '') {
  const el = $('#toast');
  el.textContent = msg;
  el.className = `toast ${kind}`;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.hidden = true), 3200);
}

// ---- Modal ----
function openModal(html) {
  const root = $('#modal-root');
  root.innerHTML = `<div class="modal-backdrop"><div class="modal">${html}</div></div>`;
  root.querySelector('.modal-backdrop').addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-backdrop')) closeModal();
  });
}
function closeModal() { $('#modal-root').innerHTML = ''; }

// ---- Navigation ----
function setView(view) {
  state.view = view;
  $$('#nav button').forEach((b) => b.classList.toggle('active', b.dataset.view === view));
  $('#view-title').textContent = VIEW_TITLES[view];
  render();
}
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

// ---- Helpers ----
function connectorById(id) { return state.connectors.find((c) => c.id === id); }
function mediaById(id) { return state.media.find((m) => m.id === id); }
function activeTargets() {
  // Platforms usable as targets: configured (automated) or manual (copy-paste).
  return state.connectors.filter((c) => c.configured || c.status === 'manual');
}

function mediaThumb(m, cls = '') {
  if (!m) return '';
  return m.kind === 'video'
    ? `<video src="${esc(m.url)}" muted playsinline class="${cls}"></video>`
    : `<img src="${esc(m.url)}" alt="${esc(m.name)}" class="${cls}" />`;
}

// ---- Render dispatch ----
function render() {
  const el = $('#view');
  el.innerHTML = ({
    dashboard: renderDashboard,
    compose: renderCompose,
    media: renderMedia,
    connections: renderConnections,
    settings: renderSettings,
  }[state.view] || renderDashboard)();
  wireView();
}

// ---- Dashboard ----
function statusBadge(status) {
  const map = {
    success: ['success', 'Published'],
    error: ['error', 'Failed'],
    manual: ['manual', 'Manual'],
    pending: ['pending', 'Pending'],
  };
  const [cls, label] = map[status] || ['pending', status];
  return `<span class="badge ${cls}">${label}</span>`;
}

function postStatusBadge(p) {
  const map = {
    published: ['success', 'Published'],
    partial: ['beta', 'Partial'],
    failed: ['error', 'Failed'],
    scheduled: ['pending', 'Scheduled'],
    draft: ['manual', 'Draft'],
    needs_manual: ['beta', 'Needs manual'],
  };
  const [cls, label] = map[p.status] || ['manual', p.status];
  return `<span class="badge ${cls}">${label}</span>`;
}

function renderDashboard() {
  const posts = state.posts;
  const published = posts.filter((p) => ['published', 'partial'].includes(p.status)).length;
  const scheduled = posts.filter((p) => p.status === 'scheduled').length;
  const connected = state.connectors.filter((c) => c.configured).length;

  return `
    <div class="grid cols-4">
      <div class="stat"><b>${connected}</b><span>Connected platforms</span></div>
      <div class="stat"><b>${published}</b><span>Posts published</span></div>
      <div class="stat"><b>${scheduled}</b><span>Scheduled</span></div>
      <div class="stat"><b>${state.media.length}</b><span>Media assets</span></div>
    </div>

    <div style="margin-top:26px">
      <div class="row">
        <p class="section-title" style="margin:0">Recent posts</p>
        <div class="spacer"></div>
        <button class="btn btn-sm" data-goto="compose">＋ New post</button>
      </div>
      <div style="margin-top:12px">
        ${posts.length ? posts.slice(0, 12).map(renderPostRow).join('') : `<div class="empty">No posts yet. Head to <b>Compose</b> to publish your first one.</div>`}
      </div>
    </div>
  `;
}

function renderPostRow(p) {
  const media = p.mediaIds.map(mediaById).filter(Boolean);
  const when = p.scheduledFor && p.status === 'scheduled'
    ? `Scheduled for ${new Date(p.scheduledFor).toLocaleString()}`
    : new Date(p.updatedAt || p.createdAt).toLocaleString();

  const results = p.targets.map((tid) => {
    const c = connectorById(tid);
    const r = (p.results || {})[tid] || { status: 'pending' };
    let extra = '';
    if (r.status === 'success' && r.url) extra = `<a href="${esc(r.url)}" target="_blank" rel="noopener">view ↗</a>`;
    else if (r.status === 'error') extra = `<span class="muted small">${esc(r.error || '')}</span>`;
    else if (r.status === 'manual') extra = `<button class="btn btn-sm" data-manual="${p.id}:${tid}">Get publish pack</button>`;
    return `<div class="result-row"><span class="t-ico">${c ? c.icon : '•'}</span>
      <b style="min-width:120px">${c ? esc(c.name) : tid}</b>
      ${statusBadge(r.status)} <div class="spacer"></div> ${extra}</div>`;
  }).join('');

  const canPublish = ['draft', 'scheduled', 'failed', 'partial', 'needs_manual'].includes(p.status);

  return `
    <div class="post-row">
      <div class="p-top">
        <div style="min-width:0">
          <div class="p-text">${esc(p.text) || '<span class="muted">(no text)</span>'}</div>
          ${media.length ? `<div class="p-media">${media.map((m) => mediaThumb(m)).join('')}</div>` : ''}
        </div>
        <div style="text-align:right; white-space:nowrap">
          ${postStatusBadge(p)}
          <div class="muted small" style="margin-top:6px">${esc(when)}</div>
        </div>
      </div>
      <div style="margin-top:12px">${results}</div>
      <div class="row" style="margin-top:12px">
        ${canPublish ? `<button class="btn btn-sm btn-primary" data-publish="${p.id}">${p.status === 'scheduled' ? 'Publish now' : 'Publish'}</button>` : ''}
        <button class="btn btn-sm" data-edit="${p.id}">Edit</button>
        <button class="btn btn-sm btn-danger" data-delpost="${p.id}">Delete</button>
      </div>
    </div>`;
}

// ---- Compose ----
function renderCompose() {
  const c = state.composer;
  const targets = activeTargets();
  const selectedMedia = c.mediaIds.map(mediaById).filter(Boolean);

  const targetRows = targets.length ? targets.map((t) => `
    <label class="target">
      <input type="checkbox" data-target="${t.id}" ${c.targets.includes(t.id) ? 'checked' : ''} />
      <span class="t-ico">${t.icon}</span>
      <span class="t-name">${esc(t.name)}</span>
      <span class="badge ${t.status}">${t.status === 'ready' ? 'Auto' : t.status === 'beta' ? 'Auto*' : 'Manual'}</span>
    </label>`).join('') : `<div class="note">No platforms connected yet. Add one on the <a data-goto="connections">Connections</a> page — or use a Manual platform to prepare copy-paste packages.</div>`;

  return `
    <div class="composer">
      <div class="panel">
        <label class="field">
          <span class="lbl">Post text</span>
          <textarea id="c-text" placeholder="What do you want to share?">${esc(c.text)}</textarea>
          <span class="help"><span id="c-count">${c.text.length}</span> characters${state.settings.signature ? ' · signature appended on publish' : ''}</span>
        </label>

        <p class="section-title">Media</p>
        <div class="chip-row" id="c-media">
          ${selectedMedia.map((m) => `<span class="chip">${mediaThumb(m)} ${esc(m.name).slice(0, 16)} <button data-unpick="${m.id}">×</button></span>`).join('')}
          <button class="btn btn-sm" id="c-pick">＋ Add media</button>
        </div>

        <div style="margin-top:18px">
          <label class="field">
            <span class="lbl">Schedule (optional)</span>
            <input type="datetime-local" id="c-schedule" value="${esc(c.scheduledFor)}" />
            <span class="help">Leave empty to publish immediately.</span>
          </label>
        </div>

        <div class="row" style="margin-top:8px">
          <button class="btn btn-primary" id="c-publish">${c.scheduledFor ? 'Schedule post' : 'Publish now'}</button>
          <button class="btn" id="c-draft">Save draft</button>
          ${c.editingId ? `<button class="btn btn-ghost" id="c-reset">Cancel edit</button>` : ''}
        </div>
      </div>

      <div class="panel">
        <p class="section-title">Publish to</p>
        <div class="target-list">${targetRows}</div>
        <div class="note" style="margin-top:14px">
          <b>Auto</b> platforms post automatically. <b>Auto*</b> need your API tokens (added on Connections).
          <b>Manual</b> platforms build a ready-to-paste package with downloadable media.
        </div>
      </div>
    </div>`;
}

// ---- Media ----
function renderMedia() {
  return `
    <div class="dropzone" id="dropzone">
      <div style="font-size:30px">⬆</div>
      <p><b>Drag & drop</b> photos or videos here, or <button class="btn btn-sm" id="browse">browse files</button></p>
      <input type="file" id="file-input" multiple accept="image/*,video/*" hidden />
    </div>
    <div style="margin-top:22px">
      <p class="section-title">Library (${state.media.length})</p>
      ${state.media.length ? `<div class="media-grid">${state.media.map(renderMediaItem).join('')}</div>` : `<div class="empty">No media yet. Upload photos and videos to reuse them across posts.</div>`}
    </div>`;
}

function renderMediaItem(m) {
  const size = (m.size / 1024 / 1024).toFixed(m.size > 1024 * 1024 ? 1 : 2);
  return `
    <div class="media-item" data-media="${m.id}">
      <span class="kind-tag">${m.kind}</span>
      ${mediaThumb(m)}
      <div class="m-actions">
        <button class="icon-btn" data-delmedia="${m.id}" title="Delete">🗑</button>
      </div>
      <div class="m-meta">${esc(m.name).slice(0, 22)} · ${size}MB</div>
    </div>`;
}

// ---- Connections ----
function renderConnections() {
  return `
    <div class="note" style="margin-bottom:18px">
      Add each platform’s credentials to post automatically. Anything marked <b>Manual</b> or <b>Auto*</b> needs an external account/API — set those up on the platform’s side, then paste the keys here. Nothing leaves your machine.
    </div>
    <div class="grid cols-2">
      ${state.connectors.map(renderConnectorCard).join('')}
    </div>`;
}

function renderConnectorCard(c) {
  const statusLabel = c.status === 'ready' ? 'Full auto' : c.status === 'beta' ? 'Auto (needs API)' : 'Manual';
  const configured = c.configured;
  const fields = c.fields.length ? c.fields.map((f) => `
      <label class="field">
        <span class="lbl">${esc(f.label)}${f.required ? '' : ' (optional)'}</span>
        <input type="${f.type === 'password' ? 'password' : f.type === 'url' ? 'url' : 'text'}"
               data-cred="${c.id}:${f.key}" placeholder="${esc(f.placeholder)}${f.set ? ' — saved' : ''}" />
        ${f.help ? `<span class="help">${esc(f.help)}</span>` : ''}
      </label>`).join('') : '';

  return `
    <div class="panel connector-card">
      <div class="connector-head">
        <div class="ico">${c.icon}</div>
        <div class="meta">
          <b>${esc(c.name)}</b>
          <small>${esc(c.summary)}</small>
        </div>
        <span class="badge ${c.status}">${statusLabel}</span>
      </div>
      ${configured ? `<div class="row"><span class="badge success">● Connected</span>${c.mediaNote ? `<span class="muted small">${esc(c.mediaNote)}</span>` : ''}</div>` : ''}
      ${c.manualReason ? `<div class="note">${esc(c.manualReason)}</div>` : ''}
      ${fields}
      <div class="row">
        ${c.fields.length ? `<button class="btn btn-sm btn-primary" data-savecred="${c.id}">${configured ? 'Update' : 'Connect'}</button>` : ''}
        ${configured ? `<button class="btn btn-sm btn-danger" data-clearcred="${c.id}">Disconnect</button>` : ''}
        ${c.docsUrl ? `<a class="btn btn-sm btn-ghost" href="${esc(c.docsUrl)}" target="_blank" rel="noopener">Setup guide ↗</a>` : ''}
      </div>
    </div>`;
}

// ---- Settings ----
function renderSettings() {
  const s = state.settings;
  return `
    <div class="grid cols-2">
      <div class="panel">
        <p class="section-title">Branding</p>
        <label class="field"><span class="lbl">Studio / brand name</span>
          <input type="text" id="s-name" value="${esc(s.brandName || '')}" /></label>
        <label class="field"><span class="lbl">Accent color</span>
          <input type="color" id="s-accent" value="${esc(s.accentColor || '#6d5efc')}" /></label>
        <label class="field"><span class="lbl">Logo</span>
          <div class="row">
            <div class="brand-mark" style="width:52px;height:52px">${s.logo ? `<img src="${esc(s.logo)}" />` : '🚀'}</div>
            <button class="btn btn-sm" id="s-logo-btn">Upload logo</button>
            ${s.logo ? `<button class="btn btn-sm btn-danger" id="s-logo-clear">Remove</button>` : ''}
            <input type="file" id="s-logo-input" accept="image/*" hidden />
          </div>
        </label>
      </div>
      <div class="panel">
        <p class="section-title">Posting defaults</p>
        <label class="field"><span class="lbl">Signature / footer</span>
          <textarea id="s-signature" placeholder="e.g. — Sent from My Studio  ·  #brand">${esc(s.signature || '')}</textarea>
          <span class="help">Automatically appended to the end of every published post.</span>
        </label>
        <button class="btn btn-primary" id="s-save">Save settings</button>
      </div>
    </div>

    <div class="panel" style="margin-top:18px">
      <p class="section-title">About this platform</p>
      <p class="small muted" style="line-height:1.6">
        LocalPost Hub runs entirely on your machine. Your text, media, and API keys are stored under <code>./data</code>
        and are never sent anywhere except directly to the social platforms you connect. Fully-automated platforms today:
        Mastodon, Bluesky, Telegram, Discord. Others prepare copy-paste publish packages until you add their API access.
      </p>
    </div>`;
}

// ---- Event wiring per view ----
function wireView() {
  // Dashboard/compose navigation buttons
  $$('[data-goto]').forEach((b) => b.addEventListener('click', () => setView(b.dataset.goto)));
  $$('[data-publish]').forEach((b) => b.addEventListener('click', () => doPublish(b.dataset.publish)));
  $$('[data-edit]').forEach((b) => b.addEventListener('click', () => editPost(b.dataset.edit)));
  $$('[data-delpost]').forEach((b) => b.addEventListener('click', () => delPost(b.dataset.delpost)));
  $$('[data-manual]').forEach((b) => b.addEventListener('click', () => showManualPack(...b.dataset.manual.split(':'))));

  if (state.view === 'compose') wireCompose();
  if (state.view === 'media') wireMedia();
  if (state.view === 'connections') wireConnections();
  if (state.view === 'settings') wireSettings();
}

function wireCompose() {
  const c = state.composer;
  const ta = $('#c-text');
  if (ta) ta.addEventListener('input', () => { c.text = ta.value; $('#c-count').textContent = ta.value.length; });
  const sched = $('#c-schedule');
  if (sched) sched.addEventListener('change', () => {
    c.scheduledFor = sched.value;
    $('#c-publish').textContent = sched.value ? 'Schedule post' : 'Publish now';
  });
  $$('[data-target]').forEach((cb) => cb.addEventListener('change', () => {
    const id = cb.dataset.target;
    if (cb.checked) { if (!c.targets.includes(id)) c.targets.push(id); }
    else c.targets = c.targets.filter((t) => t !== id);
  }));
  $$('[data-unpick]').forEach((b) => b.addEventListener('click', () => {
    c.mediaIds = c.mediaIds.filter((id) => id !== b.dataset.unpick); render();
  }));
  $('#c-pick')?.addEventListener('click', openMediaPicker);
  $('#c-publish')?.addEventListener('click', () => submitComposer(false));
  $('#c-draft')?.addEventListener('click', () => submitComposer(true));
  $('#c-reset')?.addEventListener('click', resetComposer);
}

function wireMedia() {
  const dz = $('#dropzone');
  const input = $('#file-input');
  $('#browse')?.addEventListener('click', () => input.click());
  input?.addEventListener('change', () => uploadFiles([...input.files]));
  ['dragover', 'dragenter'].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.add('drag'); }));
  ['dragleave', 'drop'].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.remove('drag'); }));
  dz.addEventListener('drop', (e) => uploadFiles([...e.dataTransfer.files]));
  $$('[data-delmedia]').forEach((b) => b.addEventListener('click', async (e) => {
    e.stopPropagation();
    if (!confirm('Delete this media asset?')) return;
    await api(`/api/media/${b.dataset.delmedia}`, { method: 'DELETE' });
    state.composer.mediaIds = state.composer.mediaIds.filter((id) => id !== b.dataset.delmedia);
    await refresh(); toast('Media deleted', 'ok');
  }));
}

function wireConnections() {
  $$('[data-savecred]').forEach((b) => b.addEventListener('click', async () => {
    const id = b.dataset.savecred;
    const body = {};
    $$(`[data-cred^="${id}:"]`).forEach((inp) => {
      const key = inp.dataset.cred.split(':')[1];
      if (inp.value.trim()) body[key] = inp.value.trim();
    });
    if (!Object.keys(body).length) return toast('Enter your credentials first', 'err');
    try {
      await api(`/api/connectors/${id}/credentials`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      await refresh(); toast('Connected ✓', 'ok');
    } catch (e) { toast(e.message, 'err'); }
  }));
  $$('[data-clearcred]').forEach((b) => b.addEventListener('click', async () => {
    if (!confirm('Disconnect and clear stored credentials?')) return;
    await api(`/api/connectors/${b.dataset.clearcred}/credentials`, { method: 'DELETE' });
    await refresh(); toast('Disconnected', 'ok');
  }));
}

function wireSettings() {
  $('#s-save')?.addEventListener('click', saveSettings);
  const logoInput = $('#s-logo-input');
  $('#s-logo-btn')?.addEventListener('click', () => logoInput.click());
  logoInput?.addEventListener('change', async () => {
    const file = logoInput.files[0];
    if (!file) return;
    const dataUrl = await fileToDataUrl(file);
    await api('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ logo: dataUrl }) });
    await refresh(); toast('Logo updated', 'ok');
  });
  $('#s-logo-clear')?.addEventListener('click', async () => {
    await api('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ logo: null }) });
    await refresh();
  });
}

// ---- Actions ----
async function uploadFiles(files) {
  for (const file of files) {
    try {
      await fetch('/api/media', {
        method: 'POST',
        headers: { 'Content-Type': file.type || 'application/octet-stream', 'X-Filename': encodeURIComponent(file.name) },
        body: file,
      });
    } catch (e) { toast(`Upload failed: ${e.message}`, 'err'); }
  }
  await refresh();
  toast(`${files.length} file(s) uploaded`, 'ok');
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.onerror = reject;
    fr.readAsDataURL(file);
  });
}

function openMediaPicker() {
  const c = state.composer;
  if (!state.media.length) {
    openModal(`<h3>No media yet</h3><p class="muted">Upload photos or videos in the Media Library first.</p>
      <div class="row"><button class="btn btn-primary" id="m-go">Go to Media Library</button><button class="btn" onclick="this.closest('.modal-backdrop').remove()">Close</button></div>`);
    $('#m-go').addEventListener('click', () => { closeModal(); setView('media'); });
    return;
  }
  openModal(`
    <h3>Select media</h3>
    <div class="media-grid" id="picker">
      ${state.media.map((m) => `<div class="media-item ${c.mediaIds.includes(m.id) ? 'selected' : ''}" data-pick="${m.id}">
        <span class="kind-tag">${m.kind}</span>${mediaThumb(m)}</div>`).join('')}
    </div>
    <div class="row" style="margin-top:16px"><div class="spacer"></div>
      <button class="btn btn-primary" id="picker-done">Done</button></div>`);
  $$('[data-pick]').forEach((el) => el.addEventListener('click', () => {
    const id = el.dataset.pick;
    if (c.mediaIds.includes(id)) c.mediaIds = c.mediaIds.filter((x) => x !== id);
    else c.mediaIds.push(id);
    el.classList.toggle('selected');
  }));
  $('#picker-done').addEventListener('click', () => { closeModal(); render(); });
}

function composerPayload() {
  const c = state.composer;
  return {
    text: c.text,
    mediaIds: c.mediaIds,
    targets: c.targets,
    scheduledFor: c.scheduledFor ? new Date(c.scheduledFor).toISOString() : null,
  };
}

async function submitComposer(draftOnly) {
  const c = state.composer;
  const payload = composerPayload();
  if (!payload.text.trim() && !payload.mediaIds.length) return toast('Add some text or media first', 'err');
  if (!draftOnly && !payload.targets.length) return toast('Pick at least one platform', 'err');

  try {
    let post;
    if (c.editingId) {
      post = await api(`/api/posts/${c.editingId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payload, status: payload.scheduledFor ? 'scheduled' : 'draft' }) });
    } else {
      post = await api('/api/posts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    }
    if (!draftOnly && !payload.scheduledFor) {
      await api(`/api/posts/${post.id}/publish`, { method: 'POST' });
      toast('Published!', 'ok');
    } else if (payload.scheduledFor) {
      toast('Scheduled ✓', 'ok');
    } else {
      toast('Draft saved', 'ok');
    }
    resetComposer(true);
    await refresh();
    setView('dashboard');
  } catch (e) { toast(e.message, 'err'); }
}

function resetComposer(silent) {
  state.composer = { text: '', mediaIds: [], targets: [], scheduledFor: '', editingId: null };
  if (!silent) render();
}

function editPost(id) {
  const p = state.posts.find((x) => x.id === id);
  if (!p) return;
  state.composer = {
    text: p.text || '',
    mediaIds: [...(p.mediaIds || [])],
    targets: [...(p.targets || [])],
    scheduledFor: p.scheduledFor ? new Date(p.scheduledFor).toISOString().slice(0, 16) : '',
    editingId: p.id,
  };
  setView('compose');
}

async function doPublish(id) {
  try {
    await api(`/api/posts/${id}/publish`, { method: 'POST' });
    await refresh();
    toast('Publish attempted — check results', 'ok');
  } catch (e) { toast(e.message, 'err'); }
}

async function delPost(id) {
  if (!confirm('Delete this post?')) return;
  await api(`/api/posts/${id}`, { method: 'DELETE' });
  await refresh(); toast('Post deleted', 'ok');
}

async function saveSettings() {
  const body = {
    brandName: $('#s-name').value,
    accentColor: $('#s-accent').value,
    signature: $('#s-signature').value,
  };
  await api('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  await refresh(); toast('Settings saved', 'ok');
}

// Manual publish package for platforms without automated posting.
function showManualPack(postId, targetId) {
  const p = state.posts.find((x) => x.id === postId);
  const c = connectorById(targetId);
  if (!p || !c) return;
  const media = p.mediaIds.map(mediaById).filter(Boolean);
  const text = p.text + (state.settings.signature ? `\n\n${state.settings.signature}` : '');
  openModal(`
    <h3>${c.icon} Publish to ${esc(c.name)} manually</h3>
    <p class="muted small">${esc(c.manualReason || '')}</p>
    <label class="field"><span class="lbl">Caption / text (copy this)</span>
      <textarea id="mp-text" style="min-height:140px">${esc(text)}</textarea></label>
    <div class="row"><button class="btn btn-sm btn-primary" id="mp-copy">Copy text</button></div>
    ${media.length ? `<p class="section-title" style="margin-top:16px">Media — right-click → Save, or use the download buttons</p>
      <div class="chip-row">${media.map((m) => `<span class="chip">${mediaThumb(m)} <a class="btn btn-sm" href="${esc(m.url)}" download="${esc(m.name)}">⬇ ${esc(m.name).slice(0, 14)}</a></span>`).join('')}</div>` : ''}
    <div class="row" style="margin-top:18px"><div class="spacer"></div><button class="btn" id="mp-close">Close</button></div>`);
  $('#mp-copy').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText($('#mp-text').value); toast('Text copied', 'ok'); }
    catch { $('#mp-text').select(); document.execCommand('copy'); toast('Text copied', 'ok'); }
  });
  $('#mp-close').addEventListener('click', closeModal);
}

// ---- Boot ----
$$('#nav button').forEach((b) => b.addEventListener('click', () => setView(b.dataset.view)));
$('#quick-compose').addEventListener('click', () => setView('compose'));
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

refresh().catch((e) => toast('Failed to load: ' + e.message, 'err'));
// Light polling so scheduled posts + results stay fresh.
setInterval(() => { if (!$('#modal-root').innerHTML && state.view === 'dashboard') refresh().catch(() => {}); }, 20_000);
