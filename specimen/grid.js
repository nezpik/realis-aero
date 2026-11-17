// Realis Aero grid keyboard model: one tab stop, arrow keys inside, spreadsheet
// conventions for editing. Used by the specimen table and exercised key by key
// by tools/check-render.mjs.
(function () {
  var grid = document.getElementById('assets');
  if (!grid) return;
  var body = grid.tBodies[0], status = document.getElementById('grid-status'), foot = document.getElementById('grid-counts');
  var headers = Array.prototype.slice.call(grid.querySelectorAll('thead tr:nth-child(2) th'));
  var active = null, editing = null, TOTAL = 1240;

  function rows() { return Array.prototype.slice.call(body.rows); }
  function cells(row) { return Array.prototype.slice.call(row.cells); }
  function pos(cell) { var r = cell.parentElement; return { row: r.parentElement === body ? rows().indexOf(r) : -1, col: cells(r).indexOf(cell) }; }
  function at(row, col) { return row < 0 ? headers[col] : rows()[row] && rows()[row].cells[col]; }

  function describe() {
    if (!active) return;
    var p = pos(active), head = headers[p.col], name = p.row < 0 ? 'Header' : rows()[p.row].cells[0].textContent.trim();
    var group = head.dataset.group ? head.dataset.group + ' › ' : '';
    status.textContent = (editing ? 'EDIT' : 'NAV') + ' · ' + name + ' · ' + group + head.textContent.trim();
  }
  function counts() {
    var selected = body.querySelectorAll('tr[aria-selected="true"]').length, dirty = body.querySelectorAll('td[data-state="dirty"]').length;
    var sorted = grid.querySelector('th[aria-sort]:not([aria-sort="none"])');
    foot.textContent = 'Showing ' + rows().length + ' of ' + TOTAL.toLocaleString('en') + ' · ' + selected + ' selected · ' + dirty + ' unsaved'
      + (sorted ? ' · sorted by ' + sorted.textContent.trim() + ' (' + sorted.getAttribute('aria-sort') + ')' : '');
  }
  function activate(cell, focus) {
    if (!cell) return;
    if (active) { active.tabIndex = -1; active.classList.remove('is-active'); }
    active = cell; cell.tabIndex = 0; cell.classList.add('is-active');
    if (focus !== false) cell.focus();
    describe();
  }

  function sort(th) {
    var col = headers.indexOf(th), dir = th.getAttribute('aria-sort') === 'ascending' ? 'descending' : 'ascending';
    headers.forEach(function (h) { if (h.hasAttribute('aria-sort')) h.setAttribute('aria-sort', 'none'); });
    th.setAttribute('aria-sort', dir);
    var numeric = th.classList.contains('num');
    rows().sort(function (a, b) {
      var x = a.cells[col].dataset.value || a.cells[col].textContent.trim(), y = b.cells[col].dataset.value || b.cells[col].textContent.trim();
      var d = numeric ? parseFloat(x) - parseFloat(y) : x.localeCompare(y);
      return dir === 'ascending' ? d : -d;
    }).forEach(function (r) { body.appendChild(r); });
    counts();
  }

  function startEdit(cell) {
    if (!cell.hasAttribute('data-editable') || editing) return;
    var box = cell.querySelector('.cell-edit'), value = box.querySelector('.cell-value');
    var input = document.createElement('input');
    input.value = value.textContent.trim(); input.setAttribute('aria-label', headers[pos(cell).col].textContent.trim() + ', ' + cell.parentElement.cells[0].textContent.trim());
    input.inputMode = 'decimal';
    value.hidden = true; box.appendChild(input);
    editing = { cell: cell, input: input, value: value, before: value.textContent };
    input.focus(); input.select(); describe();
  }
  function endEdit(commit) {
    if (!editing) return;
    var e = editing; editing = null;
    var next = e.input.value.trim();
    e.input.remove(); e.value.hidden = false;
    if (commit && next !== '' && next !== e.before) {
      e.value.textContent = next; e.value.innerHTML = '<bdi></bdi>'; e.value.firstChild.textContent = next; e.cell.dataset.value = next;
      var original = e.cell.dataset.original || (e.cell.dataset.original = e.before);
      var dirty = next !== original, dot = e.cell.querySelector('.mark');
      if (dirty) e.cell.dataset.state = 'dirty'; else delete e.cell.dataset.state;
      dot.hidden = !dirty;
      e.cell.setAttribute('aria-description', dirty ? 'Unsaved, was ' + original : '');
    }
    counts(); describe();
  }
  function nextEditable(from, step) {
    var all = Array.prototype.slice.call(body.querySelectorAll('td[data-editable]')), i = all.indexOf(from) + step;
    return all[i];
  }

  grid.addEventListener('keydown', function (ev) {
    var cell = active, p = pos(cell), last = rows().length - 1, lastCol = headers.length - 1, k = ev.key;
    if (editing) {
      if (k === 'Enter') { ev.preventDefault(); endEdit(true); activate(at(Math.min(p.row + 1, last), p.col)); }
      else if (k === 'Escape') { ev.preventDefault(); endEdit(false); activate(cell); }
      else if (k === 'Tab') { var n = nextEditable(cell, ev.shiftKey ? -1 : 1); endEdit(true); if (n) { ev.preventDefault(); activate(n); startEdit(n); } else activate(cell, false); }
      return;
    }
    var page = 5, go = null;
    if (k === 'ArrowRight') go = at(p.row, Math.min(p.col + 1, lastCol));
    else if (k === 'ArrowLeft') go = at(p.row, Math.max(p.col - 1, 0));
    else if (k === 'ArrowDown') go = at(Math.min(p.row + 1, last), p.col);
    else if (k === 'ArrowUp') go = at(Math.max(p.row - 1, -1), p.col);
    else if (k === 'Home') go = ev.ctrlKey ? at(0, 0) : at(p.row, 0);
    else if (k === 'End') go = ev.ctrlKey ? at(last, lastCol) : at(p.row, lastCol);
    else if (k === 'PageDown') go = at(Math.min(Math.max(p.row, 0) + page, last), p.col);
    else if (k === 'PageUp') go = at(Math.max(p.row - page, 0), p.col);
    else if (k === 'Enter' || k === 'F2') {
      if (p.row < 0) { if (cell.hasAttribute('aria-sort')) { ev.preventDefault(); sort(cell); } }
      else if (cell.hasAttribute('data-editable')) { ev.preventDefault(); startEdit(cell); }
      return;
    } else if (k === ' ' && p.row >= 0) {
      ev.preventDefault();
      var row = cell.parentElement; row.setAttribute('aria-selected', String(row.getAttribute('aria-selected') !== 'true'));
      counts(); return;
    } else return;
    ev.preventDefault(); activate(go);
  });
  // Pointer follows the same model: a click makes the cell active, a double click edits.
  grid.addEventListener('click', function (ev) {
    var cell = ev.target.closest('th[role="columnheader"], td');
    if (!cell || editing) return;
    activate(cell);
    if (cell.matches('th[aria-sort]')) sort(cell);
  });
  grid.addEventListener('dblclick', function (ev) { var cell = ev.target.closest('td[data-editable]'); if (cell) { activate(cell); startEdit(cell); } });
  grid.addEventListener('focusout', function (ev) { if (editing && ev.target === editing.input && !grid.contains(ev.relatedTarget)) endEdit(true); });

  headers.concat(Array.prototype.slice.call(body.querySelectorAll('td'))).forEach(function (c) { c.tabIndex = -1; });
  activate(at(0, 0), false);
  counts();
})();
