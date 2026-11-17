# Realis Aero

A design system for a future that can actually be built: optimistic because it is measurable, beautiful because it is honest, and calm because it is built to be maintained.

By Naji Zouiti.

## Contents

| Path | What it is |
|---|---|
| [`realis-aero.md`](realis-aero.md) | The document (v0.4): principles, tokens, tonal ladder, state system, themes, components, implementation, verification |
| [`tokens/realis-aero.tokens.css`](tokens/realis-aero.tokens.css) | Design tokens in three tiers (primitive, semantic, component) for light, dark and outdoor, with forced colors, print, reduced motion and reduced transparency |
| [`specimen/index.html`](specimen/index.html) | A working page showing every surface and state. Add `?theme=light`, `?theme=dark`, `?theme=outdoor` or `?transparency=reduced` |
| [`specimen/screenshots/`](specimen/screenshots/) | Review renders: each theme, grayscale, forced colors, print, 200% zoom |
| [`tools/`](tools/) | The checks |

## Checks

```sh
npm run check:tokens   # WCAG contrast for every token pair, per theme
npm run check:cvd      # chart series under simulated colour-vision deficiency
npm install && npx playwright install chromium
npm run check:render   # browser checks on the specimen; writes the screenshots
npm run check          # all of the above
```

The workflow in `.github/workflows/checks.yml` runs the same checks on every change to the tokens, the specimen or the tools.
