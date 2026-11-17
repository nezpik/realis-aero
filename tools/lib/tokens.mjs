// Reads the Realis Aero token file and resolves every token per theme.

import { readFileSync } from 'node:fs';
import { parseColor } from './color.mjs';

export const DEFAULT_TOKENS = new URL('../../tokens/realis-aero.tokens.css', import.meta.url);

/** Flat list of rule blocks: { media, selectors[], decls{} }. */
export function parseBlocks(css) {
  const src = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const out = [];
  const stack = [];
  let start = 0;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (ch === '{') {
      stack.push({ prelude: src.slice(start, i).trim(), from: i + 1 });
      start = i + 1;
    } else if (ch === '}') {
      const top = stack.pop();
      if (!top.prelude.startsWith('@')) {
        const media = stack.map(s => s.prelude).filter(p => p.startsWith('@media') || p.startsWith('@supports')).join(' ');
        const decls = Object.fromEntries(
          [...src.slice(top.from, i).matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map(m => [m[1], m[2].trim()]));
        out.push({ media, selectors: top.prelude.split(',').map(s => s.trim()), decls });
      }
      start = i + 1;
    } else if (ch === ';') start = i + 1;
  }
  return out;
}

const THEMES = ['light', 'dark', 'outdoor'];

/** { light, dark, outdoor } → { token: raw value }, plus the blocks for extra checks. */
export function loadThemes(file = DEFAULT_TOKENS) {
  const blocks = parseBlocks(readFileSync(file, 'utf8'));
  const plain = b => b.media === '' || b.media === '@media screen';
  const merge = test => Object.assign({}, ...blocks.filter(b => plain(b) && test(b)).map(b => b.decls));
  const has = sel => b => b.selectors.includes(sel);
  const base = merge(b => has(':root')(b) || has('[data-theme]')(b));
  const themes = { light: { ...base, ...merge(has('[data-theme="light"]')) } };
  for (const t of THEMES.slice(1)) themes[t] = { ...themes.light, ...merge(has(`[data-theme="${t}"]`)) };
  return { themes, blocks };
}

export function resolve(scope, name, seen = new Set()) {
  if (seen.has(name)) throw new Error(`cycle at ${name}`);
  seen.add(name);
  const v = scope[name];
  if (v === undefined) throw new Error(`undefined token ${name}`);
  const m = v.match(/^var\((--[\w-]+)\)$/);
  return m ? resolve(scope, m[1], seen) : v;
}

export const color = (scope, name) => parseColor(resolve(scope, name));
