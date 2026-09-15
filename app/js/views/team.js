import { getState, update, uid, ROLE_PERMISSIONS } from '../store.js';
import { el, sectionHead, toast, modal, field, input, select, fmtDateTime, timeAgo, confirmDialog } from '../ui.js';
import { logActivity } from './orders.js';

const ROLES = Object.keys(ROLE_PERMISSIONS);

export default function renderTeam() {
  const s = getState();
  return el('div', {}, [
    sectionHead('Team & Roles', 'Invite staff, assign roles/permissions and audit activity.', [
      el('button', { class: 'btn', text: '＋ Invite User', onClick: () => userForm() }),
    ]),
    el('div', { class: 'grid cols-3' }, [
      el('div', { class: 'card span-2' }, [
        el('div', { class: 'card-head' }, [el('h2', { text: 'Team members' })]),
        el('div', {}, s.team.users.map((u) => userRow(u))),
      ]),
      el('div', { class: 'card' }, [
        el('div', { class: 'card-head' }, [el('h2', { text: 'Role permissions' })]),
        el('div', { class: 'card-pad' }, ROLES.map((r) => el('div', { style: 'margin-bottom:12px' }, [
          el('div', { class: 'cell-strong', text: r }),
          el('div', { class: 'cell-sub', text: ROLE_PERMISSIONS[r].includes('*') ? 'Full access to everything' : ROLE_PERMISSIONS[r].join(', ') }),
        ]))),
      ]),
    ]),
    el('div', { class: 'card', style: 'margin-top:16px' }, [
      el('div', { class: 'card-head' }, [el('h2', { text: 'Activity log' })]),
      el('div', { class: 'card-pad' }, s.team.activity.length ? s.team.activity.map((a) => el('div', { class: 'list-row' }, [
        el('span', { class: 'avatar-sm', text: a.user.charAt(0) }),
        el('div', {}, [el('div', { class: 'cell-strong', text: a.action }), el('div', { class: 'cell-sub', text: a.user })]),
        el('span', { class: 'spacer' }),
        el('span', { class: 'cell-sub', text: timeAgo(a.time) }),
      ])) : [el('p', { class: 'muted', text: 'No activity yet.' })]),
    ]),
  ]);
}

function userRow(u) {
  const roleSel = select(ROLES, {});
  roleSel.value = u.role;
  roleSel.addEventListener('change', () => {
    update((st) => { const uu = st.team.users.find((x) => x.id === u.id); uu.role = roleSel.value; logActivity(st, `Changed ${u.name}'s role → ${roleSel.value}`); });
    toast('Role updated');
  });
  return el('div', { class: 'list-row', style: 'padding:14px 18px' }, [
    el('span', { class: 'avatar-sm', text: u.name.charAt(0) }),
    el('div', {}, [el('div', { class: 'cell-strong', text: u.name }), el('div', { class: 'cell-sub', text: u.email })]),
    el('span', { class: 'spacer' }),
    el('span', { class: u.active ? 'dot-ok' : 'dot-off', style: 'margin-right:10px', text: u.active ? '● Active' : '○ Suspended' }),
    roleSel,
    u.role === 'Admin' && u.name.includes('Owner') ? null : el('button', { class: 'icon-btn', text: '🗑', style: 'margin-left:6px', onClick: () => confirmDialog(`Remove ${u.name} from the team?`, () => {
      update((st) => { st.team.users = st.team.users.filter((x) => x.id !== u.id); logActivity(st, `Removed team member ${u.name}`); });
      toast('User removed');
    }) }),
  ]);
}

function userForm() {
  const name = input({ placeholder: 'Full name' });
  const email = input({ placeholder: 'email@store.com', type: 'email' });
  const role = select(ROLES, {});
  const body = el('div', {}, [
    field('Name', name),
    field('Email', email),
    field('Role', role),
    el('p', { class: 'help', text: 'The user gets access only to the sections their role allows.' }),
    el('div', { class: 'form-actions' }, [
      el('button', { class: 'btn ghost', text: 'Cancel', onClick: () => close() }),
      el('button', { class: 'btn', text: 'Send invite', onClick: () => {
        if (!name.value || !email.value) { toast('Name and email required', 'error'); return; }
        update((st) => { st.team.users.push({ id: uid('usr'), name: name.value, email: email.value, role: role.value, active: true }); logActivity(st, `Invited ${name.value} as ${role.value}`); });
        toast('Invite sent ✓'); close();
      } }),
    ]),
  ]);
  const close = modal('Invite user', body);
}
