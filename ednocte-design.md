---
name: Ednocte
version: 0.2.0
type: design-direction
status: draft-v2
author: Naji
summary: >-
  A night-native design philosophy for education technology. Learning as a
  personal, emotional, rogue act — done at night, in the city, alone, lit by
  neon and sodium lamps instead of fluorescent classrooms.
tags: [edtech, dark-ui, design-system, nocturne, brand-philosophy]
tokens:
  color:
    void: "#070A12"
    asphalt: "#0D1220"
    slate: "#151D31"
    curb: "#1E2942"
    haze: "#2A3854"
    moon: "#E8EDF7"
    streetlamp: "#A7B4CE"
    dusk: "#67769A"
    signal: "#4DE1FF"
    lamplight: "#FFB454"
    flare: "#FF5CA8"
    pulse: "#9D7BFF"
    mint: "#4DE1A6"
    ember: "#FF6B6B"
  typography:
    display: "Space Grotesk"
    body-ui: "Inter"
    reading: "Source Serif 4"
    mono: "JetBrains Mono"
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
    fast: 150ms
    base: 300ms
    slow: 600ms
    drift: 900ms
    ease: cubic-bezier(0.22, 1, 0.36, 1)
---

# EDNOCTE — Design Direction v0.1

> *11:47 PM. The park is empty except for one bench under a sodium lamp.
> Someone is there, face lit by a phone, reading a doc. The diner on the
> corner keeps its lights on for nobody in particular. Neon bleeds into
> wet asphalt. Everyone walking past is headed somewhere else — their own
> destiny — and none of them is watching you learn.*
>
> That is Ednocte.

---

## 1. Manifesto

**Ednocte** = *Ed* (education) + *nocte* (Latin: by night).

A design philosophy for the ones who learn at night, outside, alone, lit by
the city — for whom education is not a place you go but a fire you keep.

### The eight beliefs

**1. Learning was never supposed to live in a classroom.**

Somewhere along the way, education got a dress code: white walls, white
backgrounds, primary blues and reds and greens, bells. We were taught to
recognize learning by its furniture. But think of every time an idea
actually found you — almost never at a desk between nine and three. It
found you on the walk home. In the shower. At 2 AM, cold coffee, screen
too bright for the dark. Ednocte starts from that honesty: real learning
happens when the institution isn't looking. So we don't design classrooms.
We design for the moments after them.

**2. The night belongs to the curious.**

Daytime is borrowed time — school, work, obligations, other people's
schedules. When the night settles in and the city exhales, the hours
finally become yours. There is a specific clarity that only exists after
dark: fewer demands, softer sounds, thoughts finally loud enough to hear.
Ednocte is built for those hours. Not because we romanticize exhaustion,
but because that's when curiosity stops performing and starts being true.

**3. Anonymity is freedom.**

On a night street you are nobody, and it's the best thing about you there.
No name called, no hand raised, no grade waiting. The strangers passing
are moving toward their own destinies — every lit window a different life
— and none of them is paying you attention. Their indifference is a gift.
For once there is no audience, so you can want something without
explaining why. Ednocte keeps that privacy sacred. Learning here is not a
performance measured by a dashboard. It's between you and what you're
becoming.

**4. Feeling is part of the curriculum.**

Mainstream edtech treats emotion like interference to be designed away. We
treat it as the medium itself. Ambition at midnight hits differently.
Loneliness makes a question sharper. Hunger turns pages faster than any
deadline ever did. The person reading a doc on a bench in a dimly lit park
isn't a "user" completing tasks — they're someone chasing something, alone,
feeling everything. Ednocte acknowledges mood, hour, and solitude. Warm
when you're low-lit. Quiet when you need quiet. Never confetti. The product
should feel less like software and more like the one awake friend.

**5. The library dissolved into the air.**

Books used to hold knowledge; now it's ambient — in docs, feeds, videos,
models, late-night rabbit holes. Checking a document on a phone under a
park lamp is the new reading room; the diner booth near closing time is
the new library carrel. This is not the death of learning — it's its
escape. Out of books, off the shelves, into hands. Ednocte embraces it in
all directions: formal, self-taught, accidental, obsessive. If it changes
you, it counts.

**6. Ideas come from looking at lights.**

There's a reason thinkers have always walked at night. City lights are
proof of other minds — every lit window someone else's project, every neon
sign meaning made electric. Looking up at them, the mind wanders, and
wandering is where imagination does its real work. Ednocte borrows that
physics: vast calm dark, rare points of glow, each one meaning something.
Our interfaces don't decorate with light. They *mean* with it.

**7. Rogue means asking no one's permission.**

No enrollment. No gatekeeper. No committee deciding what you're allowed
to wonder about tonight. Learning chosen freely at midnight, against no
requirement, is the purest kind — it's desire, not compliance. Ednocte is
on the side of the autodidact, the switcher, the obsessed, the one going
off-map. Rogue, not chaotic: self-direction with craft. Rebellion with
taste.

**8. Personal before scalable.**

This direction is not for everyone, and that is the point. It speaks to
one person, at one table, at one hour. Mass-market edtech must average
everyone into beige; Ednocte refuses the average. We would rather be
unmistakable to the few who *feel* this — who know exactly what a phone
glow on a face in a dark park means — than tolerable to everyone.

### Compressed: the five working principles

For walls, reviews, and quick decisions — the eight beliefs folded small:

1. **The city is the campus.** Space, paths, windows, routes, beacons —
   never classrooms.
2. **Light is meaning.** Anything that glows matters; nothing glows for
   decoration alone.
3. **Intimacy over scale.** One person, one table, one hour — never "users".
4. **Rogue, not chaotic.** Self-directed energy with crafted precision.
5. **Emotion is a feature.** Hour, mood, solitude are acknowledged —
   never spammed, never shouted, never faked.

### Product vocabulary (use these names in the product)

| Token name | Meaning |
|---|---|
| **Beacon** | Primary CTA — the lit sign that says "in here" |
| **Route** | A learning path — dotted line, streetlight nodes |
| **Signal** | A notification — soft glow pulse, quiet by default |
| **Booth** | Focus / reading mode — the diner booth, nothing else exists |
| **Window** | A dashboard card — a lit window in a dark building |
| **Lamplight** | Streaks / consistency rewards — warm, not gamified |

---

## 2. Color System

### 2.1 Surfaces — the night (60%)

Never pure black. Night is blue. Layers lighten as they rise toward the
viewer, like streets → buildings → windows.

| Token | Hex | Role |
|---|---|---|
| `void` | `#070A12` | App background — the night sky |
| `asphalt` | `#0D1220` | Base surface — cards, sheets, nav bars |
| `slate` | `#151D31` | Raised surface — modals, popovers, hover |
| `curb` | `#1E2942` | Highest surface — active/pressed states |
| `haze` | `#2A3854` | Borders, dividers, disabled fills |

### 2.2 Text — what the light touches (30%)

| Token | Hex | Role | Contrast vs `asphalt` |
|---|---|---|---|
| `moon` | `#E8EDF7` | Primary text | ~15:1 ✅ AAA |
| `streetlamp` | `#A7B4CE` | Secondary text, captions | ~9:1 ✅ AA |
| `dusk` | `#67769A` | Tertiary, placeholders, timestamps | ~4.1:1 ⚠️ large text ≥24px only, or decorative |

**Hard rule:** `dusk` is never used for body copy or interactive labels.
Large low-contrast gray areas are forbidden (WCAG 1.4.11).

### 2.3 Light — the neon (10%)

Accents are *beacons*. One accent per screen region, never more.

| Token | Hex | Meaning | Contrast vs `asphalt` |
|---|---|---|---|
| `signal` | `#4DE1FF` | Primary interactive — phone-glow cyan | ~11:1 ✅ |
| `lamplight` | `#FFB454` | Warmth, streaks, success — sodium lamp / diner | ~10:1 ✅ |
| `flare` | `#FF5CA8` | Emotional highlights, hearts, saves | ~6:1 ✅ |
| `pulse` | `#9D7BFF` | AI / generative features | ~6:1 ✅ |
| `mint` | `#4DE1A6` | Success states | ~9:1 ✅ |
| `ember` | `#FF6B6B` | Errors — used sparingly, no alarm-red | ~5.5:1 ✅ |

### 2.4 Usage rules

- **60-30-10, adapted:** 60% night surfaces · 30% text & structure · 10% light.
- One **dominant accent per screen** (usually `signal`); others are punctuation.
- Neon is **never** body text color. Accents mark interaction, emphasis, life.
- Buttons: `void` text on `signal` fill (~12.7:1) — never white-on-neon.
- Errors use `ember` + copy that stays calm. The night doesn't panic.

---

## 3. Typography

The system speaks in three voices:

| Role | Font | Where | Why |
|---|---|---|---|
| **Display** | Space Grotesk | Headers, CTAs, numbers | Geometric, urban, street-tech character |
| **Reading** | Source Serif 4 | Long-form content, lessons, articles | The book voice — literary, personal, "out of books" |
| **UI / Mono** | Inter / JetBrains Mono | Controls, labels, code, timestamps | Invisible when it should be |

**The rule:** *the interface is the street (sans), the knowledge is the
book (serif).* The moment the user is reading to learn, the serif takes
over and chrome fades back.

### Scale (major third, base 16)

| Step | Size | Line height | Tracking | Font |
|---|---|---|---|---|
| display-xl | 64px | 1.05 | -2% | Space Grotesk 600 |
| display | 40px | 1.1 | -1% | Space Grotesk 600 |
| h1 | 32px | 1.2 | -1% | Space Grotesk 600 |
| h2 | 24px | 1.3 | 0 | Space Grotesk 500 |
| h3 | 20px | 1.4 | 0 | Space Grotesk 500 |
| body | 16px | 1.6 | 0 | Source Serif 4 400 |
| body-ui | 16px | 1.5 | 0 | Inter 400 |
| small | 14px | 1.5 | +1% | Inter 400 |
| caption | 12.5px | 1.4 | +2% | Inter 500, `streetlamp` |
| mono | 14px | 1.5 | 0 | JetBrains Mono |

Night-reading comfort: body line-height 1.6–1.7, measure 60–70ch, paragraph
spacing ≥ 1em. Never justify text.

---

## 4. Spacing, Grid, Shape

- Base unit **4px**, working rhythm **8px**.
- Component internal padding: 16 / 20 / 24. Screen gutters: 20px mobile, 32px desktop.
- Section spacing: **generous** — the breathing room of an empty street at 2 AM.
  64px minimum between major sections.
- Mobile-first. The phone-in-the-park is the *primary* context; one-handed,
  thumb-reach. Desktop is the diner table: same atmosphere, more air.
- Grid: 4-col mobile, 8-col tablet, 12-col desktop, 24px gutters.
  `Window` cards snap to the grid; **one rogue element per view may break it**
  (a tilted tag, a sticker-style badge — rotate −3° to −6°, never more).

### Radius

| Token | Value | Use |
|---|---|---|
| `sm` | 8px | Tags, chips, inputs |
| `md` | 12px | Buttons, small cards |
| `lg` | 16px | Cards, sheets |
| `xl` | 24px | Modals, hero panels |
| `pill` | 999px | Buttons, nav items, search |

Soft radii everywhere — light diffuses, it doesn't cut. Sharp corners are
reserved for nothing. If it's Ednocte, it's rounded.

---

## 5. Elevation & Glow — light, not shadow

**Signature move of the system:** depth is expressed as *emitted light*,
never gray drop shadows. A gray shadow on a night surface reads as fog.
Light reads as life.

Three mechanisms, in order:

1. **Surface lift** — one step up the surface scale (`asphalt` → `slate`).
2. **Edge light** — a 1px top-inner highlight, like lamplight hitting a ledge:
   ```css
   box-shadow: inset 0 1px 0 rgba(232, 237, 247, 0.06);
   ```
3. **Glow** — colored, low-alpha, wide. Tinted by the element's accent:

| Token | Value | Use |
|---|---|---|
| `glow-1` | `0 0 16px rgba(77, 225, 255, 0.18)` | Hover / focus on interactive |
| `glow-2` | `0 0 32px rgba(77, 225, 255, 0.28)` | Active element, primary beacon at rest |
| `glow-3` | `0 0 64px rgba(255, 180, 84, 0.32)` | Hero moments, celebrations, lamplight |

Focus rings: `2px solid` accent at 90% + `glow-1`. Focus is never removed —
in the dark, focus *is* the light.

---

## 6. Texture & Atmosphere

Flat dark surfaces feel sterile. Ednocte surfaces carry *air*:

- **Film grain** — SVG `feTurbulence` noise overlay, 2–4% opacity,
  `mix-blend-mode: overlay`, fixed (doesn't scroll). Kills the "SaaS dashboard" feel.
- **Vignette** — radial gradient darkening page edges ~8%, like standing inside
  a single pool of streetlight.
- **Bokeh layer** — 2–3 large blurred accent orbs (120–240px, blur 80px+,
  6–10% opacity) behind hero content. Distant city lights.
- **Wet pavement** — for hero/celebration moments only: a mirrored, flipped,
  blurred gradient reflection under the element, masked to fade within 120px.

All atmosphere layers are decorative: `aria-hidden`, `pointer-events: none`,
and disabled under `prefers-reduced-transparency`.

---

## 7. Motion

The city moves at its own pace. Motion is slow, weighted, and calm.

| Token | Duration | Use |
|---|---|---|
| `fast` | 150ms | Presses, toggles, hovers |
| `base` | 300ms | Cards, sheets, fades |
| `slow` | 600ms | Route progress, page transitions |
| `drift` | 900ms | Bokeh movement, ambient loops |

Easing: `cubic-bezier(0.22, 1, 0.36, 1)` (ease-out, decelerate like a passing car).

**Signature motions:**
- **Light sweep** — page transitions render as a soft band of light passing
  across, like a car's headlights sweeping a dark room.
- **Flicker** — loading states flicker like a neon tube warming up
  (2–3 opacity dips, then steady). Max 1.2s, always resolves.
- **Ignite** — active nav icons "light up": stroke → fill + glow-1, 300ms.
- **Route draw** — progress paths draw themselves (SVG `stroke-dashoffset`).

Under `prefers-reduced-motion`: all of the above become 100ms opacity fades.
Ambient loops stop entirely. The night is still there — it just stops moving.

---

## 8. Iconography

- Style: **outlined, 1.5px stroke, rounded caps/joins** — unlit neon tubes.
- Grid: 24×24, 2px padding. Live area ≥ 20×20.
- **The neon-sign rule:** default state = outline only (`streetlamp`).
  Active state = filled + accent color + `glow-1` — the sign *lights up*.
- No duotone, no filled-by-default icons. Light is earned by state, never free.
- Pair icons with labels below 44px; icons alone only in bottom nav (with labels).

---

## 9. Components

### Beacon (primary button)
- Pill, `signal` fill, `void` text, Space Grotesk 500, height 48px mobile / 44px desktop.
- Hover: `glow-2` + brightness 1.06. Press: scale 0.98, `glow-1`.
- Only **one** beacon per view. If everything is a beacon, the street has no landmarks.

### Window (card)
- `asphalt` surface, 1px `haze` border, radius `lg`, padding 20px.
- Hover: surface → `slate`, `glow-1` in the card's accent, border lightens 8%.
- Optional "lit window" variant: a 6px accent bar on the top edge, like light
  escaping a window frame. Used for unread/active content.

### Route (progress)
- Dotted path (2px dots, 8px gap, `haze`), streetlight nodes every milestone.
- Completed nodes: filled `lamplight` + `glow-1`. Current node: pulsing `signal`.
- Streaks render as **lamplight**: a warm glow that intensifies (opacity
  0.4 → 0.9) across a 7-day week strip. Missing a day dims it — it *fades*,
  it never shatters, never guilt-trips.

### Signal (notification)
- Quiet by default: no badges, no red dots, no sound after local 22:00.
- Arrival: soft `glow-1` pulse on the nav icon, 2 pulses, then rest.
- Content surfaces in a `slate` sheet, radius `xl`, slide-up 300ms.

### Booth (focus mode)
- Full-screen `void`, chrome fades to 20% after 3s idle, serif reading type,
  measure 65ch, optional lamplight vignette at the top of the viewport.
- Exit is always visible. The booth is a choice, never a trap.

### Inputs
- `void` field on `asphalt`, 1px `haze`, radius `sm`, height 48px.
- Focus: border → `signal`, `glow-1`, label floats in `signal`.
- Placeholder: `dusk`. Error: `ember` border + calm copy below field.

### Empty states
- A small line illustration (1.5px stroke, `streetlamp`): an empty booth, a
  bench under a lamp, a lit window across the street.
- One line of intimate copy. Example: *"This route is still being drawn.
- Come back after midnight."* One action: a beacon.

---

## 10. Imagery & Art Direction

- **Photography:** night city — bokeh, long exposure, rain reflections, lit
  windows, empty diners, hands holding phones in the dark. People *passing*,
  never posing. No eye contact with camera.
- **Treatment:** duotone — shadows pushed to `void` blue, highlights lifted
  to `lamplight` or `signal`. Grain overlay applied.
- **Forbidden:** stock classrooms, whiteboards, smiling students giving thumbs
  up, laptops on white desks, graduation caps clip-art.
- **Illustration:** same 1.5px stroke language as icons, `streetlamp` lines,
  one accent glow per illustration maximum.

---

## 11. Voice & Tone

Second person, late-night, intimate. Short sentences. The app is the one
awake friend — warm, a little rogue, never corporate, never a cheerleader.

- ✅ *"The city's asleep. Your curiosity isn't."*
- ✅ *"Picked up where you left off — 3 min to the next light."*
- ✅ *"That's a 6-night lamplight. Rare air."*
- ❌ *"Congratulations! 🎉 You've earned 50 XP and a new badge!"*
- ❌ *"Don't break your streak!!! Your future depends on it!"*

Lowercase is permitted in ambient/empty-state copy for intimacy. Never in
actions, errors, or anything requiring clarity. Emojis: max one, never in
system states.

---

## 12. Accessibility (non-negotiable)

Dark + neon fails accessibly *by default*. These rules are hard gates:

- Body text ≥ 4.5:1, large text ≥ 3:1 — every pairing documented in §2 passes;
  `dusk` is restricted per its ⚠️ note.
- Non-text UI (borders, icons, focus rings) ≥ 3:1 against adjacent surfaces (WCAG 1.4.11).
- Neon accents are never the *only* carrier of meaning — pair with icon, label, or position.
- Focus visible always: 2px ring + glow, `:focus-visible` everywhere.
- Touch targets ≥ 44×44px (one-handed, in the dark, on a bench).
- `prefers-reduced-motion`, `prefers-reduced-transparency`, `prefers-contrast: more`
  supported. Under high contrast: surfaces flatten to `void`/`asphalt`, borders
  go `moon`, glows are replaced by 2px solid borders.
- Dark theme is default; a **"Blue Hour"** light variant (deep slate-blue
  surfaces, `#F4F6FB` text) exists for daylight/battery/print — same accents,
  same soul, never a white classroom.
- Semantic HTML, real labels, screen-reader text for all glow/texture layers.

---

## 13. Anti-patterns — what Ednocte is NOT

1. ❌ White background with blue/red/green primaries — the classroom UI.
2. ❌ Cyberpunk overload — full neon gradients, chrome, glitch effects, scanlines.
3. ❌ Pure `#000` with saturated text — eye strain, halation, cheap OLED trick.
4. ❌ Gamification spam — XP, badges, confetti, guilt streaks, countdown timers.
5. ❌ Corporate LMS dashboard — 12 KPI cards, 3 pie charts, a "Welcome back, User!"
6. ❌ Gray drop shadows — depth is light (§5), never fog.
7. ❌ More than one beacon per view; more than one accent per region.
8. ❌ Noise for noise's sake — grain/bokeh at volumes you can *see* are wrong.

---

## 14. Design Tokens — implementation

### CSS custom properties

```css
:root {
  /* surfaces */
  --ed-void: #070A12;
  --ed-asphalt: #0D1220;
  --ed-slate: #151D31;
  --ed-curb: #1E2942;
  --ed-haze: #2A3854;
  /* text */
  --ed-moon: #E8EDF7;
  --ed-streetlamp: #A7B4CE;
  --ed-dusk: #67769A;
  /* light */
  --ed-signal: #4DE1FF;
  --ed-lamplight: #FFB454;
  --ed-flare: #FF5CA8;
  --ed-pulse: #9D7BFF;
  --ed-mint: #4DE1A6;
  --ed-ember: #FF6B6B;
  /* glow */
  --ed-glow-1: 0 0 16px rgba(77, 225, 255, 0.18);
  --ed-glow-2: 0 0 32px rgba(77, 225, 255, 0.28);
  --ed-glow-3: 0 0 64px rgba(255, 180, 84, 0.32);
  --ed-edge-light: inset 0 1px 0 rgba(232, 237, 247, 0.06);
  /* type */
  --ed-font-display: "Space Grotesk", sans-serif;
  --ed-font-reading: "Source Serif 4", serif;
  --ed-font-ui: "Inter", sans-serif;
  --ed-font-mono: "JetBrains Mono", monospace;
  /* space & shape */
  --ed-space: 4px;
  --ed-radius-sm: 8px;  --ed-radius-md: 12px;
  --ed-radius-lg: 16px; --ed-radius-xl: 24px;
  /* motion */
  --ed-ease: cubic-bezier(0.22, 1, 0.36, 1);
  --ed-fast: 150ms; --ed-base: 300ms; --ed-slow: 600ms; --ed-drift: 900ms;
}
```

### DTCG / W3C JSON (excerpt)

```json
{
  "color": {
    "surface": { "void": { "value": "#070A12" }, "asphalt": { "value": "#0D1220" } },
    "text": { "moon": { "value": "#E8EDF7" }, "streetlamp": { "value": "#A7B4CE" } },
    "light": { "signal": { "value": "#4DE1FF" }, "lamplight": { "value": "#FFB454" } }
  },
  "shadow": { "glow-1": { "value": "0 0 16px rgba(77,225,255,0.18)" } }
}
```

---

## 15. Implementation checklist

- [ ] Fonts licensed/loaded: Space Grotesk, Source Serif 4, Inter, JetBrains Mono (Google Fonts — free)
- [ ] Token layer shipped as CSS vars + DTCG JSON; Tailwind theme generated from tokens
- [ ] Grain/vignette/bokeh as a single reusable `<Atmosphere />` layer, `aria-hidden`
- [ ] Glow tokens mapped to a `Glow` utility; gray `box-shadow` lint-banned (stylelint `declaration-property-value-disallowed-list`)
- [ ] `dusk` usage lint-banned below 24px text
- [ ] Focus ring component mandatory; axe-core in CI, zero critical violations
- [ ] Reduced-motion variants for all four signature motions
- [ ] Blue Hour light theme passes the same contrast gates
- [ ] One-beacon-per-view rule enforced in the `Beacon` component (dev warning)

---

*Ednocte v0.2 — the night is the campus. Drafted by Naji & ox-alpha.*
