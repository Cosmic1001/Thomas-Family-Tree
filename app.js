'use strict';

// ─────────────────────────────────────────
// Storage
// ─────────────────────────────────────────
const Storage = {
  KEY: 'thomasFamilyTree_v1',

  getAll() {
    try { return JSON.parse(localStorage.getItem(this.KEY)) || []; }
    catch { return []; }
  },

  save(person) {
    const all = this.getAll();
    const i = all.findIndex(p => p.id === person.id);
    if (i >= 0) all[i] = person; else all.push(person);
    localStorage.setItem(this.KEY, JSON.stringify(all));
    return person;
  },

  delete(id) {
    localStorage.setItem(this.KEY, JSON.stringify(this.getAll().filter(p => p.id !== id)));
  },

  getById(id) {
    return this.getAll().find(p => p.id === id) || null;
  },

  findByName(name) {
    const n = normName(name);
    return this.getAll().find(p => normName(p.info.fullName) === n) || null;
  }
};

// ─────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────
function normName(s) {
  return (s || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function getYear(d) { return d ? d.slice(0, 4) : ''; }

function fmtDate(d) {
  if (!d) return '';
  try {
    return new Date(d + 'T12:00:00').toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
  } catch { return d; }
}

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function initials(name) {
  return name.split(' ').map(w => w[0]).filter(Boolean).join('').slice(0, 2).toUpperCase();
}

// ─────────────────────────────────────────
// Toast
// ─────────────────────────────────────────
function showToast(msg, type = 'success') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = `toast show ${type}`;
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), 3500);
}

// ─────────────────────────────────────────
// Modal
// ─────────────────────────────────────────
const Modal = {
  init() {
    this.overlay = document.getElementById('modal');
    this.content = document.getElementById('modalContent');
    document.getElementById('modalClose').onclick = () => this.close();
    this.overlay.addEventListener('click', e => { if (e.target === this.overlay) this.close(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') this.close(); });
  },
  open(html) {
    this.content.innerHTML = html;
    this.overlay.classList.remove('hidden');
  },
  close() {
    this.overlay.classList.add('hidden');
  }
};

// ─────────────────────────────────────────
// Router
// ─────────────────────────────────────────
const Router = {
  current: null,
  init() {
    document.querySelectorAll('[data-nav]').forEach(el => {
      el.addEventListener('click', () => this.go(el.dataset.nav));
    });
    this.go('home');

    // Mobile hamburger
    const ham = document.getElementById('hamburger');
    const menu = document.getElementById('mobileMenu');
    if (ham && menu) {
      ham.addEventListener('click', () => menu.classList.toggle('hidden'));
      menu.querySelectorAll('[data-nav]').forEach(btn => {
        btn.addEventListener('click', () => menu.classList.add('hidden'));
      });
    }
  },
  go(view) {
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
    document.querySelectorAll('[data-nav]').forEach(b => b.classList.remove('active'));

    const el = document.getElementById(`view-${view}`);
    if (el) el.classList.remove('hidden');
    document.querySelectorAll(`[data-nav="${view}"]`).forEach(b => b.classList.add('active'));

    this.current = view;
    App.onViewChange(view);
  }
};

// ─────────────────────────────────────────
// Form Manager
// ─────────────────────────────────────────
const RELS = ['grandparents', 'parents', 'siblings', 'spouse', 'children', 'grandchildren'];

const FormManager = {
  init() {
    RELS.forEach(rel => {
      document.getElementById(`addBtn-${rel}`).addEventListener('click', () => this.addField(rel));
    });
    document.getElementById('personForm').addEventListener('submit', e => {
      e.preventDefault();
      this.submit();
    });
    document.getElementById('clearFormBtn').addEventListener('click', () => this.reset());
  },

  addField(rel, value = '') {
    const list = document.getElementById(`relList-${rel}`);
    const div = document.createElement('div');
    div.className = 'rel-item';
    div.innerHTML = `<input type="text" class="rel-input" placeholder="Full name" value="${esc(value)}" /><button type="button" class="rel-remove" title="Remove">&#10005;</button>`;
    div.querySelector('.rel-remove').onclick = () => div.remove();
    list.appendChild(div);
    div.querySelector('input').focus();
  },

  getFields(rel) {
    return [...document.querySelectorAll(`#relList-${rel} .rel-input`)]
      .map(i => i.value.trim()).filter(Boolean);
  },

  collect() {
    const info = {
      fullName:        document.getElementById('fullName').value.trim(),
      dateOfBirth:     document.getElementById('dateOfBirth').value,
      dateOfDeath:     document.getElementById('dateOfDeath').value,
      placeOfBirth:    document.getElementById('placeOfBirth').value.trim(),
      currentLocation: document.getElementById('currentLocation').value.trim(),
      bio:             document.getElementById('bio').value.trim(),
      photoUrl:        document.getElementById('photoUrl').value.trim()
    };
    const rels = {};
    RELS.forEach(r => { rels[r] = this.getFields(r); });
    return { info, rels };
  },

  submit() {
    const { info, rels } = this.collect();
    if (!info.fullName) {
      showToast('Please enter your full name.', 'error');
      document.getElementById('fullName').focus();
      return;
    }

    const editId = document.getElementById('personId').value;
    const existing = Storage.findByName(info.fullName);

    let person;
    if (existing && existing.id !== editId) {
      if (!confirm(`"${info.fullName}" is already in the tree. Update their information?`)) return;
      person = { ...existing, info, rels, updatedAt: Date.now() };
    } else {
      person = {
        id: editId || uid(),
        info, rels,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
    }

    Storage.save(person);
    showToast(`${info.fullName} saved to the family tree!`);
    this.reset();
    App.updateStats();
  },

  reset() {
    document.getElementById('personId').value = '';
    document.getElementById('personForm').reset();
    RELS.forEach(rel => { document.getElementById(`relList-${rel}`).innerHTML = ''; });
  },

  load(person) {
    this.reset();
    document.getElementById('personId').value        = person.id;
    document.getElementById('fullName').value        = person.info.fullName;
    document.getElementById('dateOfBirth').value     = person.info.dateOfBirth || '';
    document.getElementById('dateOfDeath').value     = person.info.dateOfDeath || '';
    document.getElementById('placeOfBirth').value    = person.info.placeOfBirth || '';
    document.getElementById('currentLocation').value = person.info.currentLocation || '';
    document.getElementById('bio').value             = person.info.bio || '';
    document.getElementById('photoUrl').value        = person.info.photoUrl || '';
    RELS.forEach(rel => { (person.rels[rel] || []).forEach(n => this.addField(rel, n)); });
    Router.go('form');
    Modal.close();
  }
};

// ─────────────────────────────────────────
// Tree
// ─────────────────────────────────────────
const Tree = {
  NW: 178, NH: 86, HG: 52, VG: 115,
  t: { x: 0, y: 0, s: 1 },
  positions: null,

  init() {
    this.svg  = document.getElementById('treeSvg');
    this.root = document.getElementById('treeRoot');
    this._initPanZoom();
    document.getElementById('zoomIn').onclick  = () => this.zoom(1.2);
    document.getElementById('zoomOut').onclick = () => this.zoom(1 / 1.2);
    document.getElementById('zoomFit').onclick = () => this.fit();
  },

  // SVG element helper
  el(tag, attrs = {}) {
    const e = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
    return e;
  },

  render() {
    this.root.innerHTML = '';
    const persons = Storage.getAll();
    const { NW, NH, HG, VG } = this;

    // ── Build name registry ──
    const nameMap  = new Map(); // norm → person|null
    const dispName = new Map(); // norm → display string

    function reg(s) {
      if (!s) return;
      const n = normName(s);
      if (n && !dispName.has(n)) { dispName.set(n, s.trim()); nameMap.set(n, null); }
    }

    for (const p of persons) {
      const n = normName(p.info.fullName);
      nameMap.set(n, p);
      dispName.set(n, p.info.fullName.trim());
      RELS.forEach(r => (p.rels[r] || []).forEach(reg));
    }

    // ── Build parent→child edges ──
    const childrenOf = new Map(); // norm → Set<norm>
    const parentsOf  = new Map(); // norm → Set<norm>

    function addEdge(par, chi) {
      const p = normName(par), c = normName(chi);
      if (!p || !c || p === c) return;
      if (!childrenOf.has(p)) childrenOf.set(p, new Set());
      childrenOf.get(p).add(c);
      if (!parentsOf.has(c)) parentsOf.set(c, new Set());
      parentsOf.get(c).add(p);
    }

    for (const p of persons) {
      const pn = normName(p.info.fullName);
      (p.rels.parents  || []).forEach(par => addEdge(par, pn));
      (p.rels.children || []).forEach(chi => addEdge(pn, chi));
    }

    // ── Assign generation levels via BFS from roots ──
    const levels  = new Map();
    const allNorm = new Set(nameMap.keys());
    const roots   = [...allNorm].filter(n => !parentsOf.has(n) || parentsOf.get(n).size === 0);

    const queue = roots.map(r => [r, 0]);
    let qi = 0;
    while (qi < queue.length) {
      const [n, lv] = queue[qi++];
      if (!levels.has(n) || levels.get(n) < lv) {
        levels.set(n, lv);
        for (const c of (childrenOf.get(n) || [])) queue.push([c, lv + 1]);
      }
    }

    // Grandparent / grandchild hints for nodes not yet reached by BFS
    for (const p of persons) {
      const pn = normName(p.info.fullName);
      const pl = levels.get(pn) ?? 0;
      (p.rels.grandparents  || []).forEach(gp => {
        const g = normName(gp), t = pl - 2;
        if (!levels.has(g) || levels.get(g) > t) levels.set(g, t);
      });
      (p.rels.grandchildren || []).forEach(gc => {
        const g = normName(gc), t = pl + 2;
        if (!levels.has(g) || levels.get(g) < t) levels.set(g, t);
      });
    }

    for (const n of allNorm) { if (!levels.has(n)) levels.set(n, 0); }

    // Shift so minimum level = 0
    const minLv = Math.min(...levels.values());
    for (const [n, lv] of levels) levels.set(n, lv - minLv);

    // ── Group and sort within each generation ──
    const byLevel = new Map();
    for (const [n, lv] of levels) {
      if (!byLevel.has(lv)) byLevel.set(lv, []);
      byLevel.get(lv).push(n);
    }
    const maxLv = Math.max(...levels.values(), 0);

    for (let lv = 0; lv <= maxLv; lv++) {
      const nodes = byLevel.get(lv) || [];
      nodes.sort((a, b) => {
        // Sort siblings together under the same parent
        const prev = byLevel.get(lv - 1) || [];
        const aP = Math.min(...([...(parentsOf.get(a) || [])].map(p => prev.indexOf(p)).filter(i => i >= 0)), Infinity);
        const bP = Math.min(...([...(parentsOf.get(b) || [])].map(p => prev.indexOf(p)).filter(i => i >= 0)), Infinity);
        if (aP !== bP) return aP - bP;
        return (dispName.get(a) || a).localeCompare(dispName.get(b) || b);
      });
    }

    // ── Calculate X/Y positions ──
    const positions = new Map();
    for (const [lv, nodes] of byLevel) {
      const total = nodes.length * NW + (nodes.length - 1) * HG;
      const x0 = -total / 2;
      nodes.forEach((n, i) => positions.set(n, { x: x0 + i * (NW + HG), y: lv * (NH + VG) }));
    }
    this.positions = positions;

    // ── Empty state ──
    if (positions.size === 0) {
      const msg = this.el('text', { x: 0, y: 0, 'text-anchor': 'middle', class: 'tree-empty-text' });
      msg.textContent = 'No family members yet — add your info to get started!';
      this.root.appendChild(msg);
      this.fit();
      return;
    }

    // ── Edges ──
    const edgesG = this.el('g', { class: 'edges' });
    for (const [par, children] of childrenOf) {
      const pp = positions.get(par);
      if (!pp) continue;
      const px = pp.x + NW / 2, py = pp.y + NH;
      for (const chi of children) {
        const cp = positions.get(chi);
        if (!cp) continue;
        const cx = cp.x + NW / 2, cy = cp.y;
        const my = (py + cy) / 2;
        edgesG.appendChild(this.el('path', {
          d: `M ${px} ${py} C ${px} ${my}, ${cx} ${my}, ${cx} ${cy}`,
          class: 'tree-edge'
        }));
      }
    }
    this.root.appendChild(edgesG);

    // ── Nodes ──
    const nodesG = this.el('g', { class: 'nodes' });
    for (const [norm, pos] of positions) {
      const person  = nameMap.get(norm);
      const dname   = dispName.get(norm) || norm;
      const isGhost = !person;
      const g = this.el('g', { class: `tree-node${isGhost ? ' ghost' : ''}`, transform: `translate(${pos.x},${pos.y})` });

      if (person) {
        g.style.cursor = 'pointer';
        g.addEventListener('click', () => this.openPerson(person));
      }

      // Card background
      g.appendChild(this.el('rect', {
        width: NW, height: NH, rx: 10, ry: 10,
        class: isGhost ? 'ghost-card' : 'node-card'
      }));

      // Avatar circle
      const ini = initials(dname);
      g.appendChild(this.el('circle', { cx: 30, cy: NH / 2, r: 22, class: isGhost ? 'ghost-avatar' : 'avatar' }));
      const initT = this.el('text', { x: 30, y: NH / 2, 'text-anchor': 'middle', 'dominant-baseline': 'middle', class: 'avatar-initials' });
      initT.textContent = ini;
      g.appendChild(initT);

      // Name (up to 2 lines, ~17 chars each)
      const lines = this._wrapName(dname, 17);
      const baseY = lines.length === 1 ? NH / 2 - 2 : NH / 2 - 11;
      lines.forEach((line, i) => {
        const t = this.el('text', { x: 60, y: baseY + i * 16, class: 'node-name' });
        t.textContent = line;
        g.appendChild(t);
      });

      // Birth / death year
      if (person?.info.dateOfBirth) {
        const by = getYear(person.info.dateOfBirth);
        const dy = getYear(person.info.dateOfDeath);
        const yt = this.el('text', { x: 60, y: NH - 11, class: 'node-year' });
        yt.textContent = by + (dy ? ` – ${dy}` : '');
        g.appendChild(yt);
      }

      nodesG.appendChild(g);
    }
    this.root.appendChild(nodesG);
    this.fit();
  },

  _wrapName(name, max) {
    if (name.length <= max) return [name];
    const words = name.split(' ');
    const lines = [''];
    for (const w of words) {
      const try_ = (lines[lines.length - 1] + ' ' + w).trim();
      if (try_.length <= max) lines[lines.length - 1] = try_;
      else lines.push(w);
    }
    return lines.slice(0, 2).map(l => l.length > max ? l.slice(0, max - 1) + '…' : l);
  },

  openPerson(person) {
    const p = person.info, r = person.rels;

    const relRow = (label, names) => {
      if (!names?.length) return '';
      return `<div class="modal-rel-row">
        <span class="rel-lbl">${label}</span>
        <span class="rel-vals">${names.map(esc).join(', ')}</span>
      </div>`;
    };

    const dateStr = [
      p.dateOfBirth ? `Born ${fmtDate(p.dateOfBirth)}${p.placeOfBirth ? ` · ${esc(p.placeOfBirth)}` : ''}` : '',
      p.dateOfDeath ? `Died ${fmtDate(p.dateOfDeath)}` : ''
    ].filter(Boolean).join('  ·  ');

    Modal.open(`
      <div class="modal-person">
        <div class="modal-top">
          <div class="modal-avatar-lg">${initials(p.fullName)}</div>
          <div class="modal-top-info">
            <h2>${esc(p.fullName)}</h2>
            ${dateStr ? `<div class="modal-dates-sm">${dateStr}</div>` : ''}
          </div>
        </div>
        <div class="modal-body">
          ${p.currentLocation ? `<p class="modal-loc">📍 ${esc(p.currentLocation)}</p>` : ''}
          ${p.bio ? `<p class="modal-bio">${esc(p.bio)}</p>` : ''}
          <div class="modal-rels">
            ${relRow('Grandparents',   r.grandparents)}
            ${relRow('Parents',        r.parents)}
            ${relRow('Siblings',       r.siblings)}
            ${relRow('Spouse / Partner', r.spouse)}
            ${relRow('Children',       r.children)}
            ${relRow('Grandchildren',  r.grandchildren)}
          </div>
          <div class="modal-actions">
            <button class="btn btn-ghost btn-sm" id="editPersonBtn">Edit Info</button>
            <button class="btn btn-danger btn-sm" id="delPersonBtn">Remove</button>
          </div>
        </div>
      </div>
    `);

    document.getElementById('editPersonBtn').onclick = () => FormManager.load(person);
    document.getElementById('delPersonBtn').onclick  = () => App.deletePerson(person.id);
  },

  // ── Pan & Zoom ──
  _initPanZoom() {
    const svg = this.svg;
    let panning = false, ox = 0, oy = 0;

    svg.addEventListener('mousedown', e => {
      if (e.target.closest('.tree-node')) return;
      panning = true;
      ox = e.clientX - this.t.x;
      oy = e.clientY - this.t.y;
      svg.style.cursor = 'grabbing';
    });
    document.addEventListener('mouseup', () => { panning = false; svg.style.cursor = 'grab'; });
    document.addEventListener('mousemove', e => {
      if (!panning) return;
      this.t.x = e.clientX - ox;
      this.t.y = e.clientY - oy;
      this._applyT();
    });

    svg.addEventListener('wheel', e => {
      e.preventDefault();
      const r = svg.getBoundingClientRect();
      const mx = e.clientX - r.left, my = e.clientY - r.top;
      const factor = e.deltaY < 0 ? 1.1 : 0.9;
      const ns = Math.max(0.1, Math.min(5, this.t.s * factor));
      this.t.x = mx - (mx - this.t.x) * (ns / this.t.s);
      this.t.y = my - (my - this.t.y) * (ns / this.t.s);
      this.t.s = ns;
      this._applyT();
    }, { passive: false });

    // Touch support
    let lastDist = 0, touch1 = null;
    svg.addEventListener('touchstart', e => {
      if (e.touches.length === 1) {
        panning = true;
        ox = e.touches[0].clientX - this.t.x;
        oy = e.touches[0].clientY - this.t.y;
      } else if (e.touches.length === 2) {
        panning = false;
        lastDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
      }
    }, { passive: true });

    svg.addEventListener('touchmove', e => {
      e.preventDefault();
      if (e.touches.length === 1 && panning) {
        this.t.x = e.touches[0].clientX - ox;
        this.t.y = e.touches[0].clientY - oy;
        this._applyT();
      } else if (e.touches.length === 2) {
        const d = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        this.t.s = Math.max(0.1, Math.min(5, this.t.s * (d / lastDist)));
        lastDist = d;
        this._applyT();
      }
    }, { passive: false });

    svg.addEventListener('touchend', () => { panning = false; });
  },

  zoom(f) {
    const c = document.getElementById('treeCanvas');
    const cx = c.clientWidth / 2, cy = c.clientHeight / 2;
    const ns = Math.max(0.1, Math.min(5, this.t.s * f));
    this.t.x = cx - (cx - this.t.x) * (ns / this.t.s);
    this.t.y = cy - (cy - this.t.y) * (ns / this.t.s);
    this.t.s = ns;
    this._applyT();
  },

  fit() {
    const c = document.getElementById('treeCanvas');
    const cw = c.clientWidth || window.innerWidth;
    const ch = c.clientHeight || (window.innerHeight - 120);

    if (!this.positions || this.positions.size === 0) {
      this.t = { x: cw / 2, y: ch / 2, s: 1 };
      this._applyT();
      return;
    }

    const { NW, NH } = this;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const pos of this.positions.values()) {
      minX = Math.min(minX, pos.x);       minY = Math.min(minY, pos.y);
      maxX = Math.max(maxX, pos.x + NW);  maxY = Math.max(maxY, pos.y + NH);
    }
    const pad = 60;
    const s = Math.min((cw - pad * 2) / (maxX - minX), (ch - pad * 2) / (maxY - minY), 1.6);
    this.t.s = s;
    this.t.x = (cw - (maxX - minX) * s) / 2 - minX * s;
    this.t.y = (ch - (maxY - minY) * s) / 2 - minY * s;
    this._applyT();
  },

  _applyT() {
    this.root.setAttribute('transform', `translate(${this.t.x},${this.t.y}) scale(${this.t.s})`);
  }
};

// ─────────────────────────────────────────
// Members View
// ─────────────────────────────────────────
const Members = {
  init() {
    document.getElementById('memberSearch').addEventListener('input', () => this.render());
  },

  render() {
    const q = (document.getElementById('memberSearch').value || '').toLowerCase();
    const persons = Storage.getAll().filter(p => p.info.fullName.toLowerCase().includes(q));
    const grid = document.getElementById('membersGrid');

    if (!persons.length) {
      grid.innerHTML = `<p class="empty-msg">${q ? 'No members match your search.' : 'No members yet — add your info first!'}</p>`;
      return;
    }

    // Sort alphabetically
    persons.sort((a, b) => a.info.fullName.localeCompare(b.info.fullName));

    grid.innerHTML = persons.map(p => `
      <div class="member-card" data-id="${p.id}">
        <div class="member-avatar">${initials(p.info.fullName)}</div>
        <div class="member-info">
          <div class="member-name">${esc(p.info.fullName)}</div>
          ${p.info.dateOfBirth ? `<div class="member-year">b. ${getYear(p.info.dateOfBirth)}</div>` : ''}
          ${p.info.currentLocation ? `<div class="member-loc">${esc(p.info.currentLocation)}</div>` : ''}
        </div>
      </div>
    `).join('');

    grid.querySelectorAll('.member-card').forEach(card => {
      card.addEventListener('click', () => {
        const p = Storage.getById(card.dataset.id);
        if (p) Tree.openPerson(p);
      });
    });
  }
};

// ─────────────────────────────────────────
// App
// ─────────────────────────────────────────
const App = {
  init() {
    Modal.init();
    FormManager.init();
    Members.init();
    Tree.init();
    Router.init();
    this.updateStats();
  },

  onViewChange(view) {
    if (view === 'tree')    Tree.render();
    if (view === 'members') Members.render();
    if (view === 'home')    this.updateStats();
  },

  updateStats() {
    const persons = Storage.getAll();
    const connections = new Set(persons.flatMap(p => RELS.flatMap(r => (p.rels[r] || []).map(normName)))).size;
    const stories = persons.filter(p => p.info.bio).length;

    const sM = document.getElementById('statMembers');
    const sC = document.getElementById('statConnections');
    const sS = document.getElementById('statStories');
    if (sM) sM.textContent = persons.length;
    if (sC) sC.textContent = connections;
    if (sS) sS.textContent = stories;
  },

  deletePerson(id) {
    if (!confirm('Remove this person from the family tree?')) return;
    Storage.delete(id);
    Modal.close();
    showToast('Person removed from tree.', 'info');
    App.updateStats();
    if (Router.current === 'tree')    Tree.render();
    if (Router.current === 'members') Members.render();
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
