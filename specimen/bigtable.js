// A virtualized table: 12,408 rows, a few dozen in the page. The accessible
// structure keeps the full counts (aria-rowcount, aria-rowindex), the keyboard
// model works across the whole range, and the cost of each step is recorded so
// the render check can hold it to the budget.
(function () {
  var wrap = document.getElementById('big'), table = wrap && document.getElementById('big-wrap');
  var tbl = document.getElementById('big');
  if (!tbl) return;
  wrap = document.getElementById('big-wrap');
  var body = tbl.tBodies[0], N = 12408, OVER = 6, COLS = 4;
  var $ = function (id) { return document.getElementById(id); };
  var SITES = ['Casablanca DC', 'Rabat lab', 'Tangier plant'];
  var STATES = { live: ['Live', null], stale: ['Stale', 'stale'], bad: ['Comm lost', 'offline'], degraded: ['Degraded', 'degraded'] };
  var pad = function (n) { return String(n).padStart(5, '0'); };
  function data(i) {
    var s = i % 29 === 0 ? 'bad' : i % 13 === 0 ? 'stale' : i % 7 === 0 ? 'degraded' : 'live';
    return { id: 'RD-' + pad(i + 1), site: SITES[i % 3], kw: s === 'bad' ? '—' : (((i * 37) % 1000) / 10).toFixed(1), state: s };
  }
  var cur = { r: 0, c: 0 }, selected = {}, nSelected = 0, first = -1, last = -1, stats = [];
  tbl.__stats = stats;
  var rowH = function () { return parseFloat(getComputedStyle(wrap).getPropertyValue('--density-row-h')) || 40; };
  var headH = function () { return tbl.tHead.getBoundingClientRect().height; };

  function render(force) {
    var t0 = performance.now(), h = rowH(), viewport = wrap.clientHeight - headH();
    var f = Math.max(0, Math.floor(wrap.scrollTop / h) - OVER), l = Math.min(N, Math.ceil((wrap.scrollTop + viewport) / h) + OVER);
    if (!force && f === first && l === last) return;
    var hadFocus = tbl.contains(document.activeElement);
    first = f; last = l;
    var html = f > 0 ? '<tr class="spacer" aria-hidden="true"><td colspan="' + COLS + '" style="height:' + f * h + 'px"></td></tr>' : '';
    for (var i = f; i < l; i++) {
      var d = data(i), st = STATES[d.state], sel = selected[i] ? ' class="is-selected" aria-selected="true"' : ' aria-selected="false"';
      var tab = function (c) { return cur.r === i && cur.c === c ? '0' : '-1'; };
      html += '<tr role="row" aria-rowindex="' + (i + 2) + '" data-i="' + i + '"' + sel + '>'
        + '<td role="gridcell" aria-colindex="1" class="key" data-c="0" data-state="' + d.state + '" tabindex="' + tab(0) + '"><span class="key__inner"><span class="slot">' + (st[1] ? '<svg class="mark" aria-hidden="true"><use href="#m-' + st[1] + '"/></svg>' : '') + '</span><span>' + d.id + '</span></span></td>'
        + '<td role="gridcell" aria-colindex="2" data-c="1" tabindex="' + tab(1) + '">' + d.site + '</td>'
        + '<td role="gridcell" aria-colindex="3" class="num group" data-c="2" tabindex="' + tab(2) + '"><bdi>' + d.kw + '</bdi></td>'
        + '<td role="gridcell" aria-colindex="4" class="group" data-c="3" data-state="' + d.state + '" tabindex="' + tab(3) + '"><span class="state-label">' + st[0] + '</span></td></tr>';
    }
    if (l < N) html += '<tr class="spacer" aria-hidden="true"><td colspan="' + COLS + '" style="height:' + (N - l) * h + 'px"></td></tr>';
    body.innerHTML = html;
    // If the active row scrolled out of the page, the tab stop falls back to the first rendered row.
    if (cur.r < f || cur.r >= l) { cur.r = Math.min(Math.max(cur.r, f), l - 1); }
    if (!body.querySelector('[tabindex="0"]')) { var c0 = cell(cur.r, cur.c); if (c0) c0.tabIndex = 0; }
    if (hadFocus) { var c1 = cell(cur.r, cur.c); if (c1) c1.focus({ preventScroll: true }); }
    $('big-rendered').textContent = body.querySelectorAll('tr[data-i]').length;
    text(); stats.push(performance.now() - t0);
  }
  var cell = function (r, c) { var tr = body.querySelector('tr[data-i="' + r + '"]'); return tr && tr.cells[c]; };
  function text() {
    var rendered = body.querySelectorAll('tr[data-i]').length;
    var h = rowH(), view = wrap.clientHeight - headH(), top = Math.floor(wrap.scrollTop / h) + 1, bottom = Math.min(N, Math.ceil((wrap.scrollTop + view) / h));
    $('big-counts').textContent = 'Rows ' + top.toLocaleString('en') + '–' + bottom.toLocaleString('en') + ' of ' + N.toLocaleString('en') + ' · ' + rendered + ' in the page · ' + nSelected + ' selected';
    $('big-status').textContent = 'NAV · Row ' + (cur.r + 1).toLocaleString('en') + ' · ' + ['Reading', 'Site', 'Value kW', 'State'][cur.c];
  }
  function ensureVisible() {
    var h = rowH(), top = cur.r * h, bottom = (cur.r + 1) * h, view = wrap.clientHeight - headH();
    if (top < wrap.scrollTop) wrap.scrollTop = top; else if (bottom > wrap.scrollTop + view) wrap.scrollTop = bottom - view;
  }
  function go(r, c) {
    cur.r = Math.max(0, Math.min(N - 1, r)); cur.c = Math.max(0, Math.min(COLS - 1, c));
    ensureVisible(); render(true);
    var el = cell(cur.r, cur.c); if (el) el.focus({ preventScroll: true });
  }
  tbl.addEventListener('keydown', function (ev) {
    var page = Math.max(1, Math.floor((wrap.clientHeight - headH()) / rowH()) - 1), k = ev.key;
    if (k === 'ArrowDown') go(cur.r + 1, cur.c);
    else if (k === 'ArrowUp') go(cur.r - 1, cur.c);
    else if (k === 'ArrowRight') go(cur.r, cur.c + 1);
    else if (k === 'ArrowLeft') go(cur.r, cur.c - 1);
    else if (k === 'Home') go(ev.ctrlKey ? 0 : cur.r, 0);
    else if (k === 'End') go(ev.ctrlKey ? N - 1 : cur.r, COLS - 1);
    else if (k === 'PageDown') go(cur.r + page, cur.c);
    else if (k === 'PageUp') go(cur.r - page, cur.c);
    else if (k === ' ') { if (selected[cur.r]) { delete selected[cur.r]; nSelected--; } else { selected[cur.r] = true; nSelected++; } render(true); var el = cell(cur.r, cur.c); if (el) el.focus({ preventScroll: true }); }
    else return;
    ev.preventDefault();
  });
  tbl.addEventListener('click', function (ev) { var td = ev.target.closest('td[data-c]'); if (td) { cur = { r: +td.parentElement.dataset.i, c: +td.dataset.c }; render(true); cell(cur.r, cur.c).focus({ preventScroll: true }); } });
  wrap.addEventListener('scroll', function () { render(false); });
  render(true);
})();
