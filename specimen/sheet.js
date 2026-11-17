// Realis Aero Ruled Sheet and Writing Workspace. One screen, one panel.
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var TODAY = '2026-11-17';               // fixed, so every run sees the same page
  var TITLE_MAX = 80, TEXT_MAX = 1500, DRAFT_KEY = 'ra.sheet.draft.v1';
  var pad = function (n) { return String(n).padStart(2, '0'); };
  var isYmd = function (s) { return /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s + 'T12:00:00Z')); };
  var fmt = function (o) { return new Intl.DateTimeFormat('en-GB', Object.assign({ timeZone: 'UTC' }, o)); };
  var longDate = function (s) { return fmt({ weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(s + 'T12:00:00Z')); };
  var shortDate = function (s) { return fmt({ weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(s + 'T12:00:00Z')); };
  var esc = function (t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var mark = function (n) { return '<svg class="mark" aria-hidden="true"><use href="#m-' + n + '"/></svg>'; };

  var SITES = [
    ['Casablanca DC', ['Roof array A', 'Roof array B', 'Inverter 1', 'Inverter 2', 'Battery rack 1']],
    ['Rabat lab', ['Heat pump 1', 'Heat pump 2', 'Recovery pump']],
    ['Tangier plant', ['Flow meter 1', 'Flow meter 2', 'Flow meter 3', 'Weather mast']]
  ];
  var ASSETS = []; SITES.forEach(function (s) { s[1].forEach(function (a) { ASSETS.push({ id: a.toLowerCase().replace(/\W+/g, '-'), name: a, site: s[0] }); }); });
  var assetById = function (id) { return ASSETS.filter(function (a) { return a.id === id; })[0]; };
  var STATUSES = [
    { v: 'planned', label: 'Planned', mark: null, state: 'neutral' },
    { v: 'partial', label: 'Partial', mark: 'degraded', state: 'warning' },
    { v: 'done', label: 'Done', mark: 'success', state: 'success' }
  ];
  var statusMeta = function (v) { return STATUSES.filter(function (s) { return s.v === v; })[0] || STATUSES[0]; };

  // The parts, in order. Each is as tall as its text; the highlighted one is read first by its audience.
  var PARTS = [
    { key: 'objective', label: 'Objective', lines: 3, prompt: 'What should be true when this work is finished?' },
    { key: 'kind', label: 'Type', lines: 1, picks: ['Inspection', 'Repair', 'Calibration', 'Review'], prompt: 'Or describe it: planned inspection, then a repair on site…' },
    { key: 'findings', label: 'Findings', lines: 4, prompt: 'What did you see? Readings, parts, conditions…' },
    { key: 'steps', label: 'Steps', lines: 4, prompt: 'Start with “1.” and the numbering follows on each line' },
    { key: 'parts', label: 'Parts and tools', lines: 3, prompt: 'Use “-” or “1.” for a list' },
    { key: 'handover', label: 'For the next shift', lines: 3, highlight: true, prompt: 'What does the next person need to know or do first?' }
  ];
  var READING = { objective: 'Objective', kind: 'Type', findings: 'Findings', steps: 'Steps', parts: 'Parts and tools', handover: 'For the next shift' };

  var entries = [
    { id: 'e1', date: '2026-11-17', assetId: 'inverter-2', crew: 'Electrical', hours: '2.5', status: 'partial', subject: 'Filter change and thermal check', title: '', objective: 'Replace the cabinet filter and confirm the heat sink stays under 70 °C at full load.', kind: 'Inspection, Repair', findings: 'Filter clogged with dust. Heat sink 68 °C at 42 kW after the change.', steps: '1. Isolate and lock out the cabinet.\n2. Replace the filter.\n3. Run at full load for 20 minutes.', parts: '- Filter FLT-2210\n- Torque driver', handover: 'Check the heat sink again at 16:00 before the 25 kW limit is restored.' },
    { id: 'e2', date: '2026-11-17', assetId: 'roof-array-a', crew: 'Electrical', hours: '1', status: 'done', subject: 'String 04 insulation test', title: '', objective: 'Confirm string 04 insulation after last week’s storm.', kind: 'Inspection', findings: '2.1 MΩ, above the 1 MΩ limit.', steps: '', parts: '', handover: '' },
    { id: 'e3', date: '2026-11-17', assetId: 'heat-pump-2', crew: 'Mechanical', hours: '', status: 'planned', subject: 'Refrigerant pressure review', title: '', objective: 'Compare suction pressure with the commissioning record.', kind: 'Review', findings: '', steps: '', parts: '', handover: '' },
    { id: 'e4', date: '2026-11-16', assetId: 'flow-meter-3', crew: 'Controls', hours: '3', status: 'done', subject: 'Calibration after communication loss', title: '', objective: 'Restore flow meter 3 and calibrate against the reference meter.', kind: 'Calibration, Repair', findings: 'Loose RS-485 terminal. Reading back within 0.4% of the reference.', steps: '1. Re-seat and torque the terminal.\n2. Run the reference meter in series for 30 minutes.', parts: '', handover: 'Watch the comm status for 24 hours.' },
    { id: 'e5', date: '2026-11-16', assetId: 'weather-mast', crew: 'Controls', hours: '0.5', status: 'done', subject: 'Wind sensor heading check', title: '', objective: '', kind: 'Inspection', findings: 'Heading within 2 degrees of true north.', steps: '', parts: '', handover: '' }
  ];
  var entryById = function (id) { return entries.filter(function (e) { return e.id === id; })[0]; };

  var say = function (t) { var el = $('#say'); el.textContent = t; clearTimeout(say.t); say.t = setTimeout(function () { el.textContent = ''; }, 8000); };

  // ---- list continuation: Enter at the end of a "1." / "1)" / "-" line starts the next item; an empty item ends the list.
  function continueList(value, caret) {
    if (caret < value.length && value[caret] !== '\n') return null;
    var lineStart = value.lastIndexOf('\n', caret - 1) + 1, line = value.slice(lineStart, caret);
    var numbered = line.match(/^(\s*)(\d{1,3})([.)])\s+(.*)$/), bullet = numbered ? null : line.match(/^(\s*)([-•*])\s+(.*)$/), m = numbered || bullet;
    if (!m) return null;
    var content = (numbered ? numbered[4] : bullet[3]).trim();
    if (!content) return { text: value.slice(0, lineStart) + value.slice(caret), caret: lineStart };
    var marker = numbered ? numbered[1] + (Number(numbered[2]) + 1) + numbered[3] + ' ' : bullet[1] + bullet[2] + ' ';
    var insert = '\n' + marker;
    return { text: value.slice(0, caret) + insert + value.slice(caret), caret: caret + insert.length };
  }
  var picksOf = function (t) { return t.split(',').map(function (x) { return x.trim(); }).filter(Boolean); };
  var hasPick = function (t, p) { return picksOf(t).some(function (x) { return x.toLowerCase() === p.toLowerCase(); }); };
  var togglePick = function (t, p) { var l = picksOf(t); return (hasPick(t, p) ? l.filter(function (x) { return x.toLowerCase() !== p.toLowerCase(); }) : l.concat(p)).join(', '); };

  // =================================================================================================
  // Reading: pages of ruled lines, and a pane
  // =================================================================================================
  var selectedId = null, focusId = null;
  function pagesData() {
    var days = {}; entries.forEach(function (e) { (days[e.date] = days[e.date] || []).push(e); });
    return Object.keys(days).sort().reverse().map(function (d) { return { date: d, items: days[d] }; });
  }
  function renderPages() {
    var data = pagesData(), html = '';
    if (!focusId) focusId = selectedId || (data[0] && data[0].items[0].id);
    data.forEach(function (page) {
      html += '<section class="page-sheet' + (page.date === TODAY ? ' page-sheet--today' : '') + '" role="group" aria-labelledby="pg-' + page.date + '"><header class="page-sheet__head"><h3 id="pg-' + page.date + '">' + esc(longDate(page.date)) + '</h3>'
        + (page.date === TODAY ? '<span class="chip chip--today">Today</span>' : '') + '<span class="page-sheet__count">' + page.items.length + (page.items.length === 1 ? ' entry' : ' entries') + '</span></header><ol class="lines">';
      page.items.forEach(function (e) {
        var a = assetById(e.assetId), st = statusMeta(e.status), meta = [e.hours ? e.hours + ' h' : '', e.crew].filter(Boolean).join(' · ');
        html += '<li class="line" role="option" data-id="' + e.id + '" aria-selected="' + (e.id === selectedId) + '" tabindex="' + (e.id === focusId ? 0 : -1) + '">'
          + '<span class="line__margin"><span class="line__asset">' + esc(a.name) + '</span><span class="line__site">' + esc(a.site) + '</span></span>'
          + '<span class="line__body"><span class="line__subject">' + esc(e.subject) + '</span>' + (meta ? '<span class="line__meta">' + esc(meta) + '</span>' : '') + '</span>'
          + '<span class="line__state"><span class="chip" data-state="' + st.state + '">' + (st.mark ? mark(st.mark) : '') + esc(st.label) + '</span></span></li>';
      });
      html += '</ol></section>';
    });
    $('#pages').innerHTML = html;
  }
  function renderPane() {
    var e = selectedId && entryById(selectedId), pane = $('#pane');
    if (!e) { pane.innerHTML = '<p class="muted small" style="margin:0">Select an entry to read it here.</p>'; return; }
    var a = assetById(e.assetId), st = statusMeta(e.status);
    var parts = PARTS.filter(function (p) { return (e[p.key] || '').trim(); });
    pane.innerHTML = '<div><h3>' + esc(e.subject) + '</h3><p class="muted small" style="margin:0">' + esc(a.name) + ' · ' + esc(a.site) + ' · ' + esc(shortDate(e.date)) + (e.hours ? ' · ' + esc(e.hours) + ' h' : '') + '</p></div>'
      + '<span class="state-label" data-state="' + st.state + '">' + (st.mark ? mark(st.mark) : '') + '<span>' + esc(st.label) + '</span></span>'
      + (parts.length ? '<dl>' + parts.map(function (p) { return '<div><dt>' + esc(READING[p.key]) + '</dt><dd>' + esc(e[p.key]) + '</dd></div>'; }).join('') + '</dl>' : '<p class="muted small" style="margin:0">Nothing written beyond the subject.</p>')
      + '<div class="actions"><button class="btn btn--secondary" id="edit" type="button">Edit entry</button></div>';
  }
  // Selecting updates the lines in place: rebuilding the list on a click would destroy the element
  // before a double click could land on it.
  function select(id, focus) {
    selectedId = id; focusId = id;
    $$('.line').forEach(function (l) { var on = l.dataset.id === id; l.setAttribute('aria-selected', String(on)); l.tabIndex = on ? 0 : -1; });
    renderPane();
    if (focus) { var li = $('.line[data-id="' + id + '"]'); if (li) li.focus(); }
  }
  $('#pages').addEventListener('click', function (ev) { var li = ev.target.closest('.line'); if (li) select(li.dataset.id, true); });
  $('#pages').addEventListener('dblclick', function (ev) { var li = ev.target.closest('.line'); if (li) openPanel('edit', entryById(li.dataset.id), li); });
  $('#pages').addEventListener('keydown', function (ev) {
    var li = ev.target.closest('.line'); if (!li) return;
    var all = $$('.line'), i = all.indexOf(li), k = ev.key, to = null;
    if (k === 'ArrowDown') to = all[Math.min(i + 1, all.length - 1)];
    else if (k === 'ArrowUp') to = all[Math.max(i - 1, 0)];
    else if (k === 'Home') to = all[0];
    else if (k === 'End') to = all[all.length - 1];
    else if (k === 'Enter' || k === ' ') { ev.preventDefault(); select(li.dataset.id, true); return; }
    else return;
    ev.preventDefault();
    all.forEach(function (x) { x.tabIndex = -1; }); to.tabIndex = 0; focusId = to.dataset.id; to.focus();
  });
  $('#pane').addEventListener('click', function (ev) { if (ev.target.id === 'edit') openPanel('edit', entryById(selectedId), ev.target); });

  // =================================================================================================
  // Print: the pages of a paper log, ready for a signature
  // =================================================================================================
  function renderPrint() {
    var data = pagesData().slice().reverse(), total = entries.length;
    $('#print-sheet').innerHTML = '<header class="ps-head"><h1 class="ps-title">Work log</h1><p class="ps-sub">Week of 16 November 2026 · ' + total + ' entries</p></header>'
      + data.map(function (page) {
        return '<section class="ps-day"><h2 class="ps-date">' + esc(longDate(page.date)) + '</h2>' + page.items.map(function (e) {
          var a = assetById(e.assetId), filled = PARTS.filter(function (p) { return (e[p.key] || '').trim(); });
          return '<div class="ps-entry"><p class="ps-line"><span>' + esc(a.name) + ' · ' + esc(a.site) + (e.crew ? ' · ' + esc(e.crew) : '') + (e.hours ? ' · ' + esc(e.hours) + ' h' : '') + '</span><span class="ps-state">' + esc(statusMeta(e.status).label) + '</span></p>'
            + '<h3 class="ps-subject">' + esc(e.subject) + '</h3>'
            + (filled.length ? '<dl class="ps-parts">' + filled.map(function (p) { return '<div class="ps-part' + (p.key === 'findings' || p.key === 'handover' ? ' ps-part--wide' : '') + '"><dt>' + esc(READING[p.key]) + '</dt><dd>' + esc(e[p.key]) + '</dd></div>'; }).join('') + '</dl>' : '') + '</div>';
        }).join('') + '</section>';
      }).join('')
      + '<footer class="ps-foot"><div class="ps-visa"><span>Approved by</span><span class="ps-visa__box"></span></div><p class="ps-printed">Printed on 17 November 2026</p></footer>';
  }
  $('#print-btn').addEventListener('click', function () { renderPrint(); window.print(); });

  // =================================================================================================
  // Writing: the workspace
  // =================================================================================================
  var panel = $('#panel'), backdrop = $('#backdrop'), sheet = $('#sheet'), page = $('#page');
  var mode = 'create', editing = null, opener = null, draft = null, initial = '', submitted = false, errors = {}, restored = false, openMenu = null, saveTimer = null;
  var emptyDraft = function (date) { return { assetId: '', crew: '', date: date || TODAY, hours: '', status: 'planned', subject: '', title: '', objective: '', kind: '', findings: '', steps: '', parts: '', handover: '' }; };
  var draftOf = function (e) { var d = emptyDraft(e.date); Object.keys(d).forEach(function (k) { d[k] = e[k] || ''; }); d.status = e.status; return d; };
  var snapshot = function () { return JSON.stringify(draft); };
  var isDirty = function () { return snapshot() !== initial; };
  var anyContent = function (d) { return d.subject.trim() || d.assetId || PARTS.some(function (p) { return (d[p.key] || '').trim(); }); };
  function readDraft() { try { var r = localStorage.getItem(DRAFT_KEY); return r ? Object.assign(emptyDraft(), JSON.parse(r)) : null; } catch (e) { return null; } }
  function writeDraft(v) { try { if (v) localStorage.setItem(DRAFT_KEY, JSON.stringify(v)); else localStorage.removeItem(DRAFT_KEY); } catch (e) { /* storage unavailable: the form still works */ } }

  // The sheet is built once from the parts.
  function buildSheet() {
    var html = '<div class="part part--lecon"><label class="part__label" for="sh-subject">Subject</label><div class="part__body">'
      + '<input id="sh-subject" class="lecon" maxlength="' + (TITLE_MAX + 20) + '" placeholder="Ex: Filter change and thermal check" autocomplete="off">'
      + '<span class="error" id="err-subject" hidden></span><span class="counter" id="cnt-subject" hidden></span>'
      + '<button type="button" class="link-btn" id="reveal-title">+ Add a public title</button>'
      + '<div id="title-wrap" hidden><input id="sh-title" class="family-title__input" maxlength="' + (TITLE_MAX + 20) + '" placeholder="Public title (default: the subject)" aria-label="Public title" autocomplete="off"><span class="error" id="err-title" hidden></span></div>'
      + '</div></div>';
    PARTS.forEach(function (p) {
      html += '<div class="part' + (p.highlight ? ' part--highlight' : '') + '"><label class="part__label" for="sh-' + p.key + '">' + p.label + '</label><div class="part__body">'
        + (p.picks ? '<div class="format-picks" role="group" aria-label="Quick picks">' + p.picks.map(function (x) { return '<button type="button" class="pick" data-pick="' + x + '" aria-pressed="false">' + x + '</button>'; }).join('') + '</div>' : '')
        + '<textarea id="sh-' + p.key + '" class="ruled" data-key="' + p.key + '" data-lines="' + p.lines + '" rows="1" placeholder="' + p.prompt + '"></textarea>'
        + '<span class="error" id="err-' + p.key + '" hidden></span><span class="counter" id="cnt-' + p.key + '" hidden></span></div></div>';
    });
    html += '<div class="part part--file"><span class="part__label" id="files-label">Files</span><div class="part__body">'
      + '<button type="button" class="link-btn" id="reveal-files">+ Attach a file</button>'
      + '<div id="files-wrap" hidden><input type="file" id="sh-files" multiple accept=".pdf,image/jpeg,image/png" aria-labelledby="files-label"><p class="hint">PDF, JPEG or PNG, five at most.</p></div></div></div>';
    sheet.innerHTML = html;
  }
  function grow(el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; }
  function growAll() { $$('textarea', sheet).forEach(grow); }
  var sheetWidth = 0, ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(function (en) { var w = Math.round(en[0].contentRect.width); if (w !== sheetWidth) { sheetWidth = w; growAll(); } });

  // ---- form <-> draft
  function fill() {
    $('#sh-subject').value = draft.subject; $('#sh-title').value = draft.title;
    PARTS.forEach(function (p) { $('#sh-' + p.key).value = draft[p.key]; });
    $('#crew').value = draft.crew; $('#hours').value = draft.hours; $('#hours-unit').hidden = !draft.hours;
    $('#title-wrap').hidden = !draft.title; $('#reveal-title').hidden = !!draft.title;
    $('#files-wrap').hidden = true; $('#reveal-files').hidden = false;
    renderBar(); renderStatus(); renderPicks(); renderProgress(); renderErrors(); growAll();
  }
  function renderBar() {
    var a = assetById(draft.assetId);
    $('#asset-text').textContent = a ? a.name : 'Asset'; $('#asset-btn').classList.toggle('bar-btn--empty', !a);
    $('#date-text').textContent = isYmd(draft.date) ? shortDate(draft.date) : 'Date'; $('#date-btn').classList.toggle('bar-btn--empty', !isYmd(draft.date));
  }
  function renderStatus() {
    $('#status').innerHTML = STATUSES.map(function (s) { return '<button type="button" role="radio" data-v="' + s.v + '" aria-checked="' + (draft.status === s.v) + '" tabindex="' + (draft.status === s.v ? 0 : -1) + '">' + s.label + '</button>'; }).join('');
  }
  function renderPicks() { $$('.pick', sheet).forEach(function (b) { b.setAttribute('aria-pressed', String(hasPick(draft.kind, b.dataset.pick))); }); }
  function renderProgress() { var n = PARTS.filter(function (p) { return draft[p.key].trim(); }).length; $('#progress').textContent = n + ' of ' + PARTS.length + ' parts filled, all optional'; }
  function renderErrors() {
    var bar = [errors.assetId, errors.date, errors.hours].filter(Boolean);
    $('#bar-errors').hidden = !bar.length; $('#bar-errors').textContent = bar.join(' · ');
    $('#asset-btn').classList.toggle('is-invalid', !!errors.assetId); $('#date-btn').classList.toggle('is-invalid', !!errors.date); $('#hours-wrap').classList.toggle('is-invalid', !!errors.hours);
    var all = [['subject', '#sh-subject'], ['title', '#sh-title']].concat(PARTS.map(function (p) { return [p.key, '#sh-' + p.key]; }));
    all.forEach(function (x) {
      var e = $('#err-' + x[0]), f = $(x[1]), msg = errors[x[0]];
      e.hidden = !msg; e.textContent = msg || ''; f.classList.toggle('is-invalid', !!msg);
      if (msg) { f.setAttribute('aria-invalid', 'true'); f.setAttribute('aria-describedby', 'err-' + x[0]); } else { f.removeAttribute('aria-invalid'); f.removeAttribute('aria-describedby'); }
      var c = $('#cnt-' + x[0]), len = (draft[x[0]] || '').length, max = (x[0] === 'subject' || x[0] === 'title') ? TITLE_MAX : TEXT_MAX;
      if (c) { var show = !msg && len > max * 0.8; c.hidden = !show; c.textContent = show ? len + '/' + max : ''; c.classList.toggle('counter--over', len > max); }
    });
  }
  function validate() {
    var e = {};
    if (!assetById(draft.assetId)) e.assetId = 'Choose an asset.';
    if (!isYmd(draft.date)) e.date = 'Enter a date.';
    if (draft.hours && !(Number(draft.hours) >= 0 && Number(draft.hours) <= 24)) e.hours = 'Hours must be a number up to 24.';
    if (!draft.subject.trim()) e.subject = 'Give the entry a subject.'; else if (draft.subject.trim().length > TITLE_MAX) e.subject = TITLE_MAX + ' characters at most.';
    if (draft.title.trim().length > TITLE_MAX) e.title = TITLE_MAX + ' characters at most.';
    PARTS.forEach(function (p) { if (draft[p.key].trim().length > TEXT_MAX) e[p.key] = TEXT_MAX + ' characters at most.'; });
    return e;
  }
  function changed() { renderProgress(); if (submitted) { errors = validate(); } renderErrors(); scheduleDraft(); }
  function scheduleDraft() { if (mode !== 'create') return; clearTimeout(saveTimer); saveTimer = setTimeout(function () { writeDraft(isDirty() ? Object.assign({}, draft) : null); }, 300); }

  sheet.addEventListener('input', function (ev) {
    var t = ev.target;
    if (t.id === 'sh-subject') draft.subject = t.value; else if (t.id === 'sh-title') draft.title = t.value;
    else if (t.classList.contains('ruled')) { draft[t.dataset.key] = t.value; grow(t); if (t.dataset.key === 'kind') renderPicks(); }
    else return;
    changed();
  });
  sheet.addEventListener('keydown', function (ev) {
    var t = ev.target; if (!t.classList.contains('ruled')) return;
    if (ev.key !== 'Enter' || ev.shiftKey || ev.ctrlKey || ev.metaKey || ev.altKey || ev.isComposing || t.selectionStart !== t.selectionEnd) return;
    var edit = continueList(t.value, t.selectionStart); if (!edit) return;
    ev.preventDefault(); t.value = edit.text; draft[t.dataset.key] = edit.text; t.setSelectionRange(edit.caret, edit.caret); grow(t); changed();
  });
  sheet.addEventListener('click', function (ev) {
    var pick = ev.target.closest('.pick');
    if (pick) { draft.kind = togglePick(draft.kind, pick.dataset.pick); $('#sh-kind').value = draft.kind; grow($('#sh-kind')); renderPicks(); changed(); return; }
    if (ev.target.id === 'reveal-title') { $('#title-wrap').hidden = false; $('#reveal-title').hidden = true; $('#sh-title').focus(); }
    if (ev.target.id === 'reveal-files') { $('#files-wrap').hidden = false; $('#reveal-files').hidden = true; $('#sh-files').focus(); }
  });
  $('#crew').addEventListener('input', function (e) { draft.crew = e.target.value; changed(); });
  $('#hours').addEventListener('input', function (e) {
    var v = e.target.value.replace(',', '.').replace(/[^\d.]/g, '').replace(/^(\d*\.?\d*).*$/, '$1'); e.target.value = v; draft.hours = v; $('#hours-unit').hidden = !v; changed();
  });
  $('#status').addEventListener('click', function (ev) { var b = ev.target.closest('button'); if (b) { draft.status = b.dataset.v; renderStatus(); $('#status button[aria-checked="true"]').focus(); changed(); } });
  $('#status').addEventListener('keydown', function (ev) {
    var k = ev.key; if (k !== 'ArrowRight' && k !== 'ArrowLeft') return; ev.preventDefault();
    var rtl = getComputedStyle(panel).direction === 'rtl', dir = (k === 'ArrowRight') !== rtl ? 1 : -1, i = STATUSES.map(function (s) { return s.v; }).indexOf(draft.status);
    draft.status = STATUSES[(i + dir + STATUSES.length) % STATUSES.length].v; renderStatus(); $('#status button[aria-checked="true"]').focus(); changed();
  });

  // ---- setup bar menus
  function closeMenus(focusButton) {
    var was = openMenu; openMenu = null;
    ['asset', 'date'].forEach(function (m) { $('#' + m + '-menu').hidden = true; $('#' + m + '-btn').setAttribute('aria-expanded', 'false'); });
    if (was && focusButton) $('#' + was + '-btn').focus();
  }
  function toggleMenu(name) {
    var open = openMenu !== name; closeMenus(false);
    if (!open) return;
    openMenu = name; $('#' + name + '-menu').hidden = false; $('#' + name + '-btn').setAttribute('aria-expanded', 'true');
    if (name === 'asset') { renderAssets(''); var s = $('#asset-search'); if (s) s.focus(); else { var on = $('#asset-menu .pill[aria-selected="true"]') || $('#asset-menu .pill'); on.focus(); } }
    else { calMonth = isYmd(draft.date) ? draft.date.slice(0, 7) : TODAY.slice(0, 7); renderCal(); $('#date-menu .cal__day[aria-pressed="true"]').focus(); }
  }
  function renderAssets(filter) {
    var q = filter.trim().toLowerCase(), html = ASSETS.length > 8 ? '<input class="bar-field" id="asset-search" style="width:100%" placeholder="Filter assets…" aria-label="Filter assets" autocomplete="off" value="' + esc(filter) + '">' : '', n = 0;
    SITES.forEach(function (s) {
      var items = ASSETS.filter(function (a) { return a.site === s[0] && (!q || (a.name + ' ' + a.site).toLowerCase().indexOf(q) >= 0); });
      if (!items.length) return; n += items.length;
      html += '<div role="group" aria-label="' + esc(s[0]) + '"><span class="menu__level">' + esc(s[0]) + '</span><div class="menu__items">' + items.map(function (a) { return '<button type="button" role="option" class="pill" data-id="' + a.id + '" aria-selected="' + (draft.assetId === a.id) + '">' + esc(a.name) + '</button>'; }).join('') + '</div></div>';
    });
    if (!n) html += '<p class="hint">No asset matches.</p>';
    var m = $('#asset-menu'), had = document.activeElement && document.activeElement.id === 'asset-search'; m.innerHTML = html;
    if (had) { var s2 = $('#asset-search'); s2.focus(); s2.setSelectionRange(s2.value.length, s2.value.length); }
  }
  $('#asset-btn').addEventListener('click', function () { toggleMenu('asset'); });
  $('#date-btn').addEventListener('click', function () { toggleMenu('date'); });
  $('#asset-menu').addEventListener('input', function (ev) { if (ev.target.id === 'asset-search') renderAssets(ev.target.value); });
  $('#asset-menu').addEventListener('keydown', function (ev) {
    if (ev.key === 'Enter' && ev.target.id === 'asset-search') { ev.preventDefault(); var f = $('#asset-menu .pill'); if (f) pickAsset(f.dataset.id); }
  });
  $('#asset-menu').addEventListener('click', function (ev) { var b = ev.target.closest('.pill'); if (b) pickAsset(b.dataset.id); });
  function pickAsset(id) { draft.assetId = id; renderBar(); closeMenus(true); changed(); }
  var calMonth = '2026-11';
  function renderCal() {
    var y = +calMonth.slice(0, 4), m = +calMonth.slice(5) - 1, first = new Date(Date.UTC(y, m, 1)), start = (first.getUTCDay() + 6) % 7, days = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    var marks = {}; entries.forEach(function (e) { if (e.assetId === draft.assetId && (!editing || e.id !== editing.id)) marks[e.date] = (marks[e.date] || 0) + 1; });
    var html = '<div class="cal__head"><button type="button" class="icon-btn" id="cal-prev" aria-label="Previous month">‹</button><strong aria-live="polite">' + fmt({ month: 'long', year: 'numeric' }).format(first) + '</strong><button type="button" class="icon-btn" id="cal-next" aria-label="Next month">›</button></div><div class="cal__grid">'
      + ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(function (d) { return '<span class="cal__dow" aria-hidden="true">' + d + '</span>'; }).join('');
    for (var i = 0; i < start; i++) html += '<span></span>';
    var focusDay = isYmd(draft.date) && draft.date.slice(0, 7) === calMonth ? draft.date : calMonth + '-01';
    for (var d = 1; d <= days; d++) {
      var ymd = calMonth + '-' + pad(d), n = marks[ymd];
      html += '<button type="button" class="cal__day" data-ymd="' + ymd + '" aria-pressed="' + (draft.date === ymd) + '" tabindex="' + (ymd === focusDay ? 0 : -1) + '"' + (ymd === TODAY ? ' data-today' : '') + (n ? ' data-mark aria-label="' + longDate(ymd) + '. ' + n + (n > 1 ? ' entries' : ' entry') + ' for this asset that day"' : ' aria-label="' + longDate(ymd) + '"') + '>' + d + '</button>';
    }
    $('#date-menu').innerHTML = html + '</div>';
  }
  function shiftMonth(n) { var y = +calMonth.slice(0, 4), m = +calMonth.slice(5) - 1 + n; var d = new Date(Date.UTC(y, m, 1)); calMonth = d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1); renderCal(); }
  $('#date-menu').addEventListener('click', function (ev) {
    if (ev.target.closest('#cal-prev')) { shiftMonth(-1); $('#cal-prev').focus(); return; }
    if (ev.target.closest('#cal-next')) { shiftMonth(1); $('#cal-next').focus(); return; }
    var b = ev.target.closest('.cal__day'); if (b) { draft.date = b.dataset.ymd; renderBar(); closeMenus(true); changed(); }
  });
  $('#date-menu').addEventListener('keydown', function (ev) {
    var b = ev.target.closest('.cal__day'); if (!b) return;
    var step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[ev.key]; if (!step) return; ev.preventDefault();
    var d = new Date(b.dataset.ymd + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + step);
    var ymd = d.toISOString().slice(0, 10); if (ymd.slice(0, 7) !== calMonth) { calMonth = ymd.slice(0, 7); renderCal(); }
    var next = $('#date-menu .cal__day[data-ymd="' + ymd + '"]'); $$('#date-menu .cal__day').forEach(function (x) { x.tabIndex = -1; }); next.tabIndex = 0; next.focus();
  });
  document.addEventListener('mousedown', function (ev) { if (openMenu && !ev.target.closest('.bar-item')) closeMenus(false); }, true);

  // ---- open, save, close
  var apps = $('#app');
  function openPanel(m, entry, from) {
    mode = m; editing = entry || null; opener = from || document.activeElement; submitted = false; errors = {}; restored = false;
    if (m === 'edit') { draft = draftOf(entry); initial = snapshot(); }
    else {
      var saved = readDraft();
      if (saved && anyContent(saved)) { draft = saved; restored = true; initial = JSON.stringify(emptyDraft()); }
      else { draft = emptyDraft(); initial = snapshot(); }
    }
    $('#panel-title').textContent = m === 'edit' ? 'Edit entry' : 'New entry';
    $('#panel-sub').textContent = m === 'edit' ? 'Changes are saved when you press Save.' : 'Visible to the whole crew when created.';
    $('#submit').textContent = m === 'edit' ? 'Save' : 'Create entry';
    $('#restored').hidden = !restored; $('#failure').hidden = true;
    apps.inert = true; backdrop.hidden = false; closeMenus(false);
    fill();
    if (!sheetWidth) { ro && ro.observe(sheet); }
    document.fonts && document.fonts.ready.then(growAll);
    $('#sh-subject').focus();
  }
  function closePanel(returnTo) {
    closeMenus(false); backdrop.hidden = true; apps.inert = false;
    var el = returnTo || opener; if (el && document.contains(el)) el.focus();
  }
  function restart() { writeDraft(null); restored = false; draft = emptyDraft(); initial = snapshot(); submitted = false; errors = {}; $('#restored').hidden = true; fill(); $('#sh-subject').focus(); }
  $('#restart').addEventListener('click', restart);
  function submit() {
    submitted = true; errors = validate(); renderErrors();
    if (Object.keys(errors).length) {
      // The first invalid field in reading order: the setup bar, then the sheet.
      var first = $('#asset-btn.is-invalid') || $('#date-btn.is-invalid') || ($('#hours-wrap.is-invalid') && $('#hours')) || $('.is-invalid', sheet);
      if (first) first.focus();
      return;
    }
    var rec = Object.assign({}, draft, { subject: draft.subject.trim() }), id;
    if (mode === 'edit') { id = editing.id; Object.assign(entryById(id), rec); say('Entry saved.'); }
    else { id = 'e' + (entries.length + 1); rec.id = id; entries.push(rec); writeDraft(null); say('Entry created.'); }
    selectedId = id; focusId = id; renderPages(); renderPane();
    closePanel($('.line[data-id="' + id + '"]'));   // focus goes to the line that was written
  }
  $('#submit').addEventListener('click', submit);
  function confirmDiscard(title, text) {
    return new Promise(function (resolve) {
      $('#confirm-t').textContent = title; $('#confirm-d').textContent = text; $('#confirm-bd').hidden = false;
      var keep = $('#confirm-keep'), discard = $('#confirm-discard'), dlg = $('#confirm');
      var done = function (v) { $('#confirm-bd').hidden = true; keep.onclick = discard.onclick = dlg.onkeydown = null; resolve(v); };
      keep.onclick = function () { done(false); }; discard.onclick = function () { done(true); };
      dlg.onkeydown = function (ev) {
        if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); done(false); }
        else if (ev.key === 'Tab') { var f = [keep, discard], i = f.indexOf(document.activeElement); ev.preventDefault(); f[(i + (ev.shiftKey ? -1 : 1) + 2) % 2].focus(); }
        ev.stopPropagation();
      };
      keep.focus();   // the safest answer
    });
  }
  async function requestClose() {
    if (mode === 'create') {
      if (isDirty()) { writeDraft(Object.assign({}, draft)); say('Draft kept on this device.'); }
    } else if (isDirty()) {
      var discard = await confirmDiscard('Discard your changes?', 'The changes you made to this entry will not be saved.');
      if (!discard) { $('#sh-subject').focus(); return; }
    }
    closePanel();
  }
  $('#close').addEventListener('click', requestClose); $('#cancel').addEventListener('click', requestClose);
  backdrop.addEventListener('mousedown', function (ev) { if (ev.target === backdrop) requestClose(); });

  // Keys typed in the panel must not reach the screen underneath; Tab stays inside the panel.
  panel.addEventListener('keydown', function (ev) {
    if (!$('#confirm-bd').hidden) return;
    var ctrl = ev.ctrlKey || ev.metaKey, k = ev.key;
    if (k === 'Escape' && openMenu) { ev.preventDefault(); ev.stopPropagation(); closeMenus(true); return; }
    if (ctrl && (k === 'Enter' || k.toLowerCase() === 's')) { ev.preventDefault(); submit(); }
    else if (k === 'Escape') { ev.preventDefault(); requestClose(); }
    else if (ctrl && k.toLowerCase() === 'p') ev.preventDefault();      // printing the form itself would make no sense
    else if (k === 'Tab') {
      var f = $$('a[href], button, input, textarea, select, [tabindex="0"]', panel).filter(function (e) { return !e.disabled && !e.closest('[hidden]') && e.tabIndex >= 0 && e.getClientRects().length; });
      if (f.length) { var first = f[0], last = f[f.length - 1]; if (ev.shiftKey && document.activeElement === first) { ev.preventDefault(); last.focus(); } else if (!ev.shiftKey && document.activeElement === last) { ev.preventDefault(); first.focus(); } }
    }
    ev.stopPropagation();
  });
  $('#new').addEventListener('click', function () { openPanel('create', null, $('#new')); });
  // A screen shortcut: it must not fire from inside the panel or while typing.
  document.addEventListener('keydown', function (ev) {
    if (!backdrop.hidden || ev.ctrlKey || ev.metaKey || ev.altKey) return;
    var t = ev.target; if (t.closest && t.closest('input, textarea, select, [contenteditable]')) return;
    if (ev.key.toLowerCase() === 'n') { ev.preventDefault(); openPanel('create', null, document.activeElement); }
  });

  buildSheet();
  renderPages(); renderPane(); renderPrint();
  if (new URLSearchParams(location.search).get('open')) openPanel('create', null, $('#new'));
})();
