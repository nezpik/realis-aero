/* Realis Pale specimen behaviour: the hour, the Bench, the Notebook, Keeps, the Graph (with Trail and List), the Spark and the Sketch.
 * Everything a person types stays in this browser (localStorage); nothing is sent anywhere. */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var root = document.documentElement, reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  function load(k, d) { try { return JSON.parse(localStorage.getItem(k)) || d; } catch (e) { return d; } }
  function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function say(t) { var a = $('#announce'); a.textContent = ''; setTimeout(function () { a.textContent = t; }, 30); }

  /* ---- art ---- */
  $('#art-steps').innerHTML = RealisPaleArt.steps();
  $('#art-path').innerHTML = RealisPaleArt.path();
  $$('.wick').forEach(function (w) { w.innerHTML = ['on', 'on', 'dim', 'on', 'dim', 'on', 'dim'].map(function (c) { return '<i class="' + c + '"></i>'; }).join(''); });
  $$('svg[aria-label=""]').forEach(function (s) { s.removeAttribute('role'); s.removeAttribute('aria-label'); s.setAttribute('aria-hidden', 'true'); });

  /* ---- the hour ---- */
  var prefs = load('rp.prefs.v1', { hour: 'dusk', theme: '', follow: false, clock: 'real' });
  var q = new URLSearchParams(location.search);
  if (q.get('hour')) prefs.hour = q.get('hour');
  if (q.get('theme') !== null) prefs.theme = q.get('theme');
  var followTimer = null;

  // Late from 21:00 and Deep from 23:30 until 05:00; otherwise Dusk. (Section 3.6 of the document.)
  function hourFor(d) { var m = d.getHours() * 60 + d.getMinutes(); return (m >= 1410 || m < 300) ? 'deep' : m >= 1260 ? 'late' : 'dusk'; }
  function nowFor(clock) { if (clock === 'real') return new Date(); var p = clock.split(':'); return new Date(2000, 0, 1, +p[0], +p[1]); }
  function setHour(h, how) {
    // A real change of hour takes 20 minutes; a chosen one 0.6 seconds; the demo clock 2.5 seconds so it can be watched.
    root.style.setProperty('--rp-fade', reduce.matches ? '0.01s' : how === 'follow-real' ? '1200s' : how === 'follow-demo' ? '2.5s' : '0.6s');
    root.dataset.hour = h; prefs.hour = h;
    $$('[data-hour-btn]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.hourBtn === h)); });
    save('rp.prefs.v1', prefs);
  }
  function tick() { setHour(hourFor(nowFor(prefs.clock)), prefs.clock === 'real' ? 'follow-real' : 'follow-demo'); }
  function setFollow(on) {
    prefs.follow = on; $('#follow').checked = on; clearInterval(followTimer);
    if (on) { tick(); followTimer = setInterval(tick, 60000); }
    save('rp.prefs.v1', prefs);
  }
  $$('[data-hour-btn]').forEach(function (b) {
    b.addEventListener('click', function () {
      if (prefs.follow) { setFollow(false); say('Following your evening is off. You chose ' + b.textContent + '.'); }
      setHour(b.dataset.hourBtn, 'manual');
    });
  });
  $('#follow').addEventListener('change', function () { setFollow(this.checked); say(this.checked ? 'The light will follow your evening.' : 'The light stays where you set it.'); });
  $('#clock').addEventListener('change', function () { prefs.clock = this.value; save('rp.prefs.v1', prefs); if (prefs.follow) tick(); });
  $('#theme').addEventListener('click', function () {
    var on = this.getAttribute('aria-pressed') !== 'true'; this.setAttribute('aria-pressed', String(on));
    if (on) root.dataset.theme = 'last-light'; else root.removeAttribute('data-theme'); prefs.theme = on ? 'last-light' : ''; save('rp.prefs.v1', prefs);
  });
  $('#clock').value = prefs.clock;
  if (prefs.theme) { root.dataset.theme = prefs.theme; $('#theme').setAttribute('aria-pressed', 'true'); }
  if (q.get('hour')) setHour(prefs.hour, 'manual'); else if (prefs.follow) setFollow(true); else setHour(prefs.hour, 'manual');
  root.style.setProperty('--rp-fade', '0.01s'); // no fade on first paint; each change sets its own

  /* ---- parts ---- */
  $('#glimmers').addEventListener('change', function () {
    $('#glimmer').hidden = !this.checked;
    $('#glimmer-note').textContent = this.checked ? 'On. One quiet Glimmer, never a badge, never a count.' : 'Off. Nothing will appear in your hours unless you ask.';
  });

  /* ---- Bench ---- */
  var idleTimer = null;
  function benchIdle() { document.body.classList.remove('idle'); clearTimeout(idleTimer); if (document.body.classList.contains('is-bench')) idleTimer = setTimeout(function () { document.body.classList.add('idle'); }, 4000); }
  $('#bench-enter').addEventListener('click', function () {
    document.body.classList.add('is-bench'); this.setAttribute('aria-pressed', 'true'); $('#bench-exit').hidden = false; $('#reading').classList.add('is-reading'); document.body.classList.add('reading-on'); benchIdle(); $('#bench-exit').focus();
  });
  $('#bench-exit').addEventListener('click', function () {
    document.body.classList.remove('is-bench', 'idle', 'reading-on'); $('#bench-enter').setAttribute('aria-pressed', 'false'); this.hidden = true; $('#reading').classList.remove('is-reading'); clearTimeout(idleTimer); $('#bench-enter').focus();
  });
  ['pointermove', 'keydown', 'pointerdown'].forEach(function (e) { document.addEventListener(e, benchIdle, { passive: true }); });

  /* ---- shared: a draggable, keyboard-movable item on a plane ---- */
  function movable(el, pos, id, onMove, onDone, plane, flag) {
    el.addEventListener('keydown', function (e) {
      var d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key]; if (!d) return;
      e.preventDefault(); var st = e.shiftKey ? 4 : 1, p = pos()[id];
      pos()[id] = [Math.max(4, Math.min(96, p[0] + d[0] * st)), Math.max(6, Math.min(94, p[1] + d[1] * st))]; onMove(); onDone();
    });
    el.addEventListener('pointerdown', function (e) {
      if (e.button) return; var r = plane.getBoundingClientRect(), sx = e.clientX, sy = e.clientY, p0 = pos()[id].slice(), drag = false;
      el.setPointerCapture(e.pointerId);
      function mv(ev) {
        if (!drag && Math.hypot(ev.clientX - sx, ev.clientY - sy) < 5) return; drag = true; el.classList.add('drag');
        pos()[id] = [Math.max(4, Math.min(96, p0[0] + (ev.clientX - sx) / r.width * 100)), Math.max(6, Math.min(94, p0[1] + (ev.clientY - sy) / r.height * 100))]; onMove();
      }
      function up() { el.removeEventListener('pointermove', mv); el.removeEventListener('pointerup', up); el.classList.remove('drag'); if (drag) { flag.moved = true; onDone(); setTimeout(function () { flag.moved = false; }, 0); } }
      el.addEventListener('pointermove', mv); el.addEventListener('pointerup', up);
    });
  }
  function clearSpark() { $$('.spark').forEach(function (s) { s.remove(); }); }
  function spark(container, left, top) {
    clearSpark(); var s = document.createElement('span'); s.className = 'spark' + (reduce.matches ? ' spark--static' : ''); s.setAttribute('aria-hidden', 'true');
    s.style.left = left; s.style.top = top; container.appendChild(s);
    if (!reduce.matches) s.addEventListener('animationend', function () { s.remove(); });
  }

  /* ---- Pages: one source of truth. The graph is made from the [[links]] in the text. ---- */
  var SEED = [
    { id: 'entropy', title: 'Entropy', x: 22, y: 30, body: 'How many ways a thing can be arranged without anyone telling the difference. See [[Information]].' },
    { id: 'information', title: 'Information', x: 46, y: 20, body: 'What a message saves you from having to guess.' },
    { id: 'compression', title: 'Compression', x: 72, y: 30, body: 'Saying the same thing in fewer words, and what that costs.' },
    { id: 'probability', title: 'Probability', x: 30, y: 64, body: 'A way of being honest about not knowing yet. Leads to [[Bayes’ rule]].' },
    { id: 'bayes', title: 'Bayes’ rule', x: 56, y: 74, body: 'How to change your mind by the right amount.' },
    { id: 'memory', title: 'Memory', x: 84, y: 62, body: 'What stays, and what the staying changes.' },
    { id: 'sleep', title: 'Sleep', x: 12, y: 84, body: 'Where a lot of it settles.' },
    { id: 'habits', title: 'Why habits stick', x: 86, y: 88, body: 'Not started yet.' },
    { id: 'question', title: 'A question I keep asking', x: 52, y: 46, body: 'Why does the page get easier the third time?' }
  ];
  var DEFAULT = { pages: SEED.map(function (p) { return { id: p.id, title: p.title, body: p.body, tags: [] }; }), pos: {}, lit: ['entropy', 'information', 'probability'], trail: ['entropy', 'information', 'probability'], last: 'entropy' };
  SEED.forEach(function (p) { DEFAULT.pos[p.id] = [p.x, p.y]; });
  var S = load('rp.pages.v1', null) || JSON.parse(JSON.stringify(DEFAULT));
  var selected = S.last || S.pages[0].id, view = 'field', before = null, flag = { moved: false };
  var plane = $('#plane'), linksSvg = $('#links');
  function persist() { save('rp.pages.v1', S); }
  function page(id) { return S.pages.filter(function (p) { return p.id === id; })[0]; }
  function byTitle(t) { t = t.trim().toLowerCase(); return S.pages.filter(function (p) { return p.title.toLowerCase() === t; })[0]; }
  function isLit(id) { return S.lit.indexOf(id) > -1; }
  function outLinks(p) { var out = [], re = /\[\[([^\]]+)\]\]/g, m; while ((m = re.exec(p.body))) { var t = byTitle(m[1]); if (t && t.id !== p.id && out.indexOf(t.id) < 0) out.push(t.id); } return out; }
  function pairs() { var seen = {}, out = []; S.pages.forEach(function (p) { outLinks(p).forEach(function (t) { var k = [p.id, t].sort().join('|'); if (!seen[k]) { seen[k] = 1; out.push([p.id, t]); } }); }); return out; }
  function linked(id) { return pairs().filter(function (l) { return l.indexOf(id) > -1; }).map(function (l) { return l[0] === id ? l[1] : l[0]; }); }
  function backlinks(id) { return S.pages.filter(function (p) { return outLinks(p).indexOf(id) > -1; }).map(function (p) { return p.id; }); }
  function names(ids) { return ids.map(function (i) { return page(i).title; }).join(', '); }
  function stateText(id) { return isLit(id) ? 'Been here' : 'Not yet'; }
  function lastWord(p) { return p.title; }
  var K = load('rp.keeps.v1', null) || [
    { id: 'k1', url: 'https://example.org/what-is-entropy', title: 'What is entropy, really?', note: 'The clearest explanation I found. Reread the middle.', page: 'entropy' },
    { id: 'k2', url: 'https://example.org/notes-on-memory', title: 'Notes on memory', note: 'For the question I keep asking.', page: '' }
  ];
  function keepsFor(id) { return K.filter(function (k) { return k.page === id; }); }

  var nodeEls = {};
  function ensureNodes() {
    S.pages.forEach(function (n) {
      if (nodeEls[n.id]) return;
      var b = document.createElement('button'); b.type = 'button'; b.className = 'node'; b.dataset.id = n.id; b.innerHTML = '<span class="name"></span><span class="state"></span>';
      plane.appendChild(b); nodeEls[n.id] = b;
      b.addEventListener('click', function () { if (flag.moved) { flag.moved = false; return; } openPage(n.id); });
      movable(b, function () { return S.pos; }, n.id, drawField, persist, plane, flag);
    });
    Object.keys(nodeEls).forEach(function (id) { if (!page(id)) { nodeEls[id].remove(); delete nodeEls[id]; } });
  }
  function drawField() {
    ensureNodes();
    S.pages.forEach(function (n) {
      var el = nodeEls[n.id], p = S.pos[n.id]; if (!p) p = S.pos[n.id] = [50, 50];
      el.style.left = p[0] + '%'; el.style.top = p[1] + '%'; el.classList.toggle('lit', isLit(n.id)); el.classList.toggle('sel', selected === n.id);
      $('.name', el).textContent = n.title; $('.state', el).textContent = stateText(n.id);
    });
    linksSvg.innerHTML = pairs().map(function (l) { var a = S.pos[l[0]], b = S.pos[l[1]]; return '<line x1="' + a[0] + '" y1="' + a[1] + '" x2="' + b[0] + '" y2="' + b[1] + '"/>'; }).join('');
  }
  function drawPath() {
    var ol = $('#pathlist'); ol.innerHTML = '';
    var order = S.trail.filter(function (id) { return page(id); }).concat(S.pages.map(function (p) { return p.id; }).filter(function (id) { return S.trail.indexOf(id) < 0; }));
    order.forEach(function (id) {
      var li = document.createElement('li'); if (isLit(id)) li.className = 'walked';
      var b = document.createElement('button'); b.type = 'button'; b.className = 'node' + (isLit(id) ? ' lit' : '') + (selected === id ? ' sel' : ''); b.dataset.id = id;
      b.innerHTML = '<span class="name"></span><span class="state"></span>'; $('.name', b).textContent = page(id).title; $('.state', b).textContent = stateText(id);
      b.addEventListener('click', function () { openPage(id); }); li.appendChild(b); ol.appendChild(li);
    });
  }
  function drawList() {
    var ul = $('#list'); ul.innerHTML = '';
    S.pages.slice().sort(function (a, b) { return a.title.localeCompare(b.title); }).forEach(function (pg) {
      var id = pg.id, li = document.createElement('li'); li.dataset.id = id; if (isLit(id)) li.className = 'lit';
      var b = document.createElement('button'); b.type = 'button'; b.className = 'open'; b.textContent = pg.title; b.addEventListener('click', function () { openPage(id); });
      var st = document.createElement('span'); st.className = 'meta'; st.textContent = stateText(id);
      var lk = document.createElement('span'); lk.className = 'meta'; var ls = linked(id); lk.textContent = ls.length ? 'Linked to: ' + names(ls) : 'No threads yet';
      li.appendChild(b); li.appendChild(st); li.appendChild(lk); ul.appendChild(li);
    });
  }

  /* ---- Notebook ---- */
  var mode = 'edit', lastPairs = null;
  function drawPages() {
    var ul = $('#pages'); ul.innerHTML = '';
    S.pages.forEach(function (p) { var li = document.createElement('li'), b = document.createElement('button'); b.type = 'button'; b.className = 'pg' + (p.id === selected ? ' sel' : ''); b.dataset.id = p.id; b.textContent = p.title || 'Untitled page'; if (p.id === selected) b.setAttribute('aria-current', 'page'); b.addEventListener('click', function () { openPage(p.id); }); li.appendChild(b); ul.appendChild(li); });
  }
  function renderRead() {
    var host = $('#page-read'); host.innerHTML = ''; var p = page(selected), re = /\[\[([^\]]+)\]\]/g, last = 0, m, txt = p.body;
    while ((m = re.exec(txt))) {
      if (m.index > last) host.appendChild(document.createTextNode(txt.slice(last, m.index)));
      var t = byTitle(m[1]);
      if (t) { var b = document.createElement('button'); b.type = 'button'; b.className = 'wl'; b.textContent = m[1]; b.addEventListener('click', function (id) { return function () { openPage(id); }; }(t.id)); host.appendChild(b); }
      else { var sp = document.createElement('span'); sp.className = 'wl wl--none'; sp.textContent = m[1] + ' (no such page yet)'; host.appendChild(sp); }
      last = m.index + m[0].length;
    }
    if (last < txt.length) host.appendChild(document.createTextNode(txt.slice(last)));
    if (!txt.trim()) host.textContent = 'Nothing written yet.';
  }
  function drawEditor() {
    var p = page(selected); if (!p) return;
    if ($('#page-title') !== document.activeElement) $('#page-title').value = p.title;
    if ($('#page-body') !== document.activeElement) $('#page-body').value = p.body;
    $('#page-title').disabled = false;
    var bl = backlinks(selected), bu = $('#backlinks'); bu.innerHTML = '';
    if (!bl.length) { var e = document.createElement('li'); e.className = 'muted'; e.textContent = 'Nothing links here yet. That is fine.'; bu.appendChild(e); }
    bl.forEach(function (id) { var li = document.createElement('li'), b = document.createElement('button'); b.type = 'button'; b.className = 'wl'; b.textContent = page(id).title; b.addEventListener('click', function () { openPage(id); }); li.appendChild(b); bu.appendChild(li); });
    var kp = keepsFor(selected), ku = $('#page-keeps'); ku.innerHTML = '';
    if (!kp.length) { var e2 = document.createElement('li'); e2.className = 'muted'; e2.textContent = 'Nothing kept for this page.'; ku.appendChild(e2); }
    kp.forEach(function (k) { var li = document.createElement('li'); li.textContent = k.title; ku.appendChild(li); });
    var sel = $('#link-to'); sel.innerHTML = ''; var out = outLinks(p);
    S.pages.filter(function (o) { return o.id !== selected && out.indexOf(o.id) < 0; }).forEach(function (o) { var op = document.createElement('option'); op.value = o.id; op.textContent = o.title; sel.appendChild(op); });
    $('#link-do').disabled = !sel.options.length;
    $$('[data-mode-btn]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.modeBtn === mode)); });
    $('#page-body').hidden = mode !== 'edit'; $('#page-read').hidden = mode !== 'read'; if (mode === 'read') renderRead();
    drawChips();
  }
  function drawChips() {
    var p = page(selected), ul = $('#chips'); ul.innerHTML = '';
    (p.tags || []).forEach(function (t, i) {
      var li = document.createElement('li'); li.appendChild(document.createTextNode(t));
      var b = document.createElement('button'); b.type = 'button'; b.textContent = '×'; b.setAttribute('aria-label', 'Remove ' + t);
      b.addEventListener('click', function () { p.tags.splice(i, 1); persist(); drawChips(); }); li.appendChild(b); ul.appendChild(li);
    });
  }
  function drawAll() { drawField(); drawPath(); drawList(); drawPages(); drawEditor(); drawParts(); }
  function drawParts() { var p = page('entropy') || S.pages[0]; $('#p1-text').textContent = p.title + '. ' + (p.body.split(/\s+/).length) + ' words, last touched yesterday evening.'; }

  function openPage(id) {
    selected = id; S.last = id; var was = isLit(id); if (!was) S.lit.push(id);
    S.trail = S.trail.filter(function (x) { return x !== id; }); S.trail.push(id); persist(); lastPairs = pairs().length;
    drawAll(); say('Opened ' + page(id).title + (was ? '.' : '. Now lit.'));
  }
  // Called when the text of a page changes: a new thread is the person's own idea meeting another.
  function afterTextChange(sparkAt) {
    var now = pairs(), keys = now.map(function (l) { return l.slice().sort().join('|'); });
    var fresh = now.filter(function (l, i) { return lastKeys.indexOf(keys[i]) < 0; });
    lastKeys = keys; persist();
    if (fresh.length) {
      var l = fresh[0]; l.forEach(function (id) { if (!isLit(id)) S.lit.push(id); }); persist();
      spark($('#page'), 'calc(100% - 36px)', '32px'); say('Linked: ' + page(l[0]).title + ' and ' + page(l[1]).title + '.');
    }
    drawField(); drawPath(); drawList(); drawPages();
    var bl = $('#backlinks'); drawEditor();
  }
  var lastKeys = pairs().map(function (l) { return l.slice().sort().join('|'); });

  $('#page-body').addEventListener('input', function () { var p = page(selected); p.body = this.value; $('#page-status').textContent = 'Saved on this device.'; afterTextChange(); });
  $('#page-title').addEventListener('input', function () {
    var p = page(selected), old = p.title, nw = this.value; if (!nw.trim()) return;
    S.pages.forEach(function (o) { o.body = o.body.split('[[' + old + ']]').join('[[' + nw + ']]'); }); p.title = nw;
    lastKeys = pairs().map(function (l) { return l.slice().sort().join('|'); }); persist(); drawField(); drawPath(); drawList(); drawPages(); drawEditor(); $('#page-status').textContent = 'Saved on this device.';
  });
  $('#link-do').addEventListener('click', function () {
    var id = $('#link-to').value; if (!id) return; var p = page(selected);
    p.body = p.body.replace(/\s*$/, '') + (p.body.trim() ? ' ' : '') + '[[' + page(id).title + ']]'; $('#page-body').value = p.body; afterTextChange();
  });
  $$('[data-mode-btn]').forEach(function (b) { b.addEventListener('click', function () { mode = b.dataset.modeBtn; drawEditor(); }); });
  $('#new-page').addEventListener('click', function () {
    var n = S.pages.length + 1, id = 'p' + Date.now().toString(36); S.pages.push({ id: id, title: 'Untitled page ' + n, body: '', tags: [] });
    S.pos[id] = [10 + (n * 13) % 78, 14 + (n * 17) % 70]; persist(); openPage(id); $('#page-title').focus(); $('#page-title').select();
  });
  $('#ask').addEventListener('click', function () { var open = $('#questions').hidden; $('#questions').hidden = !open; this.setAttribute('aria-expanded', String(open)); this.textContent = open ? 'Put the questions away' : 'Ask me something'; });
  function addTag() { var v = $('#tag').value.trim(); if (!v) return; var p = page(selected); (p.tags = p.tags || []).push(v); $('#tag').value = ''; persist(); drawChips(); }
  $('#tag-add').addEventListener('click', addTag);
  $('#tag').addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); addTag(); } });

  $$('[data-view-btn]').forEach(function (b) {
    b.addEventListener('click', function () {
      view = b.dataset.viewBtn; clearSpark();
      $$('[data-view-btn]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      $$('.view').forEach(function (v) { v.hidden = v.dataset.view !== view; });
    });
  });
  $('#tidy').addEventListener('click', function () {
    before = JSON.parse(JSON.stringify(S.pos));
    var comp = {}, k = 0; S.pages.forEach(function (n) { comp[n.id] = k++; });
    pairs().forEach(function (l) { var a = comp[l[0]], b = comp[l[1]]; Object.keys(comp).forEach(function (i) { if (comp[i] === b) comp[i] = a; }); });
    var size = {}; Object.keys(comp).forEach(function (i) { size[comp[i]] = (size[comp[i]] || 0) + 1; });
    var ids = S.pages.map(function (n) { return n.id; }).sort(function (a, b) { return size[comp[b]] - size[comp[a]] || comp[a] - comp[b]; });
    var cols = Math.max(2, Math.floor(plane.clientWidth / 210)), rows = Math.ceil(ids.length / cols);
    ids.forEach(function (id, i) { S.pos[id] = [100 / cols * ((i % cols) + .5), 100 / rows * (Math.floor(i / cols) + .5)]; });
    persist(); drawAll(); $('#untidy').disabled = false; say('Tidied. Every thread kept. You can undo.');
  });
  $('#untidy').addEventListener('click', function () { if (!before) return; S.pos = before; before = null; persist(); drawAll(); this.disabled = true; say('Put back as you had it.'); });

  /* ---- Keeps ---- */
  function hostOf(u) { try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return u; } }
  function drawKeeps() {
    var ul = $('#keeplist'); ul.innerHTML = '';
    K.forEach(function (k) {
      var li = document.createElement('li'); li.dataset.id = k.id;
      var a = document.createElement('a'); a.href = k.url; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.textContent = k.title; a.className = 'keep__title';
      var h = document.createElement('span'); h.className = 'meta'; h.textContent = hostOf(k.url);
      var n = document.createElement('p'); n.className = 'keep__note'; n.textContent = k.note || ''; if (!k.note) n.hidden = true;
      var lab = document.createElement('label'); lab.className = 'stack inline'; var sp = document.createElement('span'); sp.textContent = 'Kept for'; var sel = document.createElement('select');
      var none = document.createElement('option'); none.value = ''; none.textContent = 'no page yet'; sel.appendChild(none);
      S.pages.forEach(function (p) { var o = document.createElement('option'); o.value = p.id; o.textContent = p.title; if (p.id === k.page) o.selected = true; sel.appendChild(o); });
      sel.addEventListener('change', function () { k.page = sel.value; save('rp.keeps.v1', K); drawEditor(); });
      lab.appendChild(sp); lab.appendChild(sel);
      var rm = document.createElement('button'); rm.type = 'button'; rm.className = 'btn btn--quiet'; rm.textContent = 'Forget'; rm.setAttribute('aria-label', 'Forget ' + k.title);
      rm.addEventListener('click', function () { K = K.filter(function (x) { return x !== k; }); save('rp.keeps.v1', K); drawKeeps(); drawEditor(); say('Forgot ' + k.title + '.'); });
      li.appendChild(a); li.appendChild(h); li.appendChild(n); li.appendChild(lab); li.appendChild(rm); ul.appendChild(li);
    });
    if (!K.length) { var e = document.createElement('li'); e.className = 'muted'; e.textContent = 'Nothing kept yet.'; ul.appendChild(e); }
  }
  $('#keepform').addEventListener('submit', function (e) {
    e.preventDefault(); var raw = $('#keep-url').value.trim(), u;
    try { u = new URL(/^[a-z]+:\/\//i.test(raw) ? raw : 'https://' + raw); if (!/^https?:$/.test(u.protocol) || !u.hostname.includes('.')) throw 0; } catch (x) { say('That does not look like an address.'); $('#keep-url').setAttribute('aria-invalid', 'true'); $('#keep-url').focus(); return; }
    $('#keep-url').removeAttribute('aria-invalid');
    K.unshift({ id: 'k' + Date.now().toString(36), url: u.href, title: $('#keep-title').value.trim() || hostOf(u.href), note: $('#keep-note').value.trim(), page: selected });
    save('rp.keeps.v1', K); $('#keepform').reset(); drawKeeps(); drawEditor(); say('Kept. Nothing was fetched.');
  });

  /* ---- Sketch: an idea diagram. Solid arrows lead to; dashed lines might relate. ---- */
  var SK0 = { boxes: [{ id: 'q', t: 'Question', x: 20, y: 30 }, { id: 'k', t: 'What I know', x: 50, y: 22 }, { id: 'u', t: 'What I’m unsure of', x: 24, y: 72 }, { id: 'n', t: 'Next small step', x: 78, y: 56 }], arrows: [{ a: 'q', b: 'k', kind: 'leads' }, { a: 'k', b: 'n', kind: 'leads' }, { a: 'u', b: 'q', kind: 'relates' }] };
  var SK = load('rp.sketch.v1', null) || JSON.parse(JSON.stringify(SK0)); SK.boxes.forEach(function (b) {});
  var skPlane = $('#sketchplane'), skSvg = $('#arrows'), skEls = {}, skPos = {}, skFlag = { moved: false };
  SK.boxes.forEach(function (b) { skPos[b.id] = [b.x, b.y]; });
  function skSave() { SK.boxes.forEach(function (b) { b.x = skPos[b.id][0]; b.y = skPos[b.id][1]; }); save('rp.sketch.v1', SK); }
  function skBox(id) { return SK.boxes.filter(function (b) { return b.id === id; })[0]; }
  function skEnsure() {
    SK.boxes.forEach(function (b) {
      if (skEls[b.id]) return; var el = document.createElement('button'); el.type = 'button'; el.className = 'node box'; el.dataset.id = b.id; skPlane.appendChild(el); skEls[b.id] = el;
      movable(el, function () { return skPos; }, b.id, skDraw, skSave, skPlane, skFlag);
    });
  }
  function clip(c, o, w, h) { var dx = o[0] - c[0], dy = o[1] - c[1]; if (!dx && !dy) return c; var t = Math.min(dx ? (w / 2) / Math.abs(dx) : 1e9, dy ? (h / 2) / Math.abs(dy) : 1e9); return [c[0] + dx * t, c[1] + dy * t]; }
  function skDraw() {
    skEnsure(); var W = skPlane.clientWidth, H = skPlane.clientHeight; skSvg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    SK.boxes.forEach(function (b) { var el = skEls[b.id], p = skPos[b.id]; el.style.left = p[0] + '%'; el.style.top = p[1] + '%'; el.textContent = b.t; });
    var lines = '';
    SK.arrows.forEach(function (a) {
      var A = skPos[a.a], B = skPos[a.b], ca = [A[0] * W / 100, A[1] * H / 100], cb = [B[0] * W / 100, B[1] * H / 100];
      var ea = skEls[a.a].getBoundingClientRect(), eb = skEls[a.b].getBoundingClientRect(), p1 = clip(ca, cb, ea.width + 6, ea.height + 6), p2 = clip(cb, ca, eb.width + 6, eb.height + 6);
      lines += '<line class="' + (a.kind === 'leads' ? 'sk-leads' : 'sk-relates') + '" x1="' + p1[0].toFixed(1) + '" y1="' + p1[1].toFixed(1) + '" x2="' + p2[0].toFixed(1) + '" y2="' + p2[1].toFixed(1) + '"' + (a.kind === 'leads' ? ' marker-end="url(#head)"' : '') + '/>';
    });
    skSvg.querySelectorAll('line').forEach(function (l) { l.remove(); }); skSvg.insertAdjacentHTML('beforeend', lines);
    ['#arrow-from', '#arrow-to'].forEach(function (sel) { var s = $(sel), v = s.value; s.innerHTML = ''; SK.boxes.forEach(function (b) { var o = document.createElement('option'); o.value = b.id; o.textContent = b.t; s.appendChild(o); }); if (v) s.value = v; });
    var ul = $('#arrow-list'); ul.innerHTML = '';
    SK.arrows.forEach(function (a, i) { var li = document.createElement('li'); li.appendChild(document.createTextNode(skBox(a.a).t + (a.kind === 'leads' ? ' leads to ' : ' might relate to ') + skBox(a.b).t + ' '));
      var rm = document.createElement('button'); rm.type = 'button'; rm.className = 'btn btn--quiet'; rm.textContent = 'Remove'; rm.setAttribute('aria-label', 'Remove the arrow from ' + skBox(a.a).t + ' to ' + skBox(a.b).t);
      rm.addEventListener('click', function () { SK.arrows.splice(i, 1); skSave(); skDraw(); }); li.appendChild(rm); ul.appendChild(li); });
  }
  $('#box-add').addEventListener('click', function () {
    var v = $('#box-text').value.trim(); if (!v) return; var id = 'b' + Date.now().toString(36), n = SK.boxes.length;
    SK.boxes.push({ id: id, t: v, x: 15 + (n * 19) % 72, y: 15 + (n * 23) % 70 }); skPos[id] = [SK.boxes[n].x, SK.boxes[n].y]; $('#box-text').value = ''; skSave(); skDraw(); say('Added a box: ' + v + '.');
  });
  $('#arrow-add').addEventListener('click', function () {
    var a = $('#arrow-from').value, b = $('#arrow-to').value, kind = $('#arrow-kind').value; if (!a || !b || a === b) { say('Choose two different boxes.'); return; }
    SK.arrows.push({ a: a, b: b, kind: kind }); skSave(); skDraw(); say('Drew an arrow: ' + skBox(a).t + (kind === 'leads' ? ' leads to ' : ' might relate to ') + skBox(b).t + '.');
  });
  window.addEventListener('resize', skDraw);

  /* ---- start ---- */
  drawAll(); drawKeeps(); skDraw();
  $('#continue').addEventListener('click', function () { var id = S.last || S.pages[0].id; openPage(id); $('#notebook').scrollIntoView({ behavior: reduce.matches ? 'auto' : 'smooth' }); $('#page-body').focus({ preventScroll: true }); });
  $('#p1-open').addEventListener('click', function () { openPage('entropy'); $('#notebook').scrollIntoView({ behavior: reduce.matches ? 'auto' : 'smooth' }); });
  $('#p4-link').addEventListener('click', function () { var free = S.pages.filter(function (p) { return !linked(p.id).length; })[0] || S.pages[0]; openPage(free.id); $('#notebook').scrollIntoView({ behavior: reduce.matches ? 'auto' : 'smooth' }); $('#link-to').focus({ preventScroll: true }); });
})();
