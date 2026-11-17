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

// Ruled sheet: the pattern's geometry and behaviour, the workspace, drafts, reading and print.
console.log('ruled sheet');
{
  const surl = q => pathToFileURL(root + 'specimen/sheet.html').href + q;
  const openSheet = async (q = '', ctx = {}, media) => {
    const c = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce', ...ctx });
    const p = await c.newPage(); if (media) await p.emulateMedia({ media });
    await p.goto(surl(q)); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(350);
    return p;
  };
  const val = (p, sel) => p.evaluate(s => document.querySelector(s).value, sel);
  const css = (p, sel, prop, pseudo) => p.evaluate(([s, pr, ps]) => getComputedStyle(document.querySelector(s), ps || null)[pr], [sel, prop, pseudo]);
  const rect = (p, sel) => p.evaluate(s => { const r = document.querySelector(s).getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height, r: r.right, b: r.bottom }; }, sel);
  const PARTS = ['objective', 'kind', 'findings', 'steps', 'parts', 'handover'];
  const MEASURE_SHEET = async ({ b64, items }) => {
    const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
    const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height; const c = cv.getContext('2d', { willReadFrequently: true }); c.drawImage(img, 0, 0);
    const lin = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }, lum = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
    return items.map(it => {
      const x0 = Math.max(0, Math.floor(it.x)), y0 = Math.max(0, Math.floor(it.y)), w = Math.min(img.width - x0, Math.ceil(it.w)), h = Math.min(img.height - y0, Math.ceil(it.h));
      if (w < 1 || h < 1) return { ...it, worst: 99 };
      const d = c.getImageData(x0, y0, w, h).data, lt = lum(...it.color); let worst = 99;
      for (let i = 0; i < d.length; i += 4) { const lb = lum(d[i], d[i + 1], d[i + 2]), r = (Math.max(lt, lb) + 0.05) / (Math.min(lt, lb) + 0.05); if (r < worst) worst = r; }
      return { ...it, worst };
    });
  };
  const fillParts = async p => { await p.fill('#sh-subject', 'Pump seal replacement'); await p.fill('#sh-objective', 'Replace the seal and confirm there is no leak at full pressure.'); await p.fill('#sh-findings', 'Seal worn. Slight scoring on the shaft sleeve.'); await p.fill('#sh-handover', 'Check for a leak again at the next start.'); };

  // ---- Contrast on the pixels actually under the text: labels, typed text, placeholders, links and chips, ruled lines included.
  for (const [name, q, min] of [['light', '?theme=light&open=1', 4.5], ['dark', '?theme=dark&open=1', 4.5], ['outdoor', '?theme=outdoor&open=1', 7]]) {
    const p = await openSheet(q, { viewport: { width: 1440, height: 1500 } }); await fillParts(p);
    await p.evaluate(() => document.activeElement.blur()); await p.waitForTimeout(250);   // nothing focused: a focus ring is not under the text
    const items = await p.evaluate(() => {
      const out = [], add = (el, kind, o = {}) => { const r = el.getBoundingClientRect(); if (!r.width) return; const m = (o.color || getComputedStyle(el).color).match(/[\d.]+/g).map(Number); out.push({ kind, x: r.left + (o.dx || 0), y: r.top + (o.dy || 0), w: r.width - (o.dw || 0), h: o.h ?? r.height, color: m.slice(0, 3) }); };
      // A label: its first lines, without the margin rule beside it.
      document.querySelectorAll('.part__label').forEach(l => add(l, 'label', { dw: 2, h: Math.min(l.getBoundingClientRect().height, l.closest('.part--highlight') ? 40 : 28) }));
      // A placeholder: the line it sits on, down to (not including) the 1px ruled line at its foot, which is below the glyphs.
      document.querySelectorAll('.ruled').forEach(t => { const empty = !t.value; add(t, empty ? 'placeholder' : 'typed', empty ? { h: 27, color: getComputedStyle(t, '::placeholder').color } : {}); });
      const s = document.getElementById('sh-subject'); add(s, s.value ? 'typed' : 'placeholder', s.value ? { h: 38 } : { color: getComputedStyle(s, '::placeholder').color, h: 38 });
      document.querySelectorAll('.pick').forEach(b => add(b, 'control', { dx: 12, dy: 6, dw: 24, h: b.getBoundingClientRect().height - 12 }));
      document.querySelectorAll('.link-btn').forEach(b => { if (!b.closest('[hidden]')) add(b, 'control', { dy: 4, h: b.getBoundingClientRect().height - 8 }); });
      return out;
    });
    const hide = await p.addStyleTag({ content: '*, *::before, *::after { color: transparent !important; text-shadow: none !important; caret-color: transparent !important; } ::placeholder { color: transparent !important; opacity: 1 !important; }' });
    const buf = await p.locator('#sheet').screenshot({ animations: 'disabled' }); await hide.evaluate(e => e.remove());
    const box = await rect(p, '#sheet');
    const res = await p.evaluate(MEASURE_SHEET, { b64: buf.toString('base64'), items: items.map(i => ({ ...i, x: i.x - box.x, y: i.y - box.y })) });
    const low = res.reduce((a, b) => (b.worst < a.worst ? b : a)); const kinds = [...new Set(res.map(r => r.kind))];
    console.log(`  ${name.padEnd(8)} ${res.length} text areas of ${kinds.join(', ')} measured on real pixels, lowest ${low.worst.toFixed(2)} (${low.kind})`);
    check(res.length >= 14 && kinds.length === 4, `${name}: labels, typed text, placeholders, links and chips were all measured`, JSON.stringify(kinds));
    check(res.every(r => r.worst >= min), `${name}: every text area reaches ${min}:1 on the pixels under it, ruled lines and the highlighted part included`, res.filter(r => r.worst < min).map(r => `${r.worst.toFixed(2)} ${r.kind}`).join(' | '));
    await p.context().close();
  }

  // ---- Geometry: the spec, measured.
  {
    const p = await openSheet('?theme=light&open=1');
    const g = await p.evaluate(() => {
      const cs = (e, pr, ps) => getComputedStyle(e, ps || null)[pr], sheet = document.getElementById('sheet'), sr = sheet.getBoundingClientRect(), main = document.getElementById('page').getBoundingClientRect();
      const labels = [...sheet.querySelectorAll('.part__label')], lr = labels.map(l => l.getBoundingClientRect()), rt = [...sheet.querySelectorAll('.ruled')];
      const gaps = lr.slice(1).map((r, i) => Math.round((r.top - lr[i].bottom) * 100) / 100);
      return { sheetW: sr.width, leftSpace: sr.left - main.left, rightSpace: main.right - sr.right, bg: cs(sheet, 'backgroundColor'), border: cs(sheet, 'borderTopColor'), card: getComputedStyle(document.documentElement).getPropertyValue('--color-border-card'), radius: cs(sheet, 'borderTopLeftRadius'), shadow: cs(sheet, 'boxShadow') !== 'none',
        labelW: lr[0].width + 0, cols: cs(sheet.querySelector('.part'), 'gridTemplateColumns'), lx: [...new Set(lr.map(r => Math.round(r.right)))], gaps, rule: labels.map(l => cs(l, 'borderInlineEndWidth') + ' ' + cs(l, 'borderInlineEndStyle')),
        label: { size: cs(labels[1], 'fontSize'), weight: cs(labels[1], 'fontWeight'), tracking: cs(labels[1], 'letterSpacing'), transform: cs(labels[1], 'textTransform'), align: cs(labels[1], 'textAlign') },
        ruled: rt.map(t => ({ font: cs(t, 'fontSize'), line: cs(t, 'lineHeight'), size: cs(t, 'backgroundSize'), attach: cs(t, 'backgroundAttachment'), image: cs(t, 'backgroundImage').includes('linear-gradient'), border: cs(t, 'borderTopWidth'), pad: cs(t, 'paddingTop'), overflow: cs(t, 'overflow'), h: Math.round(t.getBoundingClientRect().height) })),
        head: { size: cs(document.getElementById('sh-subject'), 'fontSize'), weight: cs(document.getElementById('sh-subject'), 'fontWeight'), under: cs(document.getElementById('sh-subject'), 'borderBottomWidth') + ' ' + cs(document.getElementById('sh-subject'), 'borderBottomStyle'), box: cs(document.getElementById('sh-subject'), 'borderTopWidth') },
        hl: [...sheet.querySelectorAll('.part--highlight')].map(h => { const b = h.querySelector('.part__body'); return { bg: cs(b, 'backgroundColor'), bar: cs(b, 'borderInlineStartWidth') + ' ' + cs(b, 'borderInlineStartStyle'), shadow: cs(b, 'boxShadow') }; }), inset: getComputedStyle(document.documentElement).getPropertyValue('--color-surface-inset') };
    });
    check(g.sheetW === 900 && Math.abs(g.leftSpace - g.rightSpace) < 1, 'sheet: 900px wide and centred', JSON.stringify([g.sheetW, g.leftSpace, g.rightSpace]));
    check(g.bg === 'rgb(255, 254, 250)' && g.border === 'rgb(217, 205, 182)' && g.radius === '12px' && g.shadow, 'sheet: the white L2 surface with the card hairline, radius-md and a shadow', JSON.stringify([g.bg, g.border, g.radius, g.shadow]));
    check(g.cols.startsWith('156px'), 'margin: 156px wide', g.cols);
    check(g.lx.length === 1, 'margin rule: every part\'s label ends on the same line', JSON.stringify(g.lx));
    check(g.gaps.every(x => Math.abs(x) < 0.6), 'margin rule: it runs through every part with no gap between them', JSON.stringify(g.gaps));
    check(g.rule.every(r => r === '1px solid'), 'margin rule: 1px, in every part', JSON.stringify(g.rule));
    check(g.label.size === '12px' && g.label.weight === '560' && g.label.transform === 'uppercase' && parseFloat(g.label.tracking) === 0.6 && g.label.align === 'end', 'margin labels: caption size, uppercase, 0.05em tracking, aligned to the rule', JSON.stringify(g.label));
    check(g.ruled.every(r => r.font === '15px' && r.line === '28px' && r.size.endsWith('28px') && r.attach === 'local' && r.image && r.border === '0px' && r.pad === '0px'), 'writing text: 15px on a 28px line, no box, ruled lines behind it that scroll with it', JSON.stringify(g.ruled[0]));
    check(JSON.stringify(g.ruled.map(r => r.h)) === JSON.stringify([84, 28, 112, 112, 84, 84]), 'minimum heights follow the expected length: 3 lines, 1 line, 4, 4, 3, 3', JSON.stringify(g.ruled.map(r => r.h)));
    check(g.head.size === '18px' && g.head.weight === '520' && g.head.under === '1px solid' && g.head.box === '0px', 'heading line: 18px, weight 520, a single 1px underline and no box', JSON.stringify(g.head));
    check(g.hl.length === 1 && g.hl[0].bar === '3px solid' && g.hl[0].shadow === 'none' && g.hl[0].bg === 'rgb(242, 235, 221)', 'highlighted part: exactly one, on the inset tone, with a 3px bar drawn as a real border', JSON.stringify(g.hl));
    await p.context().close();
  }

  // ---- A part is as tall as its text, with no scrollbar of its own, and re-fits when the sheet narrows.
  {
    const p = await openSheet('?theme=light&open=1');
    const fit = async () => p.evaluate(() => { const t = document.getElementById('sh-findings'); return { h: t.getBoundingClientRect().height, noBar: t.scrollHeight <= t.clientHeight + 1, overflow: getComputedStyle(t).overflow }; });
    const empty = await fit();
    await p.fill('#sh-findings', Array.from({ length: 10 }, (_, i) => 'Line ' + (i + 1)).join('\n'));
    const ten = await fit(); check(ten.h === 280 && ten.noBar && ten.overflow === 'hidden', 'growth: ten lines make the part ten lines tall, with no inner scrollbar', JSON.stringify(ten));
    await p.fill('#sh-findings', ''); check((await fit()).h === empty.h, 'growth: clearing the text returns the part to its minimum', JSON.stringify(await fit()));
    await p.fill('#sh-findings', 'A long observation written without a single line break so that it has to wrap onto several lines of the page. '.repeat(6));
    const wide = await fit();
    await p.setViewportSize({ width: 800, height: 900 }); await p.waitForTimeout(250); const narrow = await fit();
    check(narrow.h > wide.h && narrow.noBar && narrow.h % 28 === 0, 'growth: when the sheet narrows the part re-wraps and re-fits, still on whole lines', `${wide.h} -> ${narrow.h}`);
    await p.setViewportSize({ width: 1440, height: 900 }); await p.waitForTimeout(250); check((await fit()).h === wide.h, 'growth: widening it again re-fits the part back', String((await fit()).h));
    check(await p.evaluate(() => getComputedStyle(document.querySelector('.part')).gridTemplateColumns.startsWith('156px')), 'margin is back to 156px at full width');
    await p.setViewportSize({ width: 1000, height: 900 }); await p.waitForTimeout(250);
    check(await p.evaluate(() => getComputedStyle(document.querySelector('.part')).gridTemplateColumns.startsWith('120px')), 'margin: 120px below 1100px');
    await p.context().close();
  }

  // ---- Lists continue.
  {
    const p = await openSheet('?theme=light&open=1');
    const typeIn = async (id, steps) => { await p.focus('#' + id); for (const s of steps) { if (s === 'Enter' || s.startsWith('Arrow') || s.startsWith('Shift+') || s.startsWith('Control+')) await p.keyboard.press(s); else await p.keyboard.type(s); } return val(p, '#' + id); };
    check(await typeIn('sh-steps', ['1. one', 'Enter']) === '1. one\n2. ', 'lists: Enter at the end of "1. one" starts "2. "');
    check(await typeIn('sh-steps', ['two', 'Enter']) === '1. one\n2. two\n3. ', 'lists: and numbering follows on the next line');
    check(await typeIn('sh-steps', ['Enter']) === '1. one\n2. two\n', 'lists: Enter on an empty item ends the list and removes the marker');
    check(await typeIn('sh-steps', ['Enter', 'after']) === '1. one\n2. two\n\nafter', 'lists: after the list, Enter is a plain new line');
    await p.fill('#sh-steps', ''); await typeIn('sh-steps', ['1. a', 'Enter', 'b', 'Enter', 'c', 'Enter', 'd', 'Enter', 'e', 'Enter', 'f', 'Enter', 'g']);
    const seven = await p.evaluate(() => { const t = document.getElementById('sh-steps'); return { v: t.value.split('\n').length, h: Math.round(t.getBoundingClientRect().height), bar: t.scrollHeight <= t.clientHeight + 1 }; });
    check(seven.v === 7 && seven.h === 196 && seven.bar, 'lists: seven items make the part seven lines tall, with no scrollbar', JSON.stringify(seven));
    await p.fill('#sh-parts', ''); check(await typeIn('sh-parts', ['- bolt', 'Enter']) === '- bolt\n- ', 'lists: "-" continues with "-"');
    await p.fill('#sh-findings', ''); check(await typeIn('sh-findings', ['1) first', 'Enter']) === '1) first\n2) ', 'lists: "1)" continues as "2)"');
    await p.fill('#sh-objective', ''); check(await typeIn('sh-objective', ['1. abc', 'ArrowLeft', 'ArrowLeft', 'Enter']) === '1. a\nbc', 'lists: Enter in the middle of a line is a plain new line');
    await p.fill('#sh-objective', ''); check(await typeIn('sh-objective', ['1. abc', 'Shift+Enter']) === '1. abc\n', 'lists: Shift+Enter is a plain new line');
    await p.fill('#sh-objective', ''); check(await typeIn('sh-objective', ['plain text', 'Enter']) === 'plain text\n', 'lists: a line that is not a list item gets a plain new line');
    check(await p.evaluate(() => { const t = document.getElementById('sh-steps'); return t.selectionStart === t.value.length; }), 'lists: the caret is at the end after continuing');
    await p.context().close();
  }

  // ---- Quick picks.
  {
    const p = await openSheet('?theme=light&open=1');
    const state = () => p.evaluate(() => ({ text: document.getElementById('sh-kind').value, on: [...document.querySelectorAll('.pick')].filter(b => b.getAttribute('aria-pressed') === 'true').map(b => b.dataset.pick) }));
    await p.click('.pick[data-pick="Repair"]'); let s = await state(); check(s.text === 'Repair' && s.on.join() === 'Repair', 'quick picks: a chip adds its value and shows it pressed', JSON.stringify(s));
    await p.click('.pick[data-pick="Inspection"]'); s = await state(); check(s.text === 'Repair, Inspection', 'quick picks: a second chip adds to the text', JSON.stringify(s));
    await p.click('.pick[data-pick="Repair"]'); s = await state(); check(s.text === 'Inspection' && s.on.join() === 'Inspection', 'quick picks: pressing a pressed chip removes its value', JSON.stringify(s));
    await p.fill('#sh-kind', 'Calibration, then a free note'); s = await state(); check(s.on.join() === 'Calibration' || s.on.length === 0, 'quick picks: the text stays free, and chips follow what is written', JSON.stringify(s));
    await p.fill('#sh-kind', 'Review'); s = await state(); check(s.on.join() === 'Review', 'quick picks: typing a value presses its chip', JSON.stringify(s));
    await p.context().close();
  }

  // ---- Focus: a 2px bar on the part's inner edge, drawn as a real border; the highlighted part gets the standard ring.
  for (const [name, q] of [['light', '?theme=light&open=1'], ['dark', '?theme=dark&open=1'], ['outdoor', '?theme=outdoor&open=1']]) {
    const p = await openSheet(q);
    const probe = async key => { return p.evaluate(k => {
      const t = document.getElementById('sh-' + k), part = t.closest('.part'), body = part.querySelector('.part__body'), label = part.querySelector('.part__label'), cs = e => getComputedStyle(e);
      const before = t.getBoundingClientRect().left; t.focus(); const after = t.getBoundingClientRect().left;
      const parse = c => c.match(/[\d.]+/g).map(Number), lin = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }, L = c => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
      const ratio = (a, b) => (Math.max(L(a), L(b)) + 0.05) / (Math.min(L(a), L(b)) + 0.05), sheetBg = parse(cs(document.getElementById('sheet')).backgroundColor), insetBg = parse(cs(body).backgroundColor);
      const bar = parse(cs(body).borderInlineStartColor);
      const labelContrast = ratio(parse(cs(label).color), sheetBg);
      return { labelContrast, moved: Math.abs(after - before), barW: cs(body).borderInlineStartWidth, barStyle: cs(body).borderInlineStartStyle, shadow: cs(body).boxShadow, label: cs(label).color, outline: cs(body).outlineWidth + ' ' + cs(body).outlineStyle, highlight: part.classList.contains('part--highlight'), contrast: ratio(bar, part.classList.contains('part--highlight') ? insetBg : sheetBg), info: getComputedStyle(document.documentElement).getPropertyValue('--state-info-text') };
    }, key); };
    const rows = {}; for (const k of PARTS) rows[k] = await probe(k);
    const normal = PARTS.filter(k => k !== 'handover');
    check(normal.every(k => rows[k].barW === '2px' && rows[k].barStyle === 'solid' && rows[k].shadow === 'none'), `${name}: focus draws a 2px solid bar as a border, not a shadow`, JSON.stringify(rows.findings));
    check(normal.every(k => rows[k].moved < 0.5), `${name}: the text does not move when the bar appears`, normal.map(k => rows[k].moved).join(','));
    check(Object.values(rows).every(r => r.contrast >= (name === 'outdoor' ? 4.5 : 3)), `${name}: the bar reaches ${name === 'outdoor' ? 4.5 : 3}:1 against what it sits on`, Object.values(rows).map(r => r.contrast.toFixed(2)).join(','));
    check(Object.values(rows).every(r => r.labelContrast >= (name === 'outdoor' ? 7 : 4.5)), `${name}: the focused label's own colour reaches ${name === 'outdoor' ? 7 : 4.5}:1 on the sheet`, Object.values(rows).map(r => r.labelContrast.toFixed(2)).join(','));
    check(rows.handover.barW === '3px' && rows.handover.outline === '2px solid' && rows.handover.shadow === 'none', `${name}: the highlighted part keeps its 3px bar and gets the standard 2px ring when focused`, JSON.stringify(rows.handover));
    check(rows.findings.label !== (await p.evaluate(() => { document.getElementById('sh-subject').focus(); return getComputedStyle(document.querySelector('#sh-findings').closest('.part').querySelector('.part__label')).color; })), `${name}: the focused part's label changes colour too, so focus is shape and colour`);
    await p.context().close();
  }
  {
    const p = await openSheet('?theme=light&open=1', { forcedColors: 'active' });
    const f = await p.evaluate(() => { const out = {}; for (const k of ['findings', 'handover', 'subject']) { const t = document.getElementById('sh-' + k), body = t.closest('.part').querySelector('.part__body'); t.focus(); const cs = getComputedStyle(body); out[k] = { bar: cs.borderInlineStartWidth + ' ' + cs.borderInlineStartStyle, outline: cs.outlineWidth + ' ' + cs.outlineStyle, color: cs.borderInlineStartColor }; } return out; });
    check(f.findings.bar === '2px solid' && f.subject.bar === '2px solid', 'forced colors: the focus bar is a real border, so it is still drawn', JSON.stringify(f));
    check(f.handover.bar === '3px solid' && f.handover.outline === '2px solid', 'forced colors: the highlighted part keeps its bar and its focus ring');
    const hl = await p.evaluate(() => { const b = document.querySelector('.part--highlight .part__body'); return { bar: getComputedStyle(b).borderInlineStartWidth, style: getComputedStyle(b).borderInlineStartStyle }; });
    check(hl.bar === '3px' && hl.style === 'solid', 'forced colors: the highlighted part is marked by its border when the tint is dropped', JSON.stringify(hl));
    await p.context().close();
  }

  // ---- Secondary fields and validation.
  {
    const p = await openSheet('?theme=light&open=1');
    await p.click('#reveal-title');
    check(await p.evaluate(() => !document.getElementById('title-wrap').hidden && document.getElementById('reveal-title').hidden && document.activeElement.id === 'sh-title' && document.getElementById('panel').contains(document.activeElement)), 'secondary fields: the link reveals its field and focus moves into it, still inside the panel');
    await p.click('#reveal-files');
    check(await p.evaluate(() => !document.getElementById('files-wrap').hidden && document.activeElement.id === 'sh-files' && document.getElementById('panel').contains(document.activeElement)), 'secondary fields: attaching a file moves focus into the file field');
    await p.click('#submit');
    let v = await p.evaluate(() => ({ active: document.activeElement.id, bar: document.getElementById('bar-errors').textContent, sub: document.getElementById('err-subject').textContent, invalid: document.getElementById('sh-subject').getAttribute('aria-invalid'), described: document.getElementById('sh-subject').getAttribute('aria-describedby') }));
    check(v.active === 'asset-btn' && v.bar === 'Choose an asset.' && v.sub === 'Give the entry a subject.', 'validation: submitting names every problem and moves focus to the first one in reading order (the setup bar)', JSON.stringify(v));
    check(v.invalid === 'true' && v.described === 'err-subject', 'validation: an invalid field is aria-invalid and described by its error');
    const err = await p.evaluate(() => { const e = document.getElementById('err-subject'), s = document.getElementById('sh-subject'); return { c: getComputedStyle(e).color, edge: getComputedStyle(s).borderBottomColor, danger: getComputedStyle(document.documentElement).getPropertyValue('--color-danger-text'), mark: getComputedStyle(document.documentElement).getPropertyValue('--state-error-mark') }; });
    check(err.c === 'rgb(154, 74, 61)' && err.edge === 'rgb(184, 95, 82)', 'validation: the error is in danger text and the control edge turns coral', JSON.stringify(err));
    await p.click('#asset-btn'); await p.click('#asset-menu .pill[data-id="inverter-2"]'); await p.click('#submit');
    v = await p.evaluate(() => ({ active: document.activeElement.id, bar: document.getElementById('bar-errors').hidden }));
    check(v.active === 'sh-subject' && v.bar, 'validation: with the setup fixed, focus goes to the first invalid field of the sheet', JSON.stringify(v));
    await p.fill('#sh-subject', 'x'); check(await p.evaluate(() => document.getElementById('err-subject').hidden), 'validation: the error clears as soon as the field is fixed');
    await p.fill('#hours', '30'); await p.click('#submit'); check(await p.evaluate(() => document.getElementById('bar-errors').textContent) === 'Hours must be a number up to 24.', 'validation: hours above 24 are refused with a reason');
    await p.fill('#hours', '2,5x'); check(await val(p, '#hours') === '2.5', 'hours: a comma becomes a point and anything else is dropped');
    await p.fill('#sh-subject', 'y'.repeat(70)); const c70 = await p.evaluate(() => ({ t: document.getElementById('cnt-subject').textContent, h: document.getElementById('cnt-subject').hidden }));
    check(!c70.h && c70.t === '70/80', 'counter: appears near the limit, and only then', JSON.stringify(c70));
    await p.fill('#sh-subject', 'y'.repeat(20)); check(await p.evaluate(() => document.getElementById('cnt-subject').hidden), 'counter: not shown far from the limit');
    await p.fill('#sh-subject', 'y'.repeat(90)); await p.click('#submit'); check(await p.evaluate(() => document.getElementById('err-subject').textContent) === '80 characters at most.', 'validation: a subject over 80 characters is refused');
    await p.fill('#sh-subject', 'ok'); await p.fill('#sh-findings', 'z'.repeat(1600)); await p.click('#submit');
    check(await p.evaluate(() => document.getElementById('err-findings').textContent) === '1500 characters at most.' && await p.evaluate(() => document.activeElement.id) === 'sh-findings', 'validation: a part over 1500 characters is refused and takes focus');
    await p.fill('#sh-findings', ''); const pr0 = await p.evaluate(() => document.getElementById('progress').textContent);
    await p.fill('#sh-findings', '   '); const prWs = await p.evaluate(() => document.getElementById('progress').textContent);
    await p.fill('#sh-findings', 'seen'); const pr1 = await p.evaluate(() => document.getElementById('progress').textContent);
    check(pr0 === '0 of 6 parts filled, all optional' && prWs === pr0 && pr1 === '1 of 6 parts filled, all optional', 'progress: one line, counting only parts with writing in them, instead of "optional" on every part', JSON.stringify([pr0, prWs, pr1]));
    await p.context().close();
  }

  // ---- The setup bar and its menus.
  {
    const p = await openSheet('?theme=light&open=1');
    const tops = await p.evaluate(() => ['#asset-btn', '#crew', '#date-btn', '#hours-wrap'].map(s => Math.round(document.querySelector(s).getBoundingClientRect().top)));
    check(new Set(tops).size === 1, 'setup bar: asset, crew, date and hours fit one row', tops.join(','));
    await p.click('#asset-btn');
    let m = await p.evaluate(() => ({ exp: document.getElementById('asset-btn').getAttribute('aria-expanded'), groups: [...document.querySelectorAll('#asset-menu [role="group"]')].map(g => g.getAttribute('aria-label')), search: !!document.getElementById('asset-search'), active: document.activeElement.id }));
    check(m.exp === 'true' && m.groups.join() === 'Casablanca DC,Rabat lab,Tangier plant' && m.search && m.active === 'asset-search', 'asset menu: a list grouped by site, with a filter that takes focus because there are more than eight assets', JSON.stringify(m));
    await p.keyboard.type('pump');
    m = await p.evaluate(() => ({ groups: [...document.querySelectorAll('#asset-menu [role="group"]')].map(g => g.getAttribute('aria-label')), items: [...document.querySelectorAll('#asset-menu .pill')].map(b => b.textContent) }));
    check(m.groups.join() === 'Rabat lab' && m.items.join() === 'Heat pump 1,Heat pump 2,Recovery pump', 'asset menu: the filter narrows the list and drops empty groups', JSON.stringify(m));
    await p.keyboard.press('Enter');
    check(await p.evaluate(() => document.getElementById('asset-text').textContent) === 'Heat pump 1' && await p.evaluate(() => document.getElementById('asset-menu').hidden), 'asset menu: Enter picks the first match and closes the menu');
    await p.click('#asset-btn'); await p.keyboard.press('Escape');
    const esc = await p.evaluate(() => ({ menu: document.getElementById('asset-menu').hidden, panel: !document.getElementById('backdrop').hidden, active: document.activeElement.id }));
    check(esc.menu && esc.panel && esc.active === 'asset-btn', 'Escape closes the menu first: the panel stays open and focus returns to the button', JSON.stringify(esc));
    await p.click('#date-btn');
    const cal = await p.evaluate(() => ({ exp: document.getElementById('date-btn').getAttribute('aria-expanded'), title: document.querySelector('#date-menu strong').textContent, pressed: document.querySelector('#date-menu .cal__day[aria-pressed="true"]')?.dataset.ymd, active: document.activeElement.dataset.ymd, today: document.querySelector('#date-menu [data-today]')?.dataset.ymd }));
    check(cal.exp === 'true' && cal.title === 'November 2026' && cal.pressed === '2026-11-17' && cal.active === '2026-11-17' && cal.today === '2026-11-17', 'date menu: opens on the month of the date, with the date selected and focused', JSON.stringify(cal));
    await p.keyboard.press('ArrowRight'); await p.keyboard.press('ArrowDown');
    check(await p.evaluate(() => document.activeElement.dataset.ymd) === '2026-11-25', 'date menu: arrow keys move by a day and by a week', await p.evaluate(() => document.activeElement.dataset.ymd));
    await p.keyboard.press('ArrowDown'); await p.keyboard.press('ArrowDown');
    check(await p.evaluate(() => document.activeElement.dataset.ymd) === '2026-12-09' && await p.evaluate(() => document.querySelector('#date-menu strong').textContent) === 'December 2026', 'date menu: moving past the end of the month turns the page');
    await p.keyboard.press('Enter');
    check(await p.evaluate(() => document.getElementById('date-text').textContent) === 'Wed 9 Dec' && await p.evaluate(() => document.getElementById('date-menu').hidden), 'date menu: Enter picks the day and closes the menu');
    await p.click('#date-btn'); check(await p.evaluate(() => !document.getElementById('date-menu').hidden), 'date menu: reopens');
    await p.mouse.click(700, 500);
    check(await p.evaluate(() => document.getElementById('date-menu').hidden), 'a click outside the setup bar closes an open menu');
    await p.click('#status button[data-v="partial"]'); await p.keyboard.press('ArrowRight');
    check(await p.evaluate(() => [...document.querySelectorAll('#status button')].map(b => b.getAttribute('aria-checked')).join()) === 'false,false,true', 'status: a radio group; the arrow keys move through it');
    await p.keyboard.press('ArrowRight'); check(await p.evaluate(() => document.querySelector('#status [aria-checked="true"]').dataset.v) === 'planned', 'status: and wrap around');
    await p.context().close();
  }
  {
    // The calendar marks days that already have entries for the chosen asset.
    const p = await openSheet('?theme=light&open=1');
    await p.click('#asset-btn'); await p.click('#asset-menu .pill[data-id="inverter-2"]'); await p.click('#date-btn');
    const m = await p.evaluate(() => { const b = document.querySelector('#date-menu .cal__day[data-ymd="2026-11-17"]'), o = document.querySelector('#date-menu .cal__day[data-ymd="2026-11-18"]'); return { mark: b.hasAttribute('data-mark'), label: b.getAttribute('aria-label'), other: o.hasAttribute('data-mark') }; });
    check(m.mark && m.label === 'Tuesday 17 November. 1 entry for this asset that day' && !m.other, 'date menu: a day that already has an entry for this asset is marked, and the mark is described in words', JSON.stringify(m));
    await p.context().close();
  }

  // ---- The workspace: modality, focus, keys, saving.
  {
    const p = await openSheet('?theme=light');
    await p.evaluate(() => { window.__keys = 0; document.addEventListener('keydown', () => { window.__keys++; }); });
    check(await p.evaluate(() => document.getElementById('backdrop').hidden), 'workspace: closed to begin with');
    await p.click('#new');
    let w = await p.evaluate(() => { const pn = document.getElementById('panel'); return { open: !document.getElementById('backdrop').hidden, inert: document.getElementById('app').inert, active: document.activeElement.id, role: pn.getAttribute('role'), modal: pn.getAttribute('aria-modal'), labelled: document.getElementById(pn.getAttribute('aria-labelledby')).textContent, w: pn.getBoundingClientRect().width, right: innerWidth - pn.getBoundingClientRect().right }; });
    check(w.open && w.inert && w.active === 'sh-subject' && w.role === 'dialog' && w.modal === 'true' && w.labelled === 'New entry', 'workspace: a labelled modal side panel; the screen behind it is inert and focus starts on the subject', JSON.stringify(w));
    check(w.w === 1240 && w.right === 0, 'workspace: up to 1240px wide, against the inline end of the screen', JSON.stringify([w.w, w.right]));
    // Tab stays inside.
    const trap = await p.evaluate(() => { const panel = document.getElementById('panel'); const f = [...panel.querySelectorAll('a[href], button, input, textarea, select, [tabindex="0"]')].filter(e => !e.disabled && !e.closest('[hidden]') && e.tabIndex >= 0 && e.getClientRects().length); f[f.length - 1].focus(); return { first: f[0].id || f[0].textContent, last: f[f.length - 1].id }; });
    await p.keyboard.press('Tab'); const afterTab = await p.evaluate(() => document.activeElement.id || document.activeElement.textContent);
    check(afterTab === trap.first, 'workspace: Tab from the last control wraps to the first', JSON.stringify([trap, afterTab]));
    await p.keyboard.press('Shift+Tab'); check(await p.evaluate(() => document.activeElement.id) === trap.last, 'workspace: Shift+Tab from the first wraps to the last');
    // Keys typed inside do not reach the screen.
    await p.focus('#sh-objective'); const k0 = await p.evaluate(() => window.__keys); await p.keyboard.type('n then more'); const k1 = await p.evaluate(() => window.__keys);
    check(k1 === k0 && await p.evaluate(() => [...document.querySelectorAll('#panel')].length) === 1, 'workspace: keys typed in the panel never reach the screen, so the "n" shortcut does not open a second panel', `${k0} -> ${k1}`);
    check(await p.evaluate(() => { const e = new KeyboardEvent('keydown', { key: 'p', ctrlKey: true, bubbles: true, cancelable: true }); document.getElementById('sh-objective').dispatchEvent(e); return e.defaultPrevented; }), 'workspace: Ctrl+P is held back, because printing the form itself would make no sense');
    await p.fill('#sh-objective', '');
    await p.keyboard.press('Escape');
    const closed = await p.evaluate(() => ({ hidden: document.getElementById('backdrop').hidden, inert: document.getElementById('app').inert, active: document.activeElement.id, draft: localStorage.getItem('ra.sheet.draft.v1') }));
    check(closed.hidden && !closed.inert && closed.active === 'new' && closed.draft === null, 'workspace: Escape closes a clean panel, returns focus to the button that opened it and keeps no draft', JSON.stringify(closed));
    await p.keyboard.press('n'); check(await p.evaluate(() => !document.getElementById('backdrop').hidden && document.activeElement.id === 'sh-subject'), 'workspace: the "n" shortcut opens it from the screen');
    await p.keyboard.press('Escape');
    // Save with Ctrl+S.
    await p.click('#new'); await p.click('#asset-btn'); await p.click('#asset-menu .pill[data-id="heat-pump-1"]'); await p.fill('#sh-subject', 'Bearing noise check'); await p.fill('#sh-findings', 'Quiet at idle, slight hum under load.'); await p.fill('#crew', 'Mechanical'); await p.fill('#hours', '1.5'); await p.click('#status button[data-v="done"]');
    await p.focus('#sh-findings'); await p.keyboard.press('Control+s');
    const saved = await p.evaluate(() => ({ hidden: document.getElementById('backdrop').hidden, say: document.getElementById('say').textContent, lines: [...document.querySelectorAll('.line')].length, active: document.activeElement.querySelector?.('.line__subject')?.textContent, selected: document.activeElement.getAttribute?.('aria-selected'), pane: document.querySelector('#pane h3')?.textContent, draft: localStorage.getItem('ra.sheet.draft.v1'), first: document.querySelector('.page-sheet .line .line__subject').textContent }));
    check(saved.hidden && saved.say === 'Entry created.' && saved.lines === 6 && saved.active === 'Bearing noise check' && saved.selected === 'true' && saved.pane === 'Bearing noise check' && saved.draft === null, 'workspace: Ctrl+S creates the entry, announces it, closes the panel, selects the new line, focuses it and shows it in the pane', JSON.stringify(saved));
    await p.context().close();
  }

  // ---- Drafts: kept on this device, offered back, and a confirmation before an edit is discarded.
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
    const p = await ctx.newPage(); await p.goto(surl('?theme=light')); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300);
    await p.click('#new'); await p.fill('#sh-subject', 'Unfinished work'); await p.fill('#sh-steps', '1. Isolate the pump'); await p.waitForTimeout(450);
    check(await p.evaluate(() => JSON.parse(localStorage.getItem('ra.sheet.draft.v1')).subject) === 'Unfinished work', 'drafts: an unfinished entry is written to the device while it is being written');
    await p.keyboard.press('Escape');
    check(await p.evaluate(() => document.getElementById('backdrop').hidden && document.getElementById('say').textContent === 'Draft kept on this device.'), 'drafts: closing a dirty new entry keeps the draft and says so, without asking');
    await p.reload(); await p.evaluate(() => document.fonts.ready); await p.click('#new');
    const back = await p.evaluate(() => ({ banner: !document.getElementById('restored').hidden, subject: document.getElementById('sh-subject').value, steps: document.getElementById('sh-steps').value, h: document.getElementById('sh-steps').getBoundingClientRect().height }));
    check(back.banner && back.subject === 'Unfinished work' && back.steps === '1. Isolate the pump', 'drafts: reopening offers the draft back, with a banner', JSON.stringify(back));
    await p.click('#restart');
    const fresh = await p.evaluate(() => ({ banner: document.getElementById('restored').hidden, subject: document.getElementById('sh-subject').value, steps: document.getElementById('sh-steps').value, draft: localStorage.getItem('ra.sheet.draft.v1'), active: document.activeElement.id }));
    check(fresh.banner && fresh.subject === '' && fresh.steps === '' && fresh.draft === null && fresh.active === 'sh-subject', 'drafts: "Start over" empties the sheet and the stored draft, and focus goes back to the subject', JSON.stringify(fresh));
    await p.keyboard.press('Escape');
    // Edit mode.
    await p.click('.line[data-id="e1"]'); await p.click('#edit');
    const ed = await p.evaluate(() => ({ title: document.getElementById('panel-title').textContent, subject: document.getElementById('sh-subject').value, asset: document.getElementById('asset-text').textContent, submit: document.getElementById('submit').textContent, handover: document.getElementById('sh-handover').value }));
    check(ed.title === 'Edit entry' && ed.subject === 'Filter change and thermal check' && ed.asset === 'Inverter 2' && ed.submit === 'Save' && ed.handover.startsWith('Check the heat sink'), 'edit: the pane opens the same workspace with the entry in it', JSON.stringify(ed));
    await p.keyboard.press('Escape'); check(await p.evaluate(() => document.getElementById('backdrop').hidden && document.getElementById('confirm-bd').hidden), 'edit: closing an unchanged entry asks nothing');
    await p.click('#edit'); await p.fill('#sh-subject', 'Changed subject'); await p.keyboard.press('Escape');
    let cf = await p.evaluate(() => ({ dlg: !document.getElementById('confirm-bd').hidden, active: document.activeElement.id, role: document.getElementById('confirm').getAttribute('role'), modal: document.getElementById('confirm').getAttribute('aria-modal'), title: document.getElementById('confirm-t').textContent }));
    check(cf.dlg && cf.active === 'confirm-keep' && cf.role === 'alertdialog' && cf.modal === 'true', 'edit: leaving a changed entry asks first, in a dialog that starts on the safest answer', JSON.stringify(cf));
    await p.keyboard.press('Tab'); check(await p.evaluate(() => document.activeElement.id) === 'confirm-discard', 'edit: Tab moves to the other answer');
    await p.keyboard.press('Tab'); check(await p.evaluate(() => document.activeElement.id) === 'confirm-keep', 'edit: and wraps inside the dialog');
    await p.keyboard.press('Escape');
    check(await p.evaluate(() => document.getElementById('confirm-bd').hidden && !document.getElementById('backdrop').hidden && document.activeElement.id === 'sh-subject' && document.getElementById('sh-subject').value === 'Changed subject'), 'edit: Escape in the dialog means keep editing, with the changes intact');
    await p.keyboard.press('Escape'); await p.click('#confirm-discard');
    check(await p.evaluate(() => document.getElementById('backdrop').hidden && document.querySelector('.line[data-id="e1"] .line__subject').textContent === 'Filter change and thermal check'), 'edit: Discard closes the panel and the entry is unchanged');
    await p.click('#edit'); await p.fill('#sh-subject', 'Filter change, thermal check and photo'); await p.keyboard.press('Control+s');
    check(await p.evaluate(() => document.getElementById('say').textContent) === 'Entry saved.', 'edit: Ctrl+S saves the change and announces it');
    check(await p.evaluate(() => document.querySelector('.line[data-id="e1"] .line__subject').textContent) === 'Filter change, thermal check and photo', 'edit: the line shows the new subject');
    await ctx.close();
  }

  // ---- Reading: pages of fixed-height ruled lines, operable from the keyboard, with the full text in a pane.
  {
    const p = await openSheet('?theme=light');
    const r = await p.evaluate(() => {
      const lines = [...document.querySelectorAll('.line')], cs = (e, k) => getComputedStyle(e)[k], pages = [...document.querySelectorAll('.page-sheet')];
      return { n: lines.length, heights: [...new Set(lines.map(l => Math.round(l.getBoundingClientRect().height)))], pages: pages.map(g => g.querySelector('h3').textContent), today: !!pages[0].querySelector('.chip--today'), role: document.getElementById('pages').getAttribute('role'), opts: lines.every(l => l.getAttribute('role') === 'option'), stops: lines.filter(l => l.tabIndex === 0).length, cols: cs(lines[0], 'gridTemplateColumns'), subj: { o: cs(lines[0].querySelector('.line__subject'), 'textOverflow'), w: cs(lines[0].querySelector('.line__subject'), 'whiteSpace') },
        chips: lines.map(l => ({ text: l.querySelector('.chip').textContent.trim(), mark: !!l.querySelector('.chip .mark') })), margin: cs(lines[0].querySelector('.line__margin'), 'borderInlineEndWidth') };
    });
    check(r.n === 5 && r.heights.join() === '56', 'reading: five entries, every line exactly 56px tall', JSON.stringify([r.n, r.heights]));
    check(r.pages.join() === 'Tuesday 17 November,Monday 16 November' && r.today, 'reading: one page per day, newest first, today marked', JSON.stringify(r.pages));
    check(r.role === 'listbox' && r.opts && r.stops === 1, 'reading: a listbox of options with a single tab stop, so the lines are reachable and operable from the keyboard', JSON.stringify([r.role, r.opts, r.stops]));
    check(r.cols.startsWith('150px') && r.margin === '1px', 'reading: the margin is 150px with its rule', JSON.stringify([r.cols, r.margin]));
    check(r.subj.o === 'ellipsis' && r.subj.w === 'nowrap', 'reading: a long subject is cut with an ellipsis, never wrapped');
    check(r.chips.every(c => c.text.length > 3) && r.chips.filter(c => c.mark).length === 4, 'reading: each line ends with its state as a text label, and a mark for Partial and Done', JSON.stringify(r.chips));
    await p.focus('.line[tabindex="0"]'); await p.keyboard.press('ArrowDown'); await p.keyboard.press('ArrowDown');
    check(await p.evaluate(() => document.activeElement.dataset.id) === 'e3' && await p.evaluate(() => document.querySelectorAll('.line[tabindex="0"]').length) === 1, 'reading: arrow keys move through the lines across pages and keep one tab stop');
    await p.keyboard.press('ArrowDown'); check(await p.evaluate(() => document.activeElement.dataset.id) === 'e4', 'reading: the next page continues the list');
    await p.keyboard.press('End'); check(await p.evaluate(() => document.activeElement.dataset.id) === 'e5', 'reading: End goes to the last line'); await p.keyboard.press('Home'); check(await p.evaluate(() => document.activeElement.dataset.id) === 'e1', 'reading: Home goes to the first');
    const before = await p.evaluate(() => [...document.querySelectorAll('.line')].map(l => l.getBoundingClientRect().height));
    await p.keyboard.press('Enter');
    const after = await p.evaluate(() => ({ h: [...document.querySelectorAll('.line')].map(l => l.getBoundingClientRect().height), sel: [...document.querySelectorAll('.line[aria-selected="true"]')].map(l => l.dataset.id), bar: getComputedStyle(document.querySelector('.line[aria-selected="true"]')).borderInlineStartWidth, pane: document.querySelector('#pane h3').textContent, dts: [...document.querySelectorAll('#pane dt')].map(d => d.textContent), dd: document.querySelector('#pane dd').textContent, focus: document.activeElement.dataset.id }));
    check(JSON.stringify(after.h) === JSON.stringify(before), 'reading: selecting a line never changes any line\'s height; the full text opens in the pane', `${before.join()} / ${after.h.join()}`);
    check(after.sel.join() === 'e1' && after.bar === '3px' && after.pane === 'Filter change and thermal check' && after.focus === 'e1', 'reading: Enter selects one line, with the 3px bar, and keeps focus on it', JSON.stringify(after));
    check(after.dts.join() === 'Objective,Type,Findings,Steps,Parts and tools,For the next shift', 'reading: the pane lists only the parts that were written, in order', JSON.stringify(after.dts));
    await p.click('.line[data-id="e3"]'); const e3 = await p.evaluate(() => [...document.querySelectorAll('#pane dt')].map(d => d.textContent));
    check(e3.join() === 'Objective,Type', 'reading: a sparse entry shows only what it has', JSON.stringify(e3));
    await p.dblclick('.line[data-id="e2"]'); check(await p.evaluate(() => !document.getElementById('backdrop').hidden && document.getElementById('sh-subject').value === 'String 04 insulation test'), 'reading: a double click opens the entry for editing');
    await p.context().close();
  }

  // ---- Print: the pages of a paper log, ready for a signature, with colour dropped.
  for (const [name, q] of [['light', '?theme=light'], ['dark', '?theme=dark']]) {
    const p = await openSheet(q, {}, 'print');
    const pr = await p.evaluate(() => {
      const sheet = document.getElementById('print-sheet'), all = [sheet, ...sheet.querySelectorAll('*')], cs = e => getComputedStyle(e);
      const parse = c => c.match(/[\d.]+/g).map(Number), lin = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }, L = c => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
      const bgs = all.map(e => cs(e).backgroundColor).filter(c => !/^rgba\(0, 0, 0, 0\)$/.test(c) && c !== 'rgb(255, 255, 255)'), darkText = all.filter(e => e.children.length === 0 && e.textContent.trim()).map(e => L(parse(cs(e).color))).filter(l => l > 0.2);
      const visible = [...document.body.children].filter(c => cs(c).display !== 'none').map(c => c.id || c.tagName);
      return { shown: cs(sheet).display, visible, bgs, lightText: darkText.length, shadows: all.filter(e => cs(e).boxShadow !== 'none').length, bodyBg: cs(document.body).backgroundColor, htmlBg: cs(document.documentElement).backgroundColor,
        entries: sheet.querySelectorAll('.ps-entry').length, avoid: [...sheet.querySelectorAll('.ps-entry')].every(e => cs(e).breakInside === 'avoid'), days: [...sheet.querySelectorAll('.ps-date')].map(d => d.textContent), box: (() => { const b = sheet.querySelector('.ps-visa__box').getBoundingClientRect(); return { w: Math.round(b.width), h: Math.round(b.height), border: cs(sheet.querySelector('.ps-visa__box')).borderTopWidth }; })(), visa: sheet.querySelector('.ps-visa').textContent.trim(), head: sheet.querySelector('.ps-title').textContent };
    });
    check(pr.shown === 'block' && pr.visible.join() === 'print-sheet', `print (${name}): only the print sheet is shown; the screen is left out`, JSON.stringify(pr.visible));
    check(pr.bgs.length === 0 && pr.lightText === 0 && pr.shadows === 0 && pr.bodyBg === 'rgb(255, 255, 255)' && pr.htmlBg === 'rgb(255, 255, 255)', `print (${name}): colour drops out: no tints, near-black text, no shadows, white paper, whatever the screen theme`, JSON.stringify([pr.bgs.slice(0, 3), pr.lightText, pr.shadows, pr.bodyBg]));
    check(pr.entries === 5 && pr.avoid && pr.days.join() === 'Monday 16 November,Tuesday 17 November', `print (${name}): every entry, oldest day first, and each avoids a page break`, JSON.stringify([pr.entries, pr.avoid, pr.days]));
    check(pr.visa === 'Approved by' && pr.box.w >= 262 && pr.box.w <= 266 && pr.box.h >= 90 && pr.box.border === '1px', `print (${name}): the sheet ends with a signature box about 70mm by 24mm`, JSON.stringify(pr.box));
    await p.context().close();
  }
  {
    const p = await openSheet('?theme=light');
    check(await p.evaluate(() => getComputedStyle(document.getElementById('print-sheet')).display) === 'none', 'print: the print sheet is not on the screen');
    await p.context().close();
  }

  // ---- Density: the page is a notebook line, the controls around it follow the density.
  const dens = {};
  for (const d of ['comfortable', 'compact', 'touch']) {
    const p = await openSheet(`?theme=light&open=1&density=${d}`);
    dens[d] = await p.evaluate(() => {
      const els = [...document.querySelectorAll('#panel .segmented button, #panel .icon-btn, #panel .bar-btn, #panel .bar-field, #panel .bar-hours, #panel .pick, #panel .link-btn, #panel .btn')].filter(e => !e.closest('[hidden]') && e.getClientRects().length);
      const t = document.getElementById('sh-findings'), cs = getComputedStyle(t);
      return { min: Math.round(Math.min(...els.map(e => e.getBoundingClientRect().height))), n: els.length, line: cs.lineHeight, font: cs.fontSize, h: Math.round(t.getBoundingClientRect().height), pick: Math.round(document.querySelector('.pick').getBoundingClientRect().height), sideways: document.getElementById('page').scrollWidth - document.getElementById('page').clientWidth };
    });
    await p.context().close();
  }
  check(dens.comfortable.min >= 36 && dens.compact.min >= 28 && dens.touch.min >= 44, 'density: every control in the workspace is at least 36px (comfortable), 28px (compact) and 44px (touch)', JSON.stringify([dens.comfortable.min, dens.compact.min, dens.touch.min]));
  check(dens.compact.min >= 24, 'density: compact never goes below the 24px minimum');
  check(Object.values(dens).every(x => x.line === '28px' && x.font === '15px' && x.h === 112), 'density: the line pitch, text size and part height do not change with the density', JSON.stringify(Object.values(dens).map(x => [x.line, x.font, x.h])));
  check(dens.comfortable.pick === 36 && dens.compact.pick === 28 && dens.touch.pick === 44, 'density: quick-pick chips follow the control height', JSON.stringify([dens.comfortable.pick, dens.compact.pick, dens.touch.pick]));

  // ---- Direction and reflow.
  {
    const p = await openSheet('?theme=light&open=1&dir=rtl');
    await p.fill('#sh-findings', 'ملاحظات'); await p.focus('#sh-findings');
    const r = await p.evaluate(() => { const part = document.getElementById('sh-findings').closest('.part'), label = part.querySelector('.part__label'), body = part.querySelector('.part__body'), cs = e => getComputedStyle(e), panel = document.getElementById('panel').getBoundingClientRect(); const hl = document.querySelector('.part--highlight .part__body'); return { labelRight: label.getBoundingClientRect().left > body.getBoundingClientRect().left, rule: cs(label).borderLeftWidth + '/' + cs(label).borderRightWidth, bar: cs(body).borderRightWidth + '/' + cs(body).borderLeftWidth, hl: cs(hl).borderRightWidth + '/' + cs(hl).borderLeftWidth, panelLeft: Math.round(panel.left), sideways: document.documentElement.scrollWidth - document.documentElement.clientWidth, align: cs(label).textAlign, h: Math.round(document.getElementById('sh-findings').getBoundingClientRect().height) }; });
    check(r.labelRight && r.rule === '1px/0px', 'right to left: the margin moves to the right with its rule on the inner side', JSON.stringify(r));
    check(r.bar === '2px/0px' && r.hl === '3px/0px', 'right to left: the focus bar and the highlight bar move to the right edge', JSON.stringify([r.bar, r.hl]));
    check(r.panelLeft === 0 && r.sideways <= 0, 'right to left: the panel opens from the left, the inline end, and nothing scrolls sideways', JSON.stringify([r.panelLeft, r.sideways]));
    await p.close();
    const q = await openSheet('?theme=light&dir=rtl'); await q.click('.line[data-id="e1"]');
    const l = await q.evaluate(() => { const li = document.querySelector('.line[data-id="e1"]'), m = li.querySelector('.line__margin').getBoundingClientRect(), b = li.querySelector('.line__body').getBoundingClientRect(), cs = getComputedStyle(li); return { marginRight: m.left > b.left, bar: cs.borderRightWidth + '/' + cs.borderLeftWidth }; });
    check(l.marginRight && l.bar === '3px/0px', 'right to left: a reading line puts its margin on the right and its selection bar on the right', JSON.stringify(l));
    await q.context().close();
  }
  {
    const p = await openSheet('?theme=light&open=1', { viewport: { width: 720, height: 900 } });
    const z = await p.evaluate(() => ({ page: document.getElementById('page').scrollWidth - document.getElementById('page').clientWidth, doc: document.documentElement.scrollWidth - document.documentElement.clientWidth, cols: getComputedStyle(document.querySelector('.part')).gridTemplateColumns.split(' ')[0], clip: [...document.querySelectorAll('.part__label, .bar-btn, .btn, .segmented button')].filter(e => e.scrollWidth > e.clientWidth + 1).map(e => e.textContent.trim().slice(0, 20)) }));
    check(z.page <= 0 && z.doc <= 0 && z.cols === '120px' && z.clip.length === 0, 'reflow: at 200% zoom the workspace has no sideways scrolling, a 120px margin and no clipped labels', JSON.stringify(z));
    await shot(p, 'sheet-zoom-200'); await p.context().close();
  }
  for (const [file, q] of [['sheet-read', '?theme=light'], ['sheet-read-dark', '?theme=dark']]) { const p = await openSheet(q); await p.click('.line[data-id="e1"]'); await shot(p, file); await p.context().close(); }
  {
    const p = await openSheet('?theme=light&open=1'); await p.fill('#sh-subject', 'Pump seal replacement'); await p.fill('#sh-objective', 'Replace the seal and confirm there is no leak at full pressure.'); await p.click('.pick[data-pick="Repair"]'); await p.fill('#sh-steps', '1. Isolate the pump\n2. Drain the housing\n3. Replace the seal'); await p.fill('#sh-handover', 'Check for a leak again at the next start.'); await p.focus('#sh-findings');
    await p.setViewportSize({ width: 1440, height: 1300 }); await p.waitForTimeout(200); await shot(p, 'sheet-write', false); await p.context().close();
    for (const [f, q] of [['sheet-write-dark', '?theme=dark&open=1'], ['sheet-write-outdoor', '?theme=outdoor&open=1']]) { const d = await openSheet(q); await d.fill('#sh-subject', 'Pump seal replacement'); await d.fill('#sh-objective', 'Replace the seal and confirm there is no leak at full pressure.'); await d.fill('#sh-handover', 'Check for a leak again at the next start.'); await d.focus('#sh-findings'); await d.setViewportSize({ width: 1440, height: 1300 }); await d.waitForTimeout(200); await shot(d, f, false); await d.context().close(); }
  }
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
