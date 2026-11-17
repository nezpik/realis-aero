#!/usr/bin/env node
// Review renders of the Realis Pale specimen and its illustrations, written to specimen/pale/screenshots/.
// Usage: node tools/capture-pale.mjs
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const root = fileURLToPath(new URL('..', import.meta.url)), out = root + 'specimen/pale/screenshots/';
mkdirSync(out, { recursive: true });
const page0 = pathToFileURL(root + 'specimen/pale.html').href, art0 = pathToFileURL(root + 'specimen/pale-art.html').href;
const browser = await chromium.launch();
const open = async (url, o = {}) => { const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, ...o }); const p = await ctx.newPage(); await p.goto(url); await p.addStyleTag({ content: '.bar { position: static !important; }' }); await p.waitForTimeout(500); return p; };
const wrote = [];
async function shot(p, name, opts = {}) { await p.screenshot({ path: out + name + '.png', ...opts }); wrote.push(name); }

for (const h of ['dusk', 'late', 'deep']) {
  const p = await open(page0 + '?hour=' + h);
  await shot(p, 'hero-' + h, { clip: { x: 0, y: 0, width: 1440, height: 900 } });
  await shot(p, 'page-' + h, { fullPage: true });
  await p.context().close();
  const a = await open(art0 + '?hour=' + h); await shot(a, 'illustrations-' + h, { fullPage: true }); await a.context().close();
}
{ // last light
  const p = await open(page0 + '?hour=dusk&theme=last-light'); await shot(p, 'hero-last-light', { clip: { x: 0, y: 0, width: 1440, height: 900 } }); await shot(p, 'page-last-light', { fullPage: true }); await p.context().close();
  const a = await open(art0 + '?hour=dusk&theme=last-light'); await shot(a, 'illustrations-last-light', { fullPage: true }); await a.context().close();
}
{ // a thread written in the Notebook, with its Spark and the Graph, at Late
  const p = await open(page0 + '?hour=late'); await p.fill('#page-body', 'How many ways a thing can be arranged without anyone telling the difference. See [[Information]]. Related: [[Compression]].'); await p.waitForTimeout(520);
  const n = p.locator('#notebook'); await n.scrollIntoViewIfNeeded(); await n.screenshot({ path: out + 'notebook-spark-late.png' }); wrote.push('notebook-spark-late');
  await p.waitForTimeout(2500); const f = p.locator('#field'); await f.scrollIntoViewIfNeeded(); await f.screenshot({ path: out + 'graph-late.png' }); wrote.push('graph-late');
  await p.click('[data-view-btn="list"]'); await f.screenshot({ path: out + 'graph-list-late.png' }); wrote.push('graph-list-late');
  await p.click('[data-mode-btn="read"]'); await p.locator('#notebook').screenshot({ path: out + 'notebook-read-late.png' }); wrote.push('notebook-read-late');
  const k = p.locator('#keeps'); await k.scrollIntoViewIfNeeded(); await k.screenshot({ path: out + 'keeps-late.png' }); wrote.push('keeps-late');
  const s2 = p.locator('#sketch'); await s2.scrollIntoViewIfNeeded(); await s2.screenshot({ path: out + 'sketch-late.png' }); wrote.push('sketch-late');
  await p.context().close();
}
{ // Bench, deep
  const p = await open(page0 + '?hour=deep'); await p.click('#bench-enter'); await p.waitForTimeout(5600); await p.locator('#bench').scrollIntoViewIfNeeded(); await shot(p, 'bench-deep'); await p.context().close();
}
{ // phone, deep
  const p = await open(page0 + '?hour=deep', { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await shot(p, 'phone-hero-deep', { clip: { x: 0, y: 0, width: 390, height: 844 } });
  await p.locator('#field').scrollIntoViewIfNeeded(); await p.locator('#plane').screenshot({ path: out + 'phone-graph-deep.png' }); wrote.push('phone-graph-deep'); await p.context().close();
}
await browser.close();
console.log(`Wrote ${wrote.length} renders to specimen/pale/screenshots/.`);
