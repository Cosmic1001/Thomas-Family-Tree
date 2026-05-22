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
// Single-value relationships: one named person each
const SINGLE_RELS = ['mother', 'father', 'patGrandmother', 'patGrandfather', 'matGrandmother', 'matGrandfather'];
// List relationships: zero-or-more named people
const LIST_RELS = ['siblings', 'spouse', 'children'];
// Names referenced by anything (used by tree to register ghost nodes)
const ALL_REL_KEYS = [...SINGLE_RELS, ...LIST_RELS];

const FormManager = {
  init() {
    LIST_RELS.forEach(rel => {
      const btn = document.getElementById(`addBtn-${rel}`);
      if (btn) btn.addEventListener('click', () => this.addField(rel));
    });
    document.getElementById('personForm').addEventListener('submit', e => {
      e.preventDefault();
      this.submit();
    });
    document.getElementById('clearFormBtn').addEventListener('click', () => this.reset());
  },

  addField(rel, value = '') {
    const list = document.getElementById(`relList-${rel}`);
    if (!list) return;
    const div = document.createElement('div');
    div.className = 'rel-item';
    div.innerHTML = `<input type="text" class="rel-input" placeholder="Full name" value="${esc(value)}" /><button type="button" class="rel-remove" title="Remove">&#10005;</button>`;
    div.querySelector('.rel-remove').onclick = () => div.remove();
    list.appendChild(div);
    div.querySelector('input').focus();
  },

  getListFields(rel) {
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
    SINGLE_RELS.forEach(r => {
      rels[r] = (document.getElementById(`rel-${r}`)?.value || '').trim();
    });
    LIST_RELS.forEach(r => { rels[r] = this.getListFields(r); });
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
    this.reset();
    App.updateStats();
    this.showSuccessModal(info.fullName);
  },

  showSuccessModal(name) {
    Modal.open(`
      <div class="success-modal">
        <div class="success-icon">&#10003;</div>
        <h2>Saved!</h2>
        <p><strong>${esc(name)}</strong> has been added to the family tree.</p>
        <div class="success-actions">
          <button class="btn btn-primary" id="successTreeBtn">Generate Tree</button>
          <button class="btn btn-outline" id="successHomeBtn">Back to Home</button>
        </div>
      </div>
    `);
    document.getElementById('successTreeBtn').onclick = () => { Modal.close(); Router.go('tree'); };
    document.getElementById('successHomeBtn').onclick = () => { Modal.close(); Router.go('home'); };
  },

  reset() {
    document.getElementById('personId').value = '';
    document.getElementById('personForm').reset();
    SINGLE_RELS.forEach(r => {
      const el = document.getElementById(`rel-${r}`);
      if (el) el.value = '';
    });
    LIST_RELS.forEach(rel => {
      const list = document.getElementById(`relList-${rel}`);
      if (list) list.innerHTML = '';
    });
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
    SINGLE_RELS.forEach(r => {
      const el = document.getElementById(`rel-${r}`);
      if (el) el.value = person.rels[r] || '';
    });
    LIST_RELS.forEach(rel => { (person.rels[rel] || []).forEach(n => this.addField(rel, n)); });
    Router.go('form');
    Modal.close();
  }
};

// ─────────────────────────────────────────
// Tree
// ─────────────────────────────────────────
const Tree = {
  NW: 140, NH: 140,        // node bounding box (circle on top, name below)
  CR: 38,                  // avatar circle radius
  CY: 44,                  // circle center y within node
  SPOUSE_GAP: 14,          // tight gap so marriage bar reads as a pair
  UNIT_GAP: 56,            // gap between unrelated units in same generation
  VG: 70,                  // vertical gap between generations
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
    const { NW, NH, CR, CY, SPOUSE_GAP, UNIT_GAP, VG } = this;

    // ── 1. Build name registry ──
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
      SINGLE_RELS.forEach(r => reg(p.rels[r]));
      LIST_RELS.forEach(r => (p.rels[r] || []).forEach(reg));
    }
    const allNorm = [...nameMap.keys()];

    // ── 2. Build relationship graphs ──
    const childrenOf = new Map();
    const parentsOf  = new Map();
    const spouseOf   = new Map();
    const siblingOf  = new Map();

    function addEdge(par, chi) {
      const p = normName(par), c = normName(chi);
      if (!p || !c || p === c) return;
      if (!childrenOf.has(p)) childrenOf.set(p, new Set());
      childrenOf.get(p).add(c);
      if (!parentsOf.has(c)) parentsOf.set(c, new Set());
      parentsOf.get(c).add(p);
    }
    function addSpouse(a, b) {
      const an = normName(a), bn = normName(b);
      if (!an || !bn || an === bn) return;
      if (!spouseOf.has(an)) spouseOf.set(an, new Set());
      spouseOf.get(an).add(bn);
      if (!spouseOf.has(bn)) spouseOf.set(bn, new Set());
      spouseOf.get(bn).add(an);
    }
    function addSibling(a, b) {
      const an = normName(a), bn = normName(b);
      if (!an || !bn || an === bn) return;
      if (!siblingOf.has(an)) siblingOf.set(an, new Set());
      siblingOf.get(an).add(bn);
      if (!siblingOf.has(bn)) siblingOf.set(bn, new Set());
      siblingOf.get(bn).add(an);
    }

    // Direct parent/child edges from mother, father, children
    for (const p of persons) {
      const pn = normName(p.info.fullName);
      if (p.rels.mother) addEdge(p.rels.mother, pn);
      if (p.rels.father) addEdge(p.rels.father, pn);
      (p.rels.children || []).forEach(chi => addEdge(pn, chi));
      (p.rels.siblings || []).forEach(sb  => addSibling(pn, sb));
    }

    // Paternal grandparents are the FATHER's parents.
    // Maternal grandparents are the MOTHER's parents.
    for (const p of persons) {
      const f = p.rels.father, m = p.rels.mother;
      if (f) {
        if (p.rels.patGrandfather) addEdge(p.rels.patGrandfather, f);
        if (p.rels.patGrandmother) addEdge(p.rels.patGrandmother, f);
      }
      if (m) {
        if (p.rels.matGrandfather) addEdge(p.rels.matGrandfather, m);
        if (p.rels.matGrandmother) addEdge(p.rels.matGrandmother, m);
      }
    }

    // Siblings inherit my Mother and Father (unless they have their own form
    // that already gave them different parents).
    for (const p of persons) {
      const pn = normName(p.info.fullName);
      const m  = p.rels.mother ? normName(p.rels.mother) : null;
      const f  = p.rels.father ? normName(p.rels.father) : null;
      if (!m && !f) continue;
      for (const sib of (p.rels.siblings || [])) {
        const sn = normName(sib);
        if (!sn) continue;
        const sibPerson = nameMap.get(sn);
        const sibHasOwnMother = sibPerson?.rels?.mother;
        const sibHasOwnFather = sibPerson?.rels?.father;
        if (m && !sibHasOwnMother) addEdge(m, sn);
        if (f && !sibHasOwnFather) addEdge(f, sn);
      }
    }

    // Pair couples only when EXACTLY two people are listed as parents of the same
    // person — an unambiguous couple signal.
    for (const ps of parentsOf.values()) {
      if (ps.size === 2) {
        const [a, b] = [...ps];
        addSpouse(a, b);
      }
    }

    // ── 3. Build family units (a unit = 1 single or 2 spouses) ──
    const unitOf = new Map();   // norm → unit_id
    const units  = new Map();   // unit_id → { members: [...], children: Set<unit_id>, parents: Set<unit_id> }

    for (const norm of allNorm) {
      if (unitOf.has(norm)) continue;
      const sp = [...(spouseOf.get(norm) || [])].filter(s => !unitOf.has(s)).sort()[0];
      if (sp) {
        const id = `u:${[norm, sp].sort().join('+')}`;
        units.set(id, { members: [norm, sp], children: new Set(), parents: new Set() });
        unitOf.set(norm, id);
        unitOf.set(sp,   id);
      } else {
        const id = `u:${norm}`;
        units.set(id, { members: [norm], children: new Set(), parents: new Set() });
        unitOf.set(norm, id);
      }
    }

    // Link parent unit → child unit (pick best-matching parent unit)
    for (const [chi, ps] of parentsOf) {
      const cu = unitOf.get(chi);
      if (!cu) continue;
      let bestU = null, bestMatch = 0;
      for (const par of ps) {
        const pu = unitOf.get(par);
        if (!pu) continue;
        const m = units.get(pu).members.filter(mem => ps.has(mem)).length;
        if (m > bestMatch) { bestU = pu; bestMatch = m; }
      }
      if (bestU && bestU !== cu) {
        units.get(bestU).children.add(cu);
        units.get(cu).parents.add(bestU);
      }
    }

    // ── 4. Assign unit generation levels (BFS from root units) ──
    const unitLevel = new Map();
    const allUnits  = [...units.keys()];
    const rootUnits = allUnits.filter(u => units.get(u).parents.size === 0);

    const q = rootUnits.map(u => [u, 0]);
    let qi = 0;
    while (qi < q.length) {
      const [u, lv] = q[qi++];
      if (!unitLevel.has(u) || unitLevel.get(u) < lv) {
        unitLevel.set(u, lv);
        for (const cu of units.get(u).children) q.push([cu, lv + 1]);
      }
    }

    for (const u of allUnits) if (!unitLevel.has(u)) unitLevel.set(u, 0);

    // Normalize to min level = 0
    const minLv = Math.min(...unitLevel.values());
    for (const [u, lv] of unitLevel) unitLevel.set(u, lv - minLv);

    // ── 5. Recursive tidy-tree layout ──
    const unitW = (u) => {
      const m = units.get(u).members.length;
      return m * NW + (m - 1) * SPOUSE_GAP;
    };
    const personOrderKey = (u) => {
      // Sort by earliest-born or alphabetical
      const mem = units.get(u).members[0];
      const person = nameMap.get(mem);
      return (person?.info.dateOfBirth || '9999') + (dispName.get(mem) || mem);
    };
    const sortedChildren = (u) => [...units.get(u).children].sort((a, b) => personOrderKey(a).localeCompare(personOrderKey(b)));

    const subW = new Map();
    const unitX = new Map();   // unit → left x of unit's leftmost member
    const beingCalc = new Set();

    const calcW = (u) => {
      if (subW.has(u)) return subW.get(u);
      if (beingCalc.has(u)) return unitW(u);
      beingCalc.add(u);
      const my = unitW(u);
      const kids = sortedChildren(u);
      if (kids.length === 0) { subW.set(u, my); return my; }
      let w = 0;
      for (const c of kids) w += calcW(c);
      w += (kids.length - 1) * UNIT_GAP;
      w = Math.max(w, my);
      subW.set(u, w);
      return w;
    };

    const placed = new Set();
    const place = (u, leftX) => {
      if (placed.has(u)) return;
      placed.add(u);
      const my = unitW(u);
      const sw = calcW(u);
      const cx = leftX + sw / 2;
      unitX.set(u, cx - my / 2);

      const kids = sortedChildren(u);
      let cur = leftX;
      for (const c of kids) {
        place(c, cur);
        cur += calcW(c) + UNIT_GAP;
      }
    };

    // Sort root units by name for stable layout
    rootUnits.sort((a, b) => personOrderKey(a).localeCompare(personOrderKey(b)));

    let total = 0;
    rootUnits.forEach((r, i) => { total += calcW(r); if (i > 0) total += UNIT_GAP; });
    let cursor = -total / 2;
    for (const r of rootUnits) {
      place(r, cursor);
      cursor += calcW(r) + UNIT_GAP;
    }

    // Build per-person positions
    const positions = new Map();
    for (const [uid, x] of unitX) {
      const u = units.get(uid);
      const y = unitLevel.get(uid) * (NH + VG);
      u.members.forEach((mem, i) => {
        positions.set(mem, { x: x + i * (NW + SPOUSE_GAP), y });
      });
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

    // ── 6. Render edges ──
    const edgesG = this.el('g', { class: 'edges' });

    // y coordinates relative to a node's bounding-box top:
    //   circle top    = CY - CR
    //   circle bottom = CY + CR
    const circleBottom = CY + CR;
    const circleTop    = CY - CR;

    // Marriage bar between spouses (horizontal line at circle vertical-center)
    for (const [uid, u] of units) {
      if (u.members.length !== 2 || !unitX.has(uid)) continue;
      const x = unitX.get(uid);
      const y = unitLevel.get(uid) * (NH + VG) + CY;
      // Goes from right edge of left circle to left edge of right circle
      const x1 = x + NW / 2 + CR;
      const x2 = x + NW + SPOUSE_GAP + NW / 2 - CR;
      edgesG.appendChild(this.el('line', {
        x1, y1: y, x2, y2: y,
        class: 'tree-marriage'
      }));
    }

    // Parent → children connectors
    for (const [uid, u] of units) {
      if (u.children.size === 0 || !unitX.has(uid)) continue;
      const parentY = unitLevel.get(uid) * (NH + VG);
      const isCouple = u.members.length === 2;

      // Drop source: midpoint of marriage bar for couples, bottom of bounding box for singles
      const srcX = unitX.get(uid) + unitW(uid) / 2;
      const srcY = isCouple ? parentY + CY : parentY + NH;

      const kids = [...u.children].filter(cu => unitX.has(cu));
      if (!kids.length) continue;

      const kidPts = kids.map(cu => ({
        x: unitX.get(cu) + unitW(cu) / 2,
        y: unitLevel.get(cu) * (NH + VG) + circleTop  // top of child's circle
      }));

      // Sibling bar y = middle of the gap between parent box bottom and child circle top
      const parentBottom = parentY + NH;
      const minKidY = Math.min(...kidPts.map(k => k.y));
      const barY = parentBottom + (minKidY - parentBottom) / 2;

      // Drop from source to sibling bar
      edgesG.appendChild(this.el('path', {
        d: `M ${srcX} ${srcY} V ${barY}`,
        class: 'tree-edge'
      }));

      if (kidPts.length === 1) {
        const k = kidPts[0];
        edgesG.appendChild(this.el('path', {
          d: `M ${srcX} ${barY} H ${k.x} V ${k.y}`,
          class: 'tree-edge'
        }));
      } else {
        const minX = Math.min(...kidPts.map(k => k.x), srcX);
        const maxX = Math.max(...kidPts.map(k => k.x), srcX);
        edgesG.appendChild(this.el('path', {
          d: `M ${minX} ${barY} H ${maxX}`,
          class: 'tree-edge'
        }));
        for (const k of kidPts) {
          edgesG.appendChild(this.el('path', {
            d: `M ${k.x} ${barY} V ${k.y}`,
            class: 'tree-edge'
          }));
        }
      }
    }

    this.root.appendChild(edgesG);

    // ── 7. Render nodes (circle on top, name below) ──
    const nodesG = this.el('g', { class: 'nodes' });
    for (const [norm, pos] of positions) {
      const person  = nameMap.get(norm);
      const dname   = dispName.get(norm) || norm;
      const isGhost = !person;
      const g = this.el('g', {
        class: `tree-node${isGhost ? ' ghost' : ''}`,
        transform: `translate(${pos.x},${pos.y})`
      });

      if (person) {
        g.style.cursor = 'pointer';
        g.addEventListener('click', () => this.openPerson(person));
      }

      // Circle avatar
      g.appendChild(this.el('circle', {
        cx: NW / 2, cy: CY, r: CR,
        class: isGhost ? 'node-circle ghost-circle' : 'node-circle'
      }));

      // Initials inside the circle
      const initT = this.el('text', {
        x: NW / 2, y: CY,
        'text-anchor': 'middle',
        'dominant-baseline': 'central',
        class: 'node-initials'
      });
      initT.textContent = initials(dname);
      g.appendChild(initT);

      // Name underneath (up to 2 lines)
      const lines = this._wrapName(dname, 16);
      const nameY = CY + CR + 18;
      lines.forEach((line, i) => {
        const t = this.el('text', {
          x: NW / 2, y: nameY + i * 15,
          'text-anchor': 'middle',
          class: 'node-name'
        });
        t.textContent = line;
        g.appendChild(t);
      });

      // Birth–death years below the name
      if (person?.info.dateOfBirth) {
        const by = getYear(person.info.dateOfBirth);
        const dy = getYear(person.info.dateOfDeath);
        const yt = this.el('text', {
          x: NW / 2, y: nameY + lines.length * 15 + 2,
          'text-anchor': 'middle',
          class: 'node-year'
        });
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

    const relRow = (label, val) => {
      const names = Array.isArray(val) ? val : (val ? [val] : []);
      if (!names.length) return '';
      return `<div class="modal-rel-row">
        <span class="rel-lbl">${label}</span>
        <span class="rel-vals">${names.map(esc).join(', ')}</span>
      </div>`;
    };

    const patGps = [r.patGrandmother, r.patGrandfather].filter(Boolean);
    const matGps = [r.matGrandmother, r.matGrandfather].filter(Boolean);

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
            ${relRow('Mother',                  r.mother)}
            ${relRow('Father',                  r.father)}
            ${relRow('Paternal Grandparents',   patGps)}
            ${relRow('Maternal Grandparents',   matGps)}
            ${relRow('Siblings',                r.siblings)}
            ${relRow('Spouse / Partner',        r.spouse)}
            ${relRow('Children',                r.children)}
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

    const clearBtn = document.getElementById('clearAllBtn');
    if (clearBtn) clearBtn.addEventListener('click', () => this.clearAll());
  },

  onViewChange(view) {
    if (view === 'tree')    Tree.render();
    if (view === 'members') Members.render();
    if (view === 'home')    this.updateStats();
  },

  updateStats() {
    const persons = Storage.getAll();
    const connSet = new Set();
    persons.forEach(p => {
      SINGLE_RELS.forEach(r => { if (p.rels[r]) connSet.add(normName(p.rels[r])); });
      LIST_RELS.forEach(r => (p.rels[r] || []).forEach(n => connSet.add(normName(n))));
    });
    const stories = persons.filter(p => p.info.bio).length;

    const sM = document.getElementById('statMembers');
    const sC = document.getElementById('statConnections');
    const sS = document.getElementById('statStories');
    if (sM) sM.textContent = persons.length;
    if (sC) sC.textContent = connSet.size;
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
  },

  clearAll() {
    const count = Storage.getAll().length;
    if (count === 0) { showToast('Nothing to clear — the tree is already empty.', 'info'); return; }
    if (!confirm(`Permanently delete all ${count} entries and start over? This cannot be undone.`)) return;
    localStorage.removeItem(Storage.KEY);
    showToast('All family data cleared. Starting fresh!', 'info');
    App.updateStats();
    if (Router.current === 'tree')    Tree.render();
    if (Router.current === 'members') Members.render();
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
