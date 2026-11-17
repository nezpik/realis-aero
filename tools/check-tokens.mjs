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

console.log('\nLowest measured:');
for (const [k, v] of Object.entries(lowest)) console.log(`  ${k.padEnd(14)} ${v.r.toFixed(2)}  ${v.label} (${v.fg} on ${v.bg})`);
console.log(failures ? `\n${failures} failing check(s) of ${count + 1}` : `\nAll ${count + 1} checks pass.`);
process.exit(failures ? 1 : 0);
