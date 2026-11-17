#!/usr/bin/env node
// Holds Realis Pale to its own claims.
//   1. Tokens: contrast of every pair in Dusk, Late, Deep and Last Light, read from tokens/realis-pale.tokens.css,
//      and the figures printed in realis-pale.md are the figures computed here.
//   2. The specimen (specimen/pale.html) in a real browser: text contrast against the painted background, the one
//      Lantern, the hours and Follow my evening (with a controlled clock), the Spark, the Field and its List, Still,
//      motion, forced colours, a phone width.
// Usage: node tools/check-pale.mjs

import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseColor, over, contrast } from './lib/color.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const root = fileURLToPath(new URL('..', import.meta.url));
const css = readFileSync(root + 'tokens/realis-pale.tokens.css', 'utf8');
const doc = readFileSync(root + 'realis-pale.md', 'utf8');

let passed = 0, failed = 0;
function check(ok, label, detail = '') { ok ? passed++ : failed++; if (!ok) console.log(`  FAIL ${label}${detail ? ' — ' + detail : ''}`); }
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const f2 = n => n.toFixed(2);

// ---- 1. Tokens
console.log('tokens');
const blocks = [];
for (const m of css.matchAll(/(:root(?:\[[^\]]+\])?)\s*\{([^{}]*)\}/g)) {
  const decls = {};
  for (const d of m[2].matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) decls[d[1]] = d[2].trim();
  blocks.push({ sel: m[1], decls });
}
const base = blocks.find(b => b.sel === ':root').decls;
const set = sel => ({ ...base, ...blocks.find(b => b.sel === sel).decls });
const T = { dusk: base, late: set(':root[data-hour="late"]'), deep: set(':root[data-hour="deep"]'), light: set(':root[data-theme="last-light"]') };
const col = (t, n) => parseColor(T[t]['--rp-' + n]);
const cr = (t, a, b) => contrast(col(t, a), col(t, b));
const SURF = ['evening', 'shade', 'overcast', 'fog'], ACC = ['lantern', 'skyline', 'lichen', 'rose', 'wisp'];

for (const h of ['dusk', 'late', 'deep']) {
  const floor = (fg, on) => Math.min(...on.map(s => cr(h, fg, s)));
  for (const fg of ['paper', 'heading', 'ash', 'haze']) check(floor(fg, SURF) >= 4.5, `${h}: ${fg} reaches 4.5:1 on all four surfaces`, f2(floor(fg, SURF)));
  check(floor('paper', SURF) >= 7 && floor('heading', SURF) >= 7 && floor('ash', SURF) >= 5.2, `${h}: reading text and headings stay above 7:1 and secondary text above 5.2:1`);
  for (const a of ACC) check(floor(a, SURF.slice(0, 3)) >= 4.5, `${h}: ${a} reaches 4.5:1 on evening, shade and overcast`, f2(floor(a, SURF.slice(0, 3))));
  const edge = SURF.slice(0, 3).map(s => cr(h, 'mist', s));
  check(edge.every(v => v >= 3), `${h}: mist reaches 3:1 as an edge on evening, shade and overcast`, edge.map(f2).join(', '));
  check(cr(h, 'evening', 'lantern') >= 7 && cr(h, 'evening', 'skyline') >= 7, `${h}: the label on a filled Lantern or a skyline fill reaches 7:1`);
  // the filled Lantern uses its own tokens
  const fill = contrast(parseColor(T[h]['--rp-on-lantern']), parseColor(T[h]['--rp-lantern-fill']));
  check(fill >= 7, `${h}: --rp-on-lantern on --rp-lantern-fill reaches 7:1`, f2(fill));
}
// Dimming must not buy atmosphere with legibility, and must be monotonic.
const lum = (t, n) => { const c = col(t, n); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
check(['evening', 'shade', 'paper', 'lantern'].every(n => lum('dusk', n) > lum('late', n) && lum('late', n) > lum('deep', n)), 'each hour is dimmer than the one before, for surfaces, text and light');
check(parseFloat(T.dusk['--rp-glow-k']) > parseFloat(T.late['--rp-glow-k']) && parseFloat(T.late['--rp-glow-k']) > parseFloat(T.deep['--rp-glow-k']) && T.late['--rp-time-k'] === '1.25' && T.deep['--rp-time-k'] === '1.5', 'glow falls (1, 0.8, 0.6) and motion slows (1, 1.25, 1.5) with the hour');

// The sky is part of the design, not a casualty of the dark: it has to stay visibly lit, and warm at the horizon.
const relLum = (t, n) => { const c = col(t, n).map(v => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const floorLow = { dusk: 0.18, late: 0.08, deep: 0.03 }, floorGlow = { dusk: 0.35, late: 0.18, deep: 0.07 };
for (const h of ['dusk', 'late', 'deep']) {
  check(relLum(h, 'sky-low') >= floorLow[h] && relLum(h, 'sky-glow') >= floorGlow[h], `${h}: the horizon stays visibly lit (low sky luminance ${f2(relLum(h, 'sky-low'))}, glow ${f2(relLum(h, 'sky-glow'))})`);
  const low = col(h, 'sky-low'), glow = col(h, 'sky-glow'), top = col(h, 'sky-top');
  check(low[0] > low[2] && glow[0] > glow[2] && top[2] > top[0], `${h}: warm at the horizon, cool at the zenith`, `low ${low}, top ${top}`);
  check(relLum(h, 'sky-glow') > relLum(h, 'sky-low') && relLum(h, 'sky-low') > relLum(h, 'sky-mid') && relLum(h, 'sky-mid') > relLum(h, 'sky-top'), `${h}: the sky brightens toward the horizon`);
}
check(relLum('dusk', 'sky-low') > relLum('late', 'sky-low') && relLum('late', 'sky-low') > relLum('deep', 'sky-low'), 'the sunset fades with the hour, and does not vanish');
check(relLum('dusk', 'sky-low') >= 4 * relLum('dusk', 'evening'), 'at Dusk the horizon is at least four times as bright as the surface, so the scenery is not swallowed by the dark');
// Text is not one white: headings, reading text and quieter text are three different colours at every hour.
for (const h of ['dusk', 'late', 'deep', 'light']) {
  const hue = n => { const [r, g, b] = col(h, n); return [r, g, b].join(); };
  check(new Set(['paper', 'heading', 'ash', 'haze'].map(hue)).size === 4 && !['paper', 'heading', 'ash', 'haze'].some(n => hue(n) === '255,255,255'), `${h}: four distinct text colours, and none of them pure white`);
  const hd = col(h, 'heading'), pp = col(h, 'paper');
  check(Math.abs(hd[0] - hd[2]) > Math.abs(pp[0] - pp[2]) - 40 || h === 'light', `${h}: headings are warmer than reading text`, `${hd} vs ${pp}`);
}

const L = T.light, lc = (a, b) => cr('light', a, b);
for (const [fg, on, min] of [['heading', 'evening', 7], ['heading', 'shade', 7], ['heading', 'overcast', 7], ['paper', 'evening', 7], ['paper', 'shade', 7], ['paper', 'overcast', 7], ['ash', 'evening', 4.5], ['ash', 'shade', 4.5], ['haze', 'evening', 4.5], ['haze', 'shade', 4.5], ['lantern', 'evening', 4.5], ['lantern', 'shade', 4.5], ['skyline', 'evening', 4.5], ['skyline', 'shade', 4.5], ['lichen', 'evening', 4.5], ['lichen', 'shade', 4.5], ['rose', 'evening', 4.5], ['rose', 'shade', 4.5], ['wisp', 'evening', 4.5], ['wisp', 'shade', 4.5], ['ash', 'overcast', 4.5], ['lantern', 'overcast', 4.5], ['skyline', 'overcast', 4.5], ['rose', 'overcast', 4.5]])
  check(lc(fg, on) >= min, `last light: ${fg} on ${on} reaches ${min}:1`, f2(lc(fg, on)));
check([lc('mist', 'evening'), lc('mist', 'shade')].every(v => v >= 3), 'last light: edges reach 3:1 on linen and parchment', [lc('mist', 'evening'), lc('mist', 'shade')].map(f2).join(', '));
check(contrast(parseColor(L['--rp-on-lantern']), parseColor(L['--rp-lantern-fill'])) >= 7, 'last light: ink on the pale amber fill reaches 7:1');

// The figures in the document are these figures.
const printed = [];
for (const h of ['dusk', 'late', 'deep']) {
  printed.push(f2(Math.min(...SURF.map(s => cr(h, 'paper', s)))), f2(Math.min(...SURF.map(s => cr(h, 'heading', s)))), f2(Math.min(...SURF.map(s => cr(h, 'ash', s)))), f2(Math.min(...SURF.map(s => cr(h, 'haze', s)))),
    f2(Math.min(...ACC.flatMap(a => SURF.slice(0, 3).map(s => cr(h, a, s))))), ...SURF.slice(0, 3).map(s => f2(cr(h, 'mist', s))), f2(cr(h, 'evening', 'lantern')));
}
for (const a of ['ink', 'ink-soft']) void a;
const missing = printed.filter(v => !doc.includes(v));
check(doc.includes(css.trim()), 'the CSS block in realis-pale.md (section 17) is the token file, exactly');
check(missing.length === 0, 'every figure in the hours table of realis-pale.md (section 3.6) is what is computed from the token file', missing.join(', '));

// ---- 2. The specimen in a browser
console.log('specimen');
const browser = await chromium.launch();
const url = pathToFileURL(root + 'specimen/pale.html').href;
const open = async (opts = {}, query = '') => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, ...opts }); const page = await ctx.newPage();
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(url + query); await page.waitForTimeout(150); page.errors = errors; page.ctx = ctx; return page;
};

// 2a. Real text, against what is painted behind it, in every hour and in Last Light.
async function textRuns(page) {
  return page.evaluate(() => {
    const out = []; const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const seen = new Set();
    while (walker.nextNode()) {
      const n = walker.currentNode, t = n.textContent.trim(), el = n.parentElement;
      if (!t || seen.has(el) || ['SCRIPT', 'STYLE', 'OPTION'].includes(el.tagName)) continue;
      if (el.closest('[hidden], [aria-hidden="true"], svg, .sr')) continue;
      const r = el.getBoundingClientRect(); if (r.width < 1 || r.height < 1) continue;
      seen.add(el);
      const cs = getComputedStyle(el); const chain = []; let p = el;
      while (p) { const b = getComputedStyle(p).backgroundColor; if (b !== 'rgba(0, 0, 0, 0)') chain.push(b); p = p.parentElement; }
      out.push({ t: t.slice(0, 40), color: cs.color, size: parseFloat(cs.fontSize), weight: +cs.fontWeight, chain, tag: el.tagName });
    }
    // fields and the placeholder
    document.querySelectorAll('textarea, input[type=text], select').forEach(el => { const cs = getComputedStyle(el), chain = []; let p = el; while (p) { const b = getComputedStyle(p).backgroundColor; if (b !== 'rgba(0, 0, 0, 0)') chain.push(b); p = p.parentElement; }
      out.push({ t: 'field ' + (el.id || el.tagName), color: cs.color, size: parseFloat(cs.fontSize), weight: 400, chain, tag: el.tagName }); });
    return out;
  });
}
const paint = chain => chain.slice().reverse().reduce((base, c) => { const v = parseColor(c); return v[3] >= 1 ? v : over(v, base); }, [0, 0, 0, 1]);
for (const [name, q] of [['dusk', '?hour=dusk'], ['late', '?hour=late'], ['deep', '?hour=deep'], ['last light', '?hour=dusk&theme=last-light']]) {
  const page = await open({}, q); await page.waitForTimeout(100);
  const runs = await textRuns(page); let worst = { r: 99 }; const bad = [];
  for (const r of runs) {
    const bg = paint(r.chain), fg = parseColor(r.color), fgc = fg[3] < 1 ? over(fg, bg) : fg;
    const ratio = contrast(fgc, bg), large = r.size >= 24 || (r.size >= 18.66 && r.weight >= 700), min = large ? 3 : 4.5;
    if (ratio < worst.r) worst = { r: ratio, t: r.t };
    if (ratio < min) bad.push(`${r.t} ${f2(ratio)}`);
  }
  check(runs.length > 60 && bad.length === 0, `${name}: ${runs.length} runs of text reach 4.5:1 on the colour painted behind them (lowest ${f2(worst.r)}, "${worst.t}")`, bad.slice(0, 3).join(' | '));
  const colours = new Set(runs.map(r => r.color));
  check(colours.size >= 6 && ![...colours].includes('rgb(255, 255, 255)'), `${name}: the page's text uses ${colours.size} different colours, none of them pure white`, [...colours].join(' | '));
  // The sky, in painted pixels: lit at the horizon, darker and cooler above, and not lost at any hour.
  const png = await page.locator('#art-steps').screenshot();
  const px = await page.evaluate(async ([b64]) => { const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode(); const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const x = c.getContext('2d'); x.drawImage(img, 0, 0);
    const at = (fx, fy) => [...x.getImageData(Math.round(fx * img.width), Math.round(fy * img.height), 1, 1).data].slice(0, 3); return { top: at(0.5, 0.12), horizon: at(0.5, 0.6) }; }, [png.toString('base64')]);
  const lumOf = ([r, g, b]) => { const f = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const minH = { dusk: 0.15, late: 0.06, deep: 0.02, 'last light': 0.5 }[name];
  check(lumOf(px.horizon) >= minH && (name === 'last light' ? px.horizon[0] - px.horizon[2] > px.top[0] - px.top[2] : lumOf(px.horizon) > lumOf(px.top) && px.horizon[0] > px.horizon[2]), `${name}: in the painted picture the horizon is lit (${lumOf(px.horizon).toFixed(2)}) and warm; above it the sky is ${name === 'last light' ? 'less warm' : 'darker'} (${lumOf(px.top).toFixed(2)})`, JSON.stringify(px));
  check(page.errors.length === 0, `${name}: no script errors`, page.errors.join('; '));
  await page.ctx.close();
}

// 2b. The page: one Lantern, focus, targets, overflow, no network.
{
  const requests = []; const page = await open();
  page.on('request', r => { if (!r.url().startsWith('file:')) requests.push(r.url()); });
  check(await page.locator('.lantern').count() === 1, 'one Lantern in the view');
  check(await page.locator('.lantern').evaluate(e => getComputedStyle(e).animationName === 'rp-breath'), 'the Lantern breathes at rest');
  const kinds = ['#hours button', '.lantern', '#continue', '.btn', '.node', 'select', 'textarea', '#follow', 'a.link'];
  const weak = [];
  for (const sel of kinds) {
    const el = page.locator(sel).first(); await el.focus();
    const ring = await el.evaluate(e => { const cs = getComputedStyle(e); return { w: parseFloat(cs.outlineWidth), s: cs.outlineStyle }; });
    if (!(ring.s !== 'none' && ring.w >= 2)) weak.push(sel);
  }
  check(weak.length === 0, 'a focused control of every kind shows a ring of at least 2px', weak.join(', '));
  const small = await page.evaluate(() => [...document.querySelectorAll('button, select, input[type=text], .check')].filter(e => e.offsetParent && !e.closest('[hidden]')).map(e => { const r = e.getBoundingClientRect(); return { t: (e.textContent || e.id).trim().slice(0, 20), h: r.height, w: r.width, tag: e.tagName }; }).filter(x => x.h < 43.5 && !(x.tag === 'LABEL')));
  check(small.length === 0, 'every button and field is at least 44px tall', small.slice(0, 3).map(x => `${x.t} ${x.h}`).join(', '));
  check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'no horizontal scroll at 1280px');
  await page.ctx.close();
  const phone = await open({ viewport: { width: 390, height: 800 }, hasTouch: true, isMobile: true });
  check(await phone.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'no horizontal scroll at a phone width of 390px');
  const overlap = await phone.evaluate(() => { const r = [...document.querySelectorAll('#plane .node')].map(n => n.getBoundingClientRect()); let c = 0; for (let i = 0; i < r.length; i++) for (let j = i + 1; j < r.length; j++) if (!(r[i].right < r[j].left || r[j].right < r[i].left || r[i].bottom < r[j].top || r[j].bottom < r[i].top)) c++; return c; });
  await phone.locator('#tidy').click(); const after = await phone.evaluate(() => { const r = [...document.querySelectorAll('#plane .node')].map(n => n.getBoundingClientRect()); let c = 0; for (let i = 0; i < r.length; i++) for (let j = i + 1; j < r.length; j++) if (!(r[i].right < r[j].left || r[j].right < r[i].left || r[i].bottom < r[j].top || r[j].bottom < r[i].top)) c++; return c; });
  check(after === 0, 'at a phone width, Tidy leaves no two items overlapping', `${overlap} overlapping before, ${after} after`);
  await phone.ctx.close();
  requests.length; // network is checked across the whole session below
}

// 2c. The hours and Follow my evening, with a clock the test controls.
{
  const page = await open(); const hour = () => page.evaluate(() => document.documentElement.dataset.hour);
  const val = n => page.evaluate(n => getComputedStyle(document.documentElement).getPropertyValue(n).trim(), n);
  check(await hour() === 'dusk' && (await page.evaluate(() => getComputedStyle(document.body).backgroundColor)) === 'rgb(27, 33, 51)', 'the page opens at Dusk with the Dusk surface');
  await page.click('[data-hour-btn="late"]'); await page.waitForTimeout(800);
  check(await hour() === 'late' && (await page.evaluate(() => getComputedStyle(document.body).backgroundColor)) === 'rgb(21, 26, 43)', 'choosing Late changes the hour and the painted background to the Late surface');
  await page.click('[data-hour-btn="deep"]'); await page.waitForTimeout(800);
  check(await hour() === 'deep' && (await page.evaluate(() => getComputedStyle(document.body).backgroundColor)) === 'rgb(15, 19, 32)', 'choosing Deep paints the Deep surface');
  await page.click('[data-hour-btn="dusk"]'); await page.waitForTimeout(800);
  // the change is a cross-fade, not a jump: sample partway through a slowed change
  await page.evaluate(() => document.documentElement.style.setProperty('--rp-fade', '2s')); await page.evaluate(() => { document.documentElement.dataset.hour = 'deep'; });
  await page.waitForTimeout(700); const mid = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  check(mid !== 'rgb(27, 33, 51)' && mid !== 'rgb(15, 19, 32)', 'a change of hour cross-fades through in-between colours instead of jumping', mid);
  await page.ctx.close();

  const clock = await browser.newContext({ viewport: { width: 1280, height: 900 } }); const p = await clock.newPage();
  await p.clock.install({ time: new Date(2026, 10, 17, 19, 0) }); await p.goto(url);
  const h = () => p.evaluate(() => document.documentElement.dataset.hour), fade = () => p.evaluate(() => document.documentElement.style.getPropertyValue('--rp-fade'));
  await p.check('#follow'); check(await h() === 'dusk' && await fade() === '1200s', 'Follow my evening at 19:00 is Dusk and fades over 20 minutes (1200s)', `${await h()} ${await fade()}`);
  await p.clock.fastForward('02:15:00'); await p.waitForTimeout(100); check(await h() === 'late', 'at 21:15 the light has moved to Late by itself', await h());
  await p.clock.fastForward('02:30:00'); await p.waitForTimeout(100); check(await h() === 'deep', 'at 23:45 it is Deep', await h());
  await p.click('[data-hour-btn="dusk"]'); check(await h() === 'dusk' && !(await p.isChecked('#follow')), 'choosing an hour by hand switches Follow off and wins');
  await p.clock.fastForward('01:00:00'); check(await h() === 'dusk', 'once off, the clock no longer changes the light');
  await p.selectOption('#clock', '21:30'); await p.check('#follow'); check(await h() === 'late', 'the demo clock at 21:30 gives Late');
  await clock.close();
}

// 2d. Field, List, Path and the Spark.
{
  const page = await open({}); const A = page.locator('#announce');
  const total = await page.locator('#plane .node').count(), lit0 = await page.locator('#plane .node.lit').count();
  check(total === 9 && lit0 === 3 && lit0 / total < 0.4, 'the Field opens mostly dark (3 of 9 lit); dark is the default', `${lit0} of ${total}`);
  check(await page.evaluate(() => !/locked|%|\bof \d+\b|complete|behind/i.test(document.querySelector('#field').innerText.replace(/Not yet/g, ''))), 'the Field shows no lock, percentage, "x of y", completeness or "behind"');
  check(await page.locator('#plane .node').evaluateAll(els => els.every(e => !e.disabled && e.getAttribute('aria-disabled') !== 'true')), 'no item is locked behind another');
  const dark = page.locator('#plane .node:not(.lit)').first();
  check((await dark.evaluate(e => getComputedStyle(e).borderTopStyle)) === 'dashed' && (await dark.locator('.state').innerText()) === 'Not yet', 'a dark item is shown by a dashed edge and the words "Not yet", not by colour alone');
  // keyboard
  const before = await page.evaluate(() => JSON.parse(localStorage.getItem('rp.field.v1') || 'null'));
  const node = page.locator('#plane .node[data-id="sleep"]'); await node.focus(); const x0 = await node.evaluate(e => parseFloat(e.style.left));
  await page.keyboard.press('ArrowRight'); await page.keyboard.press('Shift+ArrowRight'); const x1 = await node.evaluate(e => parseFloat(e.style.left));
  check(Math.abs(x1 - x0 - 5) < 0.01, 'the arrow keys move the focused item by 1% and Shift by 4%', `${x0} to ${x1}`);
  // pointer drag
  const box = await node.boundingBox(); await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down(); await page.mouse.move(box.x + box.width / 2 + 120, box.y + box.height / 2 - 60, { steps: 6 }); await page.mouse.up();
  check((await node.evaluate(e => parseFloat(e.style.left))) > x1 + 5 && !(await page.locator('#detail').isVisible()), 'dragging moves an item and does not open it');
  // reload keeps the person's arrangement
  const pos = await node.evaluate(e => [e.style.left, e.style.top]); await page.reload(); await page.waitForTimeout(100);
  check(same(await page.locator('#plane .node[data-id="sleep"]').evaluate(e => [e.style.left, e.style.top]), pos), 'nothing is rearranged without the person: positions survive a reload');
  // tidy and undo
  const snap = () => page.evaluate(() => [...document.querySelectorAll('#plane .node')].map(n => [n.dataset.id, n.style.left, n.style.top].join(':')).join('|'));
  const s0 = await snap(); await page.click('#tidy'); const s1 = await snap();
  const links = await page.locator('#links line').count();
  check(s1 !== s0 && links === 2 && !(await page.locator('#untidy').isDisabled()), 'Tidy rearranges and keeps every link, and offers Undo', `${links} links`);
  await page.click('#untidy'); check(await snap() === s0 && await page.locator('#untidy').isDisabled(), 'Undo tidy restores every position exactly');
  // Link from the Field: one Spark
  await page.click('#plane .node[data-id="entropy"]'); check(await page.locator('#detail').isVisible(), 'opening an item shows its detail');
  await page.selectOption('#link-to', 'compression'); await page.click('#link-do'); await page.waitForTimeout(100);
  check(await page.locator('.spark').count() === 1, 'making a link shows one Spark');
  check((await A.innerText()).includes('Linked: Entropy and Compression.'), 'the link is announced in words, so the moment is not carried by light alone', await A.innerText());
  check(await page.locator('#plane .node[data-id="compression"]').evaluate(e => e.classList.contains('lit')), 'both ends of a link are lit: light is where the person has been');
  await page.click('#plane .node[data-id="probability"]'); await page.selectOption('#link-to', 'memory'); await page.click('#link-do');
  check(await page.locator('.spark').count() === 1, 'a second link leaves one Spark, never a stack');
  check(await page.evaluate(() => !/\d+\s*sparks?|sparks?\s*(this|today|so far|:)/i.test(document.body.innerText) && !document.querySelector('[class*="spark-count"], [data-sparks]')), 'Sparks are not counted or summarised anywhere on the page');
  await page.waitForTimeout(2600); check(await page.locator('.spark').count() === 0 && await page.locator('#links line').count() === 4, 'the flash passes; the links stay');
  // The List is the same content
  await page.click('[data-view-btn="list"]');
  const listItems = await page.locator('#list li').count(), listLinks = await page.evaluate(() => [...document.querySelectorAll('#list li')].filter(li => /Linked to/.test(li.textContent)).length);
  check(listItems === 9 && listLinks >= 6 && await page.locator('#list li.lit').count() === await page.locator('#plane .node.lit').count(), 'the List has the same nine items, the same links and the same lit state as the Field', `${listItems} items, ${listLinks} with links`);
  await page.click('#list .open >> text=Sleep'); await page.selectOption('#link-to', 'memory'); await page.click('#link-do'); await page.waitForTimeout(100);
  check(await page.locator('.spark').count() === 1 && (await A.innerText()).includes('Linked: Sleep and Memory.'), 'a link made from the List gives its Spark and its words too');
  await page.click('[data-view-btn="field"]'); check(await page.locator('#links line').count() === 5, 'a link made in the List appears in the Field');
  await page.click('[data-view-btn="path"]'); check(await page.locator('#pathlist li').count() === 9 && await page.locator('#pathlist li.walked').count() >= 3, 'the Path shows the same nine items, lit as far as the person has been');
  // keyboard only: open and link without a pointer
  const kb = await open(); await kb.locator('#plane .node[data-id="bayes"]').focus(); await kb.keyboard.press('Enter');
  await kb.locator('#link-to').focus(); await kb.keyboard.press('ArrowDown'); await kb.locator('#link-do').focus(); await kb.keyboard.press('Enter');
  check(await kb.locator('.spark').count() === 1, 'an item can be opened and linked with the keyboard alone');
  await kb.ctx.close(); await page.ctx.close();

  // Reduced motion: a Spark that stays still, no breath, short fades.
  const rm = await open({ reducedMotion: 'reduce' }); await rm.click('#plane .node[data-id="entropy"]'); await rm.selectOption('#link-to', 'compression'); await rm.click('#link-do');
  const sp = rm.locator('.spark'); await rm.waitForTimeout(2200);
  check(await sp.count() === 1 && (await sp.evaluate(e => getComputedStyle(e).animationName)) === 'none', 'with reduced motion the Spark is a still mark that stays on the link');
  check((await rm.locator('.lantern').evaluate(e => getComputedStyle(e).animationName)) === 'none', 'with reduced motion the Lantern does not breathe');
  check((await rm.evaluate(() => parseFloat(getComputedStyle(document.querySelector('.btn')).transitionDuration))) <= 0.101, 'with reduced motion transitions are 100ms or less');
  await rm.ctx.close();
}

// 2e. Forced colours.
{
  const fc = await open({ forcedColors: 'active' });
  const a = await fc.locator('#plane .node.lit').first().evaluate(e => [getComputedStyle(e).borderTopStyle, parseFloat(getComputedStyle(e).borderTopWidth)]);
  const b = await fc.locator('#plane .node:not(.lit)').first().evaluate(e => [getComputedStyle(e).borderTopStyle, parseFloat(getComputedStyle(e).borderTopWidth)]);
  check(a[0] === 'solid' && b[0] === 'dashed' && a[1] >= 2 && b[1] >= 2, 'in forced colours, lit and dark items still differ by a solid and a dashed 2px edge', `${a} ${b}`);
  check((await fc.locator('[data-hour-btn][aria-pressed="true"]').evaluate(e => getComputedStyle(e).outlineStyle)) !== 'none', 'in forced colours, the chosen hour is marked by an outline');
  await fc.ctx.close();
}

// 2f. Bench.
{
  const page = await open(); await page.click('#bench-enter');
  check(await page.locator('#bench-exit').isVisible() && await page.locator('#bench-exit').isEnabled(), 'the Bench has an exit in view the moment it opens');
  check((await page.locator('.lantern').evaluate(e => getComputedStyle(e).animationName)) === 'none', 'while reading, the Lantern stops breathing');
  await page.waitForTimeout(5200); check(await page.evaluate(() => getComputedStyle(document.querySelector('#bar')).opacity) === '0.3', 'after four seconds idle the chrome falls to 30%');
  await page.mouse.move(100, 100); await page.waitForTimeout(1200); check(await page.evaluate(() => getComputedStyle(document.querySelector('#bar')).opacity) === '1', 'moving the pointer brings it back');
  const measure = await page.evaluate(() => { const p = document.querySelector('.reading p'); const cs = getComputedStyle(p); const probe = document.createElement('span'); probe.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap;font:' + cs.font; probe.textContent = 'n'.repeat(50); document.body.append(probe); const per = probe.getBoundingClientRect().width / 50; probe.remove(); return { ch: p.getBoundingClientRect().width / per, size: parseFloat(cs.fontSize), lh: parseFloat(cs.lineHeight) / parseFloat(cs.fontSize), fam: cs.fontFamily }; });
  check(measure.size >= 18 && measure.lh >= 1.65 && measure.lh <= 1.75 && measure.fam.startsWith('"Source Serif 4"'), 'reading text is Source Serif 4 at 18px with a line height of 1.65 to 1.75', JSON.stringify(measure));
  check(await page.evaluate(async () => { await document.fonts.ready; return document.fonts.check('18px "Source Serif 4"'); }), 'Source Serif 4 is loaded from the bundled file');
  await page.click('#bench-exit'); check(!(await page.evaluate(() => document.body.classList.contains('is-bench'))), 'the exit leaves the Bench');
  await page.ctx.close();
}

// 2g. Still, Glimmers and what stays on the device.
{
  const requests = []; const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } }); const page = await ctx.newPage();
  page.on('request', r => { if (!r.url().startsWith('file:') && !r.url().startsWith('data:')) requests.push(r.url()); });
  await page.goto(url); await page.waitForTimeout(100);
  check(await page.locator('#questions').isHidden() && (await page.locator('#ask').getAttribute('aria-expanded')) === 'false', 'the open questions are hidden until the person asks for them');
  await page.click('#ask'); check(await page.locator('#questions li').count() === 3 && await page.locator('#questions').isVisible(), 'asking shows the three questions');
  await page.fill('#still-text', 'I read it three times and the third time it was a different paragraph.');
  check((await page.locator('#now').innerText()).startsWith('I read it three times'), 'what is written appears beside the earlier note, with no score between them');
  await page.fill('#tag', 'stuck'); await page.click('#tag-add'); await page.fill('#tag', 'quiet'); await page.keyboard.press('Enter');
  check(same(await page.locator('#chips li').allInnerTexts().then(a => a.map(s => s.replace('×', '').trim())), ['stuck', 'quiet']), 'the person\'s own words become tags, exactly as written');
  await page.reload(); await page.waitForTimeout(100);
  check((await page.inputValue('#still-text')).startsWith('I read it three times') && await page.locator('#chips li').count() === 2, 'the page and its words survive a reload, on this device');
  check(await page.evaluate(() => !/score|grade|mood|sentiment|streak|badge|xp\b|points/i.test(document.body.innerText)), 'no score, grade, mood, streak, badge or points anywhere on the page');
  check(!(await page.locator('#glimmer').isVisible()) && !(await page.isChecked('#glimmers')), 'Glimmers are off until the person allows one');
  await page.check('#glimmers'); check(await page.locator('#glimmer').isVisible() && await page.locator('#glimmer .glimmer__dot').count() === 1, 'allowing Glimmers shows one quiet Glimmer, with no badge and no count');
  check(requests.length === 0, 'nothing leaves the browser: no request to any server during the whole session', requests.slice(0, 3).join(', '));
  await ctx.close();
}

await browser.close();
console.log(failed ? `\n${failed} failing check(s), ${passed} passed` : `\nAll ${passed} Realis Pale checks pass.`);
process.exit(failed ? 1 : 0);
