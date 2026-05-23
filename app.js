'use strict';

/* =====================================================================
   STORAGE
   ===================================================================== */
const Storage = {
  KEY: 'thomasFamilyTree_v2',

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
  getById(id) { return this.getAll().find(p => p.id === id) || null; },
  findByName(name) {
    const n = normName(name);
    return this.getAll().find(p => normName(p.info.fullName) === n) || null;
  },
  clearAll() { localStorage.removeItem(this.KEY); }
};

/* =====================================================================
   UTILITIES
   ===================================================================== */
function normName(s) { return (s || '').trim().toLowerCase().replace(/\s+/g, ' '); }
function uid() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }
function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function initials(name) {
  return (name || '').split(/\s+/).filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase();
}
function svgEl(tag, attrs = {}) {
  const e = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  return e;
}

/* =====================================================================
   TOAST
   ===================================================================== */
function showToast(msg) {
  let el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    el.className = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), 2800);
}

/* =====================================================================
   FALLING PETALS
   ===================================================================== */
function spawnPetals() {
  const wrap = document.getElementById('petals');
  if (!wrap) return;
  const variants = ['', 'gold', 'olive'];
  for (let i = 0; i < 22; i++) {
    const p = document.createElement('div');
    p.className = 'petal ' + variants[i % 3];
    const dur = 14 + Math.random() * 16;
    const delay = -Math.random() * 20;
    p.style.left = (Math.random() * 100) + 'vw';
    p.style.animationDuration = dur + 's';
    p.style.animationDelay = delay + 's';
    p.style.width = (10 + Math.random() * 8) + 'px';
    p.style.height = (14 + Math.random() * 10) + 'px';
    wrap.appendChild(p);
  }
}

/* =====================================================================
   FORM
   ===================================================================== */
const SINGLE_RELS = ['mother', 'father', 'patGrandmother', 'patGrandfather', 'matGrandmother', 'matGrandfather', 'spouse'];
const LIST_RELS = ['siblings', 'children'];

// Map form field IDs ↔ data keys
const FIELD_TO_REL = {
  fMother: 'mother', fFather: 'father',
  fPGM: 'patGrandmother', fPGF: 'patGrandfather',
  fMGM: 'matGrandmother', fMGF: 'matGrandfather',
  fSpouse: 'spouse'
};

const FormManager = {
  init() {
    document.getElementById('btnAddSib').addEventListener('click', () => this.addRow('siblingList', "Sibling's name"));
    document.getElementById('btnAddChild').addEventListener('click', () => this.addRow('childList', "Child's name"));
    document.getElementById('btnSubmit').addEventListener('click', () => this.submit());
  },

  addRow(containerId, placeholder, value = '') {
    const container = document.getElementById(containerId);
    const row = document.createElement('div');
    row.className = 'row';
    row.innerHTML = `<input class="input" placeholder="${esc(placeholder)}" value="${esc(value)}">
                     <button class="row-remove" title="remove">×</button>`;
    row.querySelector('.row-remove').addEventListener('click', () => {
      row.style.transition = 'opacity .2s, transform .2s';
      row.style.opacity = 0;
      row.style.transform = 'translateX(-12px)';
      setTimeout(() => row.remove(), 200);
    });
    container.appendChild(row);
    return row;
  },

  getListValues(containerId) {
    return [...document.querySelectorAll(`#${containerId} .input`)]
      .map(i => i.value.trim()).filter(Boolean);
  },

  collect() {
    const info = {
      fullName: document.getElementById('fName').value.trim(),
      born: document.getElementById('fBorn').value.trim(),
      died: document.getElementById('fDied').value.trim(),
      location: document.getElementById('fLoc').value.trim(),
      bio: document.getElementById('fBio').value.trim()
    };
    const rels = {};
    for (const [fieldId, relKey] of Object.entries(FIELD_TO_REL)) {
      rels[relKey] = document.getElementById(fieldId).value.trim();
    }
    rels.siblings = this.getListValues('siblingList');
    rels.children = this.getListValues('childList');
    return { info, rels };
  },

  reset() {
    document.getElementById('personId').value = '';
    document.getElementById('fName').value = '';
    document.getElementById('fBorn').value = '';
    document.getElementById('fDied').value = '';
    document.getElementById('fLoc').value = '';
    document.getElementById('fBio').value = '';
    for (const fieldId of Object.keys(FIELD_TO_REL)) document.getElementById(fieldId).value = '';
    document.getElementById('siblingList').innerHTML = '';
    document.getElementById('childList').innerHTML = '';
  },

  load(person) {
    this.reset();
    document.getElementById('personId').value = person.id;
    document.getElementById('fName').value = person.info.fullName || '';
    document.getElementById('fBorn').value = person.info.born || '';
    document.getElementById('fDied').value = person.info.died || '';
    document.getElementById('fLoc').value = person.info.location || '';
    document.getElementById('fBio').value = person.info.bio || '';
    for (const [fieldId, relKey] of Object.entries(FIELD_TO_REL)) {
      document.getElementById(fieldId).value = person.rels[relKey] || '';
    }
    (person.rels.siblings || []).forEach(n => this.addRow('siblingList', "Sibling's name", n));
    (person.rels.children || []).forEach(n => this.addRow('childList', "Child's name", n));
    // Make sure sidebar is visible
    const sb = document.getElementById('sidebar');
    sb.classList.remove('collapsed');
    document.getElementById('canvasWrap').classList.remove('sidebar-collapsed');
    document.getElementById('legend').classList.remove('sidebar-collapsed');
    document.getElementById('fName').focus();
  },

  submit() {
    const { info, rels } = this.collect();
    if (!info.fullName) {
      this.flashField('fName');
      return;
    }
    const editId = document.getElementById('personId').value;
    const existing = Storage.findByName(info.fullName);
    let person;
    if (existing && existing.id !== editId) {
      if (!confirm(`"${info.fullName}" is already recorded. Update their entry?`)) return;
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
    this.pulseSubmit();
    showToast(`${info.fullName} added to the tree.`);
    this.reset();
    Tree.render();
  },

  flashField(id) {
    const el = document.getElementById(id);
    el.animate([
      { borderColor: 'rgba(110,82,52,.4)' },
      { borderColor: '#a44141' },
      { borderColor: 'rgba(110,82,52,.4)' }
    ], { duration: 600 });
    el.focus();
  },

  pulseSubmit() {
    const btn = document.getElementById('btnSubmit');
    btn.animate([
      { transform: 'translateY(0) scale(1)' },
      { transform: 'translateY(-2px) scale(1.03)' },
      { transform: 'translateY(0) scale(1)' }
    ], { duration: 500, easing: 'cubic-bezier(.3,1.4,.5,1)' });
  }
};

/* =====================================================================
   TREE: layout + render
   ===================================================================== */
const Tree = {
  NODE_R: 46,
  COLUMN_W: 220,    // horizontal extent of one person (circle + name)
  GEN_GAP: 320,     // vertical gap between generation centers
  UNIT_GAP: 80,     // horizontal gap between unrelated descent units
  PAD: 200,         // viewport padding

  t: { x: 0, y: 0, s: 1 },

  init() {
    this.svg = document.getElementById('tree');
    this.viewport = document.getElementById('viewport');
    this.nodesLayer = document.getElementById('nodesLayer');
    this.connectorsLayer = document.getElementById('connectorsLayer');
    this.genLabelsLayer = document.getElementById('generationLabels');

    this._initPanZoom();

    document.getElementById('zoomIn').addEventListener('click', () => this.zoomBy(1.18));
    document.getElementById('zoomOut').addEventListener('click', () => this.zoomBy(1 / 1.18));
    document.getElementById('zoomFit').addEventListener('click', () => this.fit());
    document.getElementById('zoomCenter').addEventListener('click', () => this.fit());
    document.getElementById('btnFit').addEventListener('click', () => this.fit());
  },

  /* ---- main render ---- */
  render() {
    this.nodesLayer.innerHTML = '';
    this.connectorsLayer.innerHTML = '';
    this.genLabelsLayer.innerHTML = '';

    const persons = Storage.getAll();
    const emptyEl = document.getElementById('emptyState');
    if (persons.length === 0) {
      emptyEl.classList.remove('hidden');
      this._updateStats(0, 0);
      return;
    }
    emptyEl.classList.add('hidden');

    // ── 1. Build name registry ──
    const nameMap = new Map();   // norm → person|null
    const dispName = new Map();
    const reg = s => {
      if (!s) return;
      const n = normName(s);
      if (n && !dispName.has(n)) { dispName.set(n, s.trim()); nameMap.set(n, null); }
    };
    for (const p of persons) {
      const n = normName(p.info.fullName);
      nameMap.set(n, p);
      dispName.set(n, p.info.fullName.trim());
      SINGLE_RELS.forEach(r => reg(p.rels[r]));
      LIST_RELS.forEach(r => (p.rels[r] || []).forEach(reg));
    }
    const allNorm = [...nameMap.keys()];

    // ── 2. Build relationships ──
    const childrenOf = new Map();
    const parentsOf = new Map();
    const siblingOf = new Map();

    const addEdge = (par, chi) => {
      const p = normName(par), c = normName(chi);
      if (!p || !c || p === c) return;
      if (!childrenOf.has(p)) childrenOf.set(p, new Set());
      childrenOf.get(p).add(c);
      if (!parentsOf.has(c)) parentsOf.set(c, new Set());
      parentsOf.get(c).add(p);
    };
    const addSibling = (a, b) => {
      const an = normName(a), bn = normName(b);
      if (!an || !bn || an === bn) return;
      if (!siblingOf.has(an)) siblingOf.set(an, new Set());
      siblingOf.get(an).add(bn);
      if (!siblingOf.has(bn)) siblingOf.set(bn, new Set());
      siblingOf.get(bn).add(an);
    };

    for (const p of persons) {
      const pn = normName(p.info.fullName);
      if (p.rels.mother) addEdge(p.rels.mother, pn);
      if (p.rels.father) addEdge(p.rels.father, pn);
      (p.rels.children || []).forEach(chi => addEdge(pn, chi));
      (p.rels.siblings || []).forEach(sb => addSibling(pn, sb));
    }

    // Paternal/maternal grandparents are parents of the FATHER/MOTHER
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

    // Siblings inherit parents (unless they have their own form with different ones)
    for (const p of persons) {
      const m = p.rels.mother ? normName(p.rels.mother) : null;
      const f = p.rels.father ? normName(p.rels.father) : null;
      if (!m && !f) continue;
      for (const sib of (p.rels.siblings || [])) {
        const sn = normName(sib);
        if (!sn) continue;
        const sibPerson = nameMap.get(sn);
        const sibHasMother = sibPerson?.rels?.mother;
        const sibHasFather = sibPerson?.rels?.father;
        if (m && !sibHasMother) addEdge(m, sn);
        if (f && !sibHasFather) addEdge(f, sn);
      }
    }

    // Pair couples ONLY from shared parenthood (exactly 2 listed)
    const spouseOf = new Map();
    const addSpouse = (a, b) => {
      if (!a || !b || a === b) return;
      if (!spouseOf.has(a)) spouseOf.set(a, new Set());
      spouseOf.get(a).add(b);
      if (!spouseOf.has(b)) spouseOf.set(b, new Set());
      spouseOf.get(b).add(a);
    };
    for (const ps of parentsOf.values()) {
      if (ps.size === 2) {
        const [a, b] = [...ps];
        addSpouse(a, b);
      }
    }

    // ── 3. Build units (single OR couple) with memberAncestors ──
    const unitOf = new Map();
    const units = new Map();

    for (const norm of allNorm) {
      if (unitOf.has(norm)) continue;
      const sp = [...(spouseOf.get(norm) || [])].filter(s => !unitOf.has(s)).sort()[0];
      if (sp) {
        const id = `u:${[norm, sp].sort().join('+')}`;
        units.set(id, { members: [norm, sp], children: new Set(), parents: new Set(), memberAncestors: [null, null] });
        unitOf.set(norm, id);
        unitOf.set(sp, id);
      } else {
        const id = `u:${norm}`;
        units.set(id, { members: [norm], children: new Set(), parents: new Set(), memberAncestors: [null] });
        unitOf.set(norm, id);
      }
    }

    // Link parents → children. Couple children: store via memberAncestors so each
    // spouse's lineage hangs above THEM. Single children: standard descent edge.
    for (const [chi, ps] of parentsOf) {
      const cu = unitOf.get(chi);
      if (!cu) continue;
      const cuData = units.get(cu);
      let bestU = null, bestMatch = 0;
      for (const par of ps) {
        const pu = unitOf.get(par);
        if (!pu) continue;
        const m = units.get(pu).members.filter(mem => ps.has(mem)).length;
        if (m > bestMatch) { bestU = pu; bestMatch = m; }
      }
      if (!bestU || bestU === cu) continue;
      if (cuData.members.length === 2) {
        const idx = cuData.members.indexOf(chi);
        if (idx >= 0) cuData.memberAncestors[idx] = bestU;
      } else {
        units.get(bestU).children.add(cu);
        cuData.parents.add(bestU);
      }
    }

    // ── 4. Helper: column width of a unit, accounting for ancestors above ──
    const colW = new Map();
    const computeColW = (uid) => {
      if (colW.has(uid)) return colW.get(uid);
      const u = units.get(uid);
      let w;
      if (u.members.length === 1) {
        w = this.COLUMN_W;
      } else {
        const lA = u.memberAncestors[0];
        const rA = u.memberAncestors[1];
        const lc = lA ? computeColW(lA) : this.COLUMN_W;
        const rc = rA ? computeColW(rA) : this.COLUMN_W;
        w = lc + rc; // members are each centered in their column
      }
      colW.set(uid, w);
      return w;
    };

    const memberCenterInUnit = (uid, idx, unitLeftX) => {
      const u = units.get(uid);
      if (u.members.length === 1) return unitLeftX + this.COLUMN_W / 2;
      const lA = u.memberAncestors[0];
      const rA = u.memberAncestors[1];
      const lc = lA ? computeColW(lA) : this.COLUMN_W;
      const rc = rA ? computeColW(rA) : this.COLUMN_W;
      if (idx === 0) return unitLeftX + lc / 2;
      return unitLeftX + lc + rc / 2;
    };

    const coupleCenterX = (uid, unitLeftX) => {
      const u = units.get(uid);
      if (u.members.length === 1) return unitLeftX + this.COLUMN_W / 2;
      return (memberCenterInUnit(uid, 0, unitLeftX) + memberCenterInUnit(uid, 1, unitLeftX)) / 2;
    };

    // ── 5. Assign generation levels ──
    const ascDepth = new Map();
    const computeAsc = (uid) => {
      if (ascDepth.has(uid)) return ascDepth.get(uid);
      const u = units.get(uid);
      if (u.members.length !== 2) { ascDepth.set(uid, 0); return 0; }
      let max = 0;
      for (let i = 0; i < 2; i++) {
        const a = u.memberAncestors[i];
        if (a) max = Math.max(max, 1 + computeAsc(a));
      }
      ascDepth.set(uid, max);
      return max;
    };

    const allUnits = [...units.keys()];
    const descentRoots = allUnits.filter(u => units.get(u).parents.size === 0);
    const unitLevel = new Map();
    const q = descentRoots.map(u => [u, 0]);
    let qi = 0;
    while (qi < q.length) {
      const [u, lv] = q[qi++];
      if (!unitLevel.has(u) || unitLevel.get(u) < lv) {
        unitLevel.set(u, lv);
        for (const cu of units.get(u).children) q.push([cu, lv + 1]);
      }
    }
    for (const u of allUnits) if (!unitLevel.has(u)) unitLevel.set(u, 0);
    let maxAsc = 0;
    for (const u of descentRoots) maxAsc = Math.max(maxAsc, computeAsc(u));
    if (maxAsc > 0) for (const [u, lv] of unitLevel) unitLevel.set(u, lv + maxAsc);

    // ── 6. Tidy-tree descent layout ──
    const orderKey = (u) => {
      const mem = units.get(u).members[0];
      const person = nameMap.get(mem);
      return (person?.info.born || '9999') + (dispName.get(mem) || mem);
    };
    const sortedKids = (u) =>
      [...units.get(u).children].sort((a, b) => orderKey(a).localeCompare(orderKey(b)));

    const subW = new Map();
    const unitX = new Map(); // left edge of unit's bounding column
    const beingCalc = new Set();
    const placed = new Set();

    const calcW = (u) => {
      if (subW.has(u)) return subW.get(u);
      if (beingCalc.has(u)) return computeColW(u);
      beingCalc.add(u);
      const my = computeColW(u);
      const kids = sortedKids(u);
      if (!kids.length) { subW.set(u, my); return my; }
      let w = 0;
      for (const c of kids) w += calcW(c);
      w += (kids.length - 1) * this.UNIT_GAP;
      w = Math.max(w, my);
      subW.set(u, w);
      return w;
    };

    const place = (u, leftX) => {
      if (placed.has(u)) return;
      placed.add(u);
      const my = computeColW(u);
      const sw = calcW(u);
      const cx = leftX + sw / 2;
      unitX.set(u, cx - my / 2);
      const kids = sortedKids(u);
      if (!kids.length) return;
      // Center children under couple center (not bounding-box center)
      const cc = coupleCenterX(u, unitX.get(u));
      let kidsTotal = 0;
      for (const c of kids) kidsTotal += calcW(c);
      if (kids.length > 1) kidsTotal += (kids.length - 1) * this.UNIT_GAP;
      let cur = cc - kidsTotal / 2;
      for (const c of kids) {
        place(c, cur);
        cur += calcW(c) + this.UNIT_GAP;
      }
    };

    descentRoots.sort((a, b) => orderKey(a).localeCompare(orderKey(b)));
    let total = 0;
    descentRoots.forEach((r, i) => { total += calcW(r); if (i > 0) total += this.UNIT_GAP; });
    let cursor = -total / 2;
    for (const r of descentRoots) {
      place(r, cursor);
      cursor += calcW(r) + this.UNIT_GAP;
    }

    // ── 7. Per-person positions (center-based) ──
    const positions = new Map();
    const writeMemberPositions = (uid) => {
      const u = units.get(uid);
      const ux = unitX.get(uid);
      const y = unitLevel.get(uid) * this.GEN_GAP;
      u.members.forEach((mem, i) => {
        positions.set(mem, { x: memberCenterInUnit(uid, i, ux), y });
      });
    };
    for (const uid of unitX.keys()) writeMemberPositions(uid);

    // Ascent: place ancestor units above each couple's specific member
    const placeAscent = (uid) => {
      const u = units.get(uid);
      if (u.members.length !== 2) return;
      const myLvl = unitLevel.get(uid);
      if (myLvl == null) return;
      for (let i = 0; i < 2; i++) {
        const ancId = u.memberAncestors[i];
        if (!ancId || unitX.has(ancId)) continue;
        const memPos = positions.get(u.members[i]);
        if (!memPos) continue;
        const ancW = computeColW(ancId);
        unitX.set(ancId, memPos.x - ancW / 2);
        unitLevel.set(ancId, myLvl - 1);
        writeMemberPositions(ancId);
        placeAscent(ancId);
      }
    };
    for (const uid of [...unitX.keys()]) placeAscent(uid);

    // ── 8. Generation labels ──
    const levels = [...new Set([...unitLevel.values()])].sort((a, b) => a - b);
    const labelText = (lvIdx, count) => {
      const roman = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'][lvIdx] || (lvIdx + 1);
      const titles = ['Founding Generation', 'Forebears', 'The Parents', 'Siblings & Spouses', 'The Children', "Children's Children"];
      const title = lvIdx >= count - 1 ? 'The Living Branch' : (titles[lvIdx] || `Generation ${roman}`);
      return `· ${roman} · ${title}`;
    };

    // ── 9. Compute viewBox from actual positions ──
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const [, pos] of positions) {
      minX = Math.min(minX, pos.x); maxX = Math.max(maxX, pos.x);
      minY = Math.min(minY, pos.y); maxY = Math.max(maxY, pos.y);
    }
    const PAD = this.PAD;
    const vbX = minX - PAD;
    const vbY = minY - PAD - 30; // extra for generation labels in the gutter
    const vbW = (maxX - minX) + PAD * 2;
    const vbH = (maxY - minY) + PAD * 2 + 60;
    this.svg.setAttribute('viewBox', `${vbX} ${vbY} ${vbW} ${vbH}`);

    // Draw generation labels in the left gutter
    levels.forEach((lv, idx) => {
      const y = lv * this.GEN_GAP;
      const t = svgEl('text', { class: 'gen-label', x: vbX + 30, y: y - this.NODE_R - 36 });
      t.textContent = labelText(idx, levels.length);
      t.style.opacity = 0;
      t.style.transition = 'opacity 1.2s ease ' + (0.3 + idx * 0.12) + 's';
      this.genLabelsLayer.appendChild(t);
      requestAnimationFrame(() => { t.style.opacity = .55; });
    });

    // ── 10. Draw connectors ──
    this._drawConnectors(units, unitX, unitLevel, positions, coupleCenterX, computeColW);

    // ── 11. Draw nodes ──
    this._drawNodes(positions, nameMap, dispName);

    // Stats
    this._updateStats(persons.length, levels.length);

    // Fit on first render of fresh data
    this.fit();
  },

  _drawConnectors(units, unitX, unitLevel, positions, coupleCenterX, computeColW) {
    const NR = this.NODE_R;
    let delay = 600;

    // Marriage bars
    for (const [uid, u] of units) {
      if (u.members.length !== 2 || !unitX.has(uid)) continue;
      const m0 = positions.get(u.members[0]);
      const m1 = positions.get(u.members[1]);
      if (!m0 || !m1) continue;
      const xa = m0.x + NR;
      const xb = m1.x - NR;
      const y = m0.y;
      const line = svgEl('path', { d: `M ${xa} ${y} L ${xb} ${y}`, class: 'connector marriage-bar' });
      this._animateDraw(line, delay);
      this.connectorsLayer.appendChild(line);

      // ∞ glyph at midpoint
      const mx = (xa + xb) / 2;
      const orn = svgEl('text', {
        x: mx, y: y - 8, class: 'marriage-glyph',
        'text-anchor': 'middle', 'font-family': 'Cormorant Garamond, serif',
        'font-size': '22', 'font-style': 'italic'
      });
      orn.textContent = '∞';
      orn.style.opacity = 0;
      orn.style.transition = 'opacity .8s ease ' + (delay + 400) + 'ms';
      this.connectorsLayer.appendChild(orn);
      requestAnimationFrame(() => { orn.style.opacity = .85; });
      delay += 80;
    }

    // Descent: parent (single OR couple) → children
    for (const [uid, u] of units) {
      if (!unitX.has(uid)) continue;
      if (u.children.size === 0) continue;
      const isCouple = u.members.length === 2;
      const m0 = positions.get(u.members[0]);
      if (!m0) continue;
      const srcX = isCouple ? coupleCenterX(uid, unitX.get(uid)) : m0.x;
      const srcY = isCouple ? m0.y : m0.y + NR;
      const kids = [...u.children].filter(c => unitX.has(c));
      if (!kids.length) continue;
      const kidPts = kids.map(c => {
        const cu = units.get(c);
        const c0 = positions.get(cu.members[0]);
        const c1 = cu.members.length === 2 ? positions.get(cu.members[1]) : null;
        const cx = c1 ? coupleCenterX(c, unitX.get(c)) : c0.x;
        return { x: cx, y: c0.y - NR };
      });
      const minKidY = Math.min(...kidPts.map(k => k.y));
      const stubY = srcY + (minKidY - srcY) * 0.45;
      const stub = svgEl('path', { d: `M ${srcX} ${srcY} L ${srcX} ${stubY}`, class: 'connector' });
      this._animateDraw(stub, delay);
      this.connectorsLayer.appendChild(stub);

      if (kidPts.length === 1) {
        const k = kidPts[0];
        const drop = svgEl('path', {
          d: `M ${srcX} ${stubY} L ${srcX} ${stubY + 30} L ${k.x} ${stubY + 30} L ${k.x} ${k.y}`,
          class: 'connector'
        });
        this._animateDraw(drop, delay + 120);
        this.connectorsLayer.appendChild(drop);
      } else {
        const childXs = kidPts.map(k => k.x).sort((a, b) => a - b);
        const left = childXs[0], right = childXs[childXs.length - 1];
        const barY = stubY + 30;
        const bar = svgEl('path', { d: `M ${left} ${barY} L ${right} ${barY}`, class: 'connector sibling-bar' });
        this._animateDraw(bar, delay + 120);
        this.connectorsLayer.appendChild(bar);
        const midDrop = svgEl('path', { d: `M ${srcX} ${stubY} L ${srcX} ${barY}`, class: 'connector' });
        this._animateDraw(midDrop, delay + 80);
        this.connectorsLayer.appendChild(midDrop);
        kidPts.forEach((k, i) => {
          const drop = svgEl('path', { d: `M ${k.x} ${barY} L ${k.x} ${k.y}`, class: 'connector' });
          this._animateDraw(drop, delay + 200 + i * 60);
          this.connectorsLayer.appendChild(drop);
        });
      }
      delay += 120;
    }

    // Ancestor → specific child member (couple's left/right spouse)
    for (const [uid, u] of units) {
      if (u.members.length !== 2 || !unitX.has(uid)) continue;
      for (let i = 0; i < 2; i++) {
        const ancId = u.memberAncestors[i];
        if (!ancId || !unitX.has(ancId)) continue;
        const anc = units.get(ancId);
        const anc0 = positions.get(anc.members[0]);
        const anc1 = anc.members.length === 2 ? positions.get(anc.members[1]) : null;
        if (!anc0) continue;
        const ancCx = anc1 ? coupleCenterX(ancId, unitX.get(ancId)) : anc0.x;
        const ancSrcY = anc1 ? anc0.y : anc0.y + NR;
        const childMem = positions.get(u.members[i]);
        if (!childMem) continue;
        const childCx = childMem.x;
        const childTopY = childMem.y - NR;
        const midY = (ancSrcY + childTopY) / 2;
        const path = svgEl('path', {
          d: `M ${ancCx} ${ancSrcY} L ${ancCx} ${midY} L ${childCx} ${midY} L ${childCx} ${childTopY}`,
          class: 'connector'
        });
        this._animateDraw(path, delay);
        this.connectorsLayer.appendChild(path);
        delay += 60;
      }
    }
  },

  _drawNodes(positions, nameMap, dispName) {
    const NR = this.NODE_R;
    let i = 0;
    for (const [norm, pos] of positions) {
      const person = nameMap.get(norm);
      const dname = dispName.get(norm) || norm;
      const isGhost = !person;
      const g = svgEl('g', {
        class: `node${isGhost ? ' ghost' : ''}`,
        'data-norm': norm,
        transform: `translate(${pos.x},${pos.y})`
      });
      g.style.opacity = 0;
      g.style.transform = `translate(${pos.x}px, ${pos.y}px) scale(.4)`;

      g.appendChild(svgEl('circle', { class: 'node-ring', r: NR + 8 }));
      g.appendChild(svgEl('circle', { class: 'node-circle', r: NR, cx: 0, cy: 0 }));
      g.appendChild(svgEl('circle', {
        r: NR - 4, cx: 0, cy: 0,
        fill: 'none', stroke: 'rgba(255,235,190,.35)', 'stroke-width': 1.2
      }));

      const init = svgEl('text', { class: 'node-initials', 'font-size': 30, x: 0, y: 2 });
      init.textContent = initials(dname);
      g.appendChild(init);

      // Wrap long names onto two lines
      const lines = this._wrapName(dname, 22);
      lines.forEach((line, idx) => {
        const nm = svgEl('text', {
          class: 'node-name',
          'font-size': lines.length === 1 ? 30 : 26,
          x: 0, y: NR + 36 + idx * 26
        });
        nm.textContent = line;
        g.appendChild(nm);
      });

      // Dates (only if entered)
      if (person && (person.info.born || person.info.died)) {
        const dt = svgEl('text', {
          class: 'node-dates', 'font-size': 12,
          x: 0, y: NR + 36 + lines.length * 26 + 6
        });
        const b = person.info.born || '?';
        const d = person.info.died || 'present';
        dt.textContent = `${b} — ${d}`;
        g.appendChild(dt);
      }

      this.nodesLayer.appendChild(g);

      // Wave-in animation
      const delay = 700 + i * 50;
      setTimeout(() => {
        g.style.transition = 'opacity .8s ease, transform .9s cubic-bezier(.2,1.4,.4,1)';
        g.style.opacity = 1;
        g.style.transform = `translate(${pos.x}px, ${pos.y}px) scale(1)`;
      }, delay);

      // Interactions
      g.addEventListener('mouseenter', e => Tooltip.show(e, dname + (person?.info.born ? ` · ${person.info.born}` : '')));
      g.addEventListener('mousemove', e => Tooltip.move(e));
      g.addEventListener('mouseleave', () => Tooltip.hide());
      g.addEventListener('click', e => {
        e.stopPropagation();
        if (person) Detail.open(person);
      });

      i++;
    }
  },

  _wrapName(name, maxChars) {
    if (name.length <= maxChars) return [name];
    const words = name.split(/\s+/);
    const lines = [''];
    for (const w of words) {
      const tryLine = (lines[lines.length - 1] + ' ' + w).trim();
      if (tryLine.length <= maxChars) lines[lines.length - 1] = tryLine;
      else lines.push(w);
    }
    return lines.slice(0, 2).map(l => l.length > maxChars ? l.slice(0, maxChars - 1) + '…' : l);
  },

  _animateDraw(pathEl, delay) {
    try {
      requestAnimationFrame(() => {
        const len = pathEl.getTotalLength ? pathEl.getTotalLength() : 200;
        pathEl.style.strokeDasharray = len;
        pathEl.style.strokeDashoffset = len;
        pathEl.style.transition = `stroke-dashoffset 1.3s cubic-bezier(.7,0,.3,1) ${delay}ms`;
        requestAnimationFrame(() => { pathEl.style.strokeDashoffset = 0; });
      });
    } catch (e) {}
  },

  _updateStats(people, gens) {
    document.getElementById('statPeople').textContent = people;
    document.getElementById('statGens').textContent = gens;
  },

  /* ---- pan & zoom ---- */
  _applyT() {
    this.viewport.setAttribute('transform', `translate(${this.t.x} ${this.t.y}) scale(${this.t.s})`);
  },

  _initPanZoom() {
    const wrap = document.getElementById('canvasWrap');
    let dragging = false, startX = 0, startY = 0, startTx = 0, startTy = 0;

    wrap.addEventListener('mousedown', e => {
      if (e.target.closest('.node') || e.target.closest('.controls') ||
          e.target.closest('.legend') || e.target.closest('.detail-panel') ||
          e.target.closest('.sidebar') || e.target.closest('.app-header')) return;
      dragging = true;
      wrap.classList.add('dragging');
      startX = e.clientX; startY = e.clientY;
      startTx = this.t.x; startTy = this.t.y;
    });
    window.addEventListener('mousemove', e => {
      if (!dragging) return;
      const rect = this.svg.getBoundingClientRect();
      const vb = this.svg.viewBox.baseVal;
      const scaleX = vb.width / rect.width;
      const scaleY = vb.height / rect.height;
      this.t.x = startTx + (e.clientX - startX) * scaleX;
      this.t.y = startTy + (e.clientY - startY) * scaleY;
      this._applyT();
    });
    window.addEventListener('mouseup', () => { dragging = false; wrap.classList.remove('dragging'); });

    wrap.addEventListener('wheel', e => {
      if (e.target.closest('.sidebar') || e.target.closest('.detail-panel')) return;
      e.preventDefault();
      const dir = e.deltaY > 0 ? 0.92 : 1.08;
      this.zoomBy(dir, e.clientX, e.clientY);
    }, { passive: false });

    // Click empty area closes detail
    wrap.addEventListener('click', e => {
      if (e.target.closest('.node')) return;
      Detail.close();
    });

    // Keyboard
    window.addEventListener('keydown', e => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      const step = 60;
      if (e.key === 'ArrowLeft')  { this.t.x += step; this._applyT(); }
      if (e.key === 'ArrowRight') { this.t.x -= step; this._applyT(); }
      if (e.key === 'ArrowUp')    { this.t.y += step; this._applyT(); }
      if (e.key === 'ArrowDown')  { this.t.y -= step; this._applyT(); }
      if (e.key === '+' || e.key === '=') this.zoomBy(1.12);
      if (e.key === '-') this.zoomBy(1 / 1.12);
      if (e.key === 'Escape') Detail.close();
    });
  },

  zoomBy(factor, clientX, clientY) {
    const ns = Math.max(0.3, Math.min(4, this.t.s * factor));
    if (clientX != null && clientY != null) {
      const rect = this.svg.getBoundingClientRect();
      const vb = this.svg.viewBox.baseVal;
      const cx = (clientX - rect.left) / rect.width * vb.width + vb.x;
      const cy = (clientY - rect.top) / rect.height * vb.height + vb.y;
      const k = ns / this.t.s;
      this.t.x = cx - (cx - this.t.x) * k;
      this.t.y = cy - (cy - this.t.y) * k;
    }
    this.t.s = ns;
    this._applyT();
  },

  fit() { this.t.x = 0; this.t.y = 0; this.t.s = 1; this._applyT(); }
};

/* =====================================================================
   DETAIL PANEL
   ===================================================================== */
const Detail = {
  init() {
    document.getElementById('detailClose').addEventListener('click', () => this.close());
    document.getElementById('detailEdit').addEventListener('click', () => {
      if (this.current) { FormManager.load(this.current); this.close(); }
    });
    document.getElementById('detailDelete').addEventListener('click', () => {
      if (!this.current) return;
      if (!confirm(`Remove ${this.current.info.fullName} from the tree?`)) return;
      Storage.delete(this.current.id);
      this.close();
      Tree.render();
      showToast('Entry removed.');
    });
  },
  current: null,

  open(person) {
    this.current = person;
    document.querySelectorAll('.node').forEach(n =>
      n.classList.toggle('selected', n.dataset.norm === normName(person.info.fullName)));

    document.getElementById('detailPortrait').textContent = initials(person.info.fullName);
    document.getElementById('detailName').textContent = person.info.fullName;
    const b = person.info.born || '?';
    const d = person.info.died || 'present';
    document.getElementById('detailDates').textContent = `${b} — ${d}`;
    document.getElementById('detailLoc').textContent = person.info.location || '—';
    document.getElementById('detailBio').textContent = person.info.bio || 'No notes recorded.';

    const rel = document.getElementById('detailRelations');
    rel.innerHTML = '';

    const addChip = (label, name) => {
      if (!name) return;
      const c = document.createElement('div');
      c.className = 'relation-chip';
      c.textContent = `${label} · ${name}`;
      c.addEventListener('click', () => {
        const target = Storage.findByName(name);
        if (target) this.open(target);
      });
      rel.appendChild(c);
    };

    addChip('Mother', person.rels.mother);
    addChip('Father', person.rels.father);
    addChip('Spouse', person.rels.spouse);
    addChip('Paternal Grandmother', person.rels.patGrandmother);
    addChip('Paternal Grandfather', person.rels.patGrandfather);
    addChip('Maternal Grandmother', person.rels.matGrandmother);
    addChip('Maternal Grandfather', person.rels.matGrandfather);
    (person.rels.siblings || []).forEach(s => addChip('Sibling', s));
    (person.rels.children || []).forEach(c => addChip('Child', c));

    document.getElementById('detail').classList.add('open');
  },

  close() {
    document.getElementById('detail').classList.remove('open');
    document.querySelectorAll('.node.selected').forEach(n => n.classList.remove('selected'));
    this.current = null;
  }
};

/* =====================================================================
   TOOLTIP
   ===================================================================== */
const Tooltip = {
  el: null,
  show(e, text) {
    if (!this.el) this.el = document.getElementById('tooltip');
    this.el.textContent = text;
    this.el.classList.add('show');
    this.move(e);
  },
  move(e) {
    if (!this.el) return;
    this.el.style.left = e.clientX + 'px';
    this.el.style.top = e.clientY + 'px';
  },
  hide() { if (this.el) this.el.classList.remove('show'); }
};

/* =====================================================================
   SIDEBAR TOGGLE
   ===================================================================== */
function initSidebarToggle() {
  const sidebar = document.getElementById('sidebar');
  const canvasWrap = document.getElementById('canvasWrap');
  const legend = document.getElementById('legend');
  document.getElementById('sidebarToggle').addEventListener('click', () => {
    const collapsed = sidebar.classList.toggle('collapsed');
    canvasWrap.classList.toggle('sidebar-collapsed', collapsed);
    legend.classList.toggle('sidebar-collapsed', collapsed);
  });
}

/* =====================================================================
   CLEAR ALL
   ===================================================================== */
function initClearAll() {
  document.getElementById('btnClear').addEventListener('click', () => {
    const n = Storage.getAll().length;
    if (n === 0) { showToast('The tree is already empty.'); return; }
    if (!confirm(`Permanently erase all ${n} entries and start over? This cannot be undone.`)) return;
    Storage.clearAll();
    Tree.render();
    showToast('All entries cleared. Begin again.');
  });
}

/* =====================================================================
   BOOT
   ===================================================================== */
document.addEventListener('DOMContentLoaded', () => {
  spawnPetals();
  FormManager.init();
  Tree.init();
  Detail.init();
  initSidebarToggle();
  initClearAll();
  Tree.render();
});
