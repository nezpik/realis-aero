#!/usr/bin/env node
// Every character the specimen actually draws as text must be in a bundled
// face, so no device falls back to a system font and changes the shape of a
// digit, a sign or a unit. Latin text is checked against Source Sans 3 (and
// Source Code Pro where the mono face draws it), Arabic against Noto Sans
// Arabic, reading the WOFF2 character maps directly. Marks are SVG, so they
// cannot fall back.
// Usage: node tools/check-glyphs.mjs

import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { cmapOf } from './lib/woff2-cmap.mjs';

const { chromium } = createRequire(import.meta.url)('playwright');
const root = fileURLToPath(new URL('..', import.meta.url));
const faces = {
  'Source Sans 3': cmapOf(root + 'fonts/source-sans-3-upright.woff2'),
  'Source Code Pro': cmapOf(root + 'fonts/source-code-pro-upright.woff2'),
  'Noto Sans Arabic': cmapOf(root + 'fonts/noto-sans-arabic.woff2'),
};

const browser = await chromium.launch();
let failed = 0, checked = 0;
const PAGES = [['index.html', '?theme=light'], ['index.html', '?theme=dark'], ['index.html', '?theme=outdoor'], ['settings.html', ''], ['glass.html', '?theme=light'], ['sheet.html', '?theme=light&open=1']];
for (const [file, query] of PAGES) {
  const theme = file + query;
  const page = await browser.newPage();
  await page.goto(pathToFileURL(root + 'specimen/' + file).href + query);
  await page.evaluate(() => document.fonts.ready);
  if (file === 'settings.html') for (const lang of ['fr', 'ar']) { await page.check(`input[name="language"][value="${lang}"]`); await page.evaluate(() => document.fonts.ready); }
  // Characters per computed first font family (mono vs sans), as drawn.
  const drawn = await page.evaluate(() => {
    const out = {};
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n; (n = walker.nextNode());) {
      const el = n.parentElement;
      if (el.closest('script, style, svg > defs') || !el.getClientRects().length) continue;
      const family = getComputedStyle(el).fontFamily.split(',')[0].replace(/["']/g, '').trim();
      (out[family] ??= new Set());
      for (const ch of n.textContent) if (ch.trim() && !/[‎‏]/.test(ch)) out[family].add(ch);
    }
    return Object.fromEntries(Object.entries(out).map(([k, v]) => [k, [...v].join('')]));
  });
  for (const [family, chars] of Object.entries(drawn)) {
    for (const ch of chars) {
      const cp = ch.codePointAt(0);
      const arabic = cp >= 0x600 && cp <= 0x6ff || cp >= 0xfb50 && cp <= 0xfeff;
      const face = arabic ? 'Noto Sans Arabic' : family;
      const map = faces[face];
      checked++;
      if (!map) { failed++; console.log(`FAIL ${theme}: "${ch}" (U+${cp.toString(16)}) is set in "${family}", which is not a bundled face`); continue; }
      if (!map.has(cp)) { failed++; console.log(`FAIL ${theme}: "${ch}" (U+${cp.toString(16).toUpperCase()}) is not in ${face}`); }
    }
  }
  await page.close();
}
await browser.close();
console.log(failed ? `\n${failed} uncovered character(s) of ${checked}` : `\nAll ${checked} drawn characters are covered by a bundled face.`);
process.exit(failed ? 1 : 0);
