#!/usr/bin/env node
// Opens the specimen in a real browser and checks what the token maths cannot:
// that every state is really drawn with a mark and a label, that text painted
// on the page meets its contrast target, and that the system holds up in
// forced colors, print, reduced motion, reduced transparency and 200% zoom,
// and that the table keyboard model and the layered-state model behave as
// the document says, key by key and action by action.
// Writes review screenshots to specimen/screenshots/ unless --no-screenshots.
// Usage: node tools/check-render.mjs [--no-screenshots]

import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const { chromium } = createRequire(import.meta.url)('playwright');
const shots = !process.argv.includes('--no-screenshots');
const root = fileURLToPath(new URL('..', import.meta.url));
const page_url = q => pathToFileURL(root + 'specimen/index.html').href + q;
const shotDir = root + 'specimen/screenshots/';
if (shots) mkdirSync(shotDir, { recursive: true });

const STATES = ['live', 'paused', 'stale', 'offline', 'degraded', 'maintenance', 'success', 'uncertain',
  'bad', 'warning', 'error', 'info', 'dirty', 'queued'];
const THEMES = ['light', 'dark', 'outdoor'];

let passed = 0, failed = 0;
function check(ok, label, detail = '') {
  ok ? passed++ : failed++;
  if (!ok) console.log(`  FAIL ${label}${detail ? ' — ' + detail : ''}`);
}

// RA_CHROMIUM_ARGS reproduces another machine's rendering, e.g. the CI runner's pixel-snapped
// glyph advances: RA_CHROMIUM_ARGS=--font-render-hinting=full npm run check:render
const browser = await chromium.launch({ args: (process.env.RA_CHROMIUM_ARGS ?? '').split(/\s+/).filter(Boolean) });
async function open(query, opts = {}) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, ...opts.context });
  const page = await context.newPage();
  if (opts.media) await page.emulateMedia(opts.media);
  await page.goto(page_url(query));
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(250);   // let load-time transitions settle before measuring
  return page;
}
const shot = async (page, name, full = true) => { if (shots) await page.screenshot({ path: shotDir + name + '.png', fullPage: full, animations: 'disabled' }); };

// Runs in the page: contrast of every painted text against the surface under it.
function measureText() {
  const parse = c => { const m = c.match(/[\d.]+/g).map(Number); return [m[0], m[1], m[2], m[3] === undefined ? 1 : m[3]]; };
  const over = (t, b) => [0, 1, 2].map(i => t[i] * t[3] + b[i] * (1 - t[3])).concat(1);
  const lin = c => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  const lum = c => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  // The opaque colour behind an element, or null when a gradient or image is involved.
  function backdrop(el) {
    const layers = [];
    for (let n = el; n; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.backgroundImage !== 'none') return null;
      const bg = parse(cs.backgroundColor);
      if (bg[3] > 0) layers.push(bg);
      if (bg[3] === 1) break;
    }
    let base = layers.pop() ?? [255, 255, 255, 1];
    while (layers.length) base = over(layers.pop(), base);
    return base;
  }
  const out = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let node; (node = walker.nextNode());) {
    const text = node.textContent.trim();
    const el = node.parentElement;
    if (!text || el.closest('svg, script, style')) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || !el.getClientRects().length) continue;
    const bg = backdrop(el);
    if (!bg) continue;
    const size = parseFloat(cs.fontSize), bold = Number(cs.fontWeight) >= 700;
    const large = size >= 24 || (bold && size >= 18.66);
    out.push({ text: text.slice(0, 40), ratio: ratio(over(parse(cs.color), bg), bg), large });
  }
  return out;
}

for (const theme of THEMES) {
  console.log(`\n${theme}`);
  const page = await open(`?theme=${theme}`);
  const textMin = theme === 'outdoor' ? 7 : 4.5, largeMin = theme === 'outdoor' ? 4.5 : 3;

  // Every state the document defines is drawn, with a visible mark and a text label.
  const found = await page.evaluate(states => states.map(s => {
    const el = document.querySelector(`[data-state="${s}"]`);
    if (!el) return { s, present: false };
    const label = el.matches('.state-label') ? el : el.querySelector('.state-label, .field__message');
    const mark = el.querySelector('.mark');
    const box = mark?.getBoundingClientRect();
    return { s, present: true, text: label?.textContent.trim() ?? '', mark: mark?.querySelector('use')?.getAttribute('href') ?? null, size: box ? Math.min(box.width, box.height) : 0 };
  }), STATES);
  for (const f of found) {
    check(f.present, `state "${f.s}" is in the specimen`);
    if (!f.present) continue;
    check(f.text.length > 2, `state "${f.s}" has a text label`, JSON.stringify(f.text));
    check(f.mark && f.size >= 14, `state "${f.s}" has a visible mark`, `${f.mark} ${f.size}px`);
  }
  // No two different states share a mark (dirty and queued both carry the unsaved dot by design).
  const byMark = new Map();
  for (const f of found.filter(f => f.mark)) byMark.set(f.mark, [...(byMark.get(f.mark) ?? []), f.s]);
  const allowed = new Set(['bad,offline', 'dirty,queued']);
  for (const [mark, list] of byMark) check(list.length === 1 || allowed.has([...list].sort().join(',')), `mark ${mark} belongs to one state`, list.join(', '));

  // Painted text meets its target on the surface it actually sits on.
  const texts = await page.evaluate(measureText);
  check(texts.length > 80, 'text was measured', `${texts.length} runs`);
  let worst = { ratio: 99 };
  for (const t of texts) {
    const min = t.large ? largeMin : textMin;
    if (t.ratio < worst.ratio) worst = t;
    check(Math.round(t.ratio * 100) >= min * 100, `text contrast >= ${min}`, `${t.ratio.toFixed(2)} "${t.text}"`);
  }
  console.log(`  ${texts.length} text runs measured, lowest ${worst.ratio.toFixed(2)} ("${worst.text}")`);

  // Keyboard: every focusable control shows a ring at least 2px wide; targets meet the density's height.
  const focus = await page.evaluate(async () => {
    const out = [];
    for (const el of document.querySelectorAll('a[href], button, input, [tabindex="0"]:not(td):not(th)')) {
      el.focus({ focusVisible: true });
      const ringed = el.closest('.field__control') ?? el;
      const cs = getComputedStyle(ringed);
      const r = el.closest('.field__control')?.getBoundingClientRect() ?? el.getBoundingClientRect();
      out.push({ name: (el.textContent.trim() || el.id).slice(0, 30), width: parseFloat(cs.outlineWidth), style: cs.outlineStyle, h: r.height, w: r.width });
    }
    document.activeElement.blur();
    return out;
  });
  for (const f of focus) {
    check(f.style === 'solid' && f.width >= 2, 'focus ring is at least 2px', `${f.name}: ${f.width}px ${f.style}`);
    check(f.h >= 36, 'target is at least 36px high in comfortable density', `${f.name}: ${f.h}px`);
  }

  // Disabled controls stay focusable, explain themselves and are never just faded.
  const disabled = await page.evaluate(() => [...document.querySelectorAll('[aria-disabled="true"]')].map(el => ({
    focusable: el.tabIndex >= 0, reason: !!document.getElementById(el.getAttribute('aria-describedby'))?.textContent.trim(),
    opacity: getComputedStyle(el).opacity, native: el.disabled === true })));
  check(disabled.length >= 2, 'disabled examples exist');
  for (const d of disabled) check(d.focusable && d.reason && d.opacity === '1' && !d.native, 'disabled control is focusable, has a reason and is not faded', JSON.stringify(d));

  // A subtree can carry another theme, including tokens derived from semantic ones.
  const sub = await page.evaluate(() => {
    const probe = document.createElement('div'); probe.dataset.theme = 'dark'; probe.style.cssText = 'background:var(--color-surface);color:var(--c-button-primary-bg)';
    document.body.append(probe);
    const want = getComputedStyle(probe); const exp = { bg: want.backgroundColor, btn: want.color }; probe.remove();
    const card = document.getElementById('subtree');
    return { exp, bg: getComputedStyle(card).backgroundColor, btn: getComputedStyle(card.querySelector('.btn--primary')).backgroundColor };
  });
  check(sub.bg === sub.exp.bg && sub.btn === sub.exp.btn, 'a data-theme subtree resolves its own tokens', JSON.stringify(sub));
  check(sub.bg === 'rgb(13, 47, 69)', 'the dark subtree uses the dark card tone', sub.bg);

  // Selected rows re-point muted text and keep a real leading bar.
  const sel = await page.evaluate(() => {
    const row = document.getElementById('selected-row'), cs = getComputedStyle(row);
    return { edge: parseFloat(cs.borderInlineStartWidth), style: cs.borderInlineStartStyle, bg: cs.backgroundColor, other: getComputedStyle(row.previousElementSibling).borderInlineStartWidth };
  });
  check(sel.edge === 3 && sel.style === 'solid', 'selected row has a 3px leading bar', JSON.stringify(sel));
  check(parseFloat(sel.other) === 0, 'rows without the state reserve no edge', sel.other);

  // Neighbouring fields keep their gap, whatever their message length.
  const gaps = await page.evaluate(() => {
    const boxes = [...document.querySelectorAll('.field__control')].map(el => el.getBoundingClientRect());
    return boxes.slice(0, 8).flatMap((a, i) => boxes.slice(i + 1).filter(b => Math.abs(a.top - b.top) < 4).map(b => Math.round(Math.abs(b.left - a.right)))).filter(g => g < 300);
  });
  check(gaps.every(g => g >= 12), 'field controls on one row keep their gap', gaps.join(' '));

  // Pausing changes the mark and the text, not only a colour.
  await page.click('#pause');
  const paused = await page.evaluate(() => ({ text: document.getElementById('feed-text').textContent, mark: document.querySelector('#feed use').getAttribute('href'), pressed: document.getElementById('pause').getAttribute('aria-pressed') }));
  check(paused.text.startsWith('Paused') && paused.mark === '#m-paused' && paused.pressed === 'true', 'pause is explicit: text, mark and pressed state change', JSON.stringify(paused));
  await page.click('#pause');

  await shot(page, theme);
  if (theme === 'light') {
    // Grayscale review render: every state must still be identifiable by shape, line or text.
    await page.addStyleTag({ content: 'html { filter: grayscale(1); }' });
    await shot(page, 'light-grayscale');
  }
  await page.context().close();
}

// Density: one switch changes heights and gaps, never type size or content.
console.log('density');
{
  const measure = async (q, ctx) => {
    const p = await open(q, ctx ? { context: ctx } : {});
    const v = await p.evaluate(() => {
      const h = s => document.querySelector(s).getBoundingClientRect().height;
      return {
        btn: h('#l-apply'), field: h('#l-setpoint'), control: h('.field__control'), row: h('#assets tbody tr'), cell: h('#assets td[data-editable] .cell-edit'),
        smallest: Math.min(...[...document.querySelectorAll('a[href], button, .field__control, #assets tbody td')].map(e => e.getBoundingClientRect().height)),
        font: getComputedStyle(document.querySelector('#assets td')).fontSize, rows: document.querySelectorAll('#assets tbody tr').length,
        rowHeights: new Set([...document.querySelectorAll('#assets tbody tr')].map(r => Math.round(r.getBoundingClientRect().height))).size,
        sideways: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    });
    if (ctx === undefined && q.includes('density=')) await shot(p, 'density-' + q.split('density=')[1]);
    await p.context().close();
    return v;
  };
  const comfortable = await measure('?theme=light'), compact = await measure('?theme=light&density=compact'), touch = await measure('?theme=light&density=touch');
  check(comfortable.control === 36 && comfortable.row === 40, 'comfortable: 36px controls, 40px rows', JSON.stringify(comfortable));
  check(compact.control === 28 && compact.row === 32, 'compact: 28px controls, 32px rows', JSON.stringify(compact));
  check(compact.smallest >= 24, 'compact: no target below the 24px minimum', `${compact.smallest}px`);
  check(compact.cell >= 24, 'compact: an editable cell is at least 24px high', `${compact.cell}px`);
  check(touch.control === 44 && touch.row === 48 && touch.smallest >= 44, 'touch: 44px controls, 48px rows, no target below 44px', JSON.stringify(touch));
  for (const [name, d] of Object.entries({ comfortable, compact, touch })) {
    check(d.font === comfortable.font && d.rows === comfortable.rows, `${name}: same type size and same rows`, `${d.font} ${d.rows}`);
    check(d.rowHeights === 1, `${name}: table rows keep one height`, String(d.rowHeights));
    check(d.sideways <= 0, `${name}: no sideways scrolling`, `${d.sideways}px`);
  }
  const coarse = await measure('?theme=light', { hasTouch: true, isMobile: true, viewport: { width: 1180, height: 820 } });
  check(coarse.control === 44, 'with no density set, a coarse pointer gets touch density', JSON.stringify(coarse));
}

// Table: the grid keyboard model, key by key.
console.log('table keyboard');
{
  const page = await open('?theme=light');
  const st = () => page.evaluate(() => {
    const a = document.activeElement, cell = a.closest('td, th'), row = cell?.parentElement;
    return {
      inGrid: !!a.closest('#assets'), tag: a.tagName, text: cell?.textContent.trim(), col: cell ? [...row.cells].indexOf(cell) : -1,
      row: row && row.parentElement.tagName === 'TBODY' ? [...row.parentElement.rows].indexOf(row) : -1,
      status: document.getElementById('grid-status').textContent, counts: document.getElementById('grid-counts').textContent,
      stops: document.querySelectorAll('#assets [tabindex="0"]').length,
    };
  });
  const press = async (...keys) => { for (const k of keys) await page.keyboard.press(k); return st(); };
  await page.focus('#assets tbody td');
  let s = await st();
  check(s.stops === 1, 'the grid is a single tab stop', String(s.stops));
  check(s.row === 0 && s.col === 0 && s.status.startsWith('NAV'), 'focus starts on the first cell in NAV mode', JSON.stringify(s));
  s = await press('ArrowRight', 'ArrowDown'); check(s.row === 1 && s.col === 1, 'arrow keys move one cell', JSON.stringify(s));
  s = await press('End'); check(s.col === 6, 'End goes to the last cell in the row', String(s.col));
  s = await press('Home'); check(s.col === 0, 'Home goes to the first cell in the row', String(s.col));
  s = await press('Control+End'); check(s.row === 7 && s.col === 6, 'Ctrl+End goes to the last cell', JSON.stringify(s));
  s = await press('Control+Home'); check(s.row === 0 && s.col === 0, 'Ctrl+Home goes to the first cell', JSON.stringify(s));
  s = await press('PageDown'); check(s.row === 5, 'Page Down moves a page of rows', String(s.row));
  s = await press('PageUp'); check(s.row === 0, 'Page Up moves back', String(s.row));
  s = await press('ArrowUp'); check(s.row === -1 && s.tag === 'TH', 'Arrow Up from the first row reaches the header', JSON.stringify(s));
  // Sort from the keyboard.
  s = await press('Enter');
  let sort = await page.evaluate(() => ({ dir: document.querySelector('#assets th.key[aria-sort]').getAttribute('aria-sort'), first: document.querySelector('#assets tbody tr td').textContent.trim() }));
  check(sort.dir === 'descending' && sort.first === 'Weather mast', 'Enter on a sortable header sorts and sets aria-sort', JSON.stringify(sort));
  check(s.counts.includes('sorted by Asset (descending)'), 'the footer states the sort', s.counts);
  check(s.counts.startsWith('Showing 8 of 1,240'), 'the footer states the limit', s.counts);
  s = await press('Enter');
  // Select a row.
  s = await press('ArrowDown', 'Space');
  const selected = await page.evaluate(() => document.querySelectorAll('#assets tbody tr[aria-selected="true"]').length);
  check(selected === 2 && s.counts.includes('2 selected'), 'Space selects the row and the count follows', `${selected} ${s.counts}`);
  await press('Space');
  // Edit: Enter starts, Escape cancels, Enter commits and moves down, Tab commits and moves on.
  s = await press('End'); check(s.status.includes('Control › Limit kW'), 'the status names the column group and column', s.status);
  s = await press('Enter'); check(s.tag === 'INPUT' && s.status.startsWith('EDIT'), 'Enter starts editing', JSON.stringify(s));
  await page.keyboard.type('99'); s = await press('Escape');
  check(s.tag === 'TD' && s.text === '30.0' && s.status.startsWith('NAV'), 'Escape cancels and restores the value', JSON.stringify(s));
  await press('F2'); await page.keyboard.type('45.5'); s = await press('Enter');
  const edited = await page.evaluate(() => { const c = document.querySelector('#assets tbody tr td[data-editable]'); return { text: c.textContent.trim(), state: c.dataset.state, dot: !c.querySelector('.mark').hidden, desc: c.getAttribute('aria-description') }; });
  check(edited.text === '45.5' && edited.state === 'dirty' && edited.dot, 'Enter commits; the cell is marked unsaved with the ink dot', JSON.stringify(edited));
  check(edited.desc === 'Unsaved, was 30.0', 'the unsaved state is announced with the previous value', edited.desc);
  check(s.row === 1 && s.col === 6 && s.counts.includes('1 unsaved'), 'focus moves down and the footer counts the edit', JSON.stringify(s));
  await press('Enter'); await page.keyboard.type('12'); s = await press('Tab');
  check(s.tag === 'INPUT' && s.row === 2 && s.counts.includes('2 unsaved'), 'Tab while editing commits and edits the next editable cell', JSON.stringify(s));
  await press('Escape');
  // Typing the original value back clears the mark.
  await press('ArrowUp', 'ArrowUp', 'Enter'); await page.keyboard.type('30.0'); s = await press('Enter');
  check(s.counts.includes('1 unsaved'), 'restoring the original value clears the unsaved mark', s.counts);
  // Tab leaves the grid.
  s = await press('Tab'); check(!s.inGrid, 'Tab leaves the grid', s.tag);
  // The key column stays in view when the table scrolls sideways.
  const frozen = await page.evaluate(() => { const w = document.querySelector('.table-wrap'); w.style.width = '480px'; w.scrollLeft = 200; const k = document.querySelector('#assets tbody .key').getBoundingClientRect(), b = w.getBoundingClientRect(); return Math.round(k.left - b.left); });
  check(frozen === 0, 'the key column stays frozen on horizontal scroll', String(frozen));
  await page.context().close();
}

// Layers: draft, queued, committed; Apply, Reset, Revert, Undo; offline and conflict.
console.log('layers');
{
  const page = await open('?theme=light');
  const st = () => page.evaluate(() => {
    const v = k => document.getElementById('l-' + k).value, f = k => document.getElementById('l-' + k).closest('.field');
    const off = id => document.getElementById(id).getAttribute('aria-disabled') === 'true';
    return {
      setpoint: v('setpoint'), setback: v('setback'), tariff: v('tariff'),
      states: ['setpoint', 'setback', 'tariff'].map(k => f(k).dataset.state).join(','), msg: document.getElementById('l-setpoint-m').textContent.trim(), msgSetback: document.getElementById('l-setback-m').textContent.trim(),
      dot: !f('setpoint').querySelector('.field__label .mark').hidden,
      dirtyShown: !document.getElementById('layers-dirty').parentElement.hidden, dirty: document.getElementById('layers-dirty').textContent,
      queuedShown: !document.getElementById('layers-queued').parentElement.hidden, queued: document.getElementById('layers-queued').textContent,
      apply: off('l-apply'), reset: off('l-reset'), revert: off('l-revert'), undo: off('l-undo'), applyLabel: document.getElementById('l-apply').textContent,
      status: document.getElementById('layers-status').textContent, history: [...document.querySelectorAll('#layers-history li')].map(li => li.textContent),
      net: document.getElementById('layers-net').textContent.trim(), netMark: document.querySelector('#layers-net use').getAttribute('href'),
      conflicts: [...document.querySelectorAll('#layers-conflicts .conflict')].map(c => c.querySelector('.state-label').textContent.trim()),
    };
  });
  const set = async (k, v) => { await page.fill('#l-' + k, v); return st(); };
  // aria-disabled controls stay clickable by design, so click through the DOM.
  const click = async sel => { await page.evaluate(q => document.querySelector(q).click(), sel); return st(); };
  let s = await st();
  check(s.apply && s.reset && s.revert && s.undo, 'with no changes, every action is disabled', JSON.stringify(s));
  s = await click('#l-apply'); check(s.status.startsWith('Nothing to apply'), 'a disabled action explains itself when activated', s.status);
  s = await set('setpoint', '22.0');
  check(s.states === 'dirty,rest,rest' && s.dot && s.msg === 'Unsaved · was 21.5', 'an edit is a draft: ink dot and the previous value', JSON.stringify(s));
  check(s.dirtyShown && s.dirty === '1 unsaved' && !s.apply && !s.reset, 'the apply bar counts the draft and enables Apply and Reset', JSON.stringify(s));
  s = await set('setpoint', '21.5'); check(s.states === 'rest,rest,rest' && s.apply, 'typing the saved value back clears the draft', JSON.stringify(s));
  await set('setpoint', '22.0'); s = await click('#l-reset');
  check(s.setpoint === '21.5' && s.states === 'rest,rest,rest' && s.status.startsWith('Reset'), 'Reset discards the draft', JSON.stringify(s));
  await set('setpoint', '22.0'); await set('tariff', '22:00–06:00'); s = await click('#l-apply');
  check(s.states === 'rest,rest,rest' && s.setpoint === '22.0' && s.status === 'Applied 2 changes.', 'Apply commits the draft as one named change', JSON.stringify(s));
  check(s.history[0]?.startsWith('Applied 2 changes') && !s.undo && !s.revert, 'the change is in history; Undo and Revert are available', JSON.stringify(s));
  check(s.msg === 'Saved · was 21.5 when opened', 'a saved value that differs from the baseline says so', s.msg);
  s = await click('#l-undo'); check(s.setpoint === '21.5' && s.tariff === '23:00–06:00' && s.status.startsWith('Undone: Applied 2 changes'), 'Undo reverses the whole named change', JSON.stringify(s));
  await set('setpoint', '23.0'); await click('#l-apply'); await set('setpoint', '24.0'); await click('#l-apply'); s = await click('#l-revert');
  check(s.setpoint === '21.5' && s.status.startsWith('Reverted'), 'Revert returns to the values that were opened', JSON.stringify(s));
  s = await click('#l-undo'); check(s.setpoint === '24.0', 'Revert is itself undoable', s.setpoint);
  // Offline: applied changes queue; nothing is lost and nothing is silently overwritten.
  s = await click('#net');
  check(s.net.startsWith('Offline') && s.netMark === '#m-offline' && s.applyLabel === 'Apply offline' && s.revert, 'offline is stated by text and mark; Revert is unavailable', JSON.stringify(s));
  await set('tariff', '21:00–05:00'); await set('setback', '15.5'); s = await click('#l-apply');
  check(s.states === 'rest,queued,queued' && s.queuedShown && s.queued === '2 queued', 'changes applied offline are queued, not saved', JSON.stringify(s));
  check(s.msgSetback.startsWith('Queued · was 16.0'), 'a queued value shows what is still saved', s.msgSetback);
  s = await set('setback', '15.0'); check(s.states === 'rest,dirty,queued' && s.msgSetback === 'Unsaved · was 15.5', 'a draft over a queued value compares with the queued value', JSON.stringify(s));
  await click('#l-reset'); s = await click('#net');
  check(s.tariff === '21:00–05:00' && s.setback === '16.0' && !s.queuedShown, 'back online, the non-conflicting change syncs', JSON.stringify(s));
  check(s.conflicts.length === 1 && s.conflicts[0].includes('yours 15.5, theirs 17.0'), 'a conflicting change is shown, not overwritten', JSON.stringify(s.conflicts));
  check(s.status.includes('1 change synced, 1 conflict to resolve'), 'the sync result reports the partial outcome', s.status);
  await page.click('#layers-conflicts button:has-text("Keep mine")'); s = await st();
  check(s.setback === '15.5' && s.conflicts.length === 0, 'the expert resolves the conflict', JSON.stringify(s));
  await page.context().close();
}

// Right to left: the layout mirrors because edges and positions are logical.
console.log('right to left');
{
  const page = await open('?theme=light&dir=rtl');
  const r = await page.evaluate(() => {
    const cs = s => getComputedStyle(document.querySelector(s)), box = s => document.querySelector(s).getBoundingClientRect();
    return {
      railRight: box('.rail').right >= innerWidth - 1, barRight: parseFloat(cs('#selected-row').borderRightWidth), barLeft: parseFloat(cs('#selected-row').borderLeftWidth),
      edgeRight: parseFloat(cs('.metric[data-state="maintenance"]').borderRightWidth), errRight: parseFloat(cs('.field[data-state="error"] .field__control').borderRightWidth),
      keyRight: Math.round(box('.table-wrap').right - box('#assets tbody .key').right), numAlign: cs('#assets td.num').textAlign,
      sideways: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
  check(r.railRight, 'the rail moves to the right');
  check(r.barRight === 3 && r.barLeft === 0, 'the selection bar moves to the right edge', JSON.stringify(r));
  check(r.edgeRight === 3 && r.errRight === 3, 'state edges move to the right edge', JSON.stringify(r));
  check(r.keyRight === 0, 'the key column sits at the right of the table', String(r.keyRight));
  check(r.numAlign === 'end', 'numbers stay aligned to the end of the cell', r.numAlign);
  // Numbers and dates are isolated, so a minus sign stays on the left of its digits and dates keep their order.
  const bidi = await page.evaluate(() => {
    const order = text => {
      const cell = [...document.querySelectorAll('#assets tbody td')].find(td => td.textContent.trim() === text), bdi = cell.querySelector('bdi');
      const n = bdi.firstChild, range = document.createRange(), x = i => { range.setStart(n, i); range.setEnd(n, i + 1); return range.getBoundingClientRect().left; };
      return { isolated: getComputedStyle(bdi).unicodeBidi, ltr: x(0) < x(text.length - 1) };
    };
    return { minus: order('\u221212.4'), date: order('12 Sep 2026') };
  });
  check(bidi.minus.isolated === 'isolate' && bidi.minus.ltr, 'a negative number keeps its minus sign on the left of its digits', JSON.stringify(bidi.minus));
  check(bidi.date.isolated === 'isolate' && bidi.date.ltr, 'a date keeps its reading order', JSON.stringify(bidi.date));
  check(r.sideways <= 0, 'no sideways scrolling', `${r.sideways}px`);
  // Chart text stays inside its frame and no two labels overlap, even in a mirrored page.
  const chart = await page.evaluate(() => {
    const svg = document.querySelector('svg.chart'), frame = svg.getBoundingClientRect();
    const boxes = [...svg.querySelectorAll('text')].map(t => ({ t: t.textContent.trim(), r: t.getBoundingClientRect() }));
    const outside = boxes.filter(b => b.r.left < frame.left - 1 || b.r.right > frame.right + 1).map(b => b.t);
    const overlap = [];
    boxes.forEach((a, i) => boxes.slice(i + 1).forEach(b => { if (a.r.left < b.r.right && b.r.left < a.r.right && a.r.top < b.r.bottom && b.r.top < a.r.bottom) overlap.push(a.t + ' / ' + b.t); }));
    return { outside, overlap };
  });
  check(chart.outside.length === 0, 'chart text stays inside the chart in a right-to-left page', chart.outside.join(' | '));
  check(chart.overlap.length === 0, 'no two chart labels overlap in a right-to-left page', chart.overlap.join(' | '));
  await shot(page, 'rtl');
  await page.context().close();
}

// Type: bundled faces load, digits are tabular, weights are real, Arabic uses its own face.
// Tabular digits are compared at 16px on purpose: equal widths survive pixel snapping.
console.log('type');
{
  const page = await open('?theme=light');
  const t = await page.evaluate(async () => {
    const loaded = [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family.replace(/"/g, '') + ' ' + f.style);
    const w = id => document.getElementById(id).getBoundingClientRect().width;
    const family = id => getComputedStyle(document.getElementById(id)).fontFamily;
    // Width of the same text at different weights: a variable face gives a different width at each.
    // Measured at 120px: with hinted rendering each glyph advance snaps to a whole pixel, which at 16px
    // hides the ~1px difference between 560 and 600 (the CI runner does this).
    const probe = weight => { const s = document.createElement('span'); s.style.cssText = `position:absolute;visibility:hidden;white-space:nowrap;font-family:var(--font-sans);font-weight:${weight};font-size:120px`; s.textContent = 'Differential pressure 1.92 bar'; document.body.append(s); const x = s.getBoundingClientRect().width; s.remove(); return x; };
    const sans = getComputedStyle(document.getElementById('t-sans'));
    return { loaded, ones: w('t-ones'), zeros: w('t-zeros'), mono: family('t-mono'), sansFamily: sans.fontFamily, weights: [400, 520, 560, 600].map(probe), label: getComputedStyle(document.getElementById('t-560')).fontWeight, heading: getComputedStyle(document.getElementById('t-520')).fontWeight,
      ar: await document.fonts.load('16px "Noto Sans Arabic"', 'الخزان').then(f => f.length), arCmp: getComputedStyle(document.getElementById('t-ar')).fontFamily };
  });
  check(t.loaded.some(f => f.startsWith('Source Sans 3 normal')) && t.loaded.some(f => f.startsWith('Source Sans 3 italic')), 'Source Sans 3 upright and italic are loaded', t.loaded.join(', '));
  check(t.loaded.some(f => f.startsWith('Source Code Pro')), 'Source Code Pro is loaded', t.loaded.join(', '));
  check(t.loaded.some(f => f.startsWith('Noto Sans Arabic')), 'Noto Sans Arabic is loaded for the Arabic line', t.loaded.join(', '));
  check(t.sansFamily.startsWith('"Source Sans 3"'), 'the bundled sans leads the stack', t.sansFamily);
  check(t.mono.startsWith('"Source Code Pro"') || t.mono.includes('Source Code Pro'), 'the bundled mono leads the mono stack', t.mono);
  check(Math.abs(t.ones - t.zeros) < 0.5, 'digits are tabular: 1,111.11 and 9,000.00 are the same width', `${t.ones} vs ${t.zeros}`);
  check(t.weights[0] < t.weights[1] && t.weights[1] < t.weights[2] && t.weights[2] < t.weights[3], 'weights 400, 520, 560 and 600 each render differently', t.weights.join(' < '));
  check(t.heading === '520' && t.label === '560', 'the specified weights 520 and 560 are used as written', `${t.heading} ${t.label}`);
  check(t.ar >= 1, 'the Arabic face is available for Arabic code points', String(t.ar));
  await page.context().close();
}

// Glass: frosted on screen, solid in outdoor and with reduced transparency.
console.log('\nglass');
{
  const blur = async q => { const p = await open(q); const v = await p.evaluate(() => getComputedStyle(document.getElementById('glass')).backdropFilter); await p.context().close(); return v; };
  check((await blur('?theme=light')).includes('blur'), 'glass is blurred in the light theme');
  check((await blur('?theme=dark')).includes('blur'), 'glass is blurred in the dark theme');
  check(await blur('?theme=outdoor') === 'none', 'glass is solid in the outdoor theme');
  check(await blur('?theme=light&transparency=reduced') === 'none', 'glass is solid with reduced transparency');
  check(await blur('?theme=dark&transparency=reduced') === 'none', 'glass is solid with reduced transparency in dark');
}

// System preference decides when no theme is set.
console.log('system preference');
{
  const bg = async scheme => { const p = await open('', { context: { colorScheme: scheme } }); const v = await p.evaluate(() => getComputedStyle(document.documentElement).backgroundColor); await p.context().close(); return v; };
  check(await bg('light') === 'rgb(243, 237, 225)', 'no theme + light preference gives the light canvas');
  check(await bg('dark') === 'rgb(7, 29, 43)', 'no theme + dark preference gives the dark canvas');
}

// Forced colors: backgrounds and shadows go, so borders, marks and text carry every state.
console.log('forced colors');
{
  const page = await open('?theme=light', { context: { forcedColors: 'active' } });
  const fc = await page.evaluate(() => {
    const cs = s => getComputedStyle(document.querySelector(s));
    const w = (s, p) => parseFloat(cs(s)[p]);
    return {
      degraded: w('.metric[data-state="degraded"]', 'borderInlineStartWidth'), maintenance: w('.metric[data-state="maintenance"]', 'borderInlineStartWidth'),
      plain: w('.metric[data-state="live"]', 'borderInlineStartWidth'),
      stale: cs('.metric[data-state="stale"]').borderTopStyle, uncertain: cs('.metric[data-state="uncertain"]').borderTopStyle,
      error: w('.field[data-state="error"] .field__control', 'borderInlineStartWidth'),
      primary: w('.btn--primary:not([aria-disabled])', 'borderTopWidth'), disabledStyle: cs('.btn[aria-disabled="true"]').borderTopStyle,
      selected: w('#selected-row', 'borderInlineStartWidth'),
      marks: [...document.querySelectorAll('.mark')].filter(m => !m.closest('[hidden]') && !m.closest('.cell-edit')).every(m => m.getBoundingClientRect().width >= 14),
      markColour: getComputedStyle(document.querySelector('.metric[data-state="degraded"] .mark')).color, text: cs('body').color,
      selText: cs('#selected-row').color, selLabel: cs('#selected-row .state-label').color, selMark: cs('#selected-row .mark').color,
    };
  });
  check(fc.degraded === 3 && fc.maintenance === 3, 'state edges are real borders', JSON.stringify(fc));
  check(fc.plain === 1, 'a card without the state has no state edge', String(fc.plain));
  check(fc.stale === 'dashed' && fc.uncertain === 'dotted', 'stale stays dashed and uncertain stays dotted');
  check(fc.error === 3, 'the error field keeps its leading edge');
  check(fc.primary === 3, 'the primary button is marked by a 3px border');
  check(fc.disabledStyle === 'dashed', 'the disabled button is marked by a dashed border');
  check(fc.selected === 3, 'the selected row keeps its leading bar');
  check(fc.marks, 'marks are still drawn');
  check(fc.selLabel === fc.selText && fc.selMark === fc.selText, 'state label and mark on a selected row take the highlight text colour', `${fc.selLabel} ${fc.selMark} vs ${fc.selText}`);
  check(fc.markColour === fc.text, 'marks take the system text colour', `${fc.markColour} vs ${fc.text}`);
  await shot(page, 'forced-colors');
  await page.context().close();
}

// Reduced motion: the live pulse is removed; the label carries the state.
console.log('reduced motion');
{
  const page = await open('?theme=light', { context: { reducedMotion: 'reduce' } });
  const m = await page.evaluate(() => ({ anim: getComputedStyle(document.querySelector('.is-fresh .mark')).animationName, label: document.querySelector('.is-fresh .state-label').textContent.trim(), dur: getComputedStyle(document.documentElement).getPropertyValue('--motion-standard').trim() }));
  check(m.anim === 'none', 'the live pulse does not run', m.anim);
  check(m.label.startsWith('Live'), 'the live label is still present');
  check(m.dur === '0ms', 'motion tokens drop to 0ms', m.dur);
  await page.context().close();
  const normal = await open('?theme=light');
  const n = await normal.evaluate(() => ({ anim: getComputedStyle(document.querySelector('.is-fresh .mark')).animationName, count: getComputedStyle(document.querySelector('.is-fresh .mark')).animationIterationCount }));
  check(n.anim === 'ra-live-pulse' && n.count === '1', 'with motion allowed, the live pulse runs once', JSON.stringify(n));
  await normal.context().close();
}

// Print: always light, whatever the screen theme; no glass, no shadows, no navigation.
console.log('print');
{
  const page = await open('?theme=dark', { media: { media: 'print' } });
  const p = await page.evaluate(() => ({
    card: getComputedStyle(document.querySelector('.metric')).backgroundColor, text: getComputedStyle(document.body).color,
    shadow: getComputedStyle(document.querySelector('.metric')).boxShadow, blur: getComputedStyle(document.getElementById('glass')).backdropFilter,
    rail: getComputedStyle(document.querySelector('.rail')).display,
    edge: parseFloat(getComputedStyle(document.querySelector('.metric[data-state="maintenance"]')).borderInlineStartWidth),
  }));
  check(p.card === 'rgb(255, 254, 250)' && p.text === 'rgb(17, 24, 28)', 'a dark screen prints light', JSON.stringify(p));
  check(p.shadow === 'none' && p.blur === 'none', 'print has no shadows and no glass');
  check(p.rail === 'none', 'navigation is not printed');
  check(p.edge === 3, 'state edges are printed');
  await shot(page, 'print');
  await page.context().close();
}

// 200% zoom on a 1440px screen is a 720px viewport: the page reflows and nothing clips.
console.log('zoom 200%');
{
  const page = await open('?theme=light', { context: { viewport: { width: 720, height: 900 } } });
  const z = await page.evaluate(() => ({
    sideways: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    clipped: [...document.querySelectorAll('.state-label, .metric__value, .btn, .field__message, .reading span, .type p, .table-foot span, h1, h2, h3')]
      .filter(el => el.scrollWidth > el.clientWidth + 1 || el.getBoundingClientRect().right > innerWidth + 1).map(el => el.textContent.trim().slice(0, 30)),
  }));
  check(z.sideways <= 0, 'no sideways scrolling', `${z.sideways}px`);
  check(z.clipped.length === 0, 'no clipped labels', z.clipped.join(' | '));
  await shot(page, 'zoom-200');
  await page.context().close();
}

await browser.close();
console.log(failed ? `\n${failed} failing check(s), ${passed} passed` : `\nAll ${passed} render checks pass.`);
process.exit(failed ? 1 : 0);
