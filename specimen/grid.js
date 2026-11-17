// Realis Aero data grid. The table is rendered from a small model so that its
// layout (visible columns, order, widths) can change without losing state.
// One tab stop, arrow keys inside, spreadsheet conventions for editing, range
// selection, copy and paste with a preview, and column controls with a
// keyboard alternative for every pointer action.
(function () {
  var grid = document.getElementById('assets');
  if (!grid) return;
  var body = grid.tBodies[0], colgroup = grid.querySelector('colgroup');
  var $ = function (id) { return document.getElementById(id); };
  var status = $('grid-status'), foot = $('grid-counts'), TOTAL = 1240, DASH = '—', MINUS = '−';
  var esc = function (t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var mark = function (n, hidden) { return '<svg class="mark" aria-hidden="true"' + (hidden ? ' hidden' : '') + '><use href="#m-' + n + '"/></svg>'; };
  var say = function (t) { $('grid-say').textContent = t; };

  var COLS = [
    { id: 'asset', label: 'Asset', key: true, sort: true, w: 176 },
    { id: 'site', label: 'Site', group: 'Identity', sort: true, w: 140 },
    { id: 'path', label: 'Location', group: 'Identity', mid: true, w: 216 },
    { id: 'now', label: 'Now kW', group: 'Output', num: true, sort: true, w: 112 },
    { id: 'today', label: 'Today kWh', group: 'Output', num: true, sort: true, w: 120 },
    { id: 'state', label: 'State', group: 'Health', w: 176 },
    { id: 'service', label: 'Last service', group: 'Health', muted: true, w: 136 },
    { id: 'limit', label: 'Limit kW', group: 'Control', num: true, editable: true, w: 120 },
    { id: 'reserve', label: 'Reserve %', group: 'Control', num: true, editable: true, w: 128 }
  ];
  var byId = function (id) { return COLS.filter(function (c) { return c.id === id; })[0]; };
  function R(id, asset, site, path, now, today, state, label, service, limit, reserve, markName) {
    return { id: id, asset: asset, site: site, path: path, now: now, today: today, state: state, label: label, service: service, limit: limit, reserve: reserve, mark: markName, orig: { limit: limit, reserve: reserve }, selected: false };
  }
  var ROWS = [
    R('roofa', 'Roof array A', 'Casablanca DC', 'CA-DC/Roof/Array-A/String-04/INV-1-0412', '42.6', '212.4', 'live', 'Live', '12 Sep 2026', '50.0', '20.0', null),
    R('roofb', 'Roof array B', 'Casablanca DC', 'CA-DC/Roof/Array-B/String-02/INV-1-0413', '38.1', '190.2', 'live', 'Live', '12 Sep 2026', '50.0', '20.0', null),
    R('heat2', 'Heat pump 2', 'Rabat lab', 'RB-LAB/Plant-room/HP-2/Circuit-A/HPU-2-0188', '5.1', '61.0', 'degraded', 'Degraded', '03 Jun 2026', '8.0', '15.0', 'degraded'),
    R('inv2', 'Inverter 2', 'Casablanca DC', 'CA-DC/Roof/Array-A/Cabinet-2/INV-2-0417', '0.0', '104.7', 'maintenance', 'Maintenance', 'today 16:00', '25.0', '10.0', 'maintenance'),
    R('batt1', 'Battery rack 1', 'Casablanca DC', 'CA-DC/Basement/Rack-1/Module-06/BAT-1-0061', MINUS + '12.4', MINUS + '58.3', 'live', 'Live', '21 Aug 2026', '30.0', '25.0', null),
    R('flow3', 'Flow meter 3', 'Tangier plant', 'TG-PL/East-loop/Meter-3/Skid-B/FLM-3-0903', DASH, DASH, 'bad', 'Comm lost 00:42', '14 Feb 2026', '40.0', '30.0', 'offline'),
    R('mast', 'Weather mast', 'Tangier plant', 'TG-PL/Yard/Mast-1/Sensor-Head/WSM-1-0007', '0.2', '1.9', 'stale', 'Stale · 12 min', '30 Jul 2026', '1.0', '5.0', 'stale'),
    R('recov', 'Recovery pump', 'Rabat lab', 'RB-LAB/Plant-room/RP-1/Skid-A/RPM-1-0242', '3.4', '27.5', 'success', 'Verified', '02 Oct 2026', '6.0', '12.5', null)
  ];
  ROWS.filter(function (r) { return r.id === 'inv2'; })[0].selected = true;
  var rowById = function (id) { return ROWS.filter(function (r) { return r.id === id; })[0]; };

  // ---- Layout (view state): takes effect at once, persists, and has a reset.
  function fresh() { return { order: COLS.map(function (c) { return c.id; }), hidden: [], widths: {} }; }
  function load() {
    try {
      var v = JSON.parse(localStorage.getItem('ra.layout'));
      if (v && Array.isArray(v.order) && v.order.length === COLS.length && v.order.every(function (id) { return byId(id); })) return { order: v.order, hidden: v.hidden || [], widths: v.widths || {} };
    } catch (e) { /* no storage: default layout */ }
    return fresh();
  }
  var layout = load();
  var save = function () { try { localStorage.setItem('ra.layout', JSON.stringify(layout)); } catch (e) { /* ignore */ } };
  var visible = function () { return layout.order.filter(function (id) { return layout.hidden.indexOf(id) < 0; }).map(byId); };
  var widthOf = function (c) { return layout.widths[c.id] || c.w; };
  var isDefaultLayout = function () { return JSON.stringify(layout) === JSON.stringify(fresh()); };

  var sort = { col: null, dir: 'none' }, cur = null, range = null, rowAnchor = null, editing = null, pending = null, headers = [];
  var parseNum = function (t) { t = String(t).trim().replace(MINUS, '-'); return /^-?\d+(\.\d+)?$/.test(t) ? parseFloat(t) : null; };
  function ordered() {
    var rows = ROWS.slice();
    if (sort.col) {
      var c = byId(sort.col), val = function (r) { return c.num ? (r[c.id] === DASH ? -1e9 : parseFloat(String(r[c.id]).replace(MINUS, '-'))) : String(r[c.id]); };
      rows.sort(function (a, b) { var x = val(a), y = val(b), d = c.num ? x - y : x.localeCompare(y); return sort.dir === 'ascending' ? d : -d; });
    }
    return rows;
  }

  // ---- Render
  function cellHtml(row, c, first) {
    var cls = [c.key && 'key', c.num && 'num', first && 'group', c.muted && 'muted'].filter(Boolean).join(' ');
    var attrs = ' role="gridcell" tabindex="-1" data-col="' + c.id + '"' + (cls ? ' class="' + cls + '"' : ''), inner;
    if (c.key) { attrs += ' data-state="' + row.state + '"'; inner = '<span class="key__inner"><span class="slot">' + (row.mark ? mark(row.mark) : '') + '</span><span>' + esc(row.asset) + '</span></span>'; }
    else if (c.id === 'state') { attrs += ' data-state="' + row.state + '"'; inner = '<span class="state-label">' + esc(row.label) + '</span>'; }
    else if (c.mid) {
      var t = row.path; attrs += ' data-full="' + esc(t) + '"';
      inner = '<span class="mid" title="' + esc(t) + '"><span class="mid__a">' + esc(t.slice(0, -12)) + '</span><span class="mid__b">' + esc(t.slice(-12)) + '</span></span>';
    } else if (c.editable) {
      var dirty = row[c.id] !== row.orig[c.id];
      attrs += ' data-editable data-value="' + esc(row[c.id]) + '"' + (dirty ? ' data-state="dirty" aria-description="Unsaved, was ' + esc(row.orig[c.id]) + '"' : '');
      inner = '<span class="cell-edit">' + mark('dirty', !dirty) + '<span class="cell-value"><bdi>' + esc(row[c.id]) + '</bdi></span></span>';
    } else inner = '<bdi>' + esc(row[c.id]) + '</bdi>';
    return '<td' + attrs + '>' + inner + '</td>';
  }
  function render(focus) {
    var vis = visible(), runs = [], seen = {}, firstOf = {}, total = 0;
    vis.forEach(function (c) {
      var g = c.key ? '' : c.group, last = runs[runs.length - 1];
      if (last && g && last.g === g) last.n++; else runs.push({ g: g, n: 1 });
      if (!c.key && !seen[c.group]) { seen[c.group] = 1; firstOf[c.id] = 1; }
      total += widthOf(c);
    });
    colgroup.innerHTML = vis.map(function (c) { return '<col style="width:' + widthOf(c) + 'px">'; }).join('');
    grid.style.width = total + 'px';
    grid.tHead.innerHTML = '<tr role="row">' + runs.map(function (r) { return '<th scope="colgroup" colspan="' + r.n + '" class="' + (r.g ? 'group' : 'key') + '">' + esc(r.g) + '</th>'; }).join('') + '</tr>'
      + '<tr role="row">' + vis.map(function (c) {
        var cls = [c.key && 'key', c.num && 'num', firstOf[c.id] && 'group'].filter(Boolean).join(' ');
        return '<th role="columnheader" scope="col" tabindex="-1" class="' + cls + '" data-col="' + c.id + '" data-group="' + (c.group || '') + '"'
          + (c.sort ? ' aria-sort="' + (sort.col === c.id ? sort.dir : 'none') + '"' : '') + '>' + esc(c.label) + '<span class="resize" data-col="' + c.id + '" aria-hidden="true"></span></th>';
      }).join('') + '</tr>';
    body.innerHTML = ordered().map(function (row) {
      return '<tr role="row" data-id="' + row.id + '" aria-selected="' + row.selected + '">' + vis.map(function (c) { return cellHtml(row, c, firstOf[c.id]); }).join('') + '</tr>';
    }).join('');
    headers = Array.prototype.slice.call(grid.querySelectorAll('thead tr:nth-child(2) th'));
    if (!cur || !cellFor(cur)) cur = { row: body.rows[0].dataset.id, col: 'asset' };
    var target = cellFor(cur);
    target.tabIndex = 0; target.classList.add('is-active');
    if (range) { if (!applyRange()) range = null; }
    if (focus) target.focus();
    counts(); describe(); fillPanel(); buttons();
  }
  function cellFor(ids) {
    if (ids.row === '__head') return grid.querySelector('thead th[data-col="' + ids.col + '"][role="columnheader"]');
    return body.querySelector('tr[data-id="' + ids.row + '"] td[data-col="' + ids.col + '"]');
  }
  var idsOf = function (cell) { return { row: cell.tagName === 'TH' ? '__head' : cell.parentElement.dataset.id, col: cell.dataset.col }; };
  function pos(cell) { return cell.tagName === 'TH' ? { row: -1, col: headers.indexOf(cell) } : { row: Array.prototype.indexOf.call(body.rows, cell.parentElement), col: cell.cellIndex }; }
  var at = function (row, col) { return row < 0 ? headers[col] : body.rows[row] && body.rows[row].cells[col]; };
  function activate(cell, focus) {
    Array.prototype.forEach.call(grid.querySelectorAll('[tabindex="0"]'), function (x) { x.tabIndex = -1; x.classList.remove('is-active'); });
    cur = idsOf(cell); cell.tabIndex = 0; cell.classList.add('is-active');
    if (focus !== false) cell.focus();
    describe();
  }
  var activateIds = function (ids, focus) { var c = cellFor(ids); if (c) activate(c, focus); };

  function describe() {
    var cell = cellFor(cur); if (!cell) return;
    var p = pos(cell), head = headers[p.col];
    var name = p.row < 0 ? 'Header' : rowById(cell.parentElement.dataset.id).asset, group = head.dataset.group ? head.dataset.group + ' › ' : '';
    status.textContent = (editing ? 'EDIT' : 'NAV') + ' · ' + name + ' · ' + group + head.firstChild.textContent.trim() + (cell.dataset.full ? ' · ' + cell.dataset.full : '');
  }
  function counts() {
    var sel = ROWS.filter(function (r) { return r.selected; }).length, dirty = unsaved();
    var size = range ? (Math.abs(range.r - range.ar) + 1) * (Math.abs(range.c - range.ac) + 1) : 0;
    foot.textContent = 'Showing ' + ROWS.length + ' of ' + TOTAL.toLocaleString('en') + ' · ' + sel + ' selected · ' + dirty + ' unsaved'
      + (sort.col ? ' · sorted by ' + byId(sort.col).label + ' (' + sort.dir + ')' : '')
      + (size > 1 ? ' · range ' + (Math.abs(range.r - range.ar) + 1) + ' × ' + (Math.abs(range.c - range.ac) + 1) : '');
  }
  function unsaved() { var n = 0; ROWS.forEach(function (r) { ['limit', 'reserve'].forEach(function (k) { if (r[k] !== r.orig[k]) n++; }); }); return n; }
  // A disabled control stays focusable and its reason is its description, not only a message after a click.
  function setDisabled(btn, off, why) {
    btn.setAttribute('aria-disabled', String(off));
    var id = 'why-' + btn.id, el = document.getElementById(id);
    if (off) {
      btn.dataset.why = why;
      if (!el) { el = document.createElement('span'); el.id = id; el.className = 'sr-only'; btn.after(el); }
      el.textContent = why; btn.setAttribute('aria-describedby', id);
    } else { delete btn.dataset.why; btn.removeAttribute('aria-describedby'); if (el) el.remove(); }
  }
  function buttons() {
    setDisabled($('grid-discard'), unsaved() === 0, 'Nothing to discard: no unsaved edits.');
    setDisabled($('grid-reset-layout'), isDefaultLayout(), 'The layout is already the default.');
  }

  // ---- Range
  function bounds() { return { r1: Math.min(range.ar, range.r), r2: Math.max(range.ar, range.r), c1: Math.min(range.ac, range.c), c2: Math.max(range.ac, range.c) }; }
  function clearRangeClasses() { Array.prototype.forEach.call(body.querySelectorAll('td.in-range'), function (td) { td.classList.remove('in-range'); td.removeAttribute('aria-selected'); }); }
  function applyRange() {
    clearRangeClasses();
    var b = bounds(); if (b.r1 === b.r2 && b.c1 === b.c2) return false;
    for (var r = b.r1; r <= b.r2; r++) for (var c = b.c1; c <= b.c2; c++) { var td = at(r, c); if (td) { td.classList.add('in-range'); td.setAttribute('aria-selected', 'true'); } }
    return true;
  }
  function clearRange() { range = null; clearRangeClasses(); }

  // ---- Sorting
  function sortBy(th) {
    var id = th.dataset.col; sort = { col: id, dir: sort.col === id && sort.dir === 'ascending' ? 'descending' : 'ascending' };
    cur = { row: '__head', col: id }; render(true);
  }

  // ---- Editing
  function startEdit(cell) {
    if (!cell || !cell.hasAttribute('data-editable') || editing) return;
    var ids = idsOf(cell), box = cell.querySelector('.cell-edit'), val = box.querySelector('.cell-value'), input = document.createElement('input');
    input.value = val.textContent.trim(); input.inputMode = 'decimal';
    input.setAttribute('aria-label', byId(ids.col).label + ', ' + rowById(ids.row).asset);
    val.hidden = true; box.appendChild(input);
    editing = { row: ids.row, col: ids.col, input: input };
    input.focus(); input.select(); describe();
  }
  function endEdit(commit) {
    if (!editing) return;
    var e = editing; editing = null;
    var next = e.input.value.trim(), row = rowById(e.row);
    if (commit && next !== '' && next !== row[e.col]) {
      var n = parseNum(next);
      if (n === null || n < 0 || n > 100) say('Not applied: "' + next + '" is not a number from 0 to 100.');
      else row[e.col] = n.toFixed(1);
    }
    render(false);
  }
  var nextEditable = function (ids, step) {
    var all = Array.prototype.slice.call(body.querySelectorAll('td[data-editable]')), i = all.indexOf(cellFor(ids)) + step;
    return all[i] ? idsOf(all[i]) : null;
  };

  grid.addEventListener('keydown', function (ev) {
    if (ev.target.closest('.paste')) return;
    var cell = cellFor(cur), p = pos(cell), last = body.rows.length - 1, lastCol = headers.length - 1, k = ev.key;
    if (editing) {
      var e = editing;
      if (k === 'Enter') { ev.preventDefault(); var tr = cellFor({ row: e.row, col: e.col }).parentElement.nextElementSibling; endEdit(true); activateIds({ row: tr ? tr.dataset.id : e.row, col: e.col }, true); }
      else if (k === 'Escape') { ev.preventDefault(); endEdit(false); activateIds({ row: e.row, col: e.col }, true); }
      else if (k === 'Tab') { var n = nextEditable({ row: e.row, col: e.col }, ev.shiftKey ? -1 : 1); endEdit(true); if (n) { ev.preventDefault(); activateIds(n, true); startEdit(cellFor(n)); } else activateIds({ row: e.row, col: e.col }, false); }
      return;
    }
    var page = 5, go = null, arrow = true;
    if (k === 'ArrowRight') go = at(p.row, Math.min(p.col + 1, lastCol));
    else if (k === 'ArrowLeft') go = at(p.row, Math.max(p.col - 1, 0));
    else if (k === 'ArrowDown') go = at(Math.min(p.row + 1, last), p.col);
    else if (k === 'ArrowUp') go = at(Math.max(p.row - 1, -1), p.col);
    else {
      arrow = false;
      if (k === 'Home') go = ev.ctrlKey ? at(0, 0) : at(p.row, 0);
      else if (k === 'End') go = ev.ctrlKey ? at(last, lastCol) : at(p.row, lastCol);
      else if (k === 'PageDown') go = at(Math.min(Math.max(p.row, 0) + page, last), p.col);
      else if (k === 'PageUp') go = at(Math.max(p.row - page, 0), p.col);
      else if (k === 'Enter' || k === 'F2') {
        if (p.row < 0) { if (cell.hasAttribute('aria-sort')) { ev.preventDefault(); sortBy(cell); } }
        else if (cell.hasAttribute('data-editable')) { ev.preventDefault(); startEdit(cell); }
        return;
      } else if (k === ' ' && p.row >= 0) {
        ev.preventDefault();
        var row = rowById(cell.parentElement.dataset.id);
        if (ev.shiftKey && rowAnchor) {
          var order = ordered().map(function (r) { return r.id; }), a = order.indexOf(rowAnchor), b = order.indexOf(row.id);
          order.slice(Math.min(a, b), Math.max(a, b) + 1).forEach(function (id) { rowById(id).selected = true; });
        } else { row.selected = !row.selected; rowAnchor = row.id; }
        render(true); return;
      } else if (k === 'Escape') { if (range) { ev.preventDefault(); clearRange(); counts(); } return; }
      else return;
    }
    ev.preventDefault();
    if (!go) return;
    if (arrow && ev.shiftKey && p.row >= 0 && go.tagName === 'TD') {
      if (!range) range = { ar: p.row, ac: p.col, r: p.row, c: p.col };
      var np = pos(go); range.r = np.row; range.c = np.col; activate(go); applyRange(); counts();
    } else { clearRange(); activate(go); counts(); }
  });

  // ---- Copy and paste
  grid.addEventListener('copy', function (ev) {
    if (editing) return;
    var cell = cellFor(cur); if (!cell || cur.row === '__head') return;
    var p = pos(cell), b = range ? bounds() : { r1: p.row, r2: p.row, c1: p.col, c2: p.col }, lines = [];
    for (var r = b.r1; r <= b.r2; r++) { var line = []; for (var c = b.c1; c <= b.c2; c++) line.push(at(r, c).textContent.trim()); lines.push(line.join('\t')); }
    ev.clipboardData.setData('text/plain', lines.join('\n')); ev.preventDefault();
    say((b.r1 === b.r2 && b.c1 === b.c2) ? 'Copied 1 cell.' : 'Copied ' + (b.r2 - b.r1 + 1) + ' × ' + (b.c2 - b.c1 + 1) + ' cells.');
  });
  var closePaste = function (focus) { pending = null; $('paste').hidden = true; if (focus) activateIds(cur, true); };
  grid.addEventListener('paste', function (ev) {
    if (editing) return;
    var text = ev.clipboardData && ev.clipboardData.getData('text/plain'), cell = cellFor(cur);
    if (!text || !cell || cur.row === '__head') return;
    ev.preventDefault();
    var p = pos(cell), vis = visible(), items = [], skipped = [];
    text.replace(/\r/g, '').replace(/\n$/, '').split('\n').forEach(function (line, i) {
      line.split('\t').forEach(function (v, j) {
        var tr = body.rows[p.row + i], col = vis[p.col + j];
        if (!tr || !col) { skipped.push('Outside the table'); return; }
        var row = rowById(tr.dataset.id), where = row.asset + ' · ' + col.label;
        if (!col.editable) { skipped.push(where + ': read-only'); return; }
        var n = parseNum(v);
        if (n === null || n < 0 || n > 100) { skipped.push(where + ': "' + v + '" is not a number from 0 to 100'); return; }
        items.push({ id: row.id, col: col.id, where: where, from: row[col.id], to: n.toFixed(1) });
      });
    });
    pending = items;
    var list = $('paste-list'); list.innerHTML = '';
    var add = function (cls, markName, text) { var li = document.createElement('li'); li.className = cls; li.innerHTML = mark(markName); var s = document.createElement('span'); s.textContent = text; li.appendChild(s); list.appendChild(li); };
    items.slice(0, 6).forEach(function (it) { add('paste__ok', 'success', it.where + ': ' + it.from + ' → ' + it.to); });
    if (items.length > 6) add('paste__more', 'info', 'and ' + (items.length - 6) + ' more');
    skipped.slice(0, 4).forEach(function (t) { add('paste__skip', 'warning', 'Skipped · ' + t); });
    $('paste-title').textContent = 'Paste preview · ' + items.length + ' change' + (items.length === 1 ? '' : 's') + ', ' + skipped.length + ' skipped';
    setDisabled($('paste-apply'), items.length === 0, 'Nothing to paste: every value was skipped.');
    $('paste').hidden = false; $('paste-apply').focus();
  });
  $('paste').addEventListener('keydown', function (ev) { if (ev.key === 'Escape') { ev.preventDefault(); closePaste(true); say('Paste cancelled. Nothing changed.'); } });
  $('paste-cancel').addEventListener('click', function () { closePaste(true); say('Paste cancelled. Nothing changed.'); });
  $('paste-apply').addEventListener('click', function () {
    if ($('paste-apply').getAttribute('aria-disabled') === 'true') { say($('paste-apply').dataset.why); return; }
    var items = pending, skipped = $('paste-list').querySelectorAll('.paste__skip').length;
    items.forEach(function (it) { rowById(it.id)[it.col] = it.to; });
    closePaste(false); render(true);
    say('Pasted ' + items.length + ' value' + (items.length === 1 ? '' : 's') + ' as unsaved changes' + (skipped ? '. ' + skipped + ' skipped.' : '.'));
  });

  // ---- Pointer
  grid.addEventListener('click', function (ev) {
    if (ev.target.closest('.resize')) return;
    var cell = ev.target.closest('th[role="columnheader"], td');
    if (!cell || editing) return;
    activate(cell); clearRange(); counts();
    if (cell.matches('th[aria-sort]')) sortBy(cell);
  });
  grid.addEventListener('dblclick', function (ev) {
    var handle = ev.target.closest('.resize');
    if (handle) { delete layout.widths[handle.dataset.col]; save(); render(false); say(byId(handle.dataset.col).label + ' reset to its default width.'); return; }
    var cell = ev.target.closest('td[data-editable]'); if (cell) { activate(cell); startEdit(cell); }
  });
  grid.addEventListener('focusout', function (ev) { if (editing && ev.target === editing.input && !grid.contains(ev.relatedTarget)) endEdit(true); });
  grid.addEventListener('pointerdown', function (ev) {
    var handle = ev.target.closest('.resize'); if (!handle) return;
    ev.preventDefault();
    var c = byId(handle.dataset.col), startX = ev.clientX, startW = widthOf(c), dir = getComputedStyle(grid).direction === 'rtl' ? -1 : 1, w = startW;
    var colEl = colgroup.children[visible().indexOf(c)], startTotal = parseFloat(grid.style.width);
    var move = function (e) { w = Math.max(64, Math.min(480, startW + dir * (e.clientX - startX))); colEl.style.width = w + 'px'; grid.style.width = (startTotal - startW + w) + 'px'; };
    var up = function () {
      document.removeEventListener('pointermove', move); document.removeEventListener('pointerup', up);
      if (w === startW) return;   // a plain click must not rebuild the header, or a double click would lose its target
      layout.widths[c.id] = w; save(); render(false); say(c.label + ' resized to ' + w + 'px.');
    };
    document.addEventListener('pointermove', move); document.addEventListener('pointerup', up);
  });

  // ---- Toolbar and column panel (view state: immediate, with a reset)
  var guard = function (btn, fn) { btn.addEventListener('click', function () { if (btn.getAttribute('aria-disabled') === 'true') { say(btn.dataset.why); return; } fn(); }); };
  guard($('grid-discard'), function () { var n = unsaved(); ROWS.forEach(function (r) { r.limit = r.orig.limit; r.reserve = r.orig.reserve; }); render(false); say('Discarded ' + n + ' unsaved edit' + (n === 1 ? '' : 's') + '.'); });
  guard($('grid-reset-layout'), function () { layout = fresh(); save(); render(false); say('Layout reset to the default.'); });
  $('cols-btn').addEventListener('click', function () {
    var open = $('cols-panel').hidden; $('cols-panel').hidden = !open; $('cols-btn').setAttribute('aria-expanded', String(open));
    if (open) $('cols-list').querySelector('input, button').focus();
  });
  $('cols-panel').addEventListener('keydown', function (ev) { if (ev.key === 'Escape') { $('cols-panel').hidden = true; $('cols-btn').setAttribute('aria-expanded', 'false'); $('cols-btn').focus(); } });
  function fillPanel() {
    var list = $('cols-list'), html = '';
    layout.order.forEach(function (id) {
      var c = byId(id), hidden = layout.hidden.indexOf(id) >= 0, name = esc(c.label);
      var btn = function (act, label, aria) { return '<button class="btn btn--secondary" type="button" data-act="' + act + '" aria-label="' + aria + '"' + (c.key ? ' aria-disabled="true" aria-describedby="cols-key-why"' : '') + '>' + label + '</button>'; };
      html += '<li class="cols__row" data-col="' + id + '"><label class="choice"><input type="checkbox" data-act="show"' + (hidden ? '' : ' checked') + (c.key ? ' aria-disabled="true" aria-describedby="cols-key-why"' : '') + '><span>' + name + '</span></label>'
        + '<span class="caption muted cols__group">' + esc(c.key ? 'Key column' : c.group) + '</span><span class="cols__btns">'
        + btn('up', 'Up', 'Move ' + name + ' up') + btn('down', 'Down', 'Move ' + name + ' down') + btn('narrow', 'Narrower', 'Make ' + name + ' narrower') + btn('wide', 'Wider', 'Make ' + name + ' wider') + '</span></li>';
    });
    var focus = document.activeElement && document.activeElement.closest && document.activeElement.closest('#cols-list') ? { col: document.activeElement.closest('.cols__row').dataset.col, act: document.activeElement.dataset.act } : null;
    list.innerHTML = html;
    if (focus) { var el = list.querySelector('[data-col="' + focus.col + '"] [data-act="' + focus.act + '"]'); if (el) el.focus(); }
  }
  function panelAction(col, act, target) {
    var c = byId(col), n = visible().length;
    if (c.key) { say('Asset is the key column: always shown, in place, and its width is fixed.'); if (act === 'show') target.checked = true; return; }
    if (act === 'show') {
      var i = layout.hidden.indexOf(col);
      if (i >= 0) layout.hidden.splice(i, 1); else layout.hidden.push(col);
      save(); render(false); say(c.label + (i >= 0 ? ' shown. ' : ' hidden. ') + visible().length + ' of ' + COLS.length + ' columns shown.');
    } else if (act === 'up' || act === 'down') {
      var sib = layout.order.filter(function (id) { return byId(id).group === c.group; }), at0 = sib.indexOf(col), nb = sib[at0 + (act === 'up' ? -1 : 1)];
      if (!nb) { say(c.label + ' is already ' + (act === 'up' ? 'first' : 'last') + ' in ' + c.group + '. Columns move within their group.'); return; }
      var a = layout.order.indexOf(col), b = layout.order.indexOf(nb); layout.order[a] = nb; layout.order[b] = col;
      save(); render(false); say(c.label + ' moved ' + (act === 'up' ? 'before ' : 'after ') + byId(nb).label + '.');
    } else {
      var w = widthOf(c), next = Math.max(64, Math.min(480, w + (act === 'wide' ? 16 : -16)));
      if (next === w) { say(c.label + ' is already at its ' + (act === 'wide' ? 'maximum' : 'minimum') + ' width of ' + w + 'px.'); return; }
      layout.widths[col] = next; save(); render(false); say(c.label + ' ' + (act === 'wide' ? 'widened' : 'narrowed') + ' to ' + next + 'px.');
    }
  }
  $('cols-list').addEventListener('click', function (ev) { var b = ev.target.closest('button[data-act]'); if (b) panelAction(b.closest('.cols__row').dataset.col, b.dataset.act, b); });
  $('cols-list').addEventListener('change', function (ev) { var i = ev.target.closest('input[data-act]'); if (i) panelAction(i.closest('.cols__row').dataset.col, 'show', i); });

  render(false);
})();
