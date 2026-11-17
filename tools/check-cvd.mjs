#!/usr/bin/env node
// Verifies that the chart series stay distinguishable under simulated
// colour-vision deficiency, in every theme: every pair of the five family
// series. Distances are OKLab after Machado (2009) simulation at full
// severity. The forecast series is excluded: it is always dotted with a
// confidence band.
// Usage: node tools/check-cvd.mjs [tokens.css] [--all]

import { CVD_TYPES, distance, simulatedOklab } from './lib/color.mjs';
import { loadThemes, color } from './lib/tokens.mjs';

const MIN_DISTANCE = 0.07;
const args = process.argv.slice(2);
const { themes } = loadThemes(args.find(a => !a.startsWith('--')));
const series = ['generation', 'storage', 'flow', 'eco', 'material'].map(n => `--chart-${n}`);

let failures = 0, count = 0;
for (const [theme, scope] of Object.entries(themes)) {
  const pairs = [];
  for (let i = 0; i < series.length; i++) for (let j = i + 1; j < series.length; j++) pairs.push([series[i], series[j]]);
  console.log(`\n${theme}`);
  for (const type of CVD_TYPES) {
    let worst = { d: Infinity };
    for (const [a, b] of pairs) {
      const d = distance(simulatedOklab(color(scope, a), type), simulatedOklab(color(scope, b), type));
      if (d < worst.d) worst = { d, a, b };
      if (args.includes('--all')) console.log(`    ${type.padEnd(12)} ${d.toFixed(3)}  ${a} ~ ${b}`);
    }
    const ok = worst.d >= MIN_DISTANCE;
    if (!ok) failures++;
    count++;
    console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${type.padEnd(12)} min ${worst.d.toFixed(3)} >= ${MIN_DISTANCE}  (${worst.a} ~ ${worst.b})`);
  }
}
console.log(failures ? `\n${failures} failing check(s) of ${count}` : `\nAll ${count} checks pass: chart series stay distinguishable.`);
process.exit(failures ? 1 : 0);
