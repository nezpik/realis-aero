/* Realis Pale specimen behaviour: the hour, the Bench, the Field (with Path and List), the Spark and Still.
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

  /* ---- Field ---- */
  var NODES = [
    { id: 'entropy', t: 'Entropy', x: 22, y: 30, note: 'How many ways a thing can be arranged without anyone telling the difference.' },
    { id: 'information', t: 'Information', x: 46, y: 20, note: 'What a message saves you from having to guess.' },
    { id: 'compression', t: 'Compression', x: 72, y: 30, note: 'Saying the same thing in fewer words, and what that costs.' },
    { id: 'probability', t: 'Probability', x: 30, y: 64, note: 'A way of being honest about not knowing yet.' },
    { id: 'bayes', t: 'Bayes’ rule', x: 56, y: 74, note: 'How to change your mind by the right amount.' },
    { id: 'memory', t: 'Memory', x: 84, y: 62, note: 'What stays, and what the staying changes.' },
    { id: 'sleep', t: 'Sleep', x: 12, y: 84, note: 'Where a lot of it settles.' },
    { id: 'habits', t: 'Why habits stick', x: 86, y: 88, note: 'Not started yet.' },
    { id: 'question', t: 'A question I keep asking', x: 52, y: 46, note: 'Why does the page get easier the third time?' }
  ];
  var byId = {}; NODES.forEach(function (n) { byId[n.id] = n; });
  var DEFAULT = { pos: {}, lit: ['entropy', 'information', 'probability'], links: [['entropy', 'information'], ['probability', 'bayes']], order: NODES.map(function (n) { return n.id; }) };
  NODES.forEach(function (n) { DEFAULT.pos[n.id] = [n.x, n.y]; });
  var S = load('rp.field.v1', null) || JSON.parse(JSON.stringify(DEFAULT));
  var selected = null, view = 'field', before = null, moved = false;
  var plane = $('#plane'), linksSvg = $('#links');
  function persist() { save('rp.field.v1', S); }
  function isLit(id) { return S.lit.indexOf(id) > -1; }
  function linked(id) { return S.links.filter(function (l) { return l.indexOf(id) > -1; }).map(function (l) { return l[0] === id ? l[1] : l[0]; }); }
  function names(ids) { return ids.map(function (i) { return byId[i].t; }).join(', '); }
  function stateText(id) { return isLit(id) ? 'Been here' : 'Not yet'; }

  var nodeEls = {};
  NODES.forEach(function (n) {
    var b = document.createElement('button'); b.type = 'button'; b.className = 'node'; b.dataset.id = n.id;
    b.innerHTML = '<span class="name"></span><span class="state"></span>'; $('.name', b).textContent = n.t;
    plane.appendChild(b); nodeEls[n.id] = b;
    b.addEventListener('click', function () { if (moved) { moved = false; return; } openNode(n.id); });
    b.addEventListener('keydown', function (e) {
      var d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key]; if (!d) return;
      e.preventDefault(); var s = e.shiftKey ? 4 : 1, p = S.pos[n.id];
      S.pos[n.id] = [Math.max(4, Math.min(96, p[0] + d[0] * s)), Math.max(6, Math.min(94, p[1] + d[1] * s))]; persist(); drawField();
    });
    b.addEventListener('pointerdown', function (e) {
      if (e.button) return; var r = plane.getBoundingClientRect(), sx = e.clientX, sy = e.clientY, p0 = S.pos[n.id].slice(), drag = false;
      b.setPointerCapture(e.pointerId);
      function mv(ev) {
        if (!drag && Math.hypot(ev.clientX - sx, ev.clientY - sy) < 5) return; drag = true; b.classList.add('drag');
        S.pos[n.id] = [Math.max(4, Math.min(96, p0[0] + (ev.clientX - sx) / r.width * 100)), Math.max(6, Math.min(94, p0[1] + (ev.clientY - sy) / r.height * 100))]; drawField();
      }
      function up() { b.removeEventListener('pointermove', mv); b.removeEventListener('pointerup', up); b.classList.remove('drag'); if (drag) { moved = true; persist(); setTimeout(function () { moved = false; }, 0); } }
      b.addEventListener('pointermove', mv); b.addEventListener('pointerup', up);
    });
  });

  function drawField() {
    NODES.forEach(function (n) {
      var el = nodeEls[n.id], p = S.pos[n.id];
      el.style.left = p[0] + '%'; el.style.top = p[1] + '%';
      el.classList.toggle('lit', isLit(n.id)); el.classList.toggle('sel', selected === n.id);
      $('.state', el).textContent = stateText(n.id);
    });
    linksSvg.innerHTML = S.links.map(function (l) { var a = S.pos[l[0]], b = S.pos[l[1]]; return '<line x1="' + a[0] + '" y1="' + a[1] + '" x2="' + b[0] + '" y2="' + b[1] + '"/>'; }).join('');
  }
  function drawPath() {
    var ol = $('#pathlist'); ol.innerHTML = '';
    S.order.forEach(function (id) {
      var li = document.createElement('li'); if (isLit(id)) li.className = 'walked';
      var b = document.createElement('button'); b.type = 'button'; b.className = 'node' + (isLit(id) ? ' lit' : '') + (selected === id ? ' sel' : ''); b.dataset.id = id;
      b.innerHTML = '<span class="name"></span><span class="state"></span>'; $('.name', b).textContent = byId[id].t; $('.state', b).textContent = stateText(id);
      b.addEventListener('click', function () { openNode(id); }); li.appendChild(b); ol.appendChild(li);
    });
  }
  function drawList() {
    var ul = $('#list'); ul.innerHTML = '';
    S.order.slice().sort(function (a, b) { return byId[a].t.localeCompare(byId[b].t); }).forEach(function (id) {
      var li = document.createElement('li'); li.dataset.id = id; if (isLit(id)) li.className = 'lit';
      var b = document.createElement('button'); b.type = 'button'; b.className = 'open'; b.textContent = byId[id].t; b.addEventListener('click', function () { openNode(id); });
      var st = document.createElement('span'); st.className = 'meta'; st.textContent = stateText(id);
      var lk = document.createElement('span'); lk.className = 'meta'; var ls = linked(id); lk.textContent = ls.length ? 'Linked to: ' + names(ls) : 'No links yet';
      li.appendChild(b); li.appendChild(st); li.appendChild(lk); ul.appendChild(li);
    });
  }
  function drawDetail() {
    var d = $('#detail'); if (!selected) { d.hidden = true; return; }
    d.hidden = false; $('#detail-title').textContent = byId[selected].t; $('#detail-note').textContent = byId[selected].note;
    var ls = linked(selected); $('#detail-links').textContent = ls.length ? 'Linked to: ' + names(ls) : 'No links yet.';
    var sel = $('#link-to'); sel.innerHTML = '';
    NODES.filter(function (n) { return n.id !== selected && ls.indexOf(n.id) < 0; }).forEach(function (n) { var o = document.createElement('option'); o.value = n.id; o.textContent = n.t; sel.appendChild(o); });
    $('#link-do').disabled = !sel.options.length;
  }
  function drawAll() { drawField(); drawPath(); drawList(); drawDetail(); }

  function openNode(id) {
    selected = id; var was = isLit(id); if (!was) { S.lit.push(id); persist(); }
    drawAll(); say('Opened ' + byId[id].t + (was ? '.' : '. Now lit.'));
  }
  function clearSpark() { $$('.spark').forEach(function (s) { s.remove(); }); }
  function spark(container, left, top) {
    clearSpark(); var s = document.createElement('span'); s.className = 'spark' + (reduce.matches ? ' spark--static' : ''); s.setAttribute('aria-hidden', 'true');
    s.style.left = left; s.style.top = top; container.appendChild(s);
    if (!reduce.matches) s.addEventListener('animationend', function () { s.remove(); });
  }
  $('#link-do').addEventListener('click', function () {
    var a = selected, b = $('#link-to').value; if (!a || !b) return;
    S.links.push([a, b]); [a, b].forEach(function (id) { if (!isLit(id)) S.lit.push(id); }); persist(); drawAll();
    if (view === 'field') { var pa = S.pos[a], pb = S.pos[b]; spark(plane, (pa[0] + pb[0]) / 2 + '%', (pa[1] + pb[1]) / 2 + '%'); }
    else if (view === 'list') { var li = $('#list li[data-id="' + a + '"]'); li.style.position = 'relative'; spark(li, 'calc(100% - 28px)', '50%'); }
    else { var nb = $('#pathlist .node[data-id="' + b + '"]'); nb.parentNode.style.position = 'relative'; spark(nb.parentNode, '50%', '0'); }
    say('Linked: ' + byId[a].t + ' and ' + byId[b].t + '.');
  });
  $('#detail-close').addEventListener('click', function () { selected = null; drawAll(); });
  $('#link-to').addEventListener('change', function () {});

  $$('[data-view-btn]').forEach(function (b) {
    b.addEventListener('click', function () {
      view = b.dataset.viewBtn; clearSpark();
      $$('[data-view-btn]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      $$('.view').forEach(function (v) { v.hidden = v.dataset.view !== view; });
    });
  });

  // Tidy gathers related items next to each other and keeps every link; Undo puts everything back.
  $('#tidy').addEventListener('click', function () {
    before = JSON.parse(JSON.stringify(S.pos));
    var comp = {}, k = 0; NODES.forEach(function (n) { comp[n.id] = k++; });
    S.links.forEach(function (l) { var a = comp[l[0]], b = comp[l[1]]; Object.keys(comp).forEach(function (i) { if (comp[i] === b) comp[i] = a; }); });
    var size = {}; Object.keys(comp).forEach(function (i) { size[comp[i]] = (size[comp[i]] || 0) + 1; });
    var ids = NODES.map(function (n) { return n.id; }).sort(function (a, b) { return size[comp[b]] - size[comp[a]] || comp[a] - comp[b]; });
    var cols = Math.max(2, Math.floor(plane.clientWidth / 210)), rows = Math.ceil(ids.length / cols);
    ids.forEach(function (id, i) { S.pos[id] = [100 / cols * ((i % cols) + .5), 100 / rows * (Math.floor(i / cols) + .5)]; });
    persist(); drawAll(); $('#untidy').disabled = false; say('Tidied. Every link kept. You can undo.');
  });
  $('#untidy').addEventListener('click', function () { if (!before) return; S.pos = before; before = null; persist(); drawAll(); this.disabled = true; say('Put back as you had it.'); });
  drawAll();

  /* ---- Still ---- */
  var still = load('rp.still.v1', { text: '', tags: [] });
  var ta = $('#still-text'); ta.value = still.text;
  function nowText() { $('#now').textContent = ta.value.trim() || 'Nothing written yet.'; }
  ta.addEventListener('input', function () { still.text = ta.value; save('rp.still.v1', still); nowText(); $('#still-status').textContent = 'Saved on this device.'; });
  nowText();
  $('#ask').addEventListener('click', function () { var open = $('#questions').hidden; $('#questions').hidden = !open; this.setAttribute('aria-expanded', String(open)); this.textContent = open ? 'Put the questions away' : 'Ask me something'; });
  function drawChips() {
    var ul = $('#chips'); ul.innerHTML = '';
    still.tags.forEach(function (t, i) {
      var li = document.createElement('li'); li.appendChild(document.createTextNode(t));
      var b = document.createElement('button'); b.type = 'button'; b.textContent = '×'; b.setAttribute('aria-label', 'Remove ' + t);
      b.addEventListener('click', function () { still.tags.splice(i, 1); save('rp.still.v1', still); drawChips(); }); li.appendChild(b); ul.appendChild(li);
    });
  }
  function addTag() { var v = $('#tag').value.trim(); if (!v) return; still.tags.push(v); $('#tag').value = ''; save('rp.still.v1', still); drawChips(); }
  $('#tag-add').addEventListener('click', addTag);
  $('#tag').addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); addTag(); } });
  drawChips();

  $('#continue').addEventListener('click', function () { var first = S.lit[0] || 'entropy'; $('#field').scrollIntoView({ behavior: reduce.matches ? 'auto' : 'smooth' }); nodeEls[first].focus({ preventScroll: true }); openNode(first); });
})();
