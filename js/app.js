'use strict';

const $ = (s) => document.querySelector(s);
const STORE_KEY = 'internship-board-applications-v1';
const FIELDS = ['name', 'email', 'url'];

let all = [];
let current = null;
let opener = null;
let reqId = 0;
let optionsFilled = false;

// Build DOM nodes with textContent only, never innerHTML.
function el(tag, text, cls) {
  const n = document.createElement(tag);
  if (text !== undefined) n.textContent = text;
  if (cls) n.className = cls;
  return n;
}

/* ---------------- Simulated API layer (runs in the browser) ---------------- */

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// Tiny hash so duplicate checks never store a plain email address.
function hash(s) {
  let h = 5381;
  for (const c of s) h = ((h * 33) ^ c.charCodeAt(0)) >>> 0;
  return h.toString(36);
}
function readApplied() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY)) || []; } catch (e) { return []; }
}
function writeApplied(list) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(list)); } catch (e) { /* storage unavailable */ }
}

function validate(v) {
  const e = {};
  if (!v.name.trim()) e.name = 'Enter your full name.';
  if (!v.email.trim()) e.email = 'Enter your email address.';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.email.trim())) {
    e.email = 'Enter a valid email address, like name@example.com.';
  }
  if (v.url.trim()) {
    try {
      const u = new URL(v.url.trim());
      if (!['http:', 'https:'].includes(u.protocol) || u.username || u.password) throw new Error('unsafe');
    } catch (err) {
      e.url = 'Enter a link that starts with http:// or https://.';
    }
  }
  return e;
}

const api = {
  // Returns { status, data, pagination } or { status: 'error', message }.
  async list({ q = '', domain = '', mode = '', page = 1, pageSize = 6 }) {
    await wait(400);
    if (new URLSearchParams(location.search).has('fail')) {
      return { status: 'error', message: 'The internship service is not responding.', data: [], pagination: null };
    }
    if (!all.length) {
      try {
        const res = await fetch('data/internships.json');
        if (!res.ok) throw new Error('HTTP ' + res.status);
        all = (await res.json()).internships;
      } catch (e) {
        console.error('Load failed:', e.message);
        return { status: 'error', message: 'Could not load the internship data.', data: [], pagination: null };
      }
    }
    const t = q.trim().toLowerCase();
    const rows = all.filter((i) =>
      (!domain || i.domain === domain) &&
      (!mode || i.mode === mode) &&
      (!t || [i.title, i.location, i.domain].concat(i.skills).join(' ').toLowerCase().includes(t)));
    const start = (page - 1) * pageSize;
    return {
      status: 'ok',
      data: rows.slice(start, start + pageSize),
      pagination: { page, pageSize, total: rows.length, totalPages: Math.max(1, Math.ceil(rows.length / pageSize)) }
    };
  },

  async apply(id, values) {
    await wait(300);
    const errors = validate(values);
    if (Object.keys(errors).length) {
      return { status: 'error', message: 'Fix the fields marked with errors.', errors };
    }
    const key = hash(id + '|' + values.email.trim().toLowerCase());
    const applied = readApplied();
    if (applied.includes(key)) {
      return { status: 'error', message: 'Duplicate application.', errors: { email: 'This email has already applied to this internship.' } };
    }
    applied.push(key);
    writeApplied(applied);
    console.info('Application accepted for', id); // id only, never applicant details
    return { status: 'ok', message: 'Application received.' };
  }
};

/* ---------------- List rendering ---------------- */

const stateBox = $('#state');
const list = $('#list');
const count = $('#count');
const inputs = { q: $('#q'), domain: $('#domain'), mode: $('#mode') };

function showState(kind, text, actionLabel, action) {
  stateBox.replaceChildren();
  if (!kind) return;
  const box = el('div', undefined, 'state ' + kind);
  if (kind === 'error') box.setAttribute('role', 'alert');
  const p = el('p');
  if (kind === 'loading') p.append(el('span', undefined, 'spinner'));
  p.append(document.createTextNode(text));
  box.append(p);
  if (actionLabel) {
    const b = el('button', actionLabel, 'btn');
    b.type = 'button';
    b.addEventListener('click', action);
    box.append(b);
  }
  stateBox.append(box);
}

function card(i) {
  const a = el('article', undefined, 'card');
  a.append(el('h3', i.title), el('p', i.domain, 'domain'));

  const meta = el('ul', undefined, 'meta');
  ['Mode: ' + i.mode, 'Location: ' + i.location, i.openings + (i.openings === 1 ? ' opening' : ' openings')]
    .forEach((t) => meta.append(el('li', t)));
  a.append(meta);

  const skills = el('ul', undefined, 'skills');
  skills.setAttribute('aria-label', 'Skills');
  i.skills.forEach((s) => skills.append(el('li', s)));
  a.append(skills);

  const btn = el('button', 'View details and apply', 'btn');
  btn.type = 'button';
  btn.setAttribute('aria-label', 'View details and apply: ' + i.title);
  btn.addEventListener('click', () => openDialog(i, btn));
  a.append(btn);
  return a;
}

function fillOptions() {
  if (optionsFilled) return;
  optionsFilled = true;
  [['domain', 'domain'], ['mode', 'mode']].forEach(([field, key]) => {
    Array.from(new Set(all.map((i) => i[key]))).sort().forEach((v) => {
      const o = el('option', v);
      o.value = v;
      inputs[field].append(o);
    });
  });
}

async function load() {
  const id = ++reqId;
  list.replaceChildren();
  showState('loading', 'Loading internships…');
  count.textContent = 'Loading internships…';

  const res = await api.list({ q: inputs.q.value, domain: inputs.domain.value, mode: inputs.mode.value });
  if (id !== reqId) return; // a newer request replaced this one

  if (res.status === 'error') {
    count.textContent = 'Error: internships could not be loaded.';
    showState('error', res.message + ' Check your connection and try again.', 'Retry', load);
    return;
  }
  fillOptions();
  if (res.pagination.total === 0) {
    count.textContent = 'No internships match your filters.';
    showState('empty', 'No internships match. Try a different search or clear the filters.', 'Clear filters', clearFilters);
    return;
  }
  showState(null);
  res.data.forEach((i) => { const li = el('li'); li.append(card(i)); list.append(li); });
  count.textContent = 'Showing ' + res.pagination.total + ' of ' + all.length + ' internships.';
}

function clearFilters() {
  inputs.q.value = '';
  inputs.domain.value = '';
  inputs.mode.value = '';
  load();
  inputs.q.focus();
}

let timer;
inputs.q.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(load, 250); });
inputs.domain.addEventListener('change', load);
inputs.mode.addEventListener('change', load);
$('#clear').addEventListener('click', clearFilters);
$('#filters').addEventListener('submit', (e) => e.preventDefault());

/* ---------------- Details dialog and application form ---------------- */

const dlg = $('#dlg');
const form = $('#apply');
const msg = $('#form-msg');

function setError(field, text) {
  const input = $('#' + field);
  $('#' + field + '-err').textContent = text ? 'Error: ' + text : '';
  if (text) input.setAttribute('aria-invalid', 'true');
  else input.removeAttribute('aria-invalid');
}

function resetForm() {
  form.reset();
  msg.textContent = '';
  msg.className = 'msg';
  FIELDS.forEach((f) => setError(f, ''));
}

function openDialog(i, btn) {
  current = i;
  opener = btn;
  $('#dlg-title').textContent = i.title;
  const dl = $('#dlg-details');
  dl.replaceChildren();
  [['Domain', i.domain], ['Work mode', i.mode], ['Location', i.location],
   ['Openings', String(i.openings)], ['Skills', i.skills.join(', ')], ['Reference', i.id]]
    .forEach(([k, v]) => dl.append(el('dt', k), el('dd', v)));
  resetForm();
  dlg.showModal();
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const submit = form.querySelector('button[type="submit"]');
  submit.disabled = true;
  const res = await api.apply(current.id, {
    name: $('#name').value, email: $('#email').value, url: $('#url').value
  });
  submit.disabled = false;

  const errors = res.errors || {};
  FIELDS.forEach((f) => setError(f, errors[f] || ''));

  if (res.status === 'ok') {
    form.reset();
    msg.className = 'msg ok';
    msg.textContent = 'Application for ' + current.title + ' received. It is saved in this browser only.';
    msg.focus();
  } else {
    msg.className = 'msg bad';
    msg.textContent = 'Error: ' + res.message;
    const first = FIELDS.find((f) => errors[f]);
    if (first) $('#' + first).focus(); else msg.focus();
  }
});

$('#dlg-close').addEventListener('click', () => dlg.close());
dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); }); // backdrop click
dlg.addEventListener('close', () => { if (opener) opener.focus(); });

load();
