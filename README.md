# Realis Aero

A design system for a future that can actually be built: optimistic because it is measurable, beautiful because it is honest, and calm because it is built to be maintained.

By Naji Zouiti.

## Contents

| Path | What it is |
|---|---|
| [`realis-aero.md`](realis-aero.md) | The document (v0.5): principles, tokens, tonal ladder, state system, density, tables, layered state and offline, themes, typography, components, implementation, verification |
| [`tokens/realis-aero.tokens.css`](tokens/realis-aero.tokens.css) | Design tokens in three tiers (primitive, semantic, component) for light, dark and outdoor, with forced colors, print, reduced motion and reduced transparency |
| [`fonts/`](fonts/) | The bundled faces (Source Sans 3, Source Code Pro, Noto Sans Arabic), their `@font-face` file and their SIL Open Font License texts |
| [`specimen/index.html`](specimen/index.html) | A working page showing every surface and state, a keyboard-operable table and a layered-state demo. Add `?theme=light`, `?theme=dark`, `?theme=outdoor`, `?transparency=reduced`, `?density=compact`, `?density=touch` or `?dir=rtl` |
| [`specimen/screenshots/`](specimen/screenshots/) | Review renders: each theme, density, right to left, grayscale, forced colors, print, 200% zoom |
| [`tools/`](tools/) | The checks |

## Checks

```sh
npm run check:tokens   # WCAG contrast for every token pair, per theme
npm run check:cvd      # chart series under simulated colour-vision deficiency
npm install && npx playwright install chromium
npm run check:render   # browser checks on the specimen; writes the screenshots
npm run check:glyphs   # every drawn character is in a bundled face
# Reproduce another machine's rendering, e.g. the CI runner's pixel-snapped glyph advances:
RA_CHROMIUM_ARGS=--font-render-hinting=full npm run check:render
npm run check          # all of the above
```

The workflow in `.github/workflows/checks.yml` runs the same checks on every change to the tokens, the specimen or the tools.

## Licensing note

The specimen bundles Source Sans 3 and Source Code Pro (Adobe) and Noto Sans Arabic (The Noto Project Authors), all under the SIL Open Font License 1.1; the licence texts are in `fonts/`. The Source files are the publishers' own web fonts, unmodified.
