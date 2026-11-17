#!/usr/bin/env node
// Measures every token pair of the tonal ladder and the state system, in every
// theme, against the targets in the document:
//   layers        >= 1.12:1 from their neighbour
//   text          >= 4.5:1 on every surface it can sit on (7:1 in outdoor)
//   marks, edges  >= 3:1 (4.5:1 in outdoor)
// Translucent tokens are composited over the surface they sit on.
// Usage: node tools/check-tokens.mjs [tokens.css] [--all]

import { contrast, over } from './lib/color.mjs';
import { loadThemes, color } from './lib/tokens.mjs';

const args = process.argv.slice(2);
const { themes, blocks } = loadThemes(args.find(a => !a.startsWith('--')));

const LAYER = 'layer', TEXT = 'text', UI = 'ui';
const MIN = { layer: () => 1.12, text: t => (t === 'outdoor' ? 7 : 4.5), ui: t => (t === 'outdoor' ? 4.5 : 3) };

const c = n => `--color-${n}`;
const light = ['background', 'surface', 'surface-hover', 'surface-inset', 'surface-raised'].map(c);
const states = ['live', 'success', 'warning', 'error', 'maintenance', 'info', 'neutral'];
const tinted = ['success', 'warning', 'error', 'maintenance'];

// [foreground, background, kind, label, optional base under a translucent background]
const pairs = [
  [c('rail'), c('background'), LAYER, 'L0 rail vs L1 canvas'],
  [c('surface'), c('background'), LAYER, 'L2 card vs L1 canvas'],
  [c('surface-inset'), c('surface'), LAYER, 'L3 inset vs L2 card'],
  [c('surface-selected'), c('surface'), LAYER, 'selected vs card'],

  ...light.map(s => [c('text-primary'), s, TEXT, 'primary text']),
  ...light.map(s => [c('text-secondary'), s, TEXT, 'secondary text']),
  ...light.map(s => [c('text-muted'), s, TEXT, 'muted text and placeholders']),
  [c('text-primary'), c('surface-selected'), TEXT, 'primary text on selected'],
  [c('text-secondary'), c('surface-selected'), TEXT, 'secondary text on selected'],
  [c('text-muted-on-selected'), c('surface-selected'), TEXT, 'muted text on selected'],
  [c('text-primary'), c('surface-material'), TEXT, 'primary text on material surface'],
  [c('danger-text'), c('surface'), TEXT, 'danger text'],
  [c('danger-text'), c('surface-inset'), TEXT, 'danger text'],

  ...['action-primary', 'action-primary-hover', 'action-danger', 'action-danger-hover']
    .map(a => [c('text-on-action'), c(a), TEXT, 'label on filled action']),
  [c('disabled-text'), c('disabled-fill'), TEXT, 'disabled label'],

  ...['background', 'surface', 'surface-inset'].map(s => [c('border-control'), c(s), UI, 'control edge']),
  ...light.map(s => [c('focus-ring'), s, UI, 'focus ring']),
  [c('focus-ring-on-selected'), c('surface-selected'), UI, 'focus ring on selected'],
  [c('selected-edge'), c('surface-selected'), UI, 'selection bar on its fill'],
  [c('selected-edge'), c('surface'), UI, 'selection bar on card'],

  [c('rail-text'), c('rail'), TEXT, 'rail label'],
  [c('rail-muted'), c('rail'), TEXT, 'rail muted label'],
  [c('rail-text-strong'), c('rail-active'), TEXT, 'active rail label', c('rail')],
  [c('rail-accent'), c('rail'), UI, 'active rail bar'],
  [c('rail-focus'), c('rail'), UI, 'rail focus ring'],

  ...states.flatMap(s => [
    ...[...light, c('surface-selected')].map(bg => [`--state-${s}-text`, bg, TEXT, `${s} text`]),
    ...['background', 'surface', 'surface-inset', 'surface-selected'].map(bg => [`--state-${s}-mark`, c(bg), UI, `${s} mark`]),
  ]),
  ...tinted.flatMap(s => [
    [`--state-${s}-text`, `--state-${s}-tint`, TEXT, `${s} text on its tint`, c('surface')],
    [c('text-primary'), `--state-${s}-tint`, TEXT, `primary text on ${s} tint`, c('surface')],
  ]),
  [`--state-dirty-mark`, c('surface'), UI, 'unsaved mark'],
  [`--state-dirty-mark`, c('surface-inset'), UI, 'unsaved mark'],

  ...['generation', 'storage', 'flow', 'eco', 'material', 'forecast', 'threshold', 'fault', 'selected']
    .flatMap(k => [[`--chart-${k}`, c('surface'), UI, `chart ${k}`], [`--chart-${k}`, c('surface-inset'), UI, `chart ${k}`]]),
];

let failures = 0, count = 0;
const lowest = {};
for (const [theme, scope] of Object.entries(themes)) {
  const rows = [];
  for (const [fg, bg, kind, label, under] of pairs) {
    const min = MIN[kind](theme);
    let b = color(scope, bg);
    if (b[3] < 1) b = over(b, color(scope, under ?? c('surface')));
    let f = color(scope, fg);
    if (f[3] < 1) f = over(f, b);
    const r = contrast(f, b);
    // Compare at the two decimals that are reported, so 4.50 passes 4.5.
    const ok = Math.round(r * 100) >= Math.round(min * 100);
    if (!ok) failures++;
    count++;
    const key = `${theme} ${kind}`;
    if (!lowest[key] || r < lowest[key].r) lowest[key] = { r, label, fg, bg };
    rows.push(`${ok ? 'ok  ' : 'FAIL'} ${r.toFixed(2).padStart(5)} >= ${String(min).padEnd(4)} ${label.padEnd(30)} ${fg} on ${bg}`);
  }
  const bad = rows.filter(r => r.startsWith('FAIL'));
  console.log(`\n${theme}: ${rows.length - bad.length}/${rows.length} pass`);
  for (const r of (args.includes('--all') ? rows : bad)) console.log('  ' + r);
}

// The dark values exist twice (explicit theme and system preference); they must not drift.
const explicit = blocks.find(b => b.selectors.includes('[data-theme="dark"]'));
const system = blocks.find(b => b.selectors.includes(':root:not([data-theme])'));
const same = explicit && system && JSON.stringify(explicit.decls) === JSON.stringify(system.decls);
console.log(`\n${same ? 'ok  ' : 'FAIL'} dark values are identical for data-theme="dark" and the system preference`);
if (!same) failures++;

// Touch density also exists twice (explicit and coarse pointer).
const touch = blocks.find(b => b.selectors.includes('[data-density="touch"]'));
const coarse = blocks.find(b => b.selectors.includes(':root:not([data-density])'));
const sameTouch = touch && coarse && JSON.stringify(touch.decls) === JSON.stringify(coarse.decls);
console.log(`${sameTouch ? 'ok  ' : 'FAIL'} touch density is identical for data-density="touch" and a coarse pointer`);
if (!sameTouch) failures++;

// Densities: controls never drop below the 24px minimum target, and touch reaches 44px.
const px = (sel, name) => parseFloat(blocks.find(b => b.selectors.includes(sel)).decls[name]);
const sizes = { comfortable: px('[data-density="comfortable"]', '--density-control-h'), compact: px('[data-density="compact"]', '--density-control-h'), touch: px('[data-density="touch"]', '--density-control-h') };
const densOk = sizes.compact >= 24 && sizes.comfortable > sizes.compact && sizes.touch >= 44;
console.log(`${densOk ? 'ok  ' : 'FAIL'} density control heights: compact ${sizes.compact}px >= 24, comfortable ${sizes.comfortable}px, touch ${sizes.touch}px >= 44`);
if (!densOk) failures++;

// ---- Glass ----
// 1. Each tint's alpha is the one its token says (the opacity tokens once disagreed with the material table).
// 2. The reading plate guarantees text: over the brightest and the darkest possible backdrop, every text role
//    reaches 4.5:1 and every state mark 3:1, for every variant, composited as the browser does (plate over tint over backdrop).
// 3. Every fallback (outdoor, reduced transparency, print, forced colors, no backdrop-filter) collapses glass to a solid.
// 4. The envelope of BARE glass is measured and printed: it is why bare glass carries no text.
const glassVariants = { light: ['clear', 'frosted', 'alert'], dark: ['clear', 'frosted', 'dense', 'alert'] };
const textRoles = ['--color-text-primary', '--color-text-secondary', '--color-text-muted', ...['warning', 'error', 'success', 'info', 'live', 'maintenance', 'neutral'].map(k => `--state-${k}-text`)];
const markRoles = ['warning', 'error', 'success', 'info', 'live', 'maintenance', 'neutral'].map(k => `--state-${k}-mark`);
const rootScope = themes.light;
const alphaOf = (scope, t) => color(scope, t)[3];
const num = (scope, t) => parseFloat(scope[t]);
const glassRows = [];
for (const theme of ['light', 'dark']) {
  const scope = themes[theme];
  for (const v of glassVariants[theme]) {
    const want = num(rootScope, `--opacity-glass-${v}`), got = alphaOf(scope, `--glass-${v}-bg`);
    glassRows.push([Math.abs(want - got) < 1e-9, `${theme}: --glass-${v}-bg alpha ${got} equals --opacity-glass-${v} ${want}`]);
  }
  const plateWant = num(rootScope, `--opacity-glass-plate-${theme}`), plateGot = alphaOf(scope, '--glass-plate-bg');
  glassRows.push([Math.abs(plateWant - plateGot) < 1e-9, `${theme}: --glass-plate-bg alpha ${plateGot} equals --opacity-glass-plate-${theme} ${plateWant}`]);
  const plate = color(scope, '--glass-plate-bg');
  for (const v of glassVariants[theme]) {
    const tint = color(scope, `--glass-${v}-bg`);
    for (const [label, g] of [['black', 0], ['white', 255]]) {
      const bg = over(plate, over(tint, [g, g, g, 1]));
      const badText = textRoles.filter(r => Math.round(contrast(color(scope, r), bg) * 100) < 450);
      const badMarks = markRoles.filter(r => Math.round(contrast(color(scope, r), bg) * 100) < 300);
      glassRows.push([!badText.length && !badMarks.length, `${theme}: text and marks on a plate over ${v} glass over ${label} (lowest text ${Math.min(...textRoles.map(r => contrast(color(scope, r), bg))).toFixed(2)}:1)${badText.length ? ' FAILS ' + badText.join(',') : ''}${badMarks.length ? ' MARKS ' + badMarks.join(',') : ''}`]);
    }
  }
}
const collapsed = (decls, name) => {
  const bgs = Object.keys(decls).filter(k => /^--glass-(clear|frosted|dense|alert|plate)-bg$/.test(k)), blurs = Object.keys(decls).filter(k => k.startsWith('--glass-blur-')), streams = Object.keys(decls).filter(k => k.startsWith('--glass-stream-') && k !== '--glass-stream-color');
  const solid = v => v === 'var(--color-surface)' || v === 'Canvas';
  const ok = bgs.length === 5 && bgs.every(k => solid(decls[k])) && blurs.length === 4 && blurs.every(k => decls[k] === 'none') && streams.length === 3 && streams.every(k => decls[k] === '0') && decls['--glass-haze'] === 'transparent' && decls['--glass-scratch'] === 'transparent' && decls['--glass-edge-light'] === 'transparent';
  glassRows.push([ok, `fallback "${name}" makes every glass tint and the plate solid, removes blur, streams, haze, scratches and edge light`]);
};
const find = fn => blocks.filter(fn).map(b => b.decls)[0];
collapsed(find(b => b.selectors.includes('[data-theme="outdoor"]')), 'outdoor');
collapsed(find(b => b.selectors.includes('[data-reduced-transparency="true"]')), 'reduced transparency');
collapsed(find(b => b.media.startsWith('@media (prefers-reduced-transparency')), 'prefers-reduced-transparency');
collapsed(find(b => b.media.startsWith('@supports not')), 'no backdrop-filter');
collapsed(find(b => b.media === '@media print' && b.decls['--glass-clear-bg']), 'print');
collapsed(find(b => b.media.startsWith('@media (forced-colors') && b.decls['--glass-clear-bg']), 'forced colors');
let glassFail = 0;
for (const [ok, label] of glassRows) { if (!ok) glassFail++; if (!ok || args.includes('--all')) console.log(`${ok ? 'ok  ' : 'FAIL'} glass: ${label}`); }
console.log(`\nglass: ${glassRows.length - glassFail}/${glassRows.length} pass`);
failures += glassFail; count += glassRows.length;
console.log('\nBare glass (no plate): the backdrops, as gray level 0 (black) to 255 (white), over which EVERY text role reaches 4.5:1');
for (const theme of ['light', 'dark']) {
  const scope = themes[theme];
  for (const v of glassVariants[theme]) {
    const tint = color(scope, `--glass-${v}-bg`); let lo = null, hi = null;
    for (let g = 0; g <= 255; g++) { const bg = over(tint, [g, g, g, 1]); if (textRoles.every(r => contrast(color(scope, r), bg) >= 4.5)) { if (lo === null) lo = g; hi = g; } }
    console.log(`  ${theme.padEnd(5)} ${v.padEnd(8)} ${lo === null ? 'no backdrop' : `gray ${lo}..${hi}`}`);
  }
}

console.log('\nLowest measured:');
for (const [k, v] of Object.entries(lowest)) console.log(`  ${k.padEnd(14)} ${v.r.toFixed(2)}  ${v.label} (${v.fg} on ${v.bg})`);
console.log(failures ? `\n${failures} failing check(s) of ${count + 3}` : `\nAll ${count + 3} checks pass.`);
process.exit(failures ? 1 : 0);
