#!/usr/bin/env node
// Opens the specimen in a real browser and checks what the token maths cannot:
// that every state is really drawn with a mark and a label, that text painted
// on the page meets its contrast target, and that the system holds up in
// forced colors, print, reduced motion, reduced transparency and 200% zoom.
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

const browser = await chromium.launch();
async function open(query, opts = {}) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, ...opts.context });
  const page = await context.newPage();
  if (opts.media) await page.emulateMedia(opts.media);
  await page.goto(page_url(query));
  await page.evaluate(() => document.fonts.ready);
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

  // Keyboard: every focusable control shows a ring at least 2px wide; targets are at least 44px.
  const focus = await page.evaluate(async () => {
    const out = [];
    for (const el of document.querySelectorAll('a[href], button, input, [tabindex="0"]')) {
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
    check(f.h >= 44, 'target is at least 44px high', `${f.name}: ${f.h}px`);
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
    return boxes.flatMap((a, i) => boxes.slice(i + 1).filter(b => Math.abs(a.top - b.top) < 4).map(b => Math.round(Math.abs(b.left - a.right)))).filter(g => g < 300);
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
      marks: [...document.querySelectorAll('.mark')].every(m => m.getBoundingClientRect().width >= 14),
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
    clipped: [...document.querySelectorAll('.state-label, .metric__value, .btn, .field__message, .reading span, h1, h2, h3')]
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
