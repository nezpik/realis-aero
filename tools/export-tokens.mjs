#!/usr/bin/env node
// Exports the Realis Aero tokens from tokens/realis-aero.tokens.css, the single source of truth, to:
//
//   tokens/dist/dtcg/*.json              Design Tokens Community Group JSON, one set per theme and density,
//                                        aliases kept (a semantic token points at its primitive).
//   tokens/dist/tailwind.preset.cjs      A Tailwind preset whose values are the CSS variables, so a theme or
//                                        density switch changes every utility at run time.
//   tokens/dist/realis-aero.native.js    React Native values: resolved colours as strings, lengths as numbers,
//   tokens/dist/realis-aero.native.d.ts  shadows as style objects, durations in ms. With types.
//
// Usage: node tools/export-tokens.mjs           write the files
//        node tools/export-tokens.mjs --check   fail if the files on disk differ from the CSS (a stale export)

import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { loadThemes } from './lib/tokens.mjs';
import { parseColor } from './lib/color.mjs';

export const DIST = fileURLToPath(new URL('../tokens/dist/', import.meta.url));

// ---------------------------------------------------------------------------------------------------------
// Reading the CSS
// ---------------------------------------------------------------------------------------------------------
const { themes, blocks } = loadThemes();
const THEMES = ['light', 'dark', 'outdoor'];
const coreBlock = blocks.find(b => b.selectors.length === 1 && b.selectors[0] === ':root' && b.media === '' && b.decls['--equilibrium-white-000']);
const densityBlock = name => blocks.find(b => b.selectors.includes(`[data-density="${name}"]`) && b.media === '').decls;
const reducedMotion = blocks.find(b => b.media.startsWith('@media (prefers-reduced-motion')).decls;
const isDensity = n => n.startsWith('--density-');
const allNames = Object.keys(themes.light);
// A core token that a theme overrides (outdoor switches the glass lines off) belongs to the theme sets.
const overridden = n => THEMES.some(t => themes[t][n] !== themes.light[n]);
const CORE = Object.keys(coreBlock.decls).filter(n => !overridden(n));
const THEME_TOKENS = allNames.filter(n => !CORE.includes(n) && !isDensity(n));

const ALIAS = /^var\((--[\w-]+)\)$/;
function substitute(scope, text) {
  return text.replace(/var\((--[\w-]+)\)/g, (_, n) => {
    if (scope[n] === undefined) throw new Error(`undefined token ${n}`);
    return substitute(scope, scope[n]);
  });
}

// ---------------------------------------------------------------------------------------------------------
// Names: --aero-blue-800 -> primitive.aero-blue.800, --color-surface -> color.surface, ...
// ---------------------------------------------------------------------------------------------------------
const GROUPS = [['color-', 'color'], ['state-', 'state'], ['chart-', 'chart'], ['glass-', 'glass'], ['shadow-', 'shadow'], ['inner-', 'shadow'], ['space-', 'space'], ['radius-', 'radius'],
  ['blur-', 'blur'], ['opacity-', 'opacity'], ['stroke-', 'stroke'], ['text-', 'text'], ['motion-', 'motion'], ['ease-', 'ease'], ['font-', 'font'], ['density-', 'density'], ['c-', 'component']];
export function pathOf(name) {
  const n = name.slice(2), family = n.match(/^(.+)-(\d{3})$/);
  if (family) return ['primitive', family[1], family[2]];
  for (const [prefix, group] of GROUPS) if (n.startsWith(prefix)) return [group, (prefix === 'inner-' ? 'inner-' : '') + n.slice(prefix.length)];
  throw new Error(`no path for ${name}`);
}
const dotted = name => pathOf(name).join('.');
const seen = new Map();
for (const n of allNames) { const k = dotted(n); if (seen.has(k)) throw new Error(`${n} and ${seen.get(k)} share the path ${k}`); seen.set(k, n); }

// ---------------------------------------------------------------------------------------------------------
// Values
// ---------------------------------------------------------------------------------------------------------
const COLOR = /^(#[0-9a-f]{6}|rgba?\([^)]*\))$/i;
export function colorString(value) {
  const [r, g, b, a] = parseColor(value);
  return a === 1 ? '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('') : `rgba(${r}, ${g}, ${b}, ${+a.toFixed(3)})`;
}
const SHADOW = /^(inset\s+)?(-?[\d.]+)(?:px)?\s+(-?[\d.]+)(?:px)?\s+(-?[\d.]+)(?:px)?(?:\s+(-?[\d.]+)(?:px)?)?\s+(.+)$/;
function shadowOf(literal) {
  const m = literal.match(SHADOW);
  if (!m) throw new Error(`cannot read shadow "${literal}"`);
  return { color: colorString(m[6]), offsetX: `${m[2]}px`, offsetY: `${m[3]}px`, blur: `${m[4]}px`, spread: `${m[5] ?? 0}px`, ...(m[1] ? { inset: true } : {}) };
}
const fontList = literal => literal.split(',').map(x => x.trim().replace(/^"|"$/g, ''));
const bezier = literal => literal.match(/cubic-bezier\(([^)]+)\)/)[1].split(',').map(Number);

/** The typed, resolved value of a literal (no var() left in it). */
export function classify(path, literal) {
  const [group, key] = path;
  if (group === 'font') return { $type: 'fontFamily', $value: fontList(literal) };
  if (group === 'ease') return { $type: 'cubicBezier', $value: bezier(literal) };
  if (group === 'motion') return { $type: 'duration', $value: literal };
  if (group === 'shadow') return key === 'tint' ? { $type: 'other', $value: literal } : { $type: 'shadow', $value: shadowOf(literal) };
  if (COLOR.test(literal)) return { $type: 'color', $value: colorString(literal) };
  if (/^-?[\d.]+px$/.test(literal)) return { $type: 'dimension', $value: literal };
  if (/^-?[\d.]+$/.test(literal)) return { $type: 'number', $value: Number(literal) };
  return { $type: 'other', $value: literal };      // a CSS filter such as blur(14px) saturate(1.12)
}

/** A token as DTCG: an alias when the CSS value is just var(--other), otherwise its resolved value. */
function tokenOf(scope, name) {
  const raw = scope[name], path = pathOf(name), typed = classify(path, substitute(scope, raw));
  const alias = raw.match(ALIAS);
  return alias ? { $type: typed.$type, $value: `{${dotted(alias[1])}}` } : typed;
}
function put(tree, path, token) {
  let node = tree;
  for (const part of path.slice(0, -1)) node = node[part] ??= {};
  node[path.at(-1)] = token;
}
function setOf(scope, names, description) {
  const tree = { $description: description };
  for (const n of names) put(tree, pathOf(n), tokenOf(scope, n));
  return tree;
}

// ---------------------------------------------------------------------------------------------------------
// DTCG sets
// ---------------------------------------------------------------------------------------------------------
export function dtcgFiles() {
  const files = {}, sets = [];
  const add = (name, kind, file, tree) => { files[`dtcg/${file}`] = JSON.stringify(tree, null, 2) + '\n'; sets.push({ name, kind, file: `dtcg/${file}` }); };
  add('core', 'core', 'core.json', setOf(themes.light, CORE, 'Primitives and constants. Never change with the theme.'));
  for (const t of THEMES) add(t, 'theme', `${t}.json`, setOf(themes[t], THEME_TOKENS, `Semantic and component tokens for the ${t} theme. Self-contained: it aliases core tokens and its own tokens.`));
  for (const d of ['comfortable', 'compact', 'touch']) add(`density-${d}`, 'density', `density-${d}.json`, setOf(densityBlock(d), Object.keys(densityBlock(d)), `Spacing and size for the ${d} density.`));
  add('reduced-motion', 'preference', 'reduced-motion.json', setOf(reducedMotion, Object.keys(reducedMotion), 'Motion durations when the user asks for reduced motion.'));
  files['dtcg/sets.json'] = JSON.stringify({
    $description: 'Load core first, then one theme set, then one density set; reduced-motion overrides motion when the user asks for it. Aliases resolve across the sets that are loaded.',
    sets,
  }, null, 2) + '\n';
  return files;
}

// ---------------------------------------------------------------------------------------------------------
// Tailwind
// ---------------------------------------------------------------------------------------------------------
const v = name => `var(${name})`;
const nest = (tree, path, value) => { let n = tree; for (const p of path.slice(0, -1)) n = (typeof n[p] === 'object' ? n[p] : (n[p] = {})); const last = path.at(-1); if (typeof n[last] === 'object') n[last].DEFAULT = value; else n[last] = value; };
const ACCENTS = new Set(['energy', 'material', 'success', 'warning', 'danger', 'info', 'live-data']);
function colorPath(group, key) {
  if (group === 'color') {
    if (key === 'background') return ['canvas'];
    if (key === 'surface') return ['surface', 'DEFAULT'];
    if (key.startsWith('surface-')) return ['surface', key.slice(8)];
    if (key.startsWith('text-')) return ['ink', key.slice(5)];
    if (key === 'danger-text') return ['ink', 'danger'];
    if (key.startsWith('border-')) return ['edge', key.slice(7)];
    if (key.startsWith('action-')) return ['action', key.slice(7)];
    if (key === 'focus-ring') return ['focus', 'ring'];
    if (key.startsWith('focus-ring-')) return ['focus', key.slice(6)];
    if (key === 'rail') return ['rail', 'DEFAULT'];
    if (key.startsWith('rail-')) return ['rail', key.slice(5)];
    if (key === 'selected-edge') return ['selected', 'edge'];
    if (key === 'scrim') return ['scrim'];
    if (key.startsWith('disabled-')) return ['disabled', key.slice(9)];
    if (ACCENTS.has(key)) return ['accent', key];
    throw new Error(`no Tailwind colour for color-${key}`);
  }
  if (group === 'state') { const m = key.match(/^(.+)-(mark|text|tint)$/); return ['state', m[1], m[2]]; }
  if (group === 'chart') return ['chart', key];
  if (group === 'glass') return ['glass', key === 'stream-color' ? 'stream' : key.replace(/-bg$/, '')];
  throw new Error(group);
}
export function tailwindPreset() {
  const colors = { transparent: 'transparent', current: 'currentColor', inherit: 'inherit' };
  const x = { spacing: {}, borderRadius: {}, fontSize: {}, fontFamily: {}, boxShadow: {}, transitionDuration: {}, transitionTimingFunction: {}, borderWidth: {}, opacity: {}, backdropBlur: {}, height: {}, minHeight: {} };
  for (const name of allNames) {
    const [group, key, step] = pathOf(name);
    if (group === 'primitive') nest(colors, [key, step], v(name));
    else if (['color', 'state', 'chart'].includes(group)) nest(colors, colorPath(group, key), v(name));
    else if (group === 'glass') {
      if (/^(blur|stream-(idle|live|stale))/.test(key)) { if (key.startsWith('stream-')) x.opacity[key] = v(name); }   // the blur recipe stays CSS: see the Glass section
      else nest(colors, colorPath(group, key), v(name));
    }
    else if (group === 'space') x.spacing[key] = v(name);
    else if (group === 'density') {
      if (key === 'control-h') { x.height.control = v(name); x.minHeight.control = v(name); }
      else if (key === 'row-h') { x.height.row = v(name); x.minHeight.row = v(name); }
      else x.spacing[{ 'gap-intra': 'intra', 'gap-inter': 'inter', 'pad-x': 'pad' }[key]] = v(name);
    }
    else if (group === 'radius') x.borderRadius[key] = v(name);
    else if (group === 'text') x.fontSize[key] = v(name);
    else if (group === 'font') x.fontFamily[key] = v(name);
    else if (group === 'shadow') { if (key !== 'tint') x.boxShadow[key] = v(name); }
    else if (group === 'motion') x.transitionDuration[key] = v(name);
    else if (group === 'ease') x.transitionTimingFunction[key] = v(name);
    else if (group === 'stroke') x.borderWidth[key] = v(name);
    else if (group === 'opacity') x.opacity[key] = v(name);
    else if (group === 'blur') x.backdropBlur[key] = v(name);
    // component tokens (c-*) are aliases of the semantic ones above and are not exported as utilities.
  }
  const preset = { theme: { colors, extend: x } };
  const body = JSON.stringify(preset, null, 2);
  return `// Realis Aero Tailwind preset. GENERATED by tools/export-tokens.mjs from tokens/realis-aero.tokens.css: do not edit.
//
// Every value is a CSS variable, so a theme (data-theme) or a density (data-density) changes every utility at run
// time. Load tokens/realis-aero.tokens.css (and the faces in fonts/) in the app. Notes:
//   - theme.colors REPLACES Tailwind's palette on purpose: Realis Aero has a fixed set of hues, and a product does not add one.
//   - Opacity modifiers (bg-surface/50) do not work with variable colours; use the glass tokens or a state tint.
//   - theme.extend replaces Tailwind's scale for a name it also defines (rounded-sm, rounded-md, ...); spacing keys
//     1 to 24 keep their usual values and now come from the tokens.
//   - Tailwind v3. For v4, load it with @config.
module.exports = ${body};
`;
}

// ---------------------------------------------------------------------------------------------------------
// React Native
// ---------------------------------------------------------------------------------------------------------
const camel = s => s.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());
const px = literal => Number(literal.replace('px', ''));
function nativeShadow(literal) {
  const s = shadowOf(literal), y = px(s.offsetY), blur = px(s.blur), [r, g, b, a] = parseColor(s.color);
  // shadowRadius is about half of a CSS blur radius; Android draws elevation, not this shadow, so elevation follows the y offset.
  return { shadowColor: '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join(''), shadowOffset: { width: px(s.offsetX), height: y }, shadowOpacity: +a.toFixed(3), shadowRadius: blur / 2, elevation: Math.max(1, Math.round(y / 2)) };
}
function nativeValue(scope, name) {
  const path = pathOf(name), literal = substitute(scope, scope[name]), { $type, $value } = classify(path, literal);
  if ($type === 'color') return $value;
  if ($type === 'dimension') return px($value);
  if ($type === 'number') return $value;
  if ($type === 'duration') return Number($value.replace('ms', ''));
  return undefined;
}
export function nativeModule() {
  const themed = {};
  for (const t of THEMES) {
    const scope = themes[t], out = { color: {}, state: {}, chart: {}, glass: {}, component: {}, shadow: {} };
    for (const name of THEME_TOKENS) {
      const [group, key] = pathOf(name);
      if (group === 'shadow') { if (!['tint'].includes(key) && !key.startsWith('inner-')) out.shadow[key] = nativeShadow(substitute(scope, scope[name])); continue; }
      if (!out[group]) continue;
      const value = nativeValue(scope, name);
      if (value !== undefined) out[group][camel(key)] = value;
    }
    themed[t] = out;
  }
  const lit = (n, scope = themes.light) => substitute(scope, scope[n]);
  const pick = (prefix, map = x => x) => Object.fromEntries(CORE.filter(n => n.startsWith(prefix)).map(n => [n.slice(prefix.length), map(lit(n))]));
  const primitives = {};
  for (const n of CORE.filter(n => /-\d{3}$/.test(n)).sort((x, y) => Number(x.slice(-3)) - Number(y.slice(-3)))) { const [, family, step] = pathOf(n); (primitives[camel(family)] ??= {})[step] = colorString(lit(n)); }
  const density = Object.fromEntries(['comfortable', 'compact', 'touch'].map(d => [d, Object.fromEntries(Object.keys(densityBlock(d)).map(n => [camel(n.slice('--density-'.length)), px(densityBlock(d)[n])]))]));
  const glassBlur = Object.fromEntries(allNames.filter(n => n.startsWith('--glass-blur-')).map(n => [n.slice('--glass-blur-'.length), Number(lit(n).match(/blur\(([\d.]+)px\)/)[1])]));
  const modules = {
    primitives,
    space: pick('--space-', px), radius: pick('--radius-', px), fontSize: pick('--text-', px), stroke: pick('--stroke-', px), blur: pick('--blur-', px),
    opacity: pick('--opacity-', Number),
    motion: Object.fromEntries(Object.keys(reducedMotion).map(n => [n.slice('--motion-'.length), Number(lit(n).replace('ms', ''))])),
    motionReduced: Object.fromEntries(Object.keys(reducedMotion).map(n => [n.slice('--motion-'.length), Number(reducedMotion[n].replace('ms', ''))])),
    easing: pick('--ease-', bezier),
    fontFamily: { sans: fontList(lit('--font-sans')), mono: fontList(lit('--font-mono')) },
    density, glassBlur, themes: themed,
  };
  const names = Object.keys(modules);
  const js = `// Realis Aero tokens for React Native. GENERATED by tools/export-tokens.mjs from tokens/realis-aero.tokens.css: do not edit.
//
// Colours are '#rrggbb' or 'rgba(r, g, b, a)' strings, lengths are numbers (density-independent pixels), durations are
// milliseconds, easings are cubic-bezier control points for Easing.bezier(...). Pick a theme and a density:
//   const t = themes[colorScheme === 'dark' ? 'dark' : 'light'];  const d = density.comfortable;
//
// Approximations, because React Native is not CSS:
//   - shadow: shadowRadius is half the CSS blur radius, and elevation (Android) follows the y offset. Neither is exact.
//   - glass: React Native has no backdrop-filter. The tints, plate and edge are here; blur needs a native blur view, and
//     glassBlur gives the CSS radii as a starting point only. Outdoor and reduced transparency should render solid.
//   - fontFamily lists the CSS stack. Register the font files under these names; the faces are open (SIL OFL) and the
//     publishers distribute TTF and OTF builds. The WOFF2 files in fonts/ are for the web.
//   - Not exported: print, forced colors, inset shadows and the CSS-only glass filters.
${names.map(k => `export const ${k} = ${JSON.stringify(modules[k], null, 2)};`).join('\n\n')}
`;
  const ts = value => {
    if (typeof value === 'string') return 'string';
    if (typeof value === 'number') return 'number';
    if (Array.isArray(value)) return `readonly [${value.map(ts).join(', ')}]`;
    return `{ ${Object.entries(value).map(([k, x]) => `readonly ${/^[A-Za-z_$][\w$]*$/.test(k) ? k : JSON.stringify(k)}: ${ts(x)};`).join(' ')} }`;
  };
  const dts = `// GENERATED by tools/export-tokens.mjs: do not edit.\n${names.map(k => `export declare const ${k}: ${ts(modules[k])};`).join('\n')}\n`;
  return { 'realis-aero.native.js': js, 'realis-aero.native.d.ts': dts, _modules: modules };
}

// ---------------------------------------------------------------------------------------------------------
// Everything
// ---------------------------------------------------------------------------------------------------------
export function exportAll() {
  const native = nativeModule(), files = { ...dtcgFiles(), 'tailwind.preset.cjs': tailwindPreset(), 'realis-aero.native.js': native['realis-aero.native.js'], 'realis-aero.native.d.ts': native['realis-aero.native.d.ts'] };
  return { files, native: native._modules };
}
export const meta = { THEMES, CORE, THEME_TOKENS, allNames, themes, densityBlock, reducedMotion, substitute, dotted };

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { files } = exportAll();
  if (process.argv.includes('--check')) {
    const stale = Object.entries(files).filter(([f, text]) => !existsSync(DIST + f) || readFileSync(DIST + f, 'utf8') !== text).map(([f]) => f);
    if (stale.length) { console.log(`Stale export: ${stale.join(', ')}. Run: npm run build:tokens`); process.exit(1); }
    console.log(`The export is current: ${Object.keys(files).length} files.`);
  } else {
    for (const [f, text] of Object.entries(files)) { mkdirSync(dirname(DIST + f), { recursive: true }); writeFileSync(DIST + f, text); }
    console.log(`Wrote ${Object.keys(files).length} files to tokens/dist/.`);
  }
}
