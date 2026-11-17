// Read the set of code points a WOFF2 font maps (its cmap), with no dependencies:
// parse the WOFF2 table directory, Brotli-decompress the table stream with Node's
// zlib, and read cmap formats 4 and 12. Used by the glyph-coverage check.

import { readFileSync } from 'node:fs';
import { brotliDecompressSync } from 'node:zlib';

const KNOWN = ['cmap', 'head', 'hhea', 'hmtx', 'maxp', 'name', 'OS/2', 'post', 'cvt ', 'fpgm', 'glyf', 'loca', 'prep', 'CFF ', 'VORG', 'EBDT', 'EBLC', 'gasp', 'hdmx', 'kern', 'LTSH', 'PCLT', 'VDMX', 'vhea', 'vmtx', 'BASE', 'GDEF', 'GPOS', 'GSUB', 'EBSC', 'JSTF', 'MATH', 'CBDT', 'CBLC', 'COLR', 'CPAL', 'SVG ', 'sbix', 'acnt', 'avar', 'bdat', 'bloc', 'bsln', 'cvar', 'fdsc', 'feat', 'fmtx', 'fvar', 'gvar', 'hsty', 'just', 'lcar', 'mort', 'morx', 'opbd', 'prop', 'trak', 'Zapf', 'Silf', 'Glat', 'Gloc', 'Feat', 'Sill'];

function base128(buf, pos) {
  let v = 0;
  for (let i = 0; i < 5; i++) { const b = buf[pos.p++]; v = v * 128 + (b & 0x7f); if (!(b & 0x80)) return v; }
  throw new Error('bad UIntBase128');
}

export function cmapOf(file) {
  const buf = readFileSync(file);
  if (buf.toString('latin1', 0, 4) !== 'wOF2') throw new Error(`${file}: not WOFF2`);
  const numTables = buf.readUInt16BE(12), compressed = buf.readUInt32BE(20);
  const pos = { p: 48 }; const tables = [];
  for (let i = 0; i < numTables; i++) {
    const flags = buf[pos.p++]; const idx = flags & 0x3f; const version = flags >> 6;
    let tag = KNOWN[idx];
    if (idx === 63) { tag = buf.toString('latin1', pos.p, pos.p + 4); pos.p += 4; }
    const orig = base128(buf, pos);
    const transformed = (tag === 'glyf' || tag === 'loca') ? version === 0 : version !== 0;
    const length = transformed ? base128(buf, pos) : orig;
    tables.push({ tag, length });
  }
  const data = brotliDecompressSync(buf.subarray(pos.p, pos.p + compressed));
  let off = 0; let cmap = null;
  for (const t of tables) { if (t.tag === 'cmap') cmap = data.subarray(off, off + t.length); off += t.length; }
  if (!cmap) throw new Error(`${file}: no cmap`);

  const out = new Set();
  const n = cmap.readUInt16BE(2);
  for (let i = 0; i < n; i++) {
    const o = cmap.readUInt32BE(4 + i * 8 + 4); const fmt = cmap.readUInt16BE(o);
    if (fmt === 4) {
      const segX2 = cmap.readUInt16BE(o + 6); const ends = o + 14, starts = ends + segX2 + 2, deltas = starts + segX2, ranges = deltas + segX2;
      for (let s = 0; s < segX2 / 2; s++) {
        const end = cmap.readUInt16BE(ends + s * 2), start = cmap.readUInt16BE(starts + s * 2);
        const delta = cmap.readInt16BE(deltas + s * 2), ro = cmap.readUInt16BE(ranges + s * 2);
        for (let c = start; c <= end && c !== 0xffff; c++) {
          let g;
          if (ro === 0) g = (c + delta) & 0xffff;
          else { const gi = ranges + s * 2 + ro + (c - start) * 2; g = cmap.readUInt16BE(gi); if (g) g = (g + delta) & 0xffff; }
          if (g) out.add(c);
        }
      }
    } else if (fmt === 12) {
      const groups = cmap.readUInt32BE(o + 12);
      for (let gI = 0; gI < groups; gI++) {
        const b = o + 16 + gI * 12; const start = cmap.readUInt32BE(b), end = cmap.readUInt32BE(b + 4), sg = cmap.readUInt32BE(b + 8);
        for (let c = start; c <= end; c++) if (sg + (c - start)) out.add(c);
      }
    }
  }
  return out;
}

// Parse a CSS unicode-range value ("U+0600-06FF, U+FB50-FDFF") into a test function
export function rangeTest(value) {
  if (!value) return () => true;
  const parts = value.split(',').map(s => s.trim().replace(/^U\+/i, '')).filter(Boolean).map(r => {
    if (r.includes('?')) return [parseInt(r.replace(/\?/g, '0'), 16), parseInt(r.replace(/\?/g, 'F'), 16)];
    const [a, b] = r.split('-'); return [parseInt(a, 16), parseInt(b || a, 16)];
  });
  return c => parts.some(([a, b]) => c >= a && c <= b);
}
