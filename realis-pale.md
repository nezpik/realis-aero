---
name: Realis Pale
version: 0.1.0
type: design-direction
status: draft
author: Naji Zouiti
derived-from: Ednocte v0.2 (nezpik/realis-aero, pull request 1)
summary: >-
  A dusk-native design direction for learning alone. Studying and making effort
  outdoors in the evening, unsupervised, unhurried and unwatched, by a light
  that is dim but not going out. Hope here is small, steady and earned.
tags: [edtech, dusk-ui, design-system, brand-philosophy, realis]
tokens:
  color:
    evening: "#161B25"
    shade: "#1D2431"
    overcast: "#262E3D"
    fog: "#313B4C"
    mist: "#6C7992"
    paper: "#E8E4DA"
    ash: "#B9BDC6"
    haze: "#A0A8B6"
    lantern: "#E9C783"
    skyline: "#9DBAD6"
    lichen: "#A5BFA0"
    rose: "#E0A3A0"
    wisp: "#B9ACDC"
  typography:
    display: "Source Sans 3"
    reading: "Source Serif 4"
    body-ui: "Source Sans 3"
    mono: "Source Code Pro"
    scale-ratio: 1.25
    base-size: 16px
  spacing:
    base: 4px
    rhythm: 8px
  radius:
    sm: 8px
    md: 12px
    lg: 16px
    xl: 24px
    pill: 999px
  motion:
    fast: 200ms
    base: 400ms
    slow: 800ms
    drift: 1400ms
    ease: cubic-bezier(0.25, 0.6, 0.3, 1)
---

# REALIS PALE: Design Direction v0.1

> *6:40 PM, late in the year. The light has mostly gone from the sky but not
> all of it: a pale band stays along the roofline. On the steps outside the
> library someone has a notebook open on their knee, reading by the lamp over
> the door and by the glow of a phone turned low. Nobody is checking. Nobody is
> waiting for an answer. The page is slow going, and they are still on it.*
>
> *That is Realis Pale.*

Realis Pale is the quiet sibling of [Realis Aero](realis-aero.md). Realis Aero
is for systems that are measured and maintained in daylight. Realis Pale is for
the person who is trying to get better at something, alone, after the day's
obligations have ended, with little certainty that it will work. It keeps the
Realis rule that every optimistic cue is backed by something real, and applies
it to hope: **the hope in Realis Pale is the smallest light that is still on,
and it is never promised to be bigger.**

This document derives from Ednocte, the night-study direction in pull request
1. It keeps the person, the solitude and the outdoors, and it changes the hour,
the temperature, the light and the attitude. Section 1 explains how.

---

## 1. Reading Ednocte, and what changes

### 1.1 What Ednocte says

Ednocte is a design philosophy for education technology built on eight
beliefs: learning does not belong to the classroom; the night belongs to the
curious; anonymity is freedom; feeling is part of the curriculum; the library
has dissolved into the air; ideas come from looking at lights; rogue means
asking no one's permission; and personal comes before scalable. Its image is a
person on a bench in an empty park at 11:47 PM, face lit by a phone, with neon
bleeding into wet asphalt. Its product vocabulary is Beacon, Route, Signal,
Booth, Window and Lamplight. Its palette is night blue with six neon accents,
its signature is depth as emitted light instead of shadow, and its voice is the
one awake friend, a little rogue and never a cheerleader.

### 1.2 The vision underneath, in detail

Seven ideas carry the file. They are what Realis Pale keeps.

| # | Idea in Ednocte | Why it matters to the vision |
|---|---|---|
| 1 | **Learning outside institutions** | Real learning is self-chosen and happens in the gaps: on the way home, on a bench, after hours. The product serves those moments, not a timetable. |
| 2 | **Solitude as the condition** | One person, one table, one hour. The design speaks to a single reader and refuses the average. |
| 3 | **No audience** | Anonymity is a relief. No name called, no hand raised, no grade waiting, and the strangers walking past are not watching. Privacy is the premise, not a setting. |
| 4 | **Feeling is the medium** | Loneliness, ambition and hunger are acknowledged instead of designed away. The product behaves like the one awake friend, not like software. |
| 5 | **Self-direction** | No gatekeeper decides what is worth wondering about tonight. Learning that serves no requirement is the purest kind. |
| 6 | **Light that means something** | Vast calm dark and rare points of glow, each one meaningful. Nothing glows for decoration. |
| 7 | **Restraint in reward** | No confetti, no guilt streaks, no XP. Warmth when the person is low-lit, quiet when they need quiet. |

Three tensions in the original are worth naming, because Realis Pale resolves
them differently.

1. **Defiance versus tenderness.** Ednocte frames solitary study as *rogue*:
   rebellion with taste, neon, an edge. That fits someone who is escaping
   something. It fits less well someone who is simply tired, unsure and
   persevering. The mood Realis Pale wants is not defiance but *persistence
   without witnesses*.
2. **Brightness versus hope.** Ednocte's hope is lit neon: cyan at 11:1,
   magenta flares, glows up to 64px. That is stimulating, and it can read as
   energy rather than as hope. Hope that is dim is a different feeling: the
   light is low and may be all there is, and it is enough to see the next line.
3. **A city of other minds versus being unseen.** Ednocte borrows comfort from
   lit windows, as proof that other people exist. Realis Pale keeps the windows
   but does not lean on them: the comfort is that no one needs to be watching,
   not that someone is.

### 1.3 What Realis Pale keeps, changes and drops

| | Ednocte | Realis Pale |
|---|---|---|
| **Hour** | After midnight: 11:47 PM, 2 AM | The evening: blue hour into early night. The pale band is still on the roofline. |
| **Place** | Park bench, diner booth, wet city street | Library steps, bus shelter, a balcony, a park path, a school wall. Quiet edges of a town, lit by one lamp. |
| **Attitude** | Rogue, rebellious, off-map | Unobserved, unhurried, unpressured. Persistence, not rebellion. |
| **Light** | Neon: cyan, magenta, violet, 6 accents, glows to 64px | Lamp and afterglow: pale amber and cool sky, 3 working accents plus 2 quiet ones, glow capped low |
| **Surfaces** | Near-black night blue (`#070A12` and up) | A dim dusk blue-grey (`#161B25` and up): lighter, softer, never black |
| **Hope** | Energy and ignition | A small steady flame: *Kindle*, not *ignite* |
| **Effort** | Ambition at midnight | Slow, honest effort: progress shown as what is lit, never as what is missing |
| **Motion** | Light sweeps, neon flicker | Slower and gentler: kindling, a slow breath, a path drawing itself |
| **Reward** | Lamplight streak that fades | A *Wick* that dims and never goes out, with no loss messaging |
| **Voice** | Late-night, a little rogue | Evening, plain and kind, a little tired, never cheerful on command |
| **Typography** | Space Grotesk, Inter, Source Serif 4, JetBrains Mono | Source Sans 3, Source Serif 4, Source Code Pro (the first and last are already bundled in this repository) |
| **Kept as it was** | Anonymity as a premise, depth as light and not shadow, one accent per region, serif for reading and sans for the interface, nothing glows for decoration, an exit that is always visible, no gamification spam, accessibility as a hard gate | |

What is dropped on purpose: neon, cyberpunk cues, wet pavement and glitch,
flicker, the rotated rogue sticker, magenta "flare" and cyan as a brand colour,
and the `dusk` colour that Ednocte itself had to restrict because it failed
contrast for body text.

---

## 2. Manifesto

**Realis Pale** = *Realis* (the feasible, the real) + *pale* (the colour that is
left when the light is going, and the state of a thing that is not yet lit).

A design direction for people who study and work at something alone, outdoors,
in the evening, with no one supervising and no deadline pressing, and who keep
going anyway.

### The eight beliefs

**1. No one is watching, and that is a gift.**

There is no teacher on the other side of the screen, no cohort ahead of you, no
score being kept for someone else. The first thing the product owes the person
is that it is on their side of the table. What they read, how slowly they read
it and what they get wrong are not reported to anyone. Where a product must
share something, it says so plainly, asks first and makes the default private.

**2. The evening is the person's own hour.**

The day was borrowed: work, school, errands, other people's calendars. When it
ends there is a short stretch, the light low and the obligations done, that is
finally theirs. It is not midnight and it is not glamorous. It is the walk home
that goes the long way, the bench near the station, the table by the window. Realis
Pale is built for that hour, and it does not ask the person to stay up late to
earn it.

**3. Your pace is the pace.**

There is no right speed. A page that takes forty minutes is a page read. The
product never tells someone they are behind, because there is no "ahead" to be
behind. It offers where they left off, a gentle estimate of the next small step,
and a way to stop without loss. A deadline exists only if the person set it.

**4. Hope is a small light, and a small light is enough.**

The mood is dim hope: not triumph, not despair, not cheer. One lamp is on. It
shows the next line, the next problem, the next step of the path. The interface
is honest that the light is low and does not pretend it is dawn. Every screen
has one thing lit, and that one thing is true.

**5. Effort is worth seeing, not grading.**

Trying hard alone is lonely work with little feedback. The product's job is to
make real effort visible to the person who is making it, as a path that is
lit as far as they have walked, and nothing else. It does not rank, compare or
reward. It notices.

**6. Struggle is part of the material.**

Confusion, tiredness and a second attempt are not errors to be designed away
or cheered through. A hard page is a hard page. The product leaves room for
it: no timers counting down, no forced encouragement, no "you've got this!" that
the person has not asked to hear. When it speaks, it speaks plainly.

**7. Light that means something.**

The dusk is mostly dim and a few things glow. Each glow is a decision: this is
where you are, this is what you can act on, this is what you have done. Nothing
glows for decoration. The interface does not decorate with light; it *means*
with it.

**8. Personal before scalable.**

This direction is for one person, one bench, one evening. It does not try to be
tolerable to everyone. It is unmistakable to the few who know exactly what it is
to reread a paragraph under a lamp when no one would ever know if they gave up.

### Compressed: the five working principles

1. **Unobserved by default.** Nothing about a person's learning is reported,
   ranked or shown to anyone without their say.
2. **Their pace, their hour.** No deadlines the person did not set, no "behind".
3. **One lamp on.** One lit thing per region; hope is the smallest true light.
4. **Effort is noticed, not graded.** Progress is shown as what is lit.
5. **Plain and kind.** The evening voice: no cheering on command, no alarm, no guilt.

### Product vocabulary (use these names in the product)

| Name | Meaning | Replaces (Ednocte) |
|---|---|---|
| **Lantern** | Primary action: the lit sign that says "continue here" | Beacon |
| **Path** | A learning path: a dotted line with lamp-posts at milestones, lit as far as you have walked | Route |
| **Glimmer** | A notification: a faint, brief light, off by default | Signal |
| **Bench** | Focus and reading mode: the lamp over the door and nothing else | Booth |
| **Pane** | A dashboard card: one lit window in a quiet building | Window |
| **Wick** | Consistency: a small flame that dims when you are away and is still there when you return | Lamplight |

---

## 3. Colour System

### 3.1 Surfaces: the dusk (about 60%)

Never black. The sky after sunset is a deep blue-grey, and the surfaces keep
that colour. Layers rise a little in lightness, the way ground rises toward the
roofline. Realis Pale surfaces are slightly **lighter** than a night theme so
that the screen feels dim, not dark: a low evening, not a cave.

| Token | Hex | Role |
|---|---|---|
| `evening` | `#161B25` | App background, the sky |
| `shade` | `#1D2431` | Base surface: cards, sheets, bars |
| `overcast` | `#262E3D` | Raised surface: popovers, hover |
| `fog` | `#313B4C` | Highest surface: pressed and selected |
| `mist` | `#6C7992` | Borders, control edges, dividers |

### 3.2 Text: what the lamp reaches (about 30%)

Text is warm paper, not white. It is bright enough to read, and no brighter.

| Token | Hex | Role | on `evening` | on `shade` | on `overcast` | on `fog` |
|---|---|---|---|---|---|---|
| `paper` | `#E8E4DA` | Primary text | 13.58 | 12.26 | 10.74 | 8.89 |
| `ash` | `#B9BDC6` | Secondary text, captions | 9.16 | 8.27 | 7.24 | 6.00 |
| `haze` | `#A0A8B6` | Tertiary: timestamps, placeholders | 7.20 | 6.50 | 5.69 | 4.71 |

Every text colour reaches 4.5:1 on every surface, so no tier needs the
restriction Ednocte had to put on its `dusk` colour. Contrast is a ratio
computed from the hex values with the WCAG formula; it is not a statement about
how the screen looks outdoors in the evening.

### 3.3 Light: the glow (about 10%)

The accents are lamps. Fewer than in Ednocte, and softer.

| Token | Hex | Meaning | on `evening` | on `shade` | on `overcast` |
|---|---|---|---|---|---|
| `lantern` | `#E9C783` | Hope and the primary action: lamp light, pale amber | 10.65 | 9.61 | 8.41 |
| `skyline` | `#9DBAD6` | Interactive and informational: the last of the sky | 8.56 | 7.73 | 6.77 |
| `lichen` | `#A5BFA0` | Done, steady, calm success | 8.67 | 7.83 | 6.85 |
| `rose` | `#E0A3A0` | Difficulty and errors: dusty, never alarm red | 8.14 | 7.35 | 6.44 |
| `wisp` | `#B9ACDC` | Generative or assistive features | 8.21 | 7.41 | 6.49 |

- **Text on a filled accent**: `evening` on `lantern` is 10.65:1 and `evening`
  on `skyline` is 8.56:1. A filled control uses the dark surface for its label,
  never white.
- **Edges and controls** use `mist`: 3.93:1 on `evening`, 3.55:1 on `shade` and
  3.11:1 on `overcast`, above the 3:1 that non-text parts need. Borders on `fog`
  are not specified; a pressed control carries a `lantern` or `skyline` edge.
- **Surface steps are subtle on purpose**: `shade` over `evening` is 1.11:1,
  `overcast` over `shade` is 1.14:1 and `fog` over `overcast` is 1.21:1. A layer
  is told apart by its edge or its light, never by lightness alone, and that is
  a known limit of dim palettes.

### 3.4 Usage rules

- **60-30-10, adapted**: 60% dusk surfaces, 30% text and structure, 10% light.
- **One lit thing per region.** Usually `lantern` or `skyline`; the rest is
  punctuation. A screen with three bright things has no light, only noise.
- **Accents are never body text colour.** They mark action, state and life.
- **Meaning never rests on colour alone**: pair every accent with a shape, a
  label or a position. `rose` and `lichen` must never be the only difference
  between a good and a hard state.
- **Errors stay calm**: `rose` plus plain copy that says what happened and what
  can be done. The evening does not raise its voice.

### 3.5 Last Light: the daytime variant

A light variant exists for daylight, for print and for people who read better
on pale. It is not a white classroom: it is warm paper at the end of the day.
Same accents' roles, same soul.

| Token | Hex | Role |
|---|---|---|
| `linen` | `#ECE8DF` | Background |
| `parchment` | `#F5F2EA` | Base surface |
| `stone` | `#DDD8CC` | Inset wells only |
| `ink` | `#1D2432` | Primary text |
| `ink-soft` | `#444E60` | Secondary text |
| `ink-faint` | `#5B6577` | Tertiary text |
| `amber` | `#7C5410` | Lantern text and marks |
| `sky` | `#2C5780` | Interactive text and marks |
| `moss` | `#3F6A3F` | Done |
| `clay` | `#8A3F3B` | Difficulty and errors |
| `edge` | `#767E90` | Borders and control edges |

| Pair | `linen` | `parchment` | `stone` |
|---|---|---|---|
| `ink` | 12.72 | 13.90 | 10.93 |
| `ink-soft` | 6.86 | 7.50 | 5.90 |
| `ink-faint` | 4.81 | 5.25 | 4.13 |
| `amber` | 5.48 | 5.99 | 4.71 |
| `sky` | 6.17 | 6.75 | 5.31 |
| `moss` | 5.13 | 5.61 | 4.42 |
| `clay` | 6.02 | 6.58 | 5.17 |
| `edge` | 3.33 | 3.64 | 2.86 |

- **Rules from the table**: `stone` carries only `ink`, `ink-soft`, `amber`,
  `sky` and `clay`; `ink-faint` and `moss` sit on `linen` or `parchment`; edges
  are drawn on `linen` or `parchment` only. `ink` on the `lantern` fill is
  9.60:1.
- Layers are 1.09:1 (`parchment` over `linen`) and 1.27:1 (`stone` over
  `parchment`), so edges and light, not lightness, separate them here too.

---

## 4. Typography

Quiet, readable and warm. The system speaks in three voices:

| Role | Font | Where | Why |
|---|---|---|---|
| **Interface and display** | Source Sans 3 | Headings, controls, labels, numbers | A humanist sans: plain and unhurried. Already bundled in `fonts/` under the SIL Open Font License. |
| **Reading** | Source Serif 4 | Lessons, articles, long text | The book voice. Same designer family as Source Sans 3. Open licence, **not yet bundled** in this repository. |
| **Code and IDs** | Source Code Pro | Code, shortcuts, timestamps | Bundled; digits share one width and confusable characters differ. |

**The rule**: *the interface is the path (sans), the knowledge is the lit page
(serif).* When the person is reading to learn, the serif takes over and the
chrome recedes.

### Scale (major third, base 16)

| Step | Size | Line height | Tracking | Font and weight |
|---|---|---|---|---|
| display | 40px | 1.15 | -1% | Source Sans 3 500 |
| h1 | 32px | 1.2 | -0.5% | Source Sans 3 520 |
| h2 | 24px | 1.3 | 0 | Source Sans 3 520 |
| h3 | 20px | 1.4 | 0 | Source Sans 3 520 |
| reading | 18px | 1.7 | 0 | Source Serif 4 400 |
| body-ui | 16px | 1.5 | 0 | Source Sans 3 400 |
| small | 14px | 1.5 | +1% | Source Sans 3 400 |
| caption | 13px | 1.4 | +2% | Source Sans 3 450, `ash` |
| mono | 14px | 1.5 | 0 | Source Code Pro 400 |

Evening reading comfort: reading text at 18px with line height 1.65 to 1.75, a
measure of 58 to 68 characters, and paragraph spacing of at least 1em. Never
justify text. The display step is lighter and smaller than a night-neon system's
would be, because this is a low voice.

---

## 5. Spacing, Grid, Shape

- Base unit **4px**, working rhythm **8px**.
- Component padding: 16 / 20 / 24. Screen gutters: 20px on a phone, 32px on a
  desktop.
- Section spacing is **generous**: 64px at least between major sections. The
  emptiness is part of the mood: a quiet street.
- Mobile first. The phone on a bench or a bus shelter is the primary context:
  one-handed, thumb reach, low brightness. Desktop is the table by the window:
  same light, more air.
- Grid: 4 columns on a phone, 8 on a tablet, 12 on a desktop, 24px gutters. There
  is **no rogue element**: the page keeps its grid, because the mood is steadiness.

### Radius

| Token | Value | Use |
|---|---|---|
| `sm` | 8px | Tags, chips, inputs |
| `md` | 12px | Buttons, small cards |
| `lg` | 16px | Cards, sheets |
| `xl` | 24px | Modals, hero panels |
| `pill` | 999px | Lantern buttons, nav items, search |

Radii are soft everywhere, because dusk light diffuses.

---

## 6. Elevation and Glow: a dim light, not a shadow

Depth is shown as **emitted light**, not grey shadow, as in Ednocte; a grey
shadow on a dusk surface reads as dirt. Here the light is *low*: glows are warm,
small, and capped, so that nothing ever reads as neon.

Three mechanisms, in order:

1. **Surface lift**: one step up the surface scale (`shade` to `overcast`).
2. **Edge light**: a 1px top-inner highlight, like lamp light on a ledge:
   ```css
   box-shadow: inset 0 1px 0 rgba(232, 228, 218, 0.05);
   ```
3. **Glow**: tinted by the element's accent, low alpha, never wider than 40px:

| Token | Value | Use |
|---|---|---|
| `glow-1` | `0 0 12px rgba(233, 199, 131, 0.14)` | Hover and focus on interactive parts |
| `glow-2` | `0 0 24px rgba(233, 199, 131, 0.20)` | The Lantern at rest, an active Pane |
| `glow-3` | `0 0 40px rgba(233, 199, 131, 0.26)` | The one moment of arrival: a path finished |
| `glow-sky` | `0 0 12px rgba(157, 186, 214, 0.16)` | Focus on informational parts |

- **Focus rings**: `2px solid` accent plus `glow-1`. Focus is never removed; in a
  dim interface, focus is the light.
- A glow is never the only thing that marks a state: it comes with a shape or a
  label. Whether the glows are visible outdoors in the evening has not been
  tested; the low alphas are a design choice, not a measurement.

---

## 7. Atmosphere

A flat dark surface feels sterile. Realis Pale surfaces carry a little *air*, and
only a little:

- **Afterglow band**: a soft horizontal gradient at the top of hero screens, from
  `#2B2D3A` fading to `evening` across about 160px, the pale band left on the
  roofline. Decorative.
- **Grain**: SVG noise, 2% opacity at most, `mix-blend-mode: overlay`, fixed.
- **Vignette**: a radial darkening of the page edges by about 6%, one pool of
  lamp light.
- **Distant windows**: at most two small warm points (4 to 6px, blur 3px, 6% to 8%
  opacity) in the corners of a hero. Other people's lamps, far off, never the
  subject.

No bokeh orbs, no wet-pavement reflections, no light sweeps. All atmosphere layers
are decorative: `aria-hidden`, `pointer-events: none`, and removed under
`prefers-reduced-transparency`. A layer that can be *seen* as a layer is too loud.

---

## 8. Motion

The evening is slow. Motion is soft, weighted and rare.

| Token | Duration | Use |
|---|---|---|
| `fast` | 200ms | Presses, toggles, hovers |
| `base` | 400ms | Cards, sheets, fades |
| `slow` | 800ms | Path progress, page changes |
| `drift` | 1400ms | The slow breath of the Lantern |

Easing: `cubic-bezier(0.25, 0.6, 0.3, 1)`: a gentle decelerate, like coming to
rest.

**Signature motions**
- **Kindle**: active nav icons light gradually: stroke to fill with `glow-1` over
  400ms. Loading states kindle in the same way: a lamp warming, one slow rise,
  and then steady. Never a flicker, and it always resolves.
- **Breath**: the Lantern at rest eases between full and 0.82 opacity over about
  4 seconds. It is the only continuous motion in the product, and it stops when
  the person is reading.
- **Path draw**: progress paths draw themselves with `stroke-dashoffset`, 800ms.
- **Dusk change**: switching between Pale and Last Light cross-fades surfaces over
  `slow`; it never flashes.

Under `prefers-reduced-motion`, kindle and path draw become a 100ms opacity
change, and breath stops: the Lantern stays at full opacity. The evening is still
there; it just stops moving.

---

## 9. Iconography

- Style: **outlined, 1.5px stroke, rounded caps and joins**: unlit lamps.
- Grid: 24 by 24, 2px padding, live area at least 20 by 20.
- **The lamp rule**: the default state is an outline in `ash`. The active state is
  filled, in an accent, with `glow-1`. The lamp is lit by state, never by default.
- No duotone, no filled-by-default icons. Pair icons with labels below 44px; icons
  alone only in the bottom nav, which carries labels.

---

## 10. Components

### Lantern (primary action)
- Pill, `lantern` fill, `evening` label, Source Sans 3 520, 48px tall on a phone
  and 44px on a desktop. Label: *Continue*, *Begin*, *Pick it up*.
- Hover: `glow-2` and brightness 1.04. Press: scale 0.985 and `glow-1`.
- Only **one** Lantern per view. If everything is a lantern, there is no light to
  walk toward.

### Pane (card)
- `shade` surface, 1px `mist` border, radius `lg`, padding 20px.
- Hover: surface to `overcast`, `glow-1` in the card's accent.
- *Lit* variant: a 3px `lantern` bar on the inline-start edge as a real border,
  for the one item that is in progress. Never more than one per list.

### Path (progress)
- A dotted line (2px dots, 8px gap, `mist`), with a lamp-post node at every
  milestone.
- Walked nodes: filled `lantern` with `glow-1`. The current node: `skyline`, with
  a slow breath. Nodes ahead: outline only. **The path is lit as far as the person
  has walked, and no further.** There is no count of what is left, no percentage
  by default and no estimate of time behind them.

### Wick (consistency)
- A small flame mark and a seven-night strip. A night with effort is warm
  (`lantern`, opacity 0.9); a quiet night is dimmer (0.4). It dims, it never
  shatters, and the dimmest state is still visible.
- The Wick **never** says what was lost. Returning after a gap shows the flame
  where it was: *"Still here."*

### Glimmer (notification)
- **Off by default.** No badges, no red dots, no sound, and nothing after local
  20:00 unless the person has asked for it.
- When allowed: a faint `glow-1` on the nav icon, one slow pulse, then rest. The
  content appears in an `overcast` sheet, radius `xl`, sliding up over 400ms.
- No Glimmer ever says "you're falling behind", nor counts days.

### Bench (focus mode)
- Full-screen `evening`, chrome fading to 30% after 4 seconds idle, serif reading
  type at 18px, measure 62 characters, optionally a faint lamp glow at the top.
- The exit is always visible. The bench is a choice, never a trap. No countdown,
  no break reminders unless the person turned them on.

### Inputs
- `evening` field on `shade`, 1px `mist`, radius `sm`, 48px tall.
- Focus: border to `skyline`, `glow-sky`, label rises in `skyline`.
- Placeholder: `haze`. Error: `rose` border plus plain copy below the field.

### Empty states
- A small line illustration (1.5px, `ash`): an empty bench under a lamp, a lit door
  at the top of some steps, a path that goes on past the edge.
- One line of plain copy and one action: *"Nothing here yet. It will be here
  when you come back."*

### Difficulty states
- When a person answers wrongly or leaves a page unfinished: no red flash, no
  buzzer. `rose` mark, a label ("Not yet"), and a way to look again. A hard
  evening is allowed.

---

## 11. Imagery and Art Direction

- **Photography**: the evening outdoors: blue hour, a single lamp, lit stairwells,
  library steps, a bus shelter, a balcony with a book, rain on a window with a lamp
  behind it. People *absorbed*, not posing: seen from the side or behind, hands on
  a page. No eye contact with the camera, no group shots.
- **Treatment**: shadows pushed to `evening`, highlights warmed toward `lantern`.
  Low contrast, a little grain. The picture is dim on purpose and keeps its detail
  in the shadows.
- **Forbidden**: stock classrooms, whiteboards, smiling thumbs-up, graduation
  caps, white desks, lightning bolts and rocket ships. Also forbidden: neon,
  anything that implies victory, and crowds of encouraging faces.
- **Illustration**: the 1.5px line language of the icons, `ash` lines, one `lantern`
  glow per illustration at most.

---

## 12. Voice and Tone

Second person, evening, plain and kind. Short sentences. The product is the one
quiet person still up at the next table: warm, a little tired, never a
cheerleader, never a coach.

- ✅ *"Pick it up where you left off. Two pages in."*
- ✅ *"That one was hard. It will still be here."*
- ✅ *"You came back. The light was still on."*
- ✅ *"No one is waiting for this."*
- ❌ *"Amazing job!! 🎉 You've earned 50 XP!"*
- ❌ *"Don't lose your streak!"*
- ❌ *"You're 3 days behind your plan."*
- ❌ *"Join 12,000 learners studying right now!"*

Lowercase is allowed in ambient and empty-state copy for intimacy, and never in
actions, errors or anything that needs clarity. At most one emoji, never in a
system state. The product never speaks about the person's hope for them: it
offers a next step and lets the person feel what they feel.

---

## 13. Pressure-free rules

These are the behavioural counterpart of the colour rules, and they are hard
gates in the same way:

1. **No supervision channel.** No teacher, parent or manager view, no leaderboard,
   no peer comparison, no public profile, no "who else is studying" by default.
   Where a product has to report (a school, an employer), the report is disclosed
   before the person starts, is opt-in, and the person can see exactly what is
   sent.
2. **No clock the person did not wind.** No deadline, countdown, timer or "time
   left" unless the person set it. Estimates are offered as "about 10 minutes to
   the next lamp", never as "you should".
3. **No loss mechanics.** No streak that resets, no lost points, no message that
   names what was missed. Absence dims the Wick and nothing more.
4. **No scoring by default.** Answers are checked for the person's own
   information. A result is not a grade and is not stored for anyone else.
5. **Leave and return freely.** Closing mid-page saves the place. Coming back
   never opens with a reminder of how long it has been.
6. **Quiet by default.** Glimmers off, sound off, nothing after 20:00 unless
   asked, and one switch turns all of it off.
7. **The exit is always visible.** Every focus view, sheet and flow can be left,
   and leaving never costs anything.

These are product commitments, not visual properties. They can only be shown to
hold by testing a real product with real accounts; nothing in this document
verifies them.

---

## 14. Accessibility (non-negotiable)

Dim palettes fail accessibly by default. These rules are hard gates:

- Body text at least 4.5:1, large text at least 3:1, on every surface it can sit
  on. Every pairing in sections 3.2 and 3.3 reaches 4.5:1 on `evening`, `shade`
  and `overcast`; `haze` on `fog` is 4.71:1, the lowest text pair.
- Non-text parts (borders, icons, focus rings, control edges) at least 3:1 against
  the adjacent surface: `mist` gives 3.93, 3.55 and 3.11:1 on the three base
  surfaces.
- Accents are never the only carrier of meaning: pair with an icon, a label or a
  position.
- Focus is always visible: a 2px ring plus glow, with `:focus-visible`
  everywhere.
- Touch targets at least 44 by 44px, because it is one-handed, on a bench, in low
  light.
- `prefers-reduced-motion`, `prefers-reduced-transparency` and
  `prefers-contrast: more` are supported. Under more contrast, surfaces flatten to
  `evening` and `shade`, borders go to `paper`, and glows are replaced by 2px solid
  borders. Under forced colours, glows and atmosphere are removed and edges use
  system colours.
- Pale is the default; Last Light (section 3.5) passes the same gates with the
  figures shown there.
- Semantic HTML, real labels, and screen-reader text for any meaningful light.
  Atmosphere layers are hidden from assistive technology.
- **Dim interfaces and brightness**: outdoors in the evening, an uncomfortably
  bright screen is the main failure. Pale supports a **lower-brightness mode**
  (all light tokens at 85% alpha, surfaces unchanged), which must still reach
  4.5:1. That contrast has not been computed yet; it is a gate before release.

---

## 15. Anti-patterns: what Realis Pale is NOT

1. ❌ A white or primary-colour classroom.
2. ❌ Neon, cyberpunk, glitch, scanlines: that is Ednocte's night, not this dusk.
3. ❌ Pure `#000` with bright text: halation and eye strain.
4. ❌ Gamification: XP, badges, confetti, countdowns, guilt streaks.
5. ❌ A corporate learning dashboard: a dozen KPI cards and a pie chart.
6. ❌ Grey drop shadows: depth is light, never fog.
7. ❌ More than one Lantern per view, or more than one lit thing per region.
8. ❌ Forced positivity: "You've got this!", motivational quotes, cheering.
9. ❌ Surveillance dressed as care: progress shared with anyone by default,
   "your teacher can see", activity feeds.
10. ❌ Noise for its own sake: grain and glow you can *see* as grain and glow.

---

## 16. Design tokens: implementation

### CSS custom properties

```css
:root {
  /* surfaces */
  --rp-evening: #161B25;
  --rp-shade: #1D2431;
  --rp-overcast: #262E3D;
  --rp-fog: #313B4C;
  --rp-mist: #6C7992;
  /* text */
  --rp-paper: #E8E4DA;
  --rp-ash: #B9BDC6;
  --rp-haze: #A0A8B6;
  /* light */
  --rp-lantern: #E9C783;
  --rp-skyline: #9DBAD6;
  --rp-lichen: #A5BFA0;
  --rp-rose: #E0A3A0;
  --rp-wisp: #B9ACDC;
  /* glow */
  --rp-glow-1: 0 0 12px rgba(233, 199, 131, 0.14);
  --rp-glow-2: 0 0 24px rgba(233, 199, 131, 0.20);
  --rp-glow-3: 0 0 40px rgba(233, 199, 131, 0.26);
  --rp-glow-sky: 0 0 12px rgba(157, 186, 214, 0.16);
  --rp-edge-light: inset 0 1px 0 rgba(232, 228, 218, 0.05);
  /* type */
  --rp-font-ui: "Source Sans 3", "Noto Sans Arabic", system-ui, sans-serif;
  --rp-font-reading: "Source Serif 4", Georgia, serif;
  --rp-font-mono: "Source Code Pro", ui-monospace, monospace;
  /* space and shape */
  --rp-space: 4px;
  --rp-radius-sm: 8px;  --rp-radius-md: 12px;
  --rp-radius-lg: 16px; --rp-radius-xl: 24px;
  /* motion */
  --rp-ease: cubic-bezier(0.25, 0.6, 0.3, 1);
  --rp-fast: 200ms; --rp-base: 400ms; --rp-slow: 800ms; --rp-drift: 1400ms;
}

:root[data-theme="last-light"] {
  --rp-evening: #ECE8DF;  /* linen */
  --rp-shade: #F5F2EA;    /* parchment */
  --rp-overcast: #DDD8CC; /* stone */
  --rp-mist: #767E90;     /* edge */
  --rp-paper: #1D2432;    /* ink */
  --rp-ash: #444E60;      /* ink-soft */
  --rp-haze: #5B6577;     /* ink-faint */
  --rp-lantern: #7C5410;  /* amber */
  --rp-skyline: #2C5780;  /* sky */
  --rp-lichen: #3F6A3F;   /* moss */
  --rp-rose: #8A3F3B;     /* clay */
}

@media (prefers-reduced-motion: reduce) {
  :root { --rp-fast: 100ms; --rp-base: 100ms; --rp-slow: 100ms; --rp-drift: 0ms; }
}
```

In Last Light the role names stay and the values change, so a component written
against `--rp-evening`, `--rp-paper` and `--rp-lantern` follows the theme. A
filled Lantern in Last Light uses the pale amber fill `#E9C783` with the `ink`
label (9.60:1), which is a component token and not one of the semantic ones
above; a product that implements this needs a `--rp-lantern-fill` token for it.

### DTCG / W3C JSON (excerpt)

```json
{
  "color": {
    "surface": { "evening": { "$value": "#161B25", "$type": "color" }, "shade": { "$value": "#1D2431", "$type": "color" } },
    "text": { "paper": { "$value": "#E8E4DA", "$type": "color" }, "ash": { "$value": "#B9BDC6", "$type": "color" } },
    "light": { "lantern": { "$value": "#E9C783", "$type": "color" }, "skyline": { "$value": "#9DBAD6", "$type": "color" } }
  },
  "shadow": { "glow-1": { "$value": { "color": "rgba(233, 199, 131, 0.14)", "offsetX": "0px", "offsetY": "0px", "blur": "12px", "spread": "0px" }, "$type": "shadow" } }
}
```

For a full export in the Realis Aero style (three tiers, themes, a Tailwind preset
and a native module), the tokens above would be moved into a token file and run
through the same exporter; that has not been done.

---

## 17. Status, verification and limits

What was done in drafting v0.1:

- **Contrast**: every pair in sections 3.2, 3.3 and 3.5 was computed from its hex
  values with the WCAG relative-luminance formula, using `tools/lib/color.mjs` in
  this repository. The figures in the tables are those results.

What has **not** been done, and should not be assumed:

- **No specimen and no render checks.** Nothing here has been drawn in a browser,
  so layering, glow visibility, focus rings, grain, the afterglow band and the
  forced-colour and print behaviour are design intent, not measured results.
- **No automated check.** The contrast numbers will not update if a token changes;
  there is no script tying this file to a token file.
- **Dim readability outdoors is untested.** The numbers say a screen *can* be
  read; they say nothing about reading it in real evening light, at low
  brightness, with tired eyes. That needs people and devices.
- **Colour-vision simulation has not been run** on the accents. The accents are
  never the only carrier of meaning by rule, but their separability under
  deuteranopia and protanopia has not been measured.
- **The Source Serif 4 face is not bundled** in this repository, so a reading
  surface falls back to Georgia until it is.
- **The pressure-free rules (section 13) are commitments.** They can be verified
  only in a product, with real accounts, by checking what is sent and shown.
- **The dim hope mood itself is untested with people.** Whether the palette,
  motion and voice read as hope and not as sadness is a design hypothesis. It
  needs interviews with people who actually study this way.

---

## 18. Implementation checklist

- [ ] Fonts loaded: Source Sans 3 and Source Code Pro (bundled), Source Serif 4 (to
      bundle, SIL Open Font License)
- [ ] Token layer shipped as CSS variables plus DTCG JSON; Tailwind theme generated
      from the tokens, as Realis Aero does
- [ ] Atmosphere as a single reusable layer, `aria-hidden`, off under reduced
      transparency
- [ ] Glow tokens mapped to one utility; grey `box-shadow` banned by lint
- [ ] One Lantern per view enforced in the component (a development warning)
- [ ] Focus ring component mandatory; automated accessibility checks in CI, zero
      critical violations
- [ ] Reduced-motion variants for kindle, breath and path draw
- [ ] Last Light passes the same contrast gates in a computed check, in CI
- [ ] Lower-brightness mode: contrast computed and passing before release
- [ ] Colour-vision simulation run on `lantern`, `skyline`, `lichen`, `rose`, `wisp`
- [ ] The pressure-free rules written as acceptance tests for the product
- [ ] Interviews with people who study alone in the evening, before v0.2

---

*Realis Pale v0.1: a small light, kept on. Derived from Ednocte v0.2. Vision
holder and author: Naji Zouiti.*
