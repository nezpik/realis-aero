#!/usr/bin/env node
// Builds docs/realis-aero.pdf from realis-aero.md: a cover, a one-page summary, a table of contents, the whole
// document and the review renders, in the bundled faces. Usage: node tools/build-pdf.mjs
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { marked } from 'marked';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const root = fileURLToPath(new URL('..', import.meta.url));
const AUTHOR = 'Naji Zouiti';
const md = readFileSync(root + 'realis-aero.md', 'utf8');
const version = (md.match(/^# Realis Aero Design System v([\d.]+)/m) || [])[1];
const month = (md.match(/\*\*Date\*\*: ([A-Za-z]+ \d{4})/) || [])[1];

// Heading ids the way the document links to them: lower case, punctuation dropped, spaces to hyphens.
const slug = s => s.toLowerCase().replace(/<[^>]+>/g, '').replace(/&amp;/g, '').replace(/[^\p{L}\p{N}\s-]/gu, '').trim().replace(/\s/g, '-');
const toc = [];
const renderer = new marked.Renderer();
renderer.heading = function ({ tokens, depth }) {
  const text = this.parser.parseInline(tokens), id = slug(text.replace(/&#39;/g, ''));
  if (depth === 2) toc.push({ id, text });
  return `<h${depth} id="${id}">${text}</h${depth}>\n`;
};
renderer.image = ({ href, text }) => `<figure><img src="${pathToFileURL(root + href).href}" alt="${text}"><figcaption>${text}</figcaption></figure>`;
const body = marked.parse(md.slice(md.indexOf('\n## ') + 1), { renderer, gfm: true });

const css = readFileSync(root + 'fonts/realis-aero.fonts.css', 'utf8').replace(/url\("/g, `url("${pathToFileURL(root + 'fonts/').href}`);
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Realis Aero Design System v${version}</title><meta name="author" content="${AUTHOR}"><style>
${css}
@page { size: A4; margin: 20mm 18mm 20mm 18mm; }
body { font: 10pt/1.5 "Source Sans 3", sans-serif; color: #071d2b; font-variant-numeric: tabular-nums; }
h1, h2, h3, h4 { font-weight: 560; break-after: avoid; color: #0d2f45; }
h2 { font-size: 20pt; margin: 0 0 10pt; padding-top: 4pt; border-top: 2pt solid #174a63; break-before: page; }
h3 { font-size: 14pt; margin: 18pt 0 6pt; } h4 { font-size: 11.5pt; margin: 14pt 0 4pt; }
p, li { orphans: 3; widows: 3; } a { color: #174a63; text-decoration: none; }
code { font: 8.6pt "Source Code Pro", monospace; background: #f3ede1; padding: 0 2pt; border-radius: 2pt; }
pre { background: #f3ede1; padding: 7pt; border-radius: 3pt; white-space: pre-wrap; overflow-wrap: anywhere; break-inside: avoid-page; } pre code { background: none; padding: 0; font-size: 8pt; line-height: 1.4; }
table { border-collapse: collapse; width: 100%; margin: 8pt 0; font-size: 8.6pt; } th, td { border: .5pt solid #b8ac96; padding: 3pt 5pt; vertical-align: top; text-align: start; }
th { background: #f3ede1; } tr { break-inside: avoid; } thead { display: table-header-group; }
figure { margin: 10pt 0; break-inside: avoid; } img { max-width: 100%; border: .5pt solid #b8ac96; } figcaption { font-size: 8.5pt; color: #3b474c; }
blockquote { margin: 8pt 0; padding-inline-start: 10pt; border-inline-start: 2pt solid #b87912; }
.cover { height: 250mm; display: flex; flex-direction: column; justify-content: center; break-after: page; }
.cover .kicker { font: 560 10pt "Source Sans 3"; letter-spacing: .12em; text-transform: uppercase; color: #235f7a; }
.cover h1 { font-size: 40pt; line-height: 1.05; font-weight: 500; margin: 8pt 0 14pt; letter-spacing: -.02em; }
.cover .sub { font-size: 14pt; max-width: 125mm; color: #3b474c; } .cover .by { margin-top: 40mm; font-size: 11pt; } .cover .by b { font-weight: 560; display: block; font-size: 15pt; }
.cover .bar { height: 4pt; width: 60mm; background: linear-gradient(90deg, #174a63, #35bdb2 60%, #e3a72f); margin-top: 14pt; }
.glance h2 { break-before: auto; } .glance { break-after: page; } .glance td:first-child { width: 32mm; font-weight: 560; }
.toc { break-after: page; } .toc h2 { break-before: auto; } .toc ol { columns: 2; column-gap: 12mm; padding-inline-start: 18pt; font-size: 10pt; } .toc li { margin: 3pt 0; }
</style></head><body>
<section class="cover"><div class="kicker">Design system specification</div><h1>Realis Aero</h1><div class="bar"></div><p class="sub">A design system for a feasible future: its vision, its tokens, its materials and its measured proof.</p>
<div class="by">Author and vision holder<b>${AUTHOR}</b>Version ${version} · ${month}</div></section>
<section class="glance"><h2>At a glance</h2>
<p>Realis Aero is a design philosophy for a future that can actually be built. Its beauty comes from visible engineering, measurable systems, repairable materials and environmental realism. It is not a nostalgic Frutiger Aero revival: glass is functional and layered, nature is a measured system, motion is damped and purposeful, and the future is feasible progress, not a dream.</p>
<table><tr><th>Vision</th><td>Six principles: feasibility is beauty; honest translucency; earned optimism; repairable beauty; measured nature-tech symbiosis; no escapism. Every optimistic cue is backed by an engineering cue.</td></tr>
<tr><th>Tokens</th><td>One file, <code>tokens/realis-aero.tokens.css</code>, in three tiers: primitives (<code>--aero-blue-800</code>), semantic (<code>--color-surface</code>), component (<code>--c-button-primary-bg</code>). Components use semantic and component tokens only; themes re-point semantic tokens and nothing else.</td></tr>
<tr><th>Themes</th><td>Light, dark and outdoor (7:1 contrast), plus forced colors, print, reduced motion and reduced transparency. Density (comfortable, compact, touch) is one token switch.</td></tr>
<tr><th>State</th><td>Every state is drawn with a shape mark and a text label, never colour alone. Live, stale, offline, degraded, maintenance, success and uncertainty are specified, with collision rules.</td></tr>
<tr><th>Components</th><td>Tables with a measured keyboard model, layered state with Apply, Reset, Revert, Undo and offline queueing, glass with reading plates, a Ruled Sheet and Writing Workspace, and settings.</td></tr>
<tr><th>Type</th><td>Source Sans 3, Source Code Pro and Noto Sans Arabic, bundled under the SIL Open Font License; tabular digits; right to left through logical properties.</td></tr>
<tr><th>Export</th><td>DTCG JSON for Figma tooling and Style Dictionary, a Tailwind v3 preset and a React Native module, generated from the token file.</td></tr>
<tr><th>Proof</th><td>Five scripts hold the claims to measurement: WCAG contrast for every token pair, colour-vision simulation of the chart series, real-browser render checks, glyph coverage, and the export checks. The document states what they cannot tell us.</td></tr></table></section>
<section class="toc"><h2>Contents</h2><ol>${toc.map(t => `<li><a href="#${t.id}">${t.text}</a></li>`).join('')}</ol></section>
${body}</body></html>`;

const dir = mkdtempSync(join(tmpdir(), 'realis-aero-pdf-'));
const file = join(dir, 'realis-aero.html'); writeFileSync(file, html);
const browser = await chromium.launch(), page = await browser.newPage();
await page.goto(pathToFileURL(file).href); await page.evaluate(() => document.fonts.ready);
await page.pdf({ path: root + 'docs/realis-aero.pdf', format: 'A4', printBackground: true, displayHeaderFooter: true,
  headerTemplate: '<span></span>', footerTemplate: `<div style="font:8px 'Source Sans 3',sans-serif;color:#555;width:100%;padding:0 18mm;display:flex;justify-content:space-between"><span>Realis Aero v${version} · ${AUTHOR}</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>`,
  margin: { top: '20mm', bottom: '20mm', left: '18mm', right: '18mm' }, tagged: true, outline: true });
await browser.close();
// Chromium leaves the Author field empty, so set the document information here.
execFileSync('python3', ['-I', '-c', `import sys, pypdf
r = pypdf.PdfReader(sys.argv[1]); w = pypdf.PdfWriter(clone_from=r)
w.add_metadata({'/Author': sys.argv[2], '/Title': sys.argv[3], '/Subject': 'Design system specification', '/Keywords': 'Realis Aero, design system, tokens, accessibility', '/Creator': 'tools/build-pdf.mjs'})
w.write(sys.argv[1])`, root + 'docs/realis-aero.pdf', AUTHOR, `Realis Aero Design System v${version}`]);
console.log(`Wrote docs/realis-aero.pdf (${toc.length} sections).`);
