#!/usr/bin/env node
// Holds the exported tokens to the CSS they came from, and to real consumers:
//   1. The files on disk are what the exporter produces now (an edited token without a re-export fails).
//   2. The DTCG sets are well formed: every leaf typed, every alias resolves, none cycles.
//   3. Every token, in every theme and density, equals what Chromium computes from tokens/realis-aero.tokens.css.
//   4. A real Tailwind build with the preset renders the same values as the CSS variables, and follows a theme or
//      density switch at run time.
//   5. Style Dictionary, an independent DTCG consumer, builds from the sets, and fails on a broken alias.
//   6. The React Native module has the right shapes and the same values as the CSS, and keeps legibility.
// Usage: node tools/check-export.mjs

import { createRequire } from 'node:module';
import { mkdtempSync, readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync, cpSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { exportAll, DIST, meta, classify, pathOf } from './export-tokens.mjs';
import { parseColor, contrast } from './lib/color.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const root = fileURLToPath(new URL('..', import.meta.url));
const { THEMES, allNames, densityBlock } = meta;

let passed = 0, failed = 0;
function check(ok, label, detail = '') { ok ? passed++ : failed++; if (!ok) console.log(`  FAIL ${label}${detail ? ' — ' + detail : ''}`); }
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// ---- 1. Fresh
console.log('freshness');
const { files, native } = exportAll();
for (const [f, text] of Object.entries(files)) check(existsSync(DIST + f) && readFileSync(DIST + f, 'utf8') === text, `${f} is what the exporter produces from the CSS now`, 'run: npm run build:tokens');

// ---- 2. DTCG structure
console.log('dtcg structure');
const TYPES = new Set(['color', 'dimension', 'number', 'duration', 'cubicBezier', 'fontFamily', 'shadow', 'other']);
function flatten(tree, prefix = []) {
  const out = {};
  for (const [k, v] of Object.entries(tree)) {
    if (k.startsWith('$')) continue;
    if (v && typeof v === 'object' && '$value' in v) out[[...prefix, k].join('.')] = v; else Object.assign(out, flatten(v, [...prefix, k]));
  }
  return out;
}
const read = f => JSON.parse(readFileSync(DIST + 'dtcg/' + f, 'utf8'));
const manifest = read('sets.json');
check(manifest.sets.length === 8 && manifest.sets.map(s => s.name).join() === 'core,light,dark,outdoor,density-comfortable,density-compact,density-touch,reduced-motion', 'the manifest lists the eight sets in load order', manifest.sets.map(s => s.name).join());
const sets = Object.fromEntries(manifest.sets.map(s => [s.name, flatten(read(s.file.replace('dtcg/', '')))]));
function resolveToken(flat, key, trail = []) {
  const t = flat[key];
  if (!t) throw new Error(`missing token ${key}`);
  if (typeof t.$value === 'string' && /^\{[^}]+\}$/.test(t.$value)) {
    const target = t.$value.slice(1, -1);
    if (trail.includes(target)) throw new Error(`cycle at ${target}`);
    return resolveToken(flat, target, [...trail, key]);
  }
  return t;
}
const merged = (theme, density = 'comfortable') => ({ ...sets.core, ...sets[theme], ...sets['density-' + density] });
for (const [name, flat] of Object.entries(sets)) {
  const bad = Object.entries(flat).filter(([, t]) => !TYPES.has(t.$type) || t.$value === undefined);
  check(bad.length === 0, `${name}: every leaf has a known $type and a $value`, bad.slice(0, 3).map(([k]) => k).join(', '));
}
for (const theme of THEMES) {
  const m = merged(theme); let broken = null;
  for (const k of Object.keys(m)) { try { resolveToken(m, k); } catch (e) { broken = e.message; break; } }
  check(!broken, `${theme}: every alias in core + ${theme} + a density resolves, and none cycles`, broken ?? '');
  check(Object.keys(m).length === allNames.length, `${theme}: the sets together hold all ${allNames.length} tokens of the CSS, once each`, `${Object.keys(m).length}`);
}
check(Object.keys(sets.dark).length === Object.keys(sets.light).length && Object.keys(sets.outdoor).length === Object.keys(sets.light).length, 'the three theme sets hold the same token names');
const aliased = Object.values(sets.light).filter(t => typeof t.$value === 'string' && t.$value.startsWith('{')).length;
check(aliased > 40, 'semantic tokens keep their link to a primitive instead of being flattened', `${aliased} aliases in the light set`);

// ---- 3. Every token against Chromium
console.log('dtcg against the browser');
const browser = await chromium.launch();
const url = (theme, density) => pathToFileURL(root + 'specimen/index.html').href + `?theme=${theme}&density=${density}`;
async function computedTokens(theme, density) {
  const page = await browser.newPage(); await page.goto(url(theme, density));
  const values = await page.evaluate(names => { const cs = getComputedStyle(document.documentElement); return Object.fromEntries(names.map(n => [n, cs.getPropertyValue(n).trim()])); }, allNames);
  await page.close(); return values;
}
const cssValues = {};
for (const theme of THEMES) {
  cssValues[theme] = await computedTokens(theme, 'comfortable');
  const m = merged(theme); const wrong = [];
  for (const n of allNames) {
    const want = classify(pathOf(n), cssValues[theme][n]), got = resolveToken(m, pathOf(n).join('.'));
    if (!same({ $type: want.$type, $value: want.$value }, { $type: got.$type, $value: got.$value })) wrong.push(`${n}: css ${JSON.stringify(want.$value)} vs export ${JSON.stringify(got.$value)}`);
  }
  check(wrong.length === 0, `${theme}: all ${allNames.length} tokens resolve to what Chromium computes from the CSS`, wrong.slice(0, 3).join(' | '));
}
const differ = allNames.filter(n => cssValues.dark[n] !== cssValues.light[n]).length;
check(differ > 50 && cssValues.outdoor['--color-text-primary'] !== cssValues.light['--color-text-primary'], 'the browser really did switch theme: dark and outdoor differ from light', `${differ} tokens differ in dark`);
for (const d of ['compact', 'touch']) {
  const css = await computedTokens('light', d), wrong = [];
  for (const [k, t] of Object.entries(sets['density-' + d])) {
    const name = '--' + k.replace('.', '-'), want = classify(pathOf(name), css[name]);
    if (!same(want.$value, t.$value)) wrong.push(`${name}: ${want.$value} vs ${t.$value}`);
  }
  check(Object.keys(sets['density-' + d]).length === 5 && wrong.length === 0, `density ${d}: its set equals the computed density tokens`, wrong.join(' | '));
}
{
  const page = await browser.newPage({ reducedMotion: 'reduce' }); await page.goto(url('light', 'comfortable'));
  const rm = await page.evaluate(names => { const cs = getComputedStyle(document.documentElement); return Object.fromEntries(names.map(n => [n, cs.getPropertyValue(n).trim()])); }, Object.keys(meta.reducedMotion)); await page.close();
  check(Object.entries(sets['reduced-motion']).every(([k, t]) => rm['--' + k.replace('.', '-')] === t.$value), 'reduced-motion: the set equals the durations Chromium computes under prefers-reduced-motion');
}

// ---- 4. A real Tailwind build
console.log('tailwind');
const preset = require(DIST + 'tailwind.preset.cjs');
const postcss = require('postcss'), tailwind = require('tailwindcss');
const FIXTURE = [
  ['bg-canvas', 'backgroundColor', '--color-background'], ['bg-surface', 'backgroundColor', '--color-surface'], ['bg-surface-inset', 'backgroundColor', '--color-surface-inset'],
  ['bg-surface-selected', 'backgroundColor', '--color-surface-selected'], ['text-ink-primary', 'color', '--color-text-primary'], ['text-ink-muted', 'color', '--color-text-muted'],
  ['text-ink-danger', 'color', '--color-danger-text'], ['border-edge-card border-solid', 'borderTopColor', '--color-border-card'], ['bg-action-primary', 'backgroundColor', '--color-action-primary'],
  ['text-ink-on-action', 'color', '--color-text-on-action'], ['bg-rail', 'backgroundColor', '--color-rail'], ['bg-accent-success', 'backgroundColor', '--color-success'],
  ['text-state-warning-text', 'color', '--state-warning-text'], ['bg-state-warning-tint', 'backgroundColor', '--state-warning-tint'], ['bg-state-error-mark', 'backgroundColor', '--state-error-mark'],
  ['bg-chart-flow', 'backgroundColor', '--chart-flow'], ['bg-glass-frosted', 'backgroundColor', '--glass-frosted-bg'], ['bg-glass-plate', 'backgroundColor', '--glass-plate-bg'],
  ['bg-aero-blue-800', 'backgroundColor', '--aero-blue-800'], ['bg-solar-700', 'backgroundColor', '--solar-700'],
  ['rounded-md', 'borderTopLeftRadius', '--radius-md'], ['rounded-pill', 'borderTopLeftRadius', '--radius-pill'], ['h-control', 'height', '--density-control-h'], ['min-h-row', 'minHeight', '--density-row-h'],
  ['p-4', 'paddingTop', '--space-4'], ['p-intra', 'paddingTop', '--density-gap-intra'], ['p-pad', 'paddingTop', '--density-pad-x'], ['text-body-sm', 'fontSize', '--text-body-sm'], ['text-display-lg', 'fontSize', '--text-display-lg'],
  ['border-stroke-state border-solid', 'borderTopWidth', '--stroke-state'],
];
const html = FIXTURE.map(([c], i) => `<div id="f${i}" class="${c}"></div>`).join('') + '<div id="white" class="bg-white"></div><div id="shadow" class="shadow-2"></div><div id="font" class="font-sans"></div><div id="fast" class="duration-fast ease-engineered transition-colors"></div><div id="dis" class="opacity-disabled"></div><div id="blur" class="backdrop-blur-md"></div><div id="dark" class="shadow-inner-depth"></div><div id="stream" class="opacity-stream-idle"></div>';
const built = await postcss([tailwind({ presets: [preset], content: [{ raw: html, extension: 'html' }], corePlugins: { preflight: false } })]).process('@tailwind base; @tailwind utilities;', { from: undefined });
const css = built.css;
check(/\.bg-surface\s*\{[^}]*background-color:\s*var\(--color-surface\)/.test(css), 'tailwind: bg-surface compiles to var(--color-surface)');
check(!/\.bg-white\b/.test(css), 'tailwind: the default palette is replaced, so bg-white does not exist');
check(['bg-surface', 'text-ink-primary', 'rounded-md', 'h-control', 'p-4', 'shadow-2', 'duration-fast'].every(c => css.includes('.' + c)), 'tailwind: the utilities the fixture uses were all generated');
const dir = mkdtempSync(join(tmpdir(), 'realis-aero-tailwind-'));
writeFileSync(join(dir, 'tailwind.css'), css);
writeFileSync(join(dir, 'index.html'), `<!doctype html><link rel="stylesheet" href="${pathToFileURL(root + 'tokens/realis-aero.tokens.css').href}"><link rel="stylesheet" href="tailwind.css"><body style="margin:0"><div id="stage" class="flex">${html}</div>`);
const tw = await browser.newPage(); await tw.goto(pathToFileURL(join(dir, 'index.html')).href);
const measure = (theme, density) => tw.evaluate(async ([fixture, theme, density]) => {
  document.documentElement.dataset.theme = theme; document.documentElement.dataset.density = density; await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  const out = [];
  fixture.forEach(([c, prop, token], i) => {
    const el = document.getElementById('f' + i), probe = document.createElement('div');
    const color = /olor|Color$/.test(prop);
    probe.style.cssText = color ? `color: var(${token});` : `width: var(${token});`;
    document.body.append(probe); const want = color ? getComputedStyle(probe).color : getComputedStyle(probe).width; probe.remove();
    out.push({ c, got: getComputedStyle(el)[prop], want });
  });
  const cs = e => getComputedStyle(document.getElementById(e));
  return { rows: out, shadow: cs('shadow').boxShadow, font: cs('font').fontFamily, dur: cs('fast').transitionDuration, ease: cs('fast').transitionTimingFunction, dis: cs('dis').opacity, blur: cs('blur').backdropFilter || cs('blur').webkitBackdropFilter, white: cs('white').backgroundColor, stream: cs('stream').opacity };
}, [FIXTURE, theme, density]);
for (const theme of THEMES) {
  const r = await measure(theme, 'comfortable'), wrong = r.rows.filter(x => x.got !== x.want);
  check(wrong.length === 0, `tailwind (${theme}): ${r.rows.length} utilities render exactly what their CSS variable computes to`, wrong.slice(0, 3).map(x => `${x.c}: ${x.got} vs ${x.want}`).join(' | '));
  if (theme === 'light') {
    check(r.shadow.includes('4px 12px') && r.font.startsWith('"Source Sans 3"') && r.dur === '0.14s' && r.ease === 'cubic-bezier(0.2, 0.8, 0.2, 1)' && r.dis === '0.42' && r.blur.includes('blur(14px)') && r.stream === '0.2', 'tailwind: shadows, font, motion, opacity and blur utilities follow the tokens', JSON.stringify({ s: r.shadow, f: r.font, d: r.dur, e: r.ease, o: r.dis, b: r.blur, st: r.stream }));
    check(r.white === 'rgba(0, 0, 0, 0)', 'tailwind: an element with bg-white (not in the palette) is left unstyled', r.white);
  }
}
check((await measure('light', 'comfortable')).rows.find(x => x.c === 'bg-surface').got === 'rgb(255, 254, 250)' && (await measure('dark', 'comfortable')).rows.find(x => x.c === 'bg-surface').got === 'rgb(13, 47, 69)', 'tailwind: the same class is white in light and aerospace blue in dark, with no rebuild: the theme switch is live');
for (const [d, h, row] of [['comfortable', '36px', '40px'], ['compact', '28px', '32px'], ['touch', '44px', '48px']]) {
  const r = await measure('light', d);
  check(r.rows.find(x => x.c === 'h-control').got === h && r.rows.find(x => x.c === 'min-h-row').got === row, `tailwind (density ${d}): h-control is ${h} and min-h-row ${row}`, `${r.rows.find(x => x.c === 'h-control').got} ${r.rows.find(x => x.c === 'min-h-row').got}`);
}
await tw.close();
{
  // Every value in the preset is a variable that exists in the CSS.
  const dangling = []; const vars = new Set(allNames);
  (function walk(o) { for (const v of Object.values(o)) { if (typeof v === 'object') walk(v); else if (/^var\(/.test(v)) { if (!vars.has(v.slice(4, -1))) dangling.push(v); } } })({ ...preset.theme.colors, ...preset.theme.extend });
  check(dangling.length === 0, 'tailwind: every variable the preset names exists in the token file', dangling.slice(0, 3).join(', '));
}

// ---- 5. Style Dictionary, an independent consumer
console.log('style dictionary');
const { default: StyleDictionary } = await import('style-dictionary');
const out = mkdtempSync(join(tmpdir(), 'realis-aero-sd-'));
const sdBuild = async (source, dest) => {
  const sd = new StyleDictionary({ usesDtcg: true, source, log: { verbosity: 'silent', warnings: 'warn' }, platforms: { css: { transformGroup: 'css', buildPath: out + '/', files: [{ destination: dest, format: 'css/variables' }] } } });
  await sd.buildAllPlatforms(); return readFileSync(join(out, dest), 'utf8');
};
for (const theme of THEMES) {
  const source = ['core', theme, 'density-comfortable'].map(s => DIST + `dtcg/${s}.json`);
  let text = null, error = null; try { text = await sdBuild(source, `${theme}.css`); } catch (e) { error = e.message; }
  check(text !== null, `style dictionary builds core + ${theme} + density without a broken alias or a collision`, error ?? '');
  if (text) {
    const count = (text.match(/^\s+--[\w-]+:/gm) || []).length;
    check(count === allNames.length && !/[{}]\w/.test(text.replace(/:root\s*\{|\}\s*$/g, '')), `style dictionary (${theme}): all ${allNames.length} tokens come out as variables with every alias resolved`, `${count} variables`);
    const v = n => (text.match(new RegExp(`--${n}:\\s*([^;]+);`)) || [])[1]?.trim();
    const want = { light: ['rgb(255, 254, 250)', '#fffefa'], dark: ['rgb(13, 47, 69)', '#0d2f45'], outdoor: ['rgb(255, 254, 250)', '#fffefa'] }[theme];
    check(want.includes(v('color-surface')) && v('primitive-aero-blue-800') === '#174a63', `style dictionary (${theme}): color.surface is ${want[1]} and the primitive aero-blue 800 is #174a63`, `${v('color-surface')} / ${v('primitive-aero-blue-800')}`);
  }
}
{
  // The negative control: a broken alias must be refused, or the passes above prove nothing.
  const bad = JSON.parse(readFileSync(DIST + 'dtcg/light.json', 'utf8')); bad.color.surface.$value = '{primitive.no-such.000}';
  const badFile = join(out, 'broken.json'); writeFileSync(badFile, JSON.stringify(bad));
  let refused = false; try { await sdBuild([DIST + 'dtcg/core.json', badFile, DIST + 'dtcg/density-comfortable.json'], 'broken.css'); } catch { refused = true; }
  check(refused, 'style dictionary refuses a set with a broken alias (the negative control)');
}

// ---- 6. React Native
console.log('react native');
const mod = await import(pathToFileURL(DIST + 'realis-aero.native.js').href + '?v=' + Date.now());
const dts = readFileSync(DIST + 'realis-aero.native.d.ts', 'utf8');
const exportsList = Object.keys(mod);
check(exportsList.length === 14 && exportsList.every(k => dts.includes(`export declare const ${k}:`)), 'native: every export has a type declaration', exportsList.join(','));
const colourRe = /^(#[0-9a-f]{6}|rgba\(\d+, \d+, \d+, [\d.]+\))$/;
const keySets = THEMES.map(t => Object.keys(mod.themes[t].color).join());
check(new Set(keySets).size === 1 && Object.keys(mod.themes.light.color).length === allNames.filter(n => n.startsWith('--color-')).length, 'native: the three themes have the same color keys', String(Object.keys(mod.themes.light.color).length));
for (const t of THEMES) {
  const th = mod.themes[t], bad = [];
  for (const g of ['color', 'state', 'chart']) for (const [k, val] of Object.entries(th[g])) if (!colourRe.test(val)) bad.push(`${g}.${k}=${val}`);
  check(bad.length === 0, `native (${t}): every colour is a hex or rgba string`, bad.slice(0, 3).join(', '));
  const css = cssValues[t], wrong = [];
  for (const [k, val] of Object.entries(th.color)) { const name = '--color-' + k.replace(/[A-Z]/g, c => '-' + c.toLowerCase()); const want = classify(['color', 'x'], css[name]).$value; if (want !== val) wrong.push(`${name}: ${want} vs ${val}`); }
  for (const [k, val] of Object.entries(th.state)) { const name = '--state-' + k.replace(/[A-Z]/g, c => '-' + c.toLowerCase()); const want = classify(['state', 'x'], css[name]).$value; if (want !== val) wrong.push(`${name}: ${want} vs ${val}`); }
  check(wrong.length === 0, `native (${t}): every color and state token equals the CSS value Chromium computes`, wrong.slice(0, 3).join(' | '));
  check(Object.keys(th.shadow).join() === '1,2,3,4' && Object.values(th.shadow).every(s => typeof s.shadowColor === 'string' && Number.isFinite(s.shadowRadius) && Number.isFinite(s.elevation) && s.shadowOffset.height >= 1), `native (${t}): four shadows as style objects`);
  const lowest = (pairs, min) => pairs.filter(([a, b]) => contrast(parseColor(th.color[a] ?? th.state[a]), parseColor(th.color[b])) < min).map(p => p.join(' on '));
  const need = t === 'outdoor' ? 7 : 4.5;
  const failing = lowest([['textPrimary', 'surface'], ['textSecondary', 'surface'], ['textMuted', 'surface'], ['textMuted', 'background'], ['dangerText', 'surface'], ['textOnAction', 'actionPrimary']], need);
  check(failing.length === 0, `native (${t}): the exported colours keep their contrast (${need}:1 for text) when read back from the numbers`, failing.join(', '));
}
check(mod.themes.outdoor.glass.streamIdle === 0 && mod.themes.light.glass.streamIdle === 0.2, 'native: the glass lines are 0.2 in light and 0 in outdoor, where glass is solid');
check(mod.space[4] === 16 && mod.radius.md === 12 && mod.radius.pill === 999 && mod.fontSize['body-sm'] === 14 && mod.stroke.hairline === 0.5 && mod.blur.md === 14 && mod.opacity.disabled === 0.42, 'native: lengths are numbers and match the CSS', JSON.stringify([mod.space[4], mod.radius.md, mod.fontSize['body-sm']]));
check(mod.motion.fast === 140 && Object.values(mod.motionReduced).every(x => x === 0) && same(mod.easing.engineered, [0.2, 0.8, 0.2, 1]), 'native: durations are milliseconds, reduced motion is all zero, easings are control points');
check(mod.density.comfortable.controlH === 36 && mod.density.compact.controlH === 28 && mod.density.touch.controlH === 44 && mod.density.touch.rowH === 48, 'native: the three densities', JSON.stringify(mod.density.touch));
check(mod.fontFamily.sans[0] === 'Source Sans 3' && mod.fontFamily.mono[0] === 'Source Code Pro', 'native: the font stacks lead with the bundled faces');
check(Object.keys(mod.primitives).length === 9 && mod.primitives.aeroBlue['800'] === '#174a63' && Object.values(mod.primitives).flatMap(f => Object.values(f)).every(c => colourRe.test(c)), 'native: nine primitive families, all colour strings');
check(same(mod.glassBlur, { clear: 8, frosted: 14, dense: 18, alert: 12 }), 'native: the glass blur radii, as a starting point for a native blur view', JSON.stringify(mod.glassBlur));

await browser.close();
console.log(failed ? `\n${failed} failing check(s), ${passed} passed` : `\nAll ${passed} export checks pass.`);
process.exit(failed ? 1 : 0);
