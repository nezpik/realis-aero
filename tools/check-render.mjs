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
    for (const el of [...document.querySelectorAll('a[href], button, input, [tabindex="0"]:not(td):not(th)')].filter(e => !e.closest('[hidden]'))) {
      el.focus({ focusVisible: true });
      const ringed = el.closest('.field__control') ?? el;
      const cs = getComputedStyle(ringed);
      const r = (el.closest('.field__control') ?? el.closest('label.choice') ?? el).getBoundingClientRect();
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
        smallest: Math.min(...[...document.querySelectorAll('a[href], button, .field__control, #assets tbody td')].filter(e => !e.closest('[hidden]')).map(e => e.getBoundingClientRect().height)),
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
      stops: document.querySelectorAll('#assets [tabindex="0"]').length, say: document.getElementById('grid-say').textContent,
    };
  });
  const press = async (...keys) => { for (const k of keys) await page.keyboard.press(k); return st(); };
  const names = () => page.evaluate(() => [...document.querySelectorAll('#assets tbody tr')].map(r => r.cells[0].textContent.trim()));
  await page.focus('#assets tbody td');
  let s = await st();
  check(s.stops === 1, 'the grid is a single tab stop', String(s.stops));
  check(s.row === 0 && s.col === 0 && s.status.startsWith('NAV'), 'focus starts on the first cell in NAV mode', JSON.stringify(s));
  s = await press('ArrowRight', 'ArrowDown'); check(s.row === 1 && s.col === 1, 'arrow keys move one cell', JSON.stringify(s));
  s = await press('End'); check(s.col === 8, 'End goes to the last cell in the row', String(s.col));
  s = await press('Home'); check(s.col === 0, 'Home goes to the first cell in the row', String(s.col));
  s = await press('Control+End'); check(s.row === 7 && s.col === 8, 'Ctrl+End goes to the last cell', JSON.stringify(s));
  s = await press('Control+Home'); check(s.row === 0 && s.col === 0, 'Ctrl+Home goes to the first cell', JSON.stringify(s));
  s = await press('PageDown'); check(s.row === 5, 'Page Down moves a page of rows', String(s.row));
  s = await press('PageUp'); check(s.row === 0, 'Page Up moves back', String(s.row));
  s = await press('ArrowUp'); check(s.row === -1 && s.tag === 'TH', 'Arrow Up from the first row reaches the header', JSON.stringify(s));
  check(!s.counts.includes('sorted'), 'the table starts unsorted, and says nothing about a sort', s.counts);
  // Sort from the keyboard, ascending then descending.
  s = await press('Enter');
  let n = await names();
  check(n[0] === 'Battery rack 1' && s.counts.includes('sorted by Asset (ascending)'), 'Enter on a sortable header sorts ascending and the footer says so', `${n[0]} | ${s.counts}`);
  check(s.tag === 'TH', 'focus stays on the header after sorting', s.tag);
  s = await press('Enter'); n = await names();
  check(n[0] === 'Weather mast' && s.counts.includes('sorted by Asset (descending)'), 'Enter again sorts descending', `${n[0]} | ${s.counts}`);
  check(await page.evaluate(() => document.querySelector('#assets th[data-col="asset"]').getAttribute('aria-sort')) === 'descending', 'aria-sort follows the sort');
  s = await press('Enter');
  check(s.counts.startsWith('Showing 8 of 1,240'), 'the footer states the limit', s.counts);
  // Select a row.
  s = await press('ArrowDown', 'ArrowDown', 'Space');
  const selected = await page.evaluate(() => document.querySelectorAll('#assets tbody tr[aria-selected="true"]').length);
  check(selected === 2 && s.counts.includes('2 selected'), 'Space selects the row and the count follows', `${selected} ${s.counts}`);
  await press('Space');
  // Edit: Enter starts, Escape cancels, Enter commits and moves down, Tab commits and moves on.
  s = await press('End', 'ArrowLeft'); check(s.status.includes('Control › Limit kW'), 'the status names the column group and column', s.status);
  s = await press('Enter'); check(s.tag === 'INPUT' && s.status.startsWith('EDIT'), 'Enter starts editing', JSON.stringify(s));
  await page.keyboard.type('99'); s = await press('Escape');
  check(s.tag === 'TD' && s.text === '40.0' && s.status.startsWith('NAV'), 'Escape cancels and restores the value', JSON.stringify(s));
  await press('F2'); await page.keyboard.type('45.5'); s = await press('Enter');
  const edited = await page.evaluate(() => { const c = document.querySelector('#assets tbody tr[data-id="flow3"] td[data-col="limit"]'); return { text: c.textContent.trim(), state: c.dataset.state, dot: !c.querySelector('.mark').hidden, desc: c.getAttribute('aria-description') }; });
  check(edited.text === '45.5' && edited.state === 'dirty' && edited.dot, 'Enter commits; the cell is marked unsaved with the ink dot', JSON.stringify(edited));
  check(edited.desc === 'Unsaved, was 40.0', 'the unsaved state is announced with the previous value', edited.desc);
  check(s.row === 2 && s.col === 7 && s.counts.includes('1 unsaved'), 'focus moves down and the footer counts the edit', JSON.stringify(s));
  await press('Enter'); await page.keyboard.type('12'); s = await press('Tab');
  check(s.tag === 'INPUT' && s.row === 2 && s.col === 8 && s.counts.includes('2 unsaved'), 'Tab while editing commits and edits the next editable cell', JSON.stringify(s));
  await press('Escape');
  await press('ArrowUp'); s = await press('ArrowLeft'); await press('Enter'); await page.keyboard.type('40.0'); s = await press('Enter');
  check(s.counts.includes('1 unsaved'), 'restoring the original value clears the unsaved mark', s.counts);
  await press('Enter'); await page.keyboard.type('abc'); s = await press('Enter');
  check(s.say.startsWith('Not applied') && s.counts.includes('1 unsaved'), 'an invalid value is refused with a reason and nothing changes', JSON.stringify([s.say, s.counts]));
  // Tab leaves the grid.
  s = await press('Tab'); check(!s.inGrid, 'Tab leaves the grid', s.tag);
  // The key column stays in view when the table scrolls sideways.
  const frozen = await page.evaluate(() => { const w = document.querySelector('.table-wrap'); w.style.width = '480px'; w.scrollLeft = 200; const k = document.querySelector('#assets tbody .key').getBoundingClientRect(), b = w.getBoundingClientRect(); return Math.round(k.left - b.left); });
  check(frozen === 0, 'the key column stays frozen on horizontal scroll', String(frozen));
  await page.context().close();
}

// Table: range selection, copy, and paste with a preview.
console.log('table range, copy and paste');
{
  const page = await open('?theme=light');
  await page.evaluate(() => { window.__copied = null; document.addEventListener('copy', e => { window.__copied = e.clipboardData.getData('text/plain'); }); });
  const st = () => page.evaluate(() => ({
    range: [...document.querySelectorAll('#assets td.in-range')].length, selectedCells: [...document.querySelectorAll('#assets td[aria-selected="true"]')].length,
    counts: document.getElementById('grid-counts').textContent, say: document.getElementById('grid-say').textContent, copied: window.__copied,
    tag: document.activeElement.tagName, previewOpen: !document.getElementById('paste').hidden, title: document.getElementById('paste-title').textContent,
    items: [...document.querySelectorAll('#paste-list li')].map(li => li.textContent.trim()),
    cell: (r, c) => null,
  }));
  const press = async (...keys) => { for (const k of keys) await page.keyboard.press(k); return st(); };
  const cellText = (id, col) => page.evaluate(([i, c]) => document.querySelector(`#assets tr[data-id="${i}"] td[data-col="${c}"]`).textContent.trim(), [id, col]);
  await page.focus('#assets tbody td');
  let s = await press('ArrowRight', 'ArrowRight', 'ArrowRight');   // Roof array A, Now kW
  s = await press('Shift+ArrowRight', 'Shift+ArrowDown');
  check(s.range === 4 && s.selectedCells === 4 && s.counts.includes('range 2 × 2'), 'Shift+Arrows select a 2 × 2 range, exposed with aria-selected and counted', JSON.stringify(s));
  const ring = await page.evaluate(() => { const c = document.querySelector('#assets td.in-range'), cs = getComputedStyle(c); return { w: parseFloat(cs.outlineWidth), style: cs.outlineStyle }; });
  check(ring.w >= 1 && ring.style === 'solid', 'every cell of a range carries its own outline, so a range inside selected rows stays visible', JSON.stringify(ring));
  s = await press('Control+c');
  check(s.copied === '42.6\t212.4\n38.1\t190.2' && s.say === 'Copied 2 × 2 cells.', 'Ctrl+C copies the range as tab-separated text', JSON.stringify([s.copied, s.say]));
  s = await press('Escape'); check(s.range === 0 && !s.counts.includes('range'), 'Escape clears the range', JSON.stringify(s));
  s = await press('Control+c'); check(s.copied === '190.2' && s.say === 'Copied 1 cell.', 'with no range, Ctrl+C copies the active cell (the one the range ended on)', JSON.stringify([s.copied, s.say]));
  // Shift+Space extends the row selection from the last toggled row.
  await press('Control+Home', 'ArrowDown'); await press('Space'); s = await press('ArrowDown', 'ArrowDown', 'Shift+Space');
  const rows = await page.evaluate(() => [...document.querySelectorAll('#assets tbody tr[aria-selected="true"]')].map(r => r.dataset.id));
  check(['roofb', 'heat2', 'inv2'].every(id => rows.includes(id)), 'Shift+Space extends the row selection to the active row', rows.join(','));
  await press('Space');
  // Paste: a preview first, nothing changes until Apply.
  const paste = (text) => page.evaluate(t => { const dt = new DataTransfer(); dt.setData('text/plain', t); document.activeElement.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true })); }, text);
  await press('Control+Home', 'ArrowDown', 'ArrowDown', 'ArrowRight', 'ArrowRight', 'ArrowRight', 'ArrowRight', 'ArrowRight', 'ArrowRight');   // Heat pump 2, Last service
  const before = await cellText('heat2', 'limit');
  await paste('n/a\t10\t11\nx\t12\tabc'); s = await st();
  check(s.previewOpen && s.tag === 'BUTTON', 'paste opens a preview and moves focus into it', JSON.stringify([s.previewOpen, s.tag]));
  check(s.title === 'Paste preview · 3 changes, 3 skipped', 'the preview counts changes and skips', s.title);
  check(s.items.some(t => t.includes('Heat pump 2 · Limit kW: 8.0 → 10.0')) && s.items.filter(t => t.startsWith('Skipped')).length === 3, 'the preview lists each change as before → after and each skip with its reason', s.items.join(' | '));
  check(s.items.some(t => t.includes('Last service: read-only')) && s.items.some(t => t.includes('"abc" is not a number')), 'skips name read-only cells and invalid values', s.items.join(' | '));
  check(await cellText('heat2', 'limit') === before, 'nothing changes until Apply', before);
  s = await press('Escape'); check(!s.previewOpen && s.say === 'Paste cancelled. Nothing changed.' && s.tag === 'TD', 'Escape cancels the paste and returns focus to the cell', JSON.stringify(s));
  await paste('n/a\t10\t11\nx\t12\tabc'); await page.click('#paste-apply'); s = await st();
  check(await cellText('heat2', 'limit') === '10.0' && await cellText('heat2', 'reserve') === '11.0' && await cellText('inv2', 'limit') === '12.0', 'Apply writes the values', 'heat2 / inv2');
  check(s.counts.includes('3 unsaved') && s.say === 'Pasted 3 values as unsaved changes. 3 skipped.', 'pasted values are unsaved changes, and the result is announced', JSON.stringify([s.counts, s.say]));
  await page.click('#grid-discard'); s = await st();
  check(s.counts.includes('0 unsaved') && s.say === 'Discarded 3 unsaved edits.', 'Discard unsaved restores every pasted value', JSON.stringify([s.counts, s.say]));
  await page.evaluate(() => document.querySelector('#assets td[tabindex="0"]').focus());
  await paste('abc'); s = await st();
  check(s.previewOpen && await page.evaluate(() => document.getElementById('paste-apply').getAttribute('aria-disabled')) === 'true', 'when every value is skipped, Apply is unavailable and says why', s.title);
  await page.context().close();
}

// Table: columns, resize, truncation and persistence.
console.log('table columns');
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage(); await page.goto(page_url('?theme=light')); await page.evaluate(() => document.fonts.ready);
  const heads = () => page.evaluate(() => [...document.querySelectorAll('#assets thead tr:nth-child(2) th')].map(t => t.firstChild.textContent.trim()));
  const groups = () => page.evaluate(() => [...document.querySelectorAll('#assets thead tr:first-child th')].map(t => t.textContent.trim() + ':' + t.colSpan));
  const say = () => page.evaluate(() => document.getElementById('grid-say').textContent);
  const width = col => page.evaluate(c => Math.round(document.querySelector(`#assets th[data-col="${c}"]`).getBoundingClientRect().width), col);
  const act = async (col, a) => { await page.evaluate(([c, x]) => document.querySelector(`#cols-list [data-col="${c}"] [data-act="${x}"]`).click(), [col, a]); };

  // Truncation: the start of a path gives way, the identifying tail stays, the full text is reachable.
  const tr = await page.evaluate(() => {
    const cell = document.querySelector('#assets tbody tr td[data-col="path"]'), a = cell.querySelector('.mid__a'), b = cell.querySelector('.mid__b');
    const decisive = [...document.querySelectorAll('#assets tbody td')].filter(td => !td.querySelector('.mid')).filter(td => td.scrollWidth > td.clientWidth + 1).map(td => td.textContent.trim());
    return { cut: a.scrollWidth > a.clientWidth, tailWhole: b.scrollWidth <= b.clientWidth + 1, ellipsis: getComputedStyle(a).textOverflow, full: cell.dataset.full, title: cell.querySelector('.mid').title, text: cell.textContent.trim(), tail: b.textContent, decisive };
  });
  check(tr.cut && tr.ellipsis === 'ellipsis' && tr.tailWhole, 'a path truncates in the middle: the start is cut with an ellipsis and the tail stays whole', JSON.stringify(tr));
  check(tr.text === tr.full && tr.title === tr.full, 'the full path is the cell text and the hover title', JSON.stringify(tr));
  check(tr.decisive.length === 0, 'no value, state or number is truncated; only paths give way', tr.decisive.join(' | '));
  await page.focus('#assets tbody td'); for (let i = 0; i < 2; i++) await page.keyboard.press('ArrowRight');
  check((await page.evaluate(() => document.getElementById('grid-status').textContent)).endsWith('CA-DC/Roof/Array-A/String-04/INV-1-0412'), 'focusing a truncated cell shows its full text in the status line');

  // Panel: open, key column protected, disabled with a reason.
  await page.click('#cols-btn');
  check(await page.evaluate(() => !document.getElementById('cols-panel').hidden && document.getElementById('cols-btn').getAttribute('aria-expanded') === 'true'), 'the Columns button opens the panel and exposes aria-expanded');
  await act('asset', 'up');
  check((await say()).startsWith('Asset is the key column'), 'the key column explains why it cannot move', await say());
  check(await page.evaluate(() => ['up', 'down', 'narrow', 'wide'].every(a => document.querySelector(`#cols-list [data-col="asset"] [data-act="${a}"]`).getAttribute('aria-disabled') === 'true') && document.querySelector('#cols-list [data-col="asset"] input').getAttribute('aria-disabled') === 'true'), 'every key-column control is aria-disabled, so it stays focusable');
  // Hide, reorder within a group, edges, width.
  await page.evaluate(() => document.querySelector('#cols-list [data-col="path"] input').click());
  check((await heads()).length === 8 && !(await heads()).includes('Location') && (await say()) === 'Location hidden. 8 of 9 columns shown.', 'hiding a column removes it and says so', `${(await heads()).join(',')} | ${await say()}`);
  await page.evaluate(() => document.querySelector('#cols-list [data-col="site"] input').click());
  check(!(await groups()).some(g => g.startsWith('Identity')), 'a group with no visible columns loses its header', (await groups()).join(','));
  await act('today', 'up');
  let h = await heads(); check(h.indexOf('Today kWh') < h.indexOf('Now kW') && (await say()) === 'Today kWh moved before Now kW.', 'a column moves within its group', `${h.join(',')} | ${await say()}`);
  await act('today', 'up'); check((await say()).includes('already first in Output'), 'at the edge of a group, a move explains itself', await say());
  const w0 = await width('limit'); await act('limit', 'wide');
  check(await width('limit') === w0 + 16 && (await say()) === 'Limit kW widened to ' + (w0 + 16) + 'px.', 'Wider adds 16px and announces it', `${w0} -> ${await width('limit')} | ${await say()}`);
  await act('limit', 'narrow'); check(await width('limit') === w0, 'Narrower takes it back', String(await width('limit')));
  // The pointer: drag a column edge, double-click to reset.
  await page.evaluate(() => { document.getElementById('cols-panel').hidden = true; });
  const edge = await page.evaluate(() => { const r = document.querySelector('#assets th[data-col="now"] .resize').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  const nowW = await width('now');
  await page.mouse.move(edge.x, edge.y); await page.mouse.down(); await page.mouse.move(edge.x + 30, edge.y, { steps: 4 }); await page.mouse.up();
  check(await width('now') === nowW + 30 && (await say()) === 'Now kW resized to ' + (nowW + 30) + 'px.', 'dragging a column edge resizes it', `${nowW} -> ${await width('now')} | ${await say()}`);
  const edge2 = await page.evaluate(() => { const r = document.querySelector('#assets th[data-col="now"] .resize').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  await page.mouse.dblclick(edge2.x, edge2.y);
  check(await width('now') === nowW, 'double-clicking the edge resets the width', `${await width('now')} vs ${nowW}`);
  // Persistence and reset.
  await act('today', 'down'); await page.evaluate(() => { document.getElementById('cols-panel').hidden = true; });
  const kept = await heads();
  await page.reload(); await page.evaluate(() => document.fonts.ready);
  check(JSON.stringify(await heads()) === JSON.stringify(kept), 'the layout persists across a reload', `${(await heads()).join(',')} vs ${kept.join(',')}`);
  check(await page.evaluate(() => document.getElementById('grid-reset-layout').getAttribute('aria-disabled')) === 'false', 'Reset layout is available once the layout differs');
  await page.evaluate(() => document.getElementById('grid-reset-layout').click());
  check((await heads()).length === 9 && (await heads())[2] === 'Location' && (await say()) === 'Layout reset to the default.', 'Reset layout restores the default', `${(await heads()).join(',')} | ${await say()}`);
  check(await page.evaluate(() => document.getElementById('grid-reset-layout').getAttribute('aria-disabled')) === 'true', 'with the default layout, Reset layout is unavailable');
  // Edits survive a layout change.
  await page.focus('#assets tbody td'); await page.keyboard.press('End'); await page.keyboard.press('ArrowLeft'); await page.keyboard.press('Enter'); await page.keyboard.type('33'); await page.keyboard.press('Enter');
  await page.click('#cols-btn'); await act('today', 'down');
  check((await page.evaluate(() => document.getElementById('grid-counts').textContent)).includes('1 unsaved'), 'unsaved edits survive a layout change');
  await ctx.close();
}

// Large table: virtualized, with the full structure and a measured budget.
console.log('large table');
{
  const page = await open('?theme=light');
  const st = () => page.evaluate(() => {
    const a = document.activeElement, tr = a.closest('tr'), tbl = document.getElementById('big');
    return { in: !!a.closest('#big'), rowIndex: tr ? +tr.getAttribute('aria-rowindex') : -1, col: a.closest('td') ? +a.closest('td').dataset.c : -1, rendered: tbl.tBodies[0].querySelectorAll('tr[data-i]').length,
      counts: document.getElementById('big-counts').textContent, status: document.getElementById('big-status').textContent, stops: tbl.querySelectorAll('[tabindex="0"]').length,
      rowcount: tbl.getAttribute('aria-rowcount'), colcount: tbl.getAttribute('aria-colcount'), top: document.getElementById('big-wrap').scrollTop };
  });
  const press = async (...keys) => { for (const k of keys) await page.keyboard.press(k); return st(); };
  let s = await st();
  check(s.rowcount === '12409' && s.colcount === '4', 'the accessible structure keeps the full counts', JSON.stringify([s.rowcount, s.colcount]));
  check(s.rendered > 0 && s.rendered <= 40, 'only a few dozen of the 12,408 rows are in the page', String(s.rendered));
  check(s.stops === 1, 'the table is a single tab stop', String(s.stops));
  const idx = await page.evaluate(() => [...document.querySelectorAll('#big tbody tr[data-i]')].every(tr => +tr.getAttribute('aria-rowindex') === +tr.dataset.i + 2));
  check(idx, 'every rendered row carries its true aria-rowindex');
  await page.focus('#big tbody td'); s = await st();
  check(s.rowIndex === 2 && s.col === 0 && s.status.startsWith('NAV · Row 1 '), 'focus starts on the first row', JSON.stringify(s));
  s = await press('Control+End');
  check(s.rowIndex === 12409 && s.col === 3 && s.status.startsWith('NAV · Row 12,408 ') && s.rendered <= 40, 'Ctrl+End reaches the last row of 12,408 and the page stays small', JSON.stringify(s));
  check(s.counts.includes('of 12,408'), 'the footer states the window and the total', s.counts);
  s = await press('Control+Home'); check(s.rowIndex === 2 && s.col === 0 && s.top === 0, 'Ctrl+Home returns to the top', JSON.stringify(s));
  s = await press('PageDown', 'PageDown'); check(s.rowIndex > 14 && s.in, 'Page Down moves a page and keeps focus in the table', JSON.stringify(s));
  s = await press('ArrowDown', 'ArrowRight'); check(s.in && s.col === 1, 'arrows keep working after paging', JSON.stringify(s));
  s = await press('Space'); check(s.counts.includes('1 selected') && s.in, 'Space selects a row without losing focus', s.counts);
  s = await press('Control+End', 'ArrowUp'); check(s.rowIndex === 12408, 'selection and focus survive scrolling far away and back', JSON.stringify(s));
  // Wheel scrolling moves the window and keeps a tab stop.
  await page.evaluate(() => { document.getElementById('big-wrap').scrollTop = 5000 * 40; });
  await page.waitForTimeout(60); s = await st();
  check(s.stops === 1 && s.rendered <= 40 && s.counts.startsWith('Rows 5,001–'), 'scrolling by pointer moves the window and keeps one tab stop', JSON.stringify(s));

  // Budget: measured here, in headless Chromium on this machine, which is not a low-end device.
  await page.evaluate(() => { const w = document.getElementById('big-wrap'); w.scrollTop = 0; });
  await page.focus('#big tbody td');
  const lat = await page.evaluate(async () => {
    const tbl = document.getElementById('big'), frame = () => new Promise(r => requestAnimationFrame(() => setTimeout(r, 0)));   // next frame, then after it has been painted
    const press = async (key, opts = {}) => {
      const t0 = performance.now();
      document.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...opts }));
      const afterHandler = performance.now() - t0;
      await frame();
      return { handler: afterHandler, visible: performance.now() - t0 };
    };
    const steps = [];
    for (let i = 0; i < 40; i++) steps.push(await press('ArrowDown'));
    for (let i = 0; i < 10; i++) steps.push(await press('PageDown'));
    const recalcs = [];
    for (let i = 0; i < 20; i++) { const t0 = performance.now(); document.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true })); recalcs.push(performance.now() - t0 + 0 * document.getElementById('big-counts').textContent.length); await frame(); }
    const wrap = document.getElementById('big-wrap'); tbl.__stats.length = 0;
    for (let y = 0; y < 400; y++) { wrap.scrollTop = y * 997 % (12408 * 40); wrap.dispatchEvent(new Event('scroll')); }
    return { handler: steps.map(s => s.handler), visible: steps.map(s => s.visible), recalcs, renders: tbl.__stats.slice(), rows: tbl.tBodies[0].querySelectorAll('tr[data-i]').length };
  });
  const q = (a, p) => [...a].sort((x, y) => x - y)[Math.min(a.length - 1, Math.floor(a.length * p))];
  console.log(`  input latency (key to frame): median ${q(lat.visible, 0.5).toFixed(1)}ms, p95 ${q(lat.visible, 0.95).toFixed(1)}ms; handler p95 ${q(lat.handler, 0.95).toFixed(1)}ms; recalculation p95 ${q(lat.recalcs, 0.95).toFixed(1)}ms; window render p95 ${q(lat.renders, 0.95).toFixed(2)}ms over ${lat.renders.length} scroll steps`);
  check(q(lat.visible, 0.5) < 50, 'budget: input latency, key to visible result, median under 50ms', `${q(lat.visible, 0.5).toFixed(1)}ms`);
  check(q(lat.visible, 0.95) < 100, 'budget: input latency, 95th percentile under 100ms (absorbs runner noise)', `${q(lat.visible, 0.95).toFixed(1)}ms`);
  check(q(lat.recalcs, 0.95) < 100, 'budget: recalculation (selection count and footer) under 100ms', `${q(lat.recalcs, 0.95).toFixed(1)}ms`);
  check(q(lat.renders, 0.95) < 16, 'budget: a scroll step re-renders the window in under one frame (16ms)', `${q(lat.renders, 0.95).toFixed(2)}ms`);
  check(lat.rows <= 40, 'budget: the page never holds more than 40 rows', String(lat.rows));
  await shot(page, 'large-table');
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

// Settings: staged until Apply, an inert preview, locked settings with an owner, reordering without a pointer, find, scope.
console.log('settings');
{
  const url = q => pathToFileURL(root + 'specimen/settings.html').href + q;
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage(); await page.goto(url('')); await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(200);
  const st = () => page.evaluate(() => {
    const r = document.documentElement, p = document.getElementById('preview'), off = id => document.getElementById(id).getAttribute('aria-disabled') === 'true';
    return {
      root: { theme: r.dataset.theme ?? null, density: r.dataset.density ?? null, dir: r.dir, lang: r.lang, trans: r.dataset.reducedTransparency ?? null },
      prev: { theme: p.dataset.theme, density: p.dataset.density ?? null, dir: p.dir, lang: p.lang, first: p.querySelector('[data-t="live"]').textContent, btn: Math.round(p.querySelector('.btn').getBoundingClientRect().height) },
      count: document.getElementById('set-count').textContent, countShown: !document.getElementById('set-count').parentElement.hidden, status: document.getElementById('set-status').textContent,
      apply: off('s-apply'), reset: off('s-reset'), defaults: off('s-defaults'),
    };
  });
  const checked = n => page.evaluate(n => document.querySelector(`input[name="${n}"]:checked`).value, n);
  const msg = (k) => page.evaluate(k => document.querySelector(`.setting[data-key="${k}"] .field__message span`).textContent, k);
  const dot = (k) => page.evaluate(k => !document.querySelector(`.setting[data-key="${k}"] .setting__name .mark`).hidden, k);
  const click = sel => page.evaluate(q => document.querySelector(q).click(), sel);
  let s = await st();
  check(s.apply && s.reset && s.defaults && !s.countShown, 'at the defaults, Apply, Reset and Revert are unavailable and nothing is counted', JSON.stringify([s.apply, s.reset, s.defaults]));
  check(await page.evaluate(() => ['s-apply', 's-reset', 's-defaults'].every(id => { const b = document.getElementById(id); return b.tabIndex >= 0 && !!document.getElementById(b.getAttribute('aria-describedby'))?.textContent.trim(); })), 'each unavailable action is focusable and carries its reason as a description');
  const base = await page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor);

  // Staged: the controls and the preview change, the page does not.
  await page.check('input[name="theme"][value="dark"]'); await page.check('input[name="density"][value="compact"]'); await page.check('input[name="language"][value="ar"]');
  s = await st();
  check(s.root.theme === null && s.root.density === null && s.root.dir === 'ltr' && await page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor) === base, 'nothing takes effect on change: the page keeps its theme, density and direction', JSON.stringify(s.root));
  check(s.prev.theme === 'dark' && s.prev.density === 'compact' && s.prev.dir === 'rtl' && s.prev.lang === 'ar', 'the preview shows the staged theme, density and language', JSON.stringify(s.prev));
  check(s.prev.first.startsWith('مباشر'), 'the preview is translated into the staged language', s.prev.first);
  check(s.prev.btn === 28, 'the preview button is compact (28px) while the page is comfortable (36px)', String(s.prev.btn));
  check(s.count === '3 unsaved' && s.countShown && !s.apply && !s.reset && !s.defaults, 'the apply bar counts the staged settings and enables Apply and Reset', JSON.stringify([s.count, s.apply, s.reset]));
  check(await dot('theme') && await dot('density') && await dot('language') && !(await dot('warnings')), 'each staged setting carries the unsaved mark; the others do not');
  check(await msg('theme') === 'Unsaved · was System · applies to your profile on every device', 'a staged setting says what it was and its scope', await msg('theme'));
  check((await msg('density')).endsWith('applies to this device only') && (await msg('warnings')) === 'Applies to your profile on every device', 'scope is stated per setting: profile or this device only', `${await msg('density')} | ${await msg('warnings')}`);
  const inert = await page.evaluate(() => { const p = document.getElementById('preview'); return { inert: p.inert, reachable: [...p.querySelectorAll('button, input, a, [tabindex]')].filter(e => e.tabIndex >= 0 && !e.closest('[inert]')).length, described: p.getAttribute('aria-describedby') }; });
  check(inert.inert && inert.reachable === 0, 'the preview is inert: no control in it can be reached or operated', JSON.stringify(inert));

  // Reset discards; Apply writes.
  await click('#s-reset'); s = await st();
  check(s.status === 'Reset: 3 unsaved settings discarded.' && (await checked('theme')) === 'system' && s.prev.dir === 'ltr' && !s.countShown, 'Reset discards every staged setting and the preview follows', JSON.stringify([s.status, s.prev.dir]));
  await page.check('input[name="theme"][value="dark"]'); await page.check('input[name="density"][value="compact"]'); await page.check('input[name="language"][value="ar"]');
  await click('#s-apply'); s = await st();
  check(s.status === 'Applied 3 settings.' && s.root.theme === 'dark' && s.root.density === 'compact' && s.root.dir === 'rtl' && s.root.lang === 'ar', 'Apply makes the staged settings take effect, and says how many', JSON.stringify([s.status, s.root]));
  check(!s.countShown && s.apply && s.reset, 'after Apply nothing is unsaved');
  await page.reload(); await page.evaluate(() => document.fonts.ready); s = await st();
  check(s.root.theme === 'dark' && s.root.density === 'compact' && s.root.dir === 'rtl' && (await checked('theme')) === 'dark' && (await checked('language')) === 'ar', 'applied settings persist across a reload', JSON.stringify(s.root));
  check(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth) <= 0, 'the page applied in Arabic, dark and compact has no sideways scrolling');
  await page.addStyleTag({ content: '.applybar--page { position: static; }' });
  await shot(page, 'settings-dark-rtl');

  // Revert to defaults stages them; it does not apply them.
  await click('#s-defaults'); s = await st();
  check(s.status === 'Staged the defaults. Apply to use them.' && s.root.theme === 'dark' && s.count === '3 unsaved' && s.defaults, 'Revert to defaults stages the defaults without applying them, then is unavailable', JSON.stringify([s.status, s.root.theme, s.count, s.defaults]));
  await click('#s-defaults'); s = await st(); check(s.status === 'Already at the defaults.', 'an unavailable action says why when activated', s.status);
  await click('#s-apply'); s = await st(); check(s.root.theme === null && s.root.density === null && s.root.dir === 'ltr', 'applying the defaults restores the default page', JSON.stringify(s.root));

  // Locked setting: visible, with reason and owner, and no way to edit it.
  const lock = await page.evaluate(() => { const l = document.querySelector('.setting--locked'); return { controls: l.querySelectorAll('input, select, textarea').length, text: l.textContent, request: !!l.querySelector('#request') }; });
  check(lock.controls === 0 && lock.text.includes('Always on') && lock.text.includes('Site policy') && lock.text.includes('H. Tazi, operations lead'), 'a locked setting stays visible with its reason and owner and has no editable control', JSON.stringify(lock));
  await click('#request'); check((await st()).status === 'Change requested from H. Tazi, operations lead.', 'requesting a change is announced');

  // Reordering without a pointer.
  const order = () => page.evaluate(() => [...document.querySelectorAll('#order .order__row')].map(r => r.dataset.id));
  check((await order()).join() === 'alerts,readings,table', 'the panels start in their default order');
  check(await page.evaluate(() => document.getElementById('up-alerts').getAttribute('aria-disabled') === 'true' && !!document.getElementById(document.getElementById('up-alerts').getAttribute('aria-describedby')).textContent), 'the first panel cannot move up, and says why');
  await page.focus('#up-readings'); await page.keyboard.press('Enter'); s = await st();
  check((await order()).join() === 'readings,alerts,table' && s.status === 'Readings moved to position 1.', 'Enter on a labelled Up button moves the panel and announces its new position', `${(await order()).join()} | ${s.status}`);
  check(await page.evaluate(() => document.activeElement.id) === 'up-readings', 'focus stays on the button that was used');
  check(await dot('order') && (await msg('order')).startsWith('Unsaved · was Alerts, Readings, Table'), 'a reorder is a staged setting like any other', await msg('order'));
  await page.evaluate(() => document.getElementById('down-readings').click()); await page.evaluate(() => document.getElementById('down-readings').click());
  check((await order()).join() === 'alerts,table,readings' && (await st()).status === 'Readings moved to position 3.', 'Down moves the panel back and further', (await order()).join());
  await click('#s-reset');

  // Find.
  const vis = () => page.evaluate(() => ({ settings: [...document.querySelectorAll('.setting:not([hidden])')].map(e => e.dataset.key), groups: [...document.querySelectorAll('[data-group]:not([hidden])')].length, status: document.getElementById('find-status').textContent }));
  await page.fill('#find', 'density'); let v = await vis();
  check(v.settings.join() === 'density' && v.groups === 1 && v.status === 'Showing 1 of 7 settings.', 'Find filters settings, hides a group with no match and says how many remain', JSON.stringify(v));
  await page.fill('#find', 'owner'); v = await vis(); check(v.settings.join() === 'critical', 'Find also matches a setting\'s owner and reason', JSON.stringify(v));
  await page.fill('#find', 'zzz'); v = await vis(); check(v.settings.length === 0 && v.groups === 0 && v.status === 'No settings match "zzz".', 'when nothing matches it says so', JSON.stringify(v));
  await page.fill('#find', ''); v = await vis(); check(v.settings.length === 7 && v.groups === 4 && v.status === '', 'clearing the search restores every group');
  await page.check('input[name="theme"][value="outdoor"]'); await page.fill('#find', 'language');
  check((await st()).count === '1 unsaved', 'a staged setting stays staged while Find hides it');
  await page.fill('#find', ''); await click('#s-reset');

  // The page itself: painted text and targets.
  await page.waitForTimeout(300);   // let the 140ms colour transitions of the last action settle before measuring
  const texts = await page.evaluate(measureText); let worst = { ratio: 99 };
  for (const t of texts) { const min = t.large ? 3 : 4.5; if (t.ratio < worst.ratio) worst = t; check(Math.round(t.ratio * 100) >= min * 100, `settings text contrast >= ${min}`, `${t.ratio.toFixed(2)} "${t.text}"`); }
  console.log(`  ${texts.length} text runs measured, lowest ${worst.ratio.toFixed(2)} ("${worst.text}")`);
  const targets = await page.evaluate(() => [...document.querySelectorAll('button, input, a[href]')].filter(e => !e.closest('[hidden], [inert]')).map(e => ({ n: (e.textContent.trim() || e.id || e.name).slice(0, 24), h: Math.round((e.closest('label.choice') ?? e.closest('.field__control') ?? e).getBoundingClientRect().height) })).filter(t => t.h < 36));
  check(targets.length === 0, 'every control on the settings page is at least 36px high', JSON.stringify(targets));
  await page.addStyleTag({ content: '.applybar--page { position: static; }' });   // a sticky bar floats mid-page in a stitched full-page capture
  await shot(page, 'settings');
  await ctx.close();
  const dctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark' }); const dp = await dctx.newPage(); await dp.goto(url('')); await dp.evaluate(() => document.fonts.ready);
  check(await dp.evaluate(() => document.getElementById('preview').dataset.theme) === 'dark', 'with the theme set to System, the preview follows the system preference');
  await dctx.close();
}

// Glass: legibility measured on real rendered pixels, the layers, the states and every fallback.
console.log('glass page');
{
  const gurl = q => pathToFileURL(root + 'specimen/glass.html').href + q;
  const openGlass = async (q, ctx = {}, media) => {
    const c = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce', ...ctx });
    const p = await c.newPage(); if (media) await p.emulateMedia({ media });
    await p.goto(gurl(q)); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(400);
    return p;
  };
  // Runs in the page: the worst contrast of each text colour against the pixels of a screenshot taken with the text hidden.
  const MEASURE = async ({ b64, items }) => {
    const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
    const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height;
    const c = cv.getContext('2d', { willReadFrequently: true }); c.drawImage(img, 0, 0);
    const lin = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
    const lum = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
    return items.map(it => {
      const x0 = Math.max(0, Math.floor(it.x)), y0 = Math.max(0, Math.floor(it.y)), w = Math.min(img.width - x0, Math.ceil(it.w)), h = Math.min(img.height - y0, Math.ceil(it.h));
      const d = c.getImageData(x0, y0, w, h).data, lt = lum(...it.color); let worst = 99;
      for (let i = 0; i < d.length; i += 4) { const lb = lum(d[i], d[i + 1], d[i + 2]), r = (Math.max(lt, lb) + 0.05) / (Math.min(lt, lb) + 0.05); if (r < worst) worst = r; }
      return { id: it.id, kind: it.kind, worst };
    });
  };
  // The text runs of a region, with their colours, taken before the text is hidden.
  const collect = (page, scope) => page.evaluate(sel => {
    const root = document.querySelector(sel) ?? document.body, base = sel ? root.getBoundingClientRect() : { left: -scrollX, top: -scrollY };
    return [...root.querySelectorAll('[data-m]')].filter(e => e.getClientRects().length).map(e => {
      const r = e.getBoundingClientRect(), cell = e.closest('[data-cell]')?.dataset.cell ?? e.closest('[id]')?.id ?? '', m = getComputedStyle(e).color.match(/[\d.]+/g).map(Number);
      return { id: cell, kind: e.dataset.m, muted: e.style.color.includes('muted'), x: r.left - base.left, y: r.top - base.top, w: r.width, h: r.height, color: m.slice(0, 3), label: e.textContent.trim().slice(0, 28) };
    });
  }, scope);
  const HIDE = '*, *::before, *::after { color: transparent !important; text-shadow: none !important; caret-color: transparent !important; }';
  const measureRegion = async (page, scope, fullPage) => {
    const items = await collect(page, scope), style = await page.addStyleTag({ content: HIDE });
    const buf = scope ? await page.locator(scope).screenshot({ animations: 'disabled' }) : await page.screenshot({ fullPage, animations: 'disabled' });
    await style.evaluate(e => e.remove());
    const res = await page.evaluate(MEASURE, { b64: buf.toString('base64'), items });
    return res.map((r, i) => ({ ...r, muted: items[i].muted, label: items[i].label }));
  };

  // ---- Legibility on real pixels, in every theme and mode that draws glass or its fallback.
  const MODES = [['light', '?theme=light', 4.5], ['dark', '?theme=dark', 4.5], ['outdoor', '?theme=outdoor', 7], ['reduced transparency, light', '?theme=light&transparency=reduced', 4.5], ['reduced transparency, dark', '?theme=dark&transparency=reduced', 4.5]];
  const bareResults = {};
  for (const [name, q, min] of MODES) {
    const page = await openGlass(q);
    const res = await measureRegion(page, null, true);
    const plates = res.filter(r => r.kind === 'plate'), bare = res.filter(r => r.kind === 'bare');
    const low = plates.reduce((a, b) => (b.worst < a.worst ? b : a));
    console.log(`  ${name.padEnd(28)} ${plates.length} plate text runs on real pixels, lowest ${low.worst.toFixed(2)} ("${low.label}" in ${low.id})${bare.length ? `; bare glass: ${bare.filter(b => b.worst < 4.5).length} of ${bare.length} runs below 4.5` : ''}`);
    check(plates.length >= 70, `${name}: the plate text runs were measured`, String(plates.length));
    check(plates.every(r => r.worst >= min), `${name}: every plate text run reaches ${min}:1 on the pixels actually behind it`, plates.filter(r => r.worst < min).map(r => `${r.worst.toFixed(2)} ${r.label} in ${r.id}`).slice(0, 4).join(' | '));
    bareResults[name] = bare;
    await page.context().close();
  }
  // The stress set has to be able to fail, or passing it proves nothing.
  const cell = (mode, id, muted) => bareResults[mode].find(r => r.id === id && r.muted === muted)?.worst;
  check(cell('light', 'frosted-ground', true) < 4.5, 'stress: muted text on bare light frosted glass over a dark ground fails, so the plate is doing the work', String(cell('light', 'frosted-ground', true)));
  check(cell('dark', 'frosted-sky', true) < 4.5, 'stress: muted text on bare dark frosted glass over a bright sky fails', String(cell('dark', 'frosted-sky', true)));
  check(cell('light', 'clear-split', true) < 4.5 && cell('light', 'clear-busy', true) < 4.5, 'stress: muted text on bare clear glass over white beside black and over fine detail fails', `${cell('light', 'clear-split', true)} ${cell('light', 'clear-busy', true)}`);

  // ---- Moving content: the notice stays legible as bright, dark and mid rows pass under it.
  {
    const page = await openGlass('?theme=light');
    let worst = 99, at = 0;
    for (const top of [0, 37, 111, 233, 400, 690, 1000, 1500]) {
      await page.evaluate(t => { document.getElementById('feed').scrollTop = t; }, top); await page.waitForTimeout(60);
      const res = await measureRegion(page, '#feed');
      const toast = res.filter(r => r.id === 'toast');
      for (const r of toast) if (r.worst < worst) { worst = r.worst; at = top; }
      if (top === 0) check(toast.length === 2, 'the notice has its two text runs measured', String(toast.length));
    }
    console.log(`  moving content: lowest plate text contrast over 8 scroll positions ${worst.toFixed(2)} (at ${at}px)`);
    check(worst >= 4.5, 'the notice stays at 4.5:1 or better at every scroll position', `${worst.toFixed(2)} at ${at}px`);
    const toast = await page.evaluate(() => { const t = document.getElementById('toast'), f = document.getElementById('feed'), a = t.getBoundingClientRect().top - f.getBoundingClientRect().top; f.scrollTop = 500; return { sticky: getComputedStyle(t).position, topAfter: Math.round(t.getBoundingClientRect().top - f.getBoundingClientRect().top), topBefore: Math.round(a), blur: getComputedStyle(t).backdropFilter }; });
    check(toast.sticky === 'sticky' && toast.topAfter === toast.topBefore && toast.blur.includes('blur'), 'the notice stays in place, blurred, while the list moves under it', JSON.stringify(toast));
    const edge = await page.evaluate(() => { const cs = getComputedStyle(document.getElementById('toast')); return { w: parseFloat(cs.borderInlineStartWidth), style: cs.borderInlineStartStyle, blur: cs.backdropFilter }; });
    check(edge.w === 3 && edge.style === 'solid' && edge.blur.includes('blur(12px)'), 'an alert notice is 12px alert glass with the state\'s 3px leading edge as a real border', JSON.stringify(edge));
    await page.context().close();
  }

  // ---- Rules and structure.
  for (const [name, q] of [['light', '?theme=light'], ['dark', '?theme=dark']]) {
    const page = await openGlass(q);
    const r = await page.evaluate(() => {
      const glass = [...document.querySelectorAll('.glass')];
      const stray = []; const w = document.createTreeWalker(document.querySelector('main'), NodeFilter.SHOW_TEXT);
      for (let n; (n = w.nextNode());) { if (!n.textContent.trim() || !n.parentElement.closest('.glass')) continue; const el = n.parentElement; if (!el.closest('.glass__plate') && !el.closest('[data-m="bare"]') && !el.closest('script, style, [hidden]')) stray.push(n.textContent.trim().slice(0, 30)); }
      const paths = [...document.querySelectorAll('.glass__streams path')], cs = e => getComputedStyle(e);
      const legend = [...document.querySelectorAll('.legend path')].map(p => cs(p).strokeDasharray);
      const scratch = getComputedStyle(document.documentElement).getPropertyValue('--glass-scratch').match(/[\d.]+/g).map(Number);
      return { n: glass.length, nested: document.querySelectorAll('.glass .glass').length, stray, matrix: document.querySelectorAll('[data-cell]').length, plates: [...document.querySelectorAll('[data-cell]')].filter(g => g.querySelector('.glass__plate')).length, bare: document.querySelectorAll('[data-m="bare"]').length,
        wear: document.querySelectorAll('[data-wear]').length, streamsHidden: [...document.querySelectorAll('.glass__streams')].every(s => s.getAttribute('aria-hidden') === 'true'),
        opacity: paths.filter(p => !p.closest('[data-state="stale"]') && !p.closest('[data-state="offline"]') && (!p.closest('[data-fb]') || p.closest('[data-fb]').dataset.fb === 'Standard')).map(p => +cs(p).opacity), widths: paths.map(p => parseFloat(cs(p).strokeWidth)), dashes: new Set(legend).size, legendN: legend.length, scratchAlpha: scratch[3], pointer: paths.every(p => cs(p.closest('svg')).pointerEvents === 'none') };
    });
    check(r.n === 26, `${name}: the glass page shows its 26 panels`, String(r.n));
    check(r.nested === 0, `${name}: no glass inside glass`, String(r.nested));
    check(r.stray.length === 0, `${name}: no text on bare glass outside the stress samples; every text run sits on a plate`, r.stray.join(' | '));
    check(r.matrix === 16 && r.plates === 16 && r.bare === 32, `${name}: four variants over four backdrops, each with bare samples and a plate`, JSON.stringify([r.matrix, r.plates, r.bare]));
    check(r.wear === 0, `${name}: wear is off unless a touch surface asks for it`, String(r.wear));
    check(r.streamsHidden && r.pointer, `${name}: the data layer is hidden from assistive technology and never takes the pointer`);
    check(r.opacity.every(o => o >= 0.10 && o <= 0.28), `${name}: stream lines sit within the 10% to 28% opacity spec`, [...new Set(r.opacity)].join(','));
    check(r.widths.every(w => w >= 1 && w <= 2), `${name}: stream lines are 1px to 2px wide`, [...new Set(r.widths)].join(','));
    check(r.legendN === 8 && r.dashes === 8, `${name}: the eight stream categories each have their own line style`, `${r.dashes} of ${r.legendN}`);
    check(r.scratchAlpha >= 0.03 && r.scratchAlpha <= 0.08, `${name}: wear lines are 3% to 8% opaque`, String(r.scratchAlpha));
    await page.context().close();
  }

  // ---- Layers: each switch removes exactly its layer.
  {
    const page = await openGlass('?theme=light');
    const read = () => page.evaluate(() => { const g = document.getElementById('anatomy'), cs = getComputedStyle(g), pl = getComputedStyle(g.querySelector('.glass__plate')); return { blur: cs.backdropFilter, tint: cs.backgroundColor, streams: getComputedStyle(g.querySelector('.glass__streams')).display, plate: pl.backgroundColor, shadow: cs.boxShadow, wear: getComputedStyle(g.querySelector('.glass__wear')).backgroundImage, attr: g.hasAttribute('data-wear') }; });
    const flip = layer => page.evaluate(l => document.querySelector(`input[data-layer="${l}"]`).click(), layer);
    let s = await read();
    check(s.blur.includes('blur') && s.tint !== 'rgba(0, 0, 0, 0)' && s.streams !== 'none' && s.plate !== 'rgba(0, 0, 0, 0)' && s.shadow.includes('inset') && s.wear === 'none' && !s.attr, 'anatomy: every layer is on and wear is off to begin with', JSON.stringify(s));
    await flip('blur'); s = await read(); check(s.blur === 'none' && s.tint !== 'rgba(0, 0, 0, 0)', 'anatomy: switching off blur removes only the blur');
    await flip('tint'); s = await read(); check(s.tint === 'rgba(0, 0, 0, 0)', 'anatomy: switching off the tint removes only the tint');
    await flip('streams'); s = await read(); check(s.streams === 'none', 'anatomy: switching off streams hides the data layer');
    await flip('plate'); s = await read(); check(s.plate === 'rgba(0, 0, 0, 0)', 'anatomy: switching off the plate removes the plate');
    await flip('edge'); s = await read(); check(!s.shadow.includes('inset'), 'anatomy: switching off the edge removes the light and shade on the edge');
    await flip('wear'); s = await read(); check(s.wear.includes('repeating-linear-gradient') && s.attr, 'anatomy: wear adds micro-scratches when asked', s.wear.slice(0, 40));
    await page.context().close();
  }

  // ---- The data layer: a fresh reading pulses once and settles; under reduced motion it does not move.
  for (const [name, motion] of [['motion allowed', 'no-preference'], ['reduced motion', 'reduce']]) {
    const page = await openGlass('?theme=light', { reducedMotion: motion });
    await page.evaluate(() => document.getElementById('fresh').click());
    const a = await page.evaluate(() => { const w = getComputedStyle(document.querySelector('#reveal .stream--water')), p = getComputedStyle(document.querySelector('#reveal .stream--power')); return { name: w.animationName, count: w.animationIterationCount, dur: w.animationDuration, other: p.animationName, say: document.getElementById('fresh-say').textContent }; });
    if (motion === 'no-preference') check(a.name === 'glass-pulse' && a.count === '1' && a.dur === '0.6s' && a.other === 'none', `${name}: a fresh reading pulses its own stream once, for 600ms, and no other`, JSON.stringify(a));
    else check(a.name === 'none', `${name}: the pulse does not run`, a.name);
    check(a.say === 'Fresh reading on the water stream.', `${name}: the fresh reading is announced in words`, a.say);
    await page.context().close();
  }

  // ---- States, in light and dark.
  for (const [name, q] of [['light', '?theme=light'], ['dark', '?theme=dark']]) {
    const page = await openGlass(q);
    const s = await page.evaluate(() => {
      const g = st => document.querySelector(`[data-s="${st}"]`), cs = (e, p) => getComputedStyle(e, p), idle = +cs(document.documentElement.querySelector('.glass__streams path')).opacity;
      const o = g('offline'), st = g('stale'), m = g('maintenance'), l = g('live');
      return {
        live: { haze: cs(l.querySelector('.glass__haze')).display, seam: cs(l.querySelector('.glass__seam')).display, opacity: +cs(l.querySelector('path')).opacity, blur: cs(l).backdropFilter },
        stale: { haze: cs(st.querySelector('.glass__haze')).display, hazeAlpha: cs(st.querySelector('.glass__haze')).backgroundColor, opacity: +cs(st.querySelector('path')).opacity, anim: cs(st.querySelector('path')).animationName, blur: cs(st).backdropFilter },
        offline: { blur: cs(o).backdropFilter, bg: cs(o).backgroundColor, streams: cs(o.querySelector('.glass__streams')).display, shadow: cs(o).boxShadow },
        maint: { edge: parseFloat(cs(m).borderInlineStartWidth), seam: cs(m.querySelector('.glass__seam')).display, bg: cs(m.querySelector('.glass__seam')).backgroundImage, blur: cs(m).backdropFilter },
        labels: ['live', 'stale', 'offline', 'maintenance'].map(x => g(x).querySelector('.state-label').textContent.trim().length > 4 && !!g(x).querySelector('.state-label .mark')), idle,
      };
    });
    check(s.live.haze === 'none' && s.live.seam === 'none' && s.live.opacity === 0.2 && s.live.blur.includes('blur'), `${name}: live glass is clear, with its lines at idle opacity`, JSON.stringify(s.live));
    check(s.stale.haze === 'block' && s.stale.hazeAlpha !== 'rgba(0, 0, 0, 0)' && s.stale.opacity === 0.1 && s.stale.anim === 'none' && s.stale.blur.includes('blur'), `${name}: stale glass clouds over, and its lines drop to 10% and stop`, JSON.stringify(s.stale));
    check(s.offline.blur === 'none' && /^rgb\(/.test(s.offline.bg) && s.offline.streams === 'none' && s.offline.shadow === 'none', `${name}: offline glass is solid, recessed and has no data layer or shadow`, JSON.stringify(s.offline));
    check(s.maint.edge === 3 && s.maint.seam === 'block' && s.maint.bg.includes('radial-gradient') && s.maint.blur.includes('blur'), `${name}: maintenance glass shows its seam and four fasteners and the 3px state edge`, JSON.stringify(s.maint));
    check(s.labels.every(Boolean), `${name}: every glass state also carries a text label and a mark`, JSON.stringify(s.labels));
    await page.context().close();
  }

  // ---- Fallbacks: the panel becomes a solid surface with no blur, no lines and no light.
  const solid = page => page.evaluate(() => [...document.querySelectorAll('.glass:not([data-state="offline"])')].map(g => { const cs = getComputedStyle(g), pl = getComputedStyle(g.querySelector('.glass__plate')), s = g.querySelector('.glass__streams'); const a = c => (c.match(/rgba?\(([^)]+)\)/)[1].split(/[ ,\/]+/).map(Number)[3] ?? 1); return { blur: cs.backdropFilter, bg: a(cs.backgroundColor), plate: a(pl.backgroundColor), streams: s ? +getComputedStyle(s.querySelector('path')).opacity : 0, wear: getComputedStyle(g.querySelector('.glass__wear') ?? g).backgroundImage }; }));
  const allSolid = (rows) => rows.every(r => r.blur === 'none' && r.bg === 1 && r.plate === 1 && r.streams === 0);
  const sub = await (async () => { const page = await openGlass('?theme=light'); const r = await page.evaluate(() => Object.fromEntries([...document.querySelectorAll('[data-fb]')].map(g => { const cs = getComputedStyle(g), a = c => (c.match(/rgba?\(([^)]+)\)/)[1].split(/[ ,\/]+/).map(Number)[3] ?? 1); return [g.dataset.fb, { blur: cs.backdropFilter, bg: a(cs.backgroundColor), plate: a(getComputedStyle(g.querySelector('.glass__plate')).backgroundColor), streams: +getComputedStyle(g.querySelector('path')).opacity }]; }))); await page.context().close(); return r; })();
  check(sub.Standard.blur.includes('blur') && sub.Standard.bg < 1 && sub.Standard.plate < 1 && sub.Standard.streams > 0, 'fallbacks: the standard panel is translucent, blurred, with visible lines', JSON.stringify(sub.Standard));
  check(allSolid([sub['Reduced transparency']]) && allSolid([sub.Outdoor]), 'fallbacks: reduced transparency and outdoor panels, side by side with the standard one, are solid', JSON.stringify([sub['Reduced transparency'], sub.Outdoor]));
  for (const [name, q, ctx, media] of [['reduced transparency', '?theme=light&transparency=reduced'], ['reduced transparency in dark', '?theme=dark&transparency=reduced'], ['outdoor', '?theme=outdoor'], ['forced colors', '?theme=light', { forcedColors: 'active' }], ['print', '?theme=dark', {}, 'print']]) {
    const page = await openGlass(q, ctx ?? {}, media); const rows = await solid(page);
    check(rows.length >= 20 && allSolid(rows), `fallbacks: on the whole page, ${name} makes every glass panel solid, with no blur and no lines`, JSON.stringify(rows.find(r => !(r.blur === 'none' && r.bg === 1 && r.plate === 1 && r.streams === 0))));
    if (media === 'print') { const h = await page.evaluate(() => document.documentElement.scrollHeight); check(h < 20000, 'fallbacks: the glass page prints at a sensible length', `${h}px`); }
    await page.context().close();
  }

  // ---- Reflow and direction.
  {
    const page = await openGlass('?theme=light', { viewport: { width: 720, height: 900 } });
    const w = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    check(w <= 0, 'the glass page reflows at 200% zoom with no sideways scrolling', `${w}px`);
    await shot(page, 'glass-zoom-200'); await page.context().close();
    const rtl = await openGlass('?theme=light&dir=rtl');
    const e = await rtl.evaluate(() => { const m = document.querySelector('[data-s="maintenance"]'), cs = getComputedStyle(m); return { right: parseFloat(cs.borderRightWidth), left: parseFloat(cs.borderLeftWidth), sideways: document.documentElement.scrollWidth - document.documentElement.clientWidth }; });
    check(e.right === 3 && e.left === 1 && e.sideways <= 0, 'right to left: the maintenance edge moves to the right and nothing scrolls sideways', JSON.stringify(e));
    await rtl.context().close();
  }
  for (const [file, q] of [['glass', '?theme=light'], ['glass-dark', '?theme=dark'], ['glass-outdoor', '?theme=outdoor']]) { const page = await openGlass(q); await shot(page, file); await page.context().close(); }
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
  const pr = await page.evaluate(() => ({ height: document.documentElement.scrollHeight, big: getComputedStyle(document.getElementById('big-wrap')).display, note: getComputedStyle(document.querySelector('.print-note')).display, panel: getComputedStyle(document.querySelector('.table-bar')).display }));
  check(pr.height < 20000, 'a virtualized table does not make the printed page tens of thousands of pixels tall', `${pr.height}px`);
  check(pr.big === 'none' && pr.note === 'block', 'the large table is not printed, and the page says why', JSON.stringify(pr));
  check(pr.panel === 'none', 'table controls are not printed', pr.panel);
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
      .filter(el => el.scrollWidth > el.clientWidth + 1 || (el.getBoundingClientRect().right > innerWidth + 1 && !el.closest('.table-wrap'))).map(el => el.textContent.trim().slice(0, 30)),
  }));
  check(z.sideways <= 0, 'no sideways scrolling', `${z.sideways}px`);
  check(z.clipped.length === 0, 'no clipped labels', z.clipped.join(' | '));
  await shot(page, 'zoom-200');
  await page.context().close();
}

await browser.close();
console.log(failed ? `\n${failed} failing check(s), ${passed} passed` : `\nAll ${passed} render checks pass.`);
process.exit(failed ? 1 : 0);
