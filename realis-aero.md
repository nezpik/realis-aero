# Realis Aero Design System v0.2

**Version**: 0.2  
**Date**: May 2026  
**Vision Holder**: Naji Zouiti  
**Purpose**: Product-ready UI/UX, brand, and implementation specification for a feasible-future aesthetic.

## Executive Definition

Realis Aero is a design philosophy for a future that can actually be built. It evolves the calm optimism, clarity, translucency, and nature-technology harmony associated with early digital futurism, but rejects fantasy perfection. Its beauty comes from visible engineering, measurable systems, repairable materials, environmental realism, and human effort.

Realis Aero does not say “the future will magically save us.” It says: **the future becomes beautiful when it is feasible, maintained, measured, and shared.**

## Manifesto & First Principles

### 1. Feasibility Is Beauty

Every visual decision should imply a working system. A beautiful Realis Aero interface shows how power flows, how air moves, how water is conserved, how structures are maintained, how progress is measured, and where trade-offs exist.

- **Do**: Show metrics, tolerances, states, thresholds, structural layers, real progress, and system dependencies.
- **Avoid**: Decorative futurism, meaningless glow, generic “eco” motifs, and impossible utopian environments.

### 2. Honest Translucency

Glass is not decoration. Glass reveals. Translucent surfaces should expose useful depth: data streams, environmental context, component layering, status signals, and internal logic.

- **Do**: Use glass to reveal hierarchy, state, and context.
- **Avoid**: Frosted panels that hide information, ornamental bubbles, fake refraction, or excessive blur.

### 3. Earned Optimism

The tone is optimistic, but never naive. Nature and technology coexist as an engineered symbiosis. The atmosphere is calm because the systems are monitored, repairable, and intentionally designed.

- **Do**: Make the interface feel hopeful through clarity, progress, and control.
- **Avoid**: Heavenly glow, magical automation, “everything is solved” messaging, or effortless perfection.

### 4. Repairable Beauty

The system should feel modular, maintainable, and touched by real use. Imperfection is not damage; it is evidence of care, age, and physical presence.

- **Do**: Use modular panels, visible joins, subtle scratches, fingerprints, wear, replaceable parts, and clear degraded states.
- **Avoid**: Sterile sci-fi surfaces, sealed monoliths, or luxury gloss that cannot be touched.

### 5. Measured Nature-Tech Symbiosis

Nature is not a wallpaper. It is an active system: shade, air, water, biodiversity, growth, solar capture, carbon, and temperature regulation.

- **Do**: Represent natural systems through data, seasonal change, physical constraints, and visible interdependence.
- **Avoid**: Random leaves, decorative vines, or greenwashing without measurable meaning.

### 6. Anti-Escapism Rule

No element may imply that the future is effortless, consequence-free, or disconnected from reality. Every optimistic cue must be backed by an engineering cue.

- **Core test**: If the interface looks beautiful after removing all metrics, states, constraints, and system signals, it may be drifting into escapism.

## Differentiation From Frutiger Aero

Realis Aero is related to Frutiger Aero only through its humanist clarity, environmental softness, and sense of approachable optimism. It is not a nostalgic revival.

| Dimension | Frutiger Aero Tendency | Realis Aero Direction |
|---|---|---|
| **Glass** | Glossy, decorative, magical | Functional, layered, revealing |
| **Nature** | Symbolic freshness | Measured ecological system |
| **Technology** | Seamless consumer optimism | Maintainable engineered infrastructure |
| **Motion** | Bouncy, playful, fluid | Physical, damped, purposeful |
| **Light** | Lens flare and sparkle | Directional daylight, believable reflection |
| **Perfection** | Smooth fantasy surface | Slightly lived-in, repairable, monitored |
| **Future** | Dreamlike promise | Feasible progress |

## Visual Language

### Design Personality

- **Engineered calm**: Interfaces feel composed, precise, and operational rather than luxurious or theatrical.
- **Warm environmental realism**: The palette carries sunlight, mineral surfaces, vegetation, water, and atmospheric depth.
- **Breathable precision**: Layouts are spacious, but not empty. Every element has a job.
- **Visible system intelligence**: Live data, health states, and status indicators are part of the aesthetic.
- **Human-scale futurism**: Controls feel touchable, readable, and serviceable.

### Art Direction Rules

- **Lighting**: Use one believable directional light source, typically diffused daylight or low solar warmth. Shadows must agree with the light source.
- **Depth**: Depth is layered through material, blur, occlusion, shadows, and data overlays. Avoid arbitrary stacking.
- **Atmosphere**: Use subtle haze, temperature shifts, and horizon gradients only when they support environmental realism.
- **Imperfection**: Micro-scratches, smudges, dust, condensation, and worn edges must be subtle and context-aware.
- **Composition**: Large calm surfaces should be balanced by precise live metrics, engineering labels, and modular seams.
- **Imagery**: Prefer real or plausible landscapes, infrastructure, workshops, transit systems, renewable energy fields, weather stations, repair benches, and inhabited environments.

## Product Experience Principles

### The Interface Should Answer

- **What is happening now?**
- **Why is it happening?**
- **What is the system confidence?**
- **What is improving or degrading?**
- **What can the user do next?**
- **What is automated, manual, offline, delayed, or uncertain?**

### Required Product States

Every major product surface should define:

- **Live state**: Data is current and updating.
- **Stale state**: Data is delayed but still usable.
- **Offline state**: System cannot sync; show last-known values.
- **Degraded state**: A subsystem is working below expected range.
- **Maintenance state**: Human intervention is needed or scheduled.
- **Success state**: A measurable improvement occurred.
- **Uncertainty state**: Confidence is low; communicate why.

## Design Tokens

### Typography

Realis Aero typography should be humanist, readable, slightly warm, and technically precise. It must not become decorative.

#### Font Stack

```css
font-family: "Frutiger", "Aptos", "Segoe UI", "Inter", "SF Pro Text", system-ui, sans-serif;
```

#### Type Scale

| Token | Web Size | Mobile Size | Weight | Line Height | Tracking | Use |
|---|---:|---:|---:|---:|---:|---|
| **display-xl** | 64px | 44px | 500 | 1.05 | -0.02em | Hero statements, manifesto titles |
| **display-lg** | 48px | 36px | 500 | 1.1 | -0.015em | Primary page headers |
| **heading-xl** | 36px | 30px | 520 | 1.15 | -0.01em | Dashboard section titles |
| **heading-lg** | 28px | 24px | 520 | 1.2 | -0.005em | Panel titles |
| **heading-md** | 22px | 20px | 520 | 1.25 | 0 | Card titles |
| **body-lg** | 18px | 17px | 400 | 1.55 | 0 | Primary reading text |
| **body-md** | 16px | 16px | 400 | 1.55 | 0 | Standard UI text |
| **body-sm** | 14px | 14px | 400 | 1.45 | 0.005em | Secondary UI text |
| **metric-lg** | 40px | 32px | 550 | 1.0 | -0.015em | Primary live metrics |
| **metric-md** | 28px | 24px | 550 | 1.05 | -0.01em | Card metrics |
| **label-md** | 13px | 13px | 560 | 1.2 | 0.06em | Labels, tabs, system tags |
| **caption** | 12px | 12px | 400 | 1.35 | 0.02em | Timestamps, units, metadata |

#### Typography Rules

- **Metrics**: Always pair numeric values with units, timestamps, and status context.
- **Labels**: Use sentence case for human clarity; reserve uppercase for compact system tags only.
- **Hierarchy**: Use weight and spacing before using color.
- **Line length**: Keep prose between 58 and 76 characters per line.
- **Numbers**: Use tabular numerals for dashboards, charts, and meters.

### Color System

The Realis Aero palette is a balanced feasible-future system. It should not read as “green tech.” It should feel like clean air, aerospace depth, repairable infrastructure, calibrated white surfaces, measured sunlight, live sensors, and grounded material reality.

White is the equilibrium layer: it creates breathing room, calibration, glass reflection, and human clarity. Dark aerospace blue is the trust layer: it anchors dashboards, navigation, night systems, and atmospheric depth. Professional umber is the material layer: it brings infrastructure, repairability, soil, wood, ceramic, and hardware warmth. Refined solar yellow is the energy layer: it signals sunlight, focus, progress, and instrumentation. Teal/cyan is the live-system layer only. Green is reserved for verified ecological gain, not general branding.

#### Primitive Palette

| Token | Hex | Role |
|---|---|---|
| **equilibrium-white-000** | `#FFFEFA` | Pure equilibrium white, readable glass reflection |
| **equilibrium-white-050** | `#FAF7F0` | Primary breathable background |
| **equilibrium-white-100** | `#F2EBDD` | Warm calibrated surface |
| **equilibrium-white-200** | `#E3D9C7` | Soft mineral border and disabled surface |
| **aero-blue-950** | `#071D2B` | Deep aerospace night, primary dark anchor |
| **aero-blue-900** | `#0D2F45` | Cockpit surface, dark navigation |
| **aero-blue-800** | `#174A63` | Primary engineering blue |
| **aero-blue-700** | `#235F7A` | Hover/active blue |
| **aero-blue-600** | `#2D6F8E` | Info, atmospheric data, secondary action |
| **aero-blue-300** | `#9CC6D8` | Pale atmospheric highlight |
| **aero-blue-100** | `#D9EAF1` | Light blue surface tint |
| **umber-900** | `#3A2A1E` | Deep professional brown, material text |
| **umber-800** | `#4C3524` | Hardware, rail, handle, dark material |
| **umber-700** | `#65462F` | Infrastructure and maintenance anchor |
| **umber-600** | `#7D5A3B` | Grounded secondary accent |
| **umber-500** | `#8B6848` | Load, consumption, tactile material |
| **umber-300** | `#B79A78` | Warm material highlight |
| **umber-100** | `#EFE3D2` | Soft material surface |
| **solar-900** | `#5F3A02` | Deep solar text and high-contrast energy |
| **solar-800** | `#7A4F05` | Serious instrumentation yellow-brown |
| **solar-700** | `#B87912` | Warning, threshold, strong energy |
| **solar-600** | `#D79520` | Active energy and progress |
| **solar-500** | `#E3A72F` | Refined Realis solar |
| **solar-300** | `#F3C766` | Warm reflection and focus glow |
| **solar-100** | `#FFF0BF` | Pale sunlight surface |
| **teal-system-800** | `#0D5C5A` | Deep live-system teal |
| **teal-system-700** | `#1B817B` | Sensor and flow accent |
| **teal-system-500** | `#35BDB2` | Live data stream |
| **teal-system-300** | `#8FE1D8` | Soft live-data glow |
| **teal-system-100** | `#D9F4F0` | Pale system-flow surface |
| **bio-green-800** | `#315A3C` | Verified ecological depth |
| **bio-green-600** | `#5E8156` | Ecological success |
| **bio-green-400** | `#9CB58D` | Soft restoration highlight |
| **bio-green-100** | `#E4ECD8` | Pale ecological proof surface |
| **signal-coral-600** | `#B85F52` | Critical fault, urgent maintenance |
| **signal-coral-300** | `#E08A7B` | Soft critical highlight |

#### Neutral Palette

| Token | Hex | Role |
|---|---|---|
| **white-equilibrium** | `#FFFEFA` | Highest-clarity surface; not sterile pure white |
| **white-calibration** | `#FAF7F0` | Default calm canvas |
| **mineral-surface** | `#F2EBDD` | Raised surface and readable glass backing |
| **mineral-border** | `#E3D9C7` | Warm border, divider, disabled fill |
| **blue-black** | `#071D2B` | Dark mode background and depth anchor |
| **graphite-950** | `#11181C` | Highest contrast text |
| **graphite-900** | `#172126` | Dark text and dark neutral surface |
| **graphite-800** | `#263238` | Secondary dark surface |
| **graphite-600** | `#58666B` | Muted text and forecast line |
| **graphite-500** | `#6F7C80` | Muted metadata and tertiary text |
| **graphite-400** | `#A9B4B5` | Metadata, disabled text, cool divider |
| **graphite-100** | `#E0E6E5` | Pale cool separator |

#### Semantic Color Roles

| Role | Light Mode | Dark Mode | Notes |
|---|---|---|---|
| **background** | `#FAF7F0` | `#071D2B` | Equilibrium canvas / aerospace night |
| **surface** | `#FFFEFA` | `#0D2F45` | Primary readable surfaces |
| **surface-raised** | `#F2EBDD` | `#174A63` | Raised cards, panels, and controls |
| **surface-material** | `#EFE3D2` | `#3A2A1E` | Infrastructure and maintenance surfaces |
| **text-primary** | `#11181C` | `#FFFEFA` | Body and headings |
| **text-secondary** | `#58666B` | `#E0E6E5` | Supporting text |
| **text-muted** | `#6F7C80` | `#A9B4B5` | Metadata |
| **action-primary** | `#174A63` | `#235F7A` | Primary buttons, active nav, engineering trust |
| **action-primary-hover** | `#0D2F45` | `#2D6F8E` | Hover and selected emphasis |
| **focus-ring** | `#B87912` | `#F3C766` | High-visibility solar focus |
| **energy** | `#D79520` | `#F3C766` | Generation, progress, sunlight, instrument highlight |
| **material** | `#65462F` | `#B79A78` | Infrastructure, repair, tactile systems |
| **success** | `#5E8156` | `#9CB58D` | Verified ecological gain only |
| **warning** | `#B87912` | `#F3C766` | Threshold or upcoming maintenance |
| **danger** | `#B85F52` | `#E08A7B` | Urgent fault |
| **info** | `#2D6F8E` | `#9CC6D8` | Atmospheric/system information |
| **live-data** | `#35BDB2` | `#8FE1D8` | Real-time streams only |

#### Data Visualization Colors

| Meaning | Color | Secondary Encoding |
|---|---|---|
| **Generation / output** | `#E3A72F` | Solid solar line |
| **Storage / reserve** | `#174A63` | Filled aerospace-blue area |
| **Live flow / sensor stream** | `#35BDB2` | Thin glowing line |
| **Ecological gain** | `#5E8156` | Leaf marker or rounded cap |
| **Material / load / infrastructure** | `#8B6848` | Dashed umber line |
| **Energy peak** | `#F3C766` | Bright marker and label |
| **Warning threshold** | `#B87912` | Triangle marker |
| **Fault / critical** | `#B85F52` | Strong outline and icon |
| **Forecast / uncertainty** | `#58666B` | Dotted line and confidence band |

#### Color Rules

- **Never rely on color alone**: Pair color with icon, label, pattern, stroke style, or shape.
- **Use white as equilibrium**: White is for calibration, clarity, glass reflection, and breathing space; avoid sterile blankness.
- **Anchor trust in aerospace blue**: Primary navigation, major actions, and dark surfaces should lean blue before teal.
- **Use umber for material truth**: Brown should signal infrastructure, repairability, load, earth, wood, ceramic, and hardware.
- **Use solar yellow sparingly**: It is for measured energy, sunlight, progress, focus, and instrumentation—not decoration.
- **Do not use pale solar as body text**: Use `solar-800` or `solar-900` for text on light surfaces; reserve `solar-300` and `solar-100` for glow, fills, and reflection.
- **Reserve teal/cyan for live systems**: Data glow should be controlled and tied to real updates, sensors, water, air, or flow.
- **Reserve green for ecological proof**: Green means verified restoration, growth, or ecological success, not generic positivity.
- **Treat coral as operational**: Coral means a real issue, not decorative contrast.

#### Recommended Palette Balance

| Family | Target Presence | Purpose |
|---|---:|---|
| **Equilibrium white / mineral surfaces** | 35–45% | Calm, readability, calibration, breathable space |
| **Aerospace blue / graphite depth** | 25–35% | Trust, engineering, navigation, dashboard structure |
| **Professional umber** | 8–14% | Materiality, grounding, repairability, infrastructure |
| **Refined solar** | 5–8% | Energy, focus, progress, sunlight, active instrumentation |
| **Teal/cyan live systems** | 3–6% | Sensors, flow, real-time updates, data streams |
| **Bio green** | 2–4% | Verified ecological success and restoration only |
| **Signal coral** | <2% | Critical operational states |

### Spacing

Use an 8px base grid with 4px micro-adjustments for dense instrumentation.

| Token | Value | Use |
|---|---:|---|
| **space-1** | 4px | Icon-text gaps, dense labels |
| **space-2** | 8px | Compact component spacing |
| **space-3** | 12px | Inline form gaps |
| **space-4** | 16px | Card internal spacing |
| **space-5** | 20px | Compact panel padding |
| **space-6** | 24px | Standard section spacing |
| **space-8** | 32px | Major panel spacing |
| **space-10** | 40px | Hero and dashboard bands |
| **space-12** | 48px | Page rhythm |
| **space-16** | 64px | Large breathable divisions |
| **space-24** | 96px | Landing page sections |

### Radius

| Token | Value | Use |
|---|---:|---|
| **radius-xs** | 4px | Data chips, tags |
| **radius-sm** | 8px | Inputs, compact buttons |
| **radius-md** | 12px | Standard controls |
| **radius-lg** | 18px | Cards and panels |
| **radius-xl** | 24px | Hero glass panels |
| **radius-pill** | 999px | Capsules and segmented controls |

### Elevation & Shadow

Shadows should feel physical, soft, and directional. They should not create floating fantasy objects.

| Token | Value | Use |
|---|---|---|
| **elevation-0** | none | Flat surfaces |
| **elevation-1** | `0 1px 2px rgba(7, 29, 43, 0.08)` | Inputs, small chips |
| **elevation-2** | `0 4px 12px rgba(7, 29, 43, 0.10)` | Buttons, compact cards |
| **elevation-3** | `0 10px 28px rgba(7, 29, 43, 0.14)` | Panels, modals |
| **elevation-4** | `0 20px 54px rgba(7, 29, 43, 0.18)` | Hero overlays only |
| **inner-highlight** | `inset 0 1px 0 rgba(255, 254, 250, 0.42)` | Glass and bevels |
| **inner-depth** | `inset 0 -1px 0 rgba(7, 29, 43, 0.10)` | Pressable controls |

### Blur, Opacity & Stroke

| Token | Value | Use |
|---|---:|---|
| **blur-sm** | 8px | Dense UI glass |
| **blur-md** | 14px | Standard glass panels |
| **blur-lg** | 24px | Large background glass |
| **opacity-glass-clear** | 0.72 | Clear operational glass |
| **opacity-glass-frosted** | 0.82 | Frosted system glass |
| **opacity-disabled** | 0.42 | Disabled elements |
| **stroke-hairline** | 0.5px | High-density visualizations |
| **stroke-sm** | 1px | Standard borders |
| **stroke-md** | 1.5px | Active controls |
| **stroke-lg** | 2px | Focus, critical states |

### Layout & Grid

#### Desktop

- **Canvas**: 1440px reference width.
- **Content max width**: 1200px for documentation and landing pages.
- **Dashboard grid**: 12 columns, 24px gutters, 24px outer margin minimum.
- **Panel rhythm**: Primary panels span 6 to 8 columns; secondary panels span 3 to 4 columns.

#### Tablet

- **Grid**: 8 columns, 20px gutters, 20px margins.
- **Navigation**: Side rail may collapse to icons plus labels on hover/focus.
- **Charts**: Prefer stacked layouts over compressed multi-column dashboards.

#### Mobile

- **Grid**: 4 columns, 16px gutters, 16px margins.
- **Touch target**: Minimum 44px by 44px.
- **Primary actions**: Bottom-aligned or sticky only when they do not cover live alerts.
- **Metrics**: Show fewer metrics with clearer hierarchy; allow drill-down for complexity.

## Material System

### Material Philosophy

Materials should feel like they belong to instruments, vehicles, public infrastructure, renewable systems, and repairable personal devices. Glass, metal, polymer, rubber, ceramic, water, air, and vegetation should be represented with restraint.

### Glass Material Variants

| Material | Background | Blur | Border | Shadow | Use |
|---|---|---:|---|---|---|
| **Clear Operational Glass** | `rgba(255, 254, 250, 0.58)` | 8px | `rgba(255, 254, 250, 0.42)` | elevation-2 | Compact controls, live labels |
| **Frosted System Glass** | `rgba(242, 235, 221, 0.72)` | 14px | `rgba(255, 254, 250, 0.34)` | elevation-3 | Cards and panels |
| **Dense Hardware Glass** | `rgba(7, 29, 43, 0.72)` | 18px | `rgba(156, 198, 216, 0.28)` | elevation-3 | Dark instrument panels |
| **Alert Glass** | `rgba(255, 254, 250, 0.78)` | 12px | semantic warning/danger border | elevation-3 | Alerts, maintenance states |
| **Reduced Transparency Surface** | solid semantic surface | 0px | standard border | elevation-1 | Accessibility fallback |

### Imperfection Rules

Imperfections should signal real use, not visual noise.

- **Micro-scratches**: 1px or thinner, 3% to 8% opacity, aligned with plausible touch or cleaning direction.
- **Fingerprints**: Use only on touch surfaces and only at large sizes or close-up views.
- **Condensation**: Use near weather, cooling, water, greenhouse, or thermal systems; never as generic decoration.
- **Dust or pollen**: Use for outdoor infrastructure, vents, sensor housings, and seasonal surfaces.
- **Wear**: Apply to edges, handles, frequently pressed buttons, and replaceable modules.

### Internal Data Layer

Glass panels may reveal low-intensity system lines beneath the surface.

- **Line opacity**: 10% to 28%.
- **Line width**: 1px to 2px.
- **Glow**: Use `teal-system-500` at low opacity; pulse only on fresh data.
- **Meaning**: Every stream must map to a real category: power, water, air, heat, carbon, network, maintenance, or movement.
- **Animation**: Idle streams should barely move or remain still; live updates may pulse once.

## Component Library

### Buttons

#### Anatomy

- **Container**: Rounded rectangle or capsule with subtle bevel.
- **Label**: Humanist medium weight, sentence case.
- **Icon**: Optional, left for action category or right for continuation.
- **Highlight**: Thin solar or glass highlight along top edge.
- **Shadow**: Soft directional depth.

#### Variants

| Variant | Use | Visual Spec |
|---|---|---|
| **Primary** | Main action | Aerospace-blue fill, refined solar highlight, high-contrast label |
| **Secondary** | Supporting action | Glass surface, aerospace-blue border, dark text |
| **Tertiary** | Low emphasis | Text or subtle glass chip |
| **Danger** | Destructive/critical | Coral border/fill, icon required |
| **System** | Operational control | Dense hardware glass, compact label |

#### States

| State | Behavior |
|---|---|
| **Rest** | Stable shadow, clear label |
| **Hover** | Slight elevation increase, border brightens |
| **Pressed** | Scale to 0.98, shadow compresses, inner depth increases |
| **Focus** | 2px solar ring with 2px offset |
| **Loading** | Preserve button width, show real task label when possible |
| **Disabled** | Reduced opacity plus reason when critical |
| **Offline** | Disable action and show last-known sync context |

### Cards & Panels

Cards are not empty containers. A Realis Aero card should communicate a system state, metric, action, or relationship.

#### Required Anatomy

- **Header**: Title, status, optional timestamp.
- **Primary value**: Metric, state, or key content.
- **Context**: Trend, threshold, source, or confidence.
- **Action**: Optional but clear.
- **Material layer**: Glass, solid, or hardware depending on context.

#### Variants

- **Metric card**: Large numeric value, unit, trend, freshness.
- **System card**: Health state, subsystem list, maintenance context.
- **Narrative card**: Short explanatory content with measured evidence.
- **Control panel**: Inputs, toggles, confirmations, and safety states.
- **Hero panel**: Large glass panel for core product proposition and live proof.

### Navigation

Navigation should feel like an instrument panel: clear, stable, spatially consistent.

- **Desktop**: Left side rail for persistent systems; top bar for global status and account.
- **Mobile**: Bottom navigation for primary sections; avoid more than five items.
- **Active state**: Aerospace-blue accent bar plus label weight change; reserve teal/cyan for live system indicators.
- **System status**: Global sync, offline, maintenance, or alert state must be visible without opening a menu.
- **Breadcrumbs**: Use for deep technical or settings flows.

### Metrics

Metrics are central to Realis Aero. They turn optimism into evidence.

#### Metric Requirements

- **Value**: Numeric or categorical.
- **Unit**: Always shown unless the value is self-evident.
- **Timestamp**: Show freshness for live or sensor-derived data.
- **Delta**: Show comparison period when relevant.
- **Confidence**: Show estimated, measured, forecast, or delayed state.
- **Source**: Show sensor/API/manual source in detail views.

#### Metric Formatting

- Use tabular numerals.
- Use thousands separators.
- Keep unit spacing consistent: `42 kWh`, `18.4 °C`, `-7% CO₂`.
- Prefer meaningful precision over excessive decimals.
- Distinguish forecast values with dotted styling or confidence bands.

### Gauges & Progress

Gauges should feel physical and readable, not decorative.

- **Circular gauges**: Use for bounded ratios such as battery, capacity, pressure, or air quality.
- **Linear bars**: Use for progress, staged setup, storage, and quotas.
- **Cell stacks**: Use for energy storage and modular capacity.
- **Threshold markers**: Always visible for warning and critical levels.
- **Labels**: Place value and unit inside or adjacent; never rely on arc length alone.

### Charts & Data Visualization

Charts should be clear first, atmospheric second.

- **Gridlines**: Warm neutral at low opacity.
- **Lines**: Slightly rounded caps, 2px standard stroke.
- **Areas**: 12% to 24% opacity, never hide grid or labels.
- **Tooltips**: Glass surface with timestamp, value, source, and confidence.
- **Forecasts**: Dotted or dashed with confidence band.
- **Anomalies**: Annotate with reason when known.
- **Live updates**: Animate only the changed segment, not the entire chart.

### Forms & Inputs

Forms should feel precise and serviceable.

- **Input height**: 44px minimum.
- **Labels**: Always visible; placeholders are examples, not labels.
- **Validation**: Inline and specific. Explain how to fix the issue.
- **Focus**: Solar ring plus clear border change.
- **Units**: Use fixed unit labels inside or adjacent to numeric inputs.
- **Critical inputs**: Require confirmation when changing automation, safety, energy, or maintenance settings.

### Toggles, Sliders & Controls

Controls should imply mechanical confidence.

- **Toggles**: Use clear on/off labels for safety-critical settings.
- **Sliders**: Show exact value, unit, min, max, and recommended range.
- **Segmented controls**: Use for mode switching; selected state must include shape and color.
- **Automation controls**: Show current mode, next scheduled action, and override status.

### Alerts & Notifications

Alerts should be operationally useful, not alarming by default.

| Severity | Visual | Behavior |
|---|---|---|
| **Info** | Water/sky accent | Passive system information |
| **Success** | Sage accent | Confirm measured improvement |
| **Warning** | Amber accent | Explain threshold and next action |
| **Critical** | Coral accent | Require acknowledgement or action |
| **Maintenance** | Solar + graphite | Show service requirement and time window |

#### Alert Content

- **Title**: What happened.
- **Body**: Why it matters.
- **Evidence**: Metric, timestamp, subsystem, or source.
- **Action**: What the user can do.
- **Fallback**: What happens if no action is taken.

### Modals & Dialogs

- Use modals only for decisions that interrupt the current flow.
- Prefer side panels for inspection and technical detail.
- Critical confirmations must summarize consequences in plain language.
- Escape, close button, and focus trap are required.
- Initial focus should land on the safest reasonable action.

### Tabs, Chips & Tags

- **Tabs**: Use for peer-level content, not navigation across unrelated areas.
- **Chips**: Use for filters, sensor tags, status labels, and selected entities.
- **Status tags**: Include icon or shape, not color alone.
- **Live tags**: Use pulsing only for active real-time data and at low intensity.

### Empty States

Empty states should be useful and honest.

- **No data**: Explain whether data has never existed, is still syncing, or is unavailable.
- **Offline**: Show last successful sync and what remains usable.
- **Setup required**: Show the smallest next step.
- **No results**: Preserve filters and offer clear adjustment.

### Loading & Skeletons

- Prefer real progress when available.
- Use task-specific labels such as `Syncing solar array data… 42%`.
- Skeletons should match final layout to prevent jumps.
- Do not animate large shimmer fields indefinitely.
- If loading exceeds expected time, show a reason or fallback action.

## Motion & Interaction

### Motion Principles

- **Physical**: Movement has mass, friction, and damping.
- **Purposeful**: Motion explains state changes.
- **Measured**: Live updates pulse once and settle.
- **Respectful**: Reduced motion must preserve meaning.

### Timing Tokens

| Token | Duration | Use |
|---|---:|---|
| **motion-instant** | 80ms | Pressed feedback |
| **motion-fast** | 140ms | Hover, small state changes |
| **motion-standard** | 220ms | Panel transitions |
| **motion-slow** | 360ms | Large layout shifts |
| **motion-live-pulse** | 600ms | Single live data pulse |

### Easing

```css
--ease-engineered: cubic-bezier(0.2, 0.8, 0.2, 1);
--ease-press: cubic-bezier(0.3, 0, 0.2, 1);
--ease-settle: cubic-bezier(0.16, 1, 0.3, 1);
```

### Reduced Motion

- Disable continuous data stream motion.
- Replace animated transitions with opacity or instant state changes.
- Preserve live updates through labels, badges, and timestamps.
- Do not remove focus or pressed-state feedback.

## Accessibility

Realis Aero must remain usable when glass, color, motion, and environmental imagery are reduced or unavailable.

### Requirements

- **Contrast**: Body text must meet WCAG 2.2 AA minimum contrast. Large text, icons, and controls must be tested on final glass backgrounds.
- **Glass fallback**: Provide reduced-transparency surfaces for low vision, high contrast, battery saver, or unsupported backdrop blur.
- **Keyboard**: All interactive components must be reachable, visible, and operable by keyboard.
- **Focus**: Focus states must be at least 2px and not rely on glow alone.
- **Screen readers**: Metrics must include value, unit, trend, timestamp, and state when meaningful.
- **Color independence**: All charts and statuses need secondary encoding.
- **Motion sensitivity**: Respect `prefers-reduced-motion`.
- **Touch targets**: Minimum 44px by 44px on touch devices.
- **Error recovery**: Form errors must explain what failed and how to correct it.

### Screen Reader Metric Pattern

Use accessible labels that communicate meaning, not just visible text.

```text
Solar generation: 42 kilowatt-hours today, up 8 percent from yesterday. Last updated 2 minutes ago. Data source: roof array sensor.
```

## Implementation Specification

### CSS Custom Properties

```css
:root {
  --equilibrium-white-000: #fffefa;
  --equilibrium-white-050: #faf7f0;
  --equilibrium-white-100: #f2ebdd;
  --equilibrium-white-200: #e3d9c7;

  --aero-blue-950: #071d2b;
  --aero-blue-900: #0d2f45;
  --aero-blue-800: #174a63;
  --aero-blue-700: #235f7a;
  --aero-blue-600: #2d6f8e;
  --aero-blue-300: #9cc6d8;
  --aero-blue-100: #d9eaf1;

  --umber-900: #3a2a1e;
  --umber-800: #4c3524;
  --umber-700: #65462f;
  --umber-600: #7d5a3b;
  --umber-500: #8b6848;
  --umber-300: #b79a78;
  --umber-100: #efe3d2;

  --solar-900: #5f3a02;
  --solar-800: #7a4f05;
  --solar-700: #b87912;
  --solar-600: #d79520;
  --solar-500: #e3a72f;
  --solar-300: #f3c766;
  --solar-100: #fff0bf;

  --teal-system-800: #0d5c5a;
  --teal-system-700: #1b817b;
  --teal-system-500: #35bdb2;
  --teal-system-300: #8fe1d8;
  --teal-system-100: #d9f4f0;

  --bio-green-800: #315a3c;
  --bio-green-600: #5e8156;
  --bio-green-400: #9cb58d;
  --bio-green-100: #e4ecd8;

  --signal-coral-600: #b85f52;
  --signal-coral-300: #e08a7b;

  --graphite-950: #11181c;
  --graphite-900: #172126;
  --graphite-800: #263238;
  --graphite-600: #58666b;
  --graphite-500: #6f7c80;
  --graphite-400: #a9b4b5;
  --graphite-100: #e0e6e5;

  --color-background: var(--equilibrium-white-050);
  --color-surface: var(--equilibrium-white-000);
  --color-surface-raised: var(--equilibrium-white-100);
  --color-surface-material: var(--umber-100);
  --color-text-primary: var(--graphite-950);
  --color-text-secondary: var(--graphite-600);
  --color-text-muted: var(--graphite-500);
  --color-action-primary: var(--aero-blue-800);
  --color-action-primary-hover: var(--aero-blue-900);
  --color-focus-ring: var(--solar-700);
  --color-energy: var(--solar-600);
  --color-material: var(--umber-700);
  --color-success: var(--bio-green-600);
  --color-warning: var(--solar-700);
  --color-danger: var(--signal-coral-600);
  --color-info: var(--aero-blue-600);
  --color-live-data: var(--teal-system-500);

  --font-sans: "Frutiger", "Aptos", "Segoe UI", "Inter", "SF Pro Text", system-ui, sans-serif;

  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;
  --space-24: 96px;

  --radius-xs: 4px;
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 18px;
  --radius-xl: 24px;
  --radius-pill: 999px;

  --blur-sm: 8px;
  --blur-md: 14px;
  --blur-lg: 24px;

  --shadow-1: 0 1px 2px rgba(7, 29, 43, 0.08);
  --shadow-2: 0 4px 12px rgba(7, 29, 43, 0.10);
  --shadow-3: 0 10px 28px rgba(7, 29, 43, 0.14);
  --shadow-4: 0 20px 54px rgba(7, 29, 43, 0.18);

  --ease-engineered: cubic-bezier(0.2, 0.8, 0.2, 1);
  --ease-press: cubic-bezier(0.3, 0, 0.2, 1);
  --ease-settle: cubic-bezier(0.16, 1, 0.3, 1);
}

@media (prefers-color-scheme: dark) {
  :root {
    --color-background: var(--aero-blue-950);
    --color-surface: var(--aero-blue-900);
    --color-surface-raised: var(--aero-blue-800);
    --color-surface-material: var(--umber-900);
    --color-text-primary: var(--equilibrium-white-000);
    --color-text-secondary: var(--graphite-100);
    --color-text-muted: var(--graphite-400);
    --color-action-primary: var(--aero-blue-700);
    --color-action-primary-hover: var(--aero-blue-600);
    --color-focus-ring: var(--solar-300);
    --color-energy: var(--solar-300);
    --color-material: var(--umber-300);
    --color-success: var(--bio-green-400);
    --color-warning: var(--solar-300);
    --color-danger: var(--signal-coral-300);
    --color-info: var(--aero-blue-300);
    --color-live-data: var(--teal-system-300);
  }
}
```

### Reference Component CSS

```css
.realis-glass-panel {
  position: relative;
  overflow: hidden;
  border-radius: var(--radius-lg);
  background:
    linear-gradient(
      180deg,
      rgba(255, 254, 250, 0.76),
      rgba(242, 235, 221, 0.60)
    );
  border: 1px solid rgba(255, 254, 250, 0.38);
  box-shadow:
    var(--shadow-3),
    inset 0 1px 0 rgba(255, 254, 250, 0.44),
    inset 0 -1px 0 rgba(7, 29, 43, 0.10);
  backdrop-filter: blur(var(--blur-md)) saturate(1.12);
}

.realis-button-primary {
  min-height: 44px;
  padding: 0 var(--space-5);
  border: 1px solid rgba(255, 254, 250, 0.28);
  border-radius: var(--radius-pill);
  background:
    linear-gradient(180deg, rgba(243, 199, 102, 0.32), transparent 28%),
    var(--color-action-primary);
  color: var(--equilibrium-white-000);
  font-family: var(--font-sans);
  font-weight: 560;
  box-shadow: var(--shadow-2), inset 0 -1px 0 rgba(7, 29, 43, 0.22);
  transition:
    transform 80ms var(--ease-press),
    box-shadow 140ms var(--ease-engineered),
    background-color 140ms var(--ease-engineered);
}

.realis-button-primary:hover {
  background:
    linear-gradient(180deg, rgba(243, 199, 102, 0.38), transparent 28%),
    var(--color-action-primary-hover);
}

.realis-button-primary:active {
  transform: scale(0.98);
  box-shadow: var(--shadow-1), inset 0 1px 2px rgba(7, 29, 43, 0.28);
}

.realis-button-primary:focus-visible {
  outline: 2px solid var(--color-focus-ring);
  outline-offset: 2px;
}

html[data-reduced-transparency="true"] .realis-glass-panel {
  background: var(--color-surface);
  backdrop-filter: none;
}

@media (prefers-reduced-transparency: reduce) {
  .realis-glass-panel {
    background: var(--color-surface);
    backdrop-filter: none;
  }
}
```

### Vite + Vue Implementation Guidance

Vite and Vue are a strong fit for Realis Aero because the aesthetic depends on responsive interfaces, live metrics, stateful components, and themeable design tokens. Vue should be used to express Realis Aero as a system of measured, composable UI parts rather than one-off decorative screens.

#### Recommended Stack

| Layer | Recommendation | Realis Aero Rationale |
|---|---|---|
| **Build tool** | Vite | Fast iteration for visual systems, tokens, and motion tuning |
| **Framework** | Vue 3 with Composition API | Clear state modeling for live, stale, degraded, and offline UI |
| **Language** | TypeScript | Safer metric, unit, status, and component contracts |
| **Styling** | CSS variables plus scoped component CSS | Keeps design tokens global and component behavior local |
| **Routing** | Vue Router | Supports dashboard, detail, maintenance, and settings flows |
| **State** | Pinia when app-wide state is needed | Useful for sync status, theme, user settings, and live data |
| **Testing** | Vitest and Vue Test Utils | Validate states, accessibility labels, and interaction behavior |

#### Project Structure

```text
src/
  app/
    App.vue
    router.ts
  assets/
    realis-textures/
  components/
    primitives/
      RealisButton.vue
      RealisGlassPanel.vue
      RealisMetric.vue
      RealisStatusTag.vue
    patterns/
      RealisSystemCard.vue
      RealisDashboardGrid.vue
      RealisAlertStack.vue
  composables/
    useReducedMotion.ts
    useReducedTransparency.ts
    useMetricFreshness.ts
    useSystemStatus.ts
  stores/
    systemStatus.ts
    theme.ts
  styles/
    tokens.css
    base.css
    materials.css
    motion.css
```

#### Token Strategy

- **Keep tokens global**: Put primitive and semantic variables in `src/styles/tokens.css`.
- **Keep material recipes reusable**: Put glass, hardware, and alert material classes in `src/styles/materials.css`.
- **Keep component specifics scoped**: Component layout and state styling should live inside each `.vue` file.
- **Avoid hardcoded colors**: Vue components should reference semantic variables such as `--color-action-primary`, not raw hex values.
- **Expose density and state through props**: Components should accept explicit states rather than infer visual styling from arbitrary classes.

#### Vue Component State Model

Every Realis Aero component that displays system data should model state explicitly.

```ts
type RealisDataState =
  | "live"
  | "stale"
  | "offline"
  | "degraded"
  | "maintenance"
  | "success"
  | "uncertain";
```

Use this state to drive labels, icons, timestamps, secondary encoding, ARIA labels, and visual treatment. Do not use color alone to communicate status.

#### Reference Vue Metric Component

```vue
<script setup lang="ts">
import { computed } from "vue";

type RealisDataState =
  | "live"
  | "stale"
  | "offline"
  | "degraded"
  | "maintenance"
  | "success"
  | "uncertain";

const props = defineProps<{
  label: string;
  value: string | number;
  unit?: string;
  state: RealisDataState;
  updatedAt: string;
  trendLabel?: string;
  sourceLabel?: string;
}>();

const accessibleLabel = computed(() => {
  const unit = props.unit ? ` ${props.unit}` : "";
  const trend = props.trendLabel ? ` ${props.trendLabel}.` : "";
  const source = props.sourceLabel ? ` Data source: ${props.sourceLabel}.` : "";

  return `${props.label}: ${props.value}${unit}. State: ${props.state}. Last updated ${props.updatedAt}.${trend}${source}`;
});
</script>

<template>
  <article class="realis-metric realis-glass-panel" :data-state="state" :aria-label="accessibleLabel">
    <div class="realis-metric__header">
      <span class="realis-metric__label">{{ label }}</span>
      <span class="realis-metric__state">{{ state }}</span>
    </div>

    <p class="realis-metric__value">
      <span>{{ value }}</span>
      <span v-if="unit" class="realis-metric__unit">{{ unit }}</span>
    </p>

    <footer class="realis-metric__meta">
      <span>{{ updatedAt }}</span>
      <span v-if="trendLabel">{{ trendLabel }}</span>
    </footer>
  </article>
</template>

<style scoped>
.realis-metric {
  display: grid;
  gap: var(--space-3);
  padding: var(--space-5);
  color: var(--color-text-primary);
}

.realis-metric__header,
.realis-metric__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}

.realis-metric__label {
  font-size: 13px;
  font-weight: 560;
  letter-spacing: 0.06em;
}

.realis-metric__state {
  border-radius: var(--radius-pill);
  padding: 2px var(--space-2);
  background: rgba(53, 189, 178, 0.18);
  background: color-mix(in srgb, var(--color-live-data) 18%, transparent);
  font-size: 12px;
}

.realis-metric__value {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
  margin: 0;
  font-variant-numeric: tabular-nums;
}

.realis-metric__value span:first-child {
  font-size: 40px;
  font-weight: 550;
  line-height: 1;
}

.realis-metric__unit,
.realis-metric__meta {
  color: var(--color-text-secondary);
  font-size: 12px;
}

.realis-metric[data-state="degraded"],
.realis-metric[data-state="maintenance"] {
  border-color: rgba(184, 121, 18, 0.52);
  border-color: color-mix(in srgb, var(--color-warning) 52%, transparent);
}

.realis-metric[data-state="offline"] {
  background: var(--color-surface);
  backdrop-filter: none;
}
</style>
```

#### Vite Configuration Principles

- **Import token CSS once**: Load `tokens.css`, `base.css`, `materials.css`, and `motion.css` in the app entry file.
- **Prefer CSS variables over JS theme constants**: Runtime theming should remain native, inspectable, and easy to override.
- **Use path aliases**: Keep component imports readable for a design-system structure.
- **Avoid visual lock-in**: Do not bake Realis Aero material rules into unrelated business logic.

```ts
import { fileURLToPath, URL } from "node:url";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
```

#### App Entry Pattern

```ts
import { createApp } from "vue";
import App from "@/app/App.vue";
import "@/styles/tokens.css";
import "@/styles/base.css";
import "@/styles/materials.css";
import "@/styles/motion.css";

createApp(App).mount("#app");
```

#### Vue Accessibility Requirements

- **Props must include meaning**: Components should receive `label`, `unit`, `state`, `updatedAt`, and `sourceLabel` when presenting metrics.
- **Computed ARIA labels**: Build accessible labels from real data instead of duplicating visual text poorly.
- **Keyboard behavior**: Buttons, tabs, dialogs, and menus must use native elements first.
- **Reduced motion**: Use a `useReducedMotion()` composable to disable live stream animation and large transitions.
- **Reduced transparency**: Use a `useReducedTransparency()` composable, a user-facing setting, and a root attribute such as `data-reduced-transparency="true"` because native media-query support can vary.
- **SSR readiness**: If the system later moves to Nuxt, avoid direct `window` access outside mounted lifecycle hooks.

#### Vue Design-System Rules

- **Components are instruments**: A Vue component should expose what it measures, controls, or explains.
- **State is first-class**: Never hide offline, stale, degraded, or uncertain states behind loading spinners.
- **Slots are for structure, not chaos**: Use named slots such as `header`, `metric`, `context`, and `actions` to preserve Realis Aero hierarchy.
- **Variants are limited**: Prefer `variant="primary | secondary | system | danger"` over open-ended visual customization.
- **Theming stays semantic**: A component should not know whether the app is in light or dark mode; it should consume semantic tokens.

### Figma Handoff Guidance

- Create token collections for color primitives, semantic colors, spacing, radius, elevation, blur, typography, and motion.
- Separate light and dark semantic variables from primitives.
- Build components with variants for state, density, platform, and theme.
- Include accessibility notes directly in component descriptions.
- Use realistic content in mockups: actual units, timestamps, thresholds, and degraded states.

### Tailwind Mapping Guidance

- Map primitives into `theme.extend.colors`.
- Map spacing to the 4px/8px scale rather than arbitrary values.
- Create utility classes for glass materials only after validating contrast.
- Keep motion tokens centralized and respect `motion-reduce`.

## Page & Product Patterns

### Landing Page

- **Hero**: Clear claim about feasible progress, paired with a live or simulated proof metric.
- **Visual**: Plausible built environment, not fantasy scenery.
- **CTA**: One primary action and one evidence-based secondary action.
- **Proof section**: Show metrics, prototypes, constraints, or implementation roadmap.
- **Tone**: Calm confidence, not hype.

### Dashboard

- **Top band**: Global system status, last sync, primary alert.
- **Primary grid**: Most important live metrics and trends.
- **Secondary grid**: Subsystems, maintenance, forecasts, and comparisons.
- **Detail panels**: Source, confidence, history, and recommended action.
- **Offline behavior**: Preserve layout and clearly mark stale data.

### Mobile App

- **Home**: One primary system health summary, 3 to 5 key metrics, urgent actions.
- **Navigation**: Bottom nav with no more than five destinations.
- **Cards**: Stack vertically; avoid dense multi-chart layouts.
- **Live updates**: Use badges and timestamps instead of constant animation.

### Hardware / Kiosk UI

- **Contrast**: Higher than standard due to lighting variability.
- **Touch targets**: 48px minimum where gloves or outdoor use are possible.
- **Material**: Dense hardware glass and physical control metaphors.
- **Maintenance**: Service state and diagnostics must be first-class.

## Voice & Content

### Voice Attributes

- **Clear**: Explain systems in plain language.
- **Measured**: Use evidence and qualifiers when needed.
- **Optimistic**: Show progress without exaggeration.
- **Responsible**: Communicate uncertainty and trade-offs.
- **Human**: Acknowledge maintenance, care, and practical next steps.

### Copy Rules

- Use active voice.
- Prefer specific claims over broad slogans.
- Pair benefits with evidence.
- Avoid “magic,” “seamless,” “revolutionary,” “limitless,” and “perfect.”
- Use “estimated,” “measured,” “forecast,” and “last updated” when relevant.

### Example Copy

- **Good**: `Solar output is 12% above forecast because cloud cover cleared earlier than expected.`
- **Good**: `Water recovery is offline. Last reliable reading: 18 minutes ago.`
- **Avoid**: `The future is effortlessly sustainable.`
- **Avoid**: `Unlimited clean energy at your fingertips.`

## Acceptance Criteria

A design qualifies as Realis Aero if it meets these standards:

- **Feasible**: It looks physically, technically, and socially plausible.
- **Informative**: It reveals at least one real system, state, metric, or dependency.
- **Readable**: It remains usable without decorative effects.
- **Repairable**: It includes maintainable, modular, or degraded-state thinking.
- **Accessible**: It works with reduced motion, reduced transparency, keyboard navigation, and screen readers.
- **Measured**: It avoids vague optimism by showing evidence or context.
- **Restrained**: It avoids candy gloss, fantasy utopia, arbitrary glow, and ornamental bubbles.

## Quality Assurance Checklist

### Visual QA

- **Light source**: Shadows and highlights are consistent.
- **Glass**: Transparency supports meaning and does not reduce readability.
- **Palette**: Accents are purposeful and not oversaturated.
- **Depth**: Layering communicates hierarchy.
- **Imperfections**: Wear, scratches, or condensation have a contextual reason.

### UX QA

- **States**: Live, stale, offline, degraded, maintenance, success, and uncertainty states are defined.
- **Metrics**: Units, timestamps, and confidence are shown where needed.
- **Navigation**: Current location and system status are visible.
- **Forms**: Errors are specific and recoverable.
- **Loading**: Progress is honest and does not hide failure.

### Accessibility QA

- **Contrast**: Text and controls pass contrast on final backgrounds.
- **Keyboard**: All actions are reachable and focus-visible.
- **Screen reader**: Metrics and charts have meaningful alternatives.
- **Reduced motion**: No essential information depends on animation.
- **Reduced transparency**: Glass panels have solid-surface fallbacks.

## Visual Examples

![Realis Aero Desktop Wallpaper](attachments/Generated Image.jpg)  
*Early foundational wallpaper: integrated sustainable landscape with glass UI overlays.*

![Mobile Sustainability Dashboard](attachments/Generated Image.jpg)  
*Mobile dashboard concept: live metrics, glass cards, maintenance-aware data visualizations.*

![Component Library Showcase](attachments/Generated Image.jpg)  
*Atomic components: buttons, cards, gauges, icons, navigation, and system states.*

## Recommended v0.3 Next Steps

- **Component specs**: Produce Figma variants for every component listed in this document.
- **Icon library**: Define a 24px icon grid with engineering-natural hybrid motifs.
- **Motion prototypes**: Create reduced-motion and standard-motion examples for live updates.
- **Contrast testing**: Validate final palette on real glass backgrounds and imagery.
- **Design examples**: Build one landing page, one dashboard, one mobile flow, and one maintenance flow.
- **Token export**: Generate JSON tokens for Figma, CSS, Tailwind, and React Native.
- **Content model**: Define standard data fields for metrics, timestamps, confidence, and source attribution.

---

**Realis Aero v0.2 is a feasible-future system: optimistic because it is measurable, beautiful because it is honest, and calm because it is built to be maintained.**
