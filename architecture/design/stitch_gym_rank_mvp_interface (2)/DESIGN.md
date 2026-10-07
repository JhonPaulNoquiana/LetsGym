---
name: Kinetic Obsidian
colors:
  surface: '#0f131c'
  surface-dim: '#0f131c'
  surface-bright: '#353942'
  surface-container-lowest: '#0a0e16'
  surface-container-low: '#181c24'
  surface-container: '#1c2028'
  surface-container-high: '#262a33'
  surface-container-highest: '#31353e'
  on-surface: '#dfe2ee'
  on-surface-variant: '#c4c9ac'
  inverse-surface: '#dfe2ee'
  inverse-on-surface: '#2c3039'
  outline: '#8e9379'
  outline-variant: '#444933'
  surface-tint: '#abd600'
  primary: '#ffffff'
  on-primary: '#283500'
  primary-container: '#c3f400'
  on-primary-container: '#556d00'
  inverse-primary: '#506600'
  secondary: '#4cd7f6'
  on-secondary: '#003640'
  secondary-container: '#03b5d3'
  on-secondary-container: '#00424e'
  tertiary: '#ffffff'
  on-tertiary: '#00354a'
  tertiary-container: '#c4e7ff'
  on-tertiary-container: '#006c93'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#c3f400'
  primary-fixed-dim: '#abd600'
  on-primary-fixed: '#161e00'
  on-primary-fixed-variant: '#3c4d00'
  secondary-fixed: '#acedff'
  secondary-fixed-dim: '#4cd7f6'
  on-secondary-fixed: '#001f26'
  on-secondary-fixed-variant: '#004e5c'
  tertiary-fixed: '#c4e7ff'
  tertiary-fixed-dim: '#7bd0ff'
  on-tertiary-fixed: '#001e2c'
  on-tertiary-fixed-variant: '#004c69'
  background: '#0f131c'
  on-background: '#dfe2ee'
  surface-variant: '#31353e'
typography:
  display-xl:
    fontFamily: Space Grotesk
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.03em
  display-xl-mobile:
    fontFamily: Space Grotesk
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 38px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Space Grotesk
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 34px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Space Grotesk
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Space Grotesk
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: 0em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: 0em
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0em
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: 0.01em
  stat-xl:
    fontFamily: JetBrains Mono
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.04em
  stat-lg:
    fontFamily: JetBrains Mono
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 28px
    letterSpacing: -0.02em
  label-md:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.06em
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 10px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.08em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 0.75rem
  gutter-tablet: 1rem
  gutter-desktop: 1.5rem
  margin: 1rem
  margin-tablet: 1.5rem
  margin-desktop: 2.5rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

This design system channels an elite, high-performance athletic atmosphere tailored for dedicated lifters and competitive fitness enthusiasts. The aesthetic fuses technical precision, gamified progression, and biometric-grade clarity—evoking the focused tension of an Olympic weight room paired with modern digital instruments like Whoop and Strava.

Visual execution relies on a high-contrast dark foundation. Deep obsidian and charcoal slates establish an immersive low-light container that prioritizes battery efficiency and eye comfort in dimly lit gyms. Hyper-saturated electric volt lime and cyber cyan accents inject bursts of adrenaline, signaling personal records, active tracking states, and tier ascension. 

Depth is achieved not through heavy decorative dropshadows, but via tonal layering, ultra-fine technical borders (hairlines), and tactical localized glow effects. The overall demeanor is dialed-in, utilitarian, and uncompromisingly modern.

## Colors

The palette balances clinical precision with aggressive athletic energy across four primary functional tiers:

- **Base Canvas & Layering**:
  - `canvas-default`: `#0B0F17` (Deep Obsidian Void)
  - `surface-subtle`: `#131B2A` (Charcoal Slate base card fill)
  - `surface-elevated`: `#1E293B` (Interactive/highlighted card state)
  - `surface-border`: `#334155` at 40% to 60% opacity (Hairline containment)

- **Performance Accents**:
  - `primary` (`#CCFF00` Electric Volt): Critical CTAs, active rep timers, personal bests, and top-tier achievement badges.
  - `secondary` (`#06B6D4` Cyber Cyan) & `tertiary` (`#38BDF8` Sky Cyan): Heart-rate spikes, telemetry charts, pace metrics, and dynamic progress rings.

- **Typography & Content Hierarchy**:
  - `text-primary`: `#F8FAFC` (100% white-hot crisp legibility)
  - `text-secondary`: `#94A3B8` (Cool slate for labels, metadata, and timestamps)
  - `text-muted`: `#64748B` (Inactive states, structural table rules)

- **Gamification & Ranking Tiers**:
  - **Bronze**: `#D97706` base with `#78350F` deep shadows.
  - **Silver**: `#94A3B8` base with `#475569` deep shadows.
  - **Gold**: `#FACC15` base with `#854D0E` deep shadows.
  - **Diamond**: `#38BDF8` base with `#1E1B4B` rich indigo undertones.

## Typography

The typographic hierarchy implements three distinct type systems to guarantee structural clarity during mid-workout viewing:

1. **Space Grotesk (Headlines & Gamification Anchors)**: Provides a sharp, aggressive, technical posture. Headings demand immediate recognition without cluttering the viewport.
2. **Inter (Body, Descriptions, Community Feeds)**: Provides neutral, ultra-legible, fatigue-free reading for exercise instructions, feed comments, and profile logs.
3. **JetBrains Mono (Stats, Numerals, Metadata Badges)**: Fixed-width metrics eliminate horizontal jitter during live counting (seconds, heart rates, kilo/pound increments) and elevate the app's instrumentation character.

All metric labels (`label-sm`, `label-md`) must be transformed to uppercase with expanded letter-spacing to reinforce precision tracking instrumentation.

## Layout & Spacing

A mobile-first 4-column layout fluidly expands to an 8-column layout on tablets and a 12-column layout on desktop dashboards. 

- **Mobile Viewports (< 640px)**: 16px (`1rem`) lateral canvas margins guarantee thumb-accessible touch targets without edge-cramping. Critical actionable items maintain a minimum 48px vertical touch target.
- **Rhythm & Flow**: Built strictly on a 4px/8px incremental grid. Intra-component padding scales between `space-sm` (8px) for high-density stat tiles and `space-md` (16px) for feed cards. Structural gaps between distinct modules utilize `space-lg` (24px) or `space-xl` (32px).
- **Data Table Layouts**: Stat grids leverage auto-fit columns with `gutter` spacing (12px) to allow horizontal swipe cards for workout splits, set/rep matrices, and weekly streak trackers.

## Elevation & Depth

Visual hierarchy does not use soft skeuomorphic drop shadows. Instead, depth is articulated through surface luminance, sharp technical borders, and focused ambient glows:

- **Level 0 (Canvas Base)**: Pure `#0B0F17`. The foundational ground layer.
- **Level 1 (Subtle Containers / Rest States)**: Surface `#131B2A` bordered with a 1px solid stroke of `#1E293B`.
- **Level 2 (Active Cards / Floating Bottom Navigation)**: Surface `#1E293B` bordered with 1px solid `#334155` at 50% opacity. 
- **Level 3 (Focused State / PR Alerts / Modal Sheets)**: Surface `#1E293B` enveloped by a low-spread radial neon glow: `0 0 24px -4px rgba(204, 255, 0, 0.15)` for volt-focused actions or `0 0 24px -4px rgba(6, 182, 212, 0.18)` for cyan biometrics.
- **Backdrop Overlays**: Semi-translucent `#0B0F17` at 85% opacity with an 8px hardware-accelerated blur (`backdrop-filter: blur(8px)`) preserves contextual immersion beneath drawer sheets and modal timers.

## Shapes

The design system standardizes on a structured, athletic corner treatment (`roundedness: 2` / 8px default):

- **Cards & Data Modules**: 8px (`0.5rem`) to 16px (`1rem`) corner radius. This keeps dashboards feeling crisp, technical, and compact without sharp utilitarian harshness.
- **Interactive Buttons & Badges**: Fully radiused pill silhouettes (`9999px`) for action chips, stat badges, and primary action triggers, creating instant affordance separation between layout cards and interactive elements.
- **Progress Gauges & Visual Rings**: Concentric circular rings with rounded stroke caps (`stroke-linecap: round`) reinforce continuous biometric momentum.

## Components

### Buttons
- **Primary Kinetic**: Pill-shaped (`rounded-full`), `#CCFF00` fill with `#0B0F17` bold typography. Active press state triggers a scale reduction to 0.98 with an inner ambient glow.
- **Secondary Ghost**: Pill-shaped, transparent fill, 1px solid border in `#38BDF8`, text rendered in `#38BDF8`.
- **Subtle Surface**: 8px radius, `#1E293B` fill, `#F8FAFC` text, minimal border in `#334155`.

### Chips & Status Pills
- Compact pill tokens combining `label-sm` monospace text with an optional 6px pulsing dot.
- High-intensity variants feature a 10% translucent background with a solid accent border (e.g., `#CCFF00` at 10% fill with a 1px `#CCFF00` border).

### Ranking Tiers & Gamification Badges
- Hexagonal and beveled shield silhouettes representing Bronze, Silver, Gold, and Diamond.
- Tier indicators feature angular dual-tone metallic gradients bordered by 1px precision hairline strokes, accompanied by uppercase `label-md` mono designations.

### Data Tables & Workout Logs
- Dense tabular rows alternating with razor-thin `#1E293B` dividers.
- Set/Rep inputs utilize centered `stat-lg` numeric values set against `#131B2A` recessed input fields with bold electric-volt indicators on edit states.

### Progress Rings & Biometric Gauges
- Dual SVG circular rings: Background track set to `#1E293B`, foreground active stroke leveraging an angular gradient from `#06B6D4` to `#CCFF00`.
- Center container features stacked `stat-xl` current values paired with `label-sm` target metrics.

### Form Inputs & Checkboxes
- **Inputs**: 8px rounded `#131B2A` containers with 1px border (`#334155`). Focus switches border to `#CCFF00` with zero outline offset.
- **Checkboxes**: 20px rounded squares with 4px inner radius. Checked states fill solid `#CCFF00` with an obsidian `#0B0F17` checkmark icon.