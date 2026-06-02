# Handoff: Boulder Challenges — „Chalk" Redesign (Light)

## Overview
Boulder Challenges is a mobile app for tracking bouldering sessions with a group of
friends in real time. Players create or join a **Challenge** (identified by a 6-character
code), add **Boulders** (climbing problems, each with a difficulty grade and a hold
colour), and log their result on each boulder — **Flash**, **Top**, or **Nicht** (didn't
send) — plus the number of failed attempts (**Fehlversuche**). A live **Leaderboard**
ranks every player by points.

This handoff covers the **"Chalk" visual direction** — a light, editorial-minimal theme
with a warm paper background, near-black ink, and a single energetic vermilion accent.
(The prototype file also contains a second dark "Volt" theme; **ignore it** — the chosen
direction is Chalk / light only.)

## About the Design Files
The files in this bundle are **design references built in HTML/CSS + React (via in-browser
Babel)**. They are interactive prototypes that demonstrate the intended look, layout, and
behaviour — **they are not production code to copy verbatim.**

Your existing app is built with Claude Code. The task is to **recreate these designs inside
your existing codebase**, using its established framework, component patterns, state
management and styling approach. Treat the HTML/CSS as the source of truth for *appearance
and interaction*; map it onto your own components. If a styling system already exists in the
app, express the design tokens below in that system (CSS variables, Tailwind theme, native
styles, etc.).

## Fidelity
**High-fidelity (hifi).** Colours, typography, spacing, radii, and interactions are final and
intentional. Recreate the UI to match — exact hex values, fonts and sizes are listed below.

---

## Design Tokens (Chalk / Light)

These are the CSS custom properties from the `.theme-paper` block in the prototype. Port them
into your app's theme.

### Colour
| Token | Value | Use |
|---|---|---|
| `--bg` | `#F4F0E8` | App background (warm paper) |
| `--surface` | `#FCFBF7` | Cards, inputs, panels |
| `--surface-2` | `#EFEADE` | Secondary buttons, segmented/stepper backgrounds |
| `--surface-3` | `#E7E1D2` | Rank chips, boulder number badge |
| `--border` | `#E4DECF` | Hairline borders / dividers |
| `--border-strong` | `#D6CEBB` | Stronger borders (inputs, controls) |
| `--ink` | `#221F19` | Primary text (warm near-black) |
| `--muted` | `#8C8576` | Secondary text |
| `--faint` | `#B6AE9E` | Tertiary text, section labels, chevrons |
| `--accent` | `#E2522A` | Primary accent (signal vermilion) — primary CTA, active Flash, highlights |
| `--accent-ink` | `#FFFFFF` | Text/icon on accent fills |
| `--accent-soft` | `rgba(226,82,42,.12)` | Tinted accent backgrounds (flash icon chip) |
| `--ok` | `#1E8A52` | Success green — active "Top", positive points, "du" tag |
| `--ok-soft` | `rgba(30,138,82,.12)` | "You" leaderboard row background, top icon chip |
| `--bad` | `#C23B3B` | Danger red — active "Nicht", negative points, delete actions |
| `--bad-soft` | `rgba(194,59,59,.10)` | Active "Nicht" background, miss icon chip |
| `--gold` | `#D69A1E` | Leaderboard rank 1 chip |
| `--silver` | `#A7AAAE` | Leaderboard rank 2 chip |
| `--bronze` | `#B9743E` | Leaderboard rank 3 chip |

Hold colours are a fixed palette of **13 presets** (two are two-tone, rendered as a 135° hard
diagonal split):
| id | Label | Value |
|---|---|---|
| `blau` | Blau | `#2F6BEB` |
| `gruenblau` | Grün-Blau | `linear-gradient(135deg,#27B24A 0 50%,#2F6BEB 50% 100%)` |
| `gelb` | Gelb | `#E6B017` |
| `schwarz` | Schwarz | `#1B2130` |
| `rot` | Rot | `#E5484D` |
| `weiss` | Weiß | `#F4F2EC` |
| `mint` | Mint | `#57E0A1` |
| `lila` | Lila | `#A855F7` |
| `orange` | Orange | `#F97316` |
| `grau` | Grau | `#9AA1AC` |
| `hellblau` | Hellblau | `#84CDF5` |
| `orangeschwarz` | Orange-Schwarz | `linear-gradient(135deg,#F97316 0 50%,#1B2130 50% 100%)` |
| `gruen` | Grün | `#27B24A` |

### Typography
Three Google Fonts:
- **Display** — `Bricolage Grotesque` (weights 600/700/800). Headings, wordmark, button
  labels, names, grades, section labels.
- **Body / UI** — `Hanken Grotesk` (weights 400/500/600/700). Paragraphs, inputs, meta text.
- **Numeric** — `Hanken Grotesk` with `font-variant-numeric: tabular-nums` for scores,
  stepper values and the challenge code (code also uses `letter-spacing: .22em`).

Key sizes (px):
| Element | Font | Size | Weight | Notes |
|---|---|---|---|---|
| Wordmark "Boulder / Challenges" | Display | 46 | 800 | line-height .96, letter-spacing -.025em; 2nd line in `--accent` |
| Screen title (e.g. challenge name) | Display | 34 | 800 | letter-spacing -.025em |
| Tagline | Body | 15 | 400 | `--muted`, max-width ~30ch, balanced wrap |
| Section label (ZULETZT GESPIELT, LEADERBOARD, BOULDER) | Display | 12 | 700 | uppercase, letter-spacing .13em, `--faint` |
| Primary button label | Display | 17 | 700 | |
| Card title (recent/list/boulder grade/player name) | Display | 17 | 700 | |
| Card meta (code · date, "1 Tops · 1 Flashes") | Body | 12.5–13 | 400 | `--muted` |
| Leaderboard score | Numeric | 30 | 700 | tabular-nums |
| Challenge code chip | Numeric | 19 | 700 | letter-spacing .22em |
| Difficulty buttons (1–7) | Numeric | 22 | 700 | |
| Per-boulder "Punkte:" value | Numeric | 14 | 700 | green `--ok` / red `--bad` |

### Spacing, radii, shadow
- Radii: `--radius: 14px` (cards/panels), `--radius-sm: 10px` (inputs/segments/inner controls),
  `--radius-btn: 11px` (buttons). Bottom sheet top corners: `26px`. Rank chips & color dots:
  circles. Boulder number badge / grade buttons: `11–12px`.
- Shadow (cards): `--shadow: 0 1px 2px rgba(40,33,20,.04)` — very subtle; the look relies on
  hairline borders, not elevation.
- Primary button has a 2px "ink shadow": `box-shadow: 0 2px 0 rgba(160,48,16,.25)`.
- Screen content padding: `62px 20px 44px` (top clears the status bar/notch; bottom clears the
  home indicator). Vertical rhythm between blocks ≈ 26px; between cards in a list ≈ 10–12px.

### Iconography
Simple line icons (`stroke="currentColor"`, ~1.8–2.4 stroke width, 24×24 viewBox), drawn
inline as SVG. Set used: bolt (Flash, filled), check (Top), x (Nicht/close), chevron-left,
chevron-right, plus, minus, share (upload arrow), users, camera, image, pencil (edit), up,
down. No icon font, no emoji.

---

## Screens / Views

### 1. Home (`BCHome`)
**Purpose:** Entry point — create or join a challenge, resume recent, browse all challenges.

**Layout** (single scroll column, 20px side padding):
1. **Hero** (centered): wordmark on two lines ("Boulder" in `--ink`, "Challenges" in
   `--accent`), then tagline in `--muted`.
2. **CTA stack** (flex column, gap 11px):
   - Primary button **"Neue Challenge erstellen"** — `--accent` fill, white text, plus icon.
   - Secondary button **"Challenge beitreten"** — `--surface-2` fill, `--border-strong`
     border, ink text, users icon.
3. **"Zuletzt gespielt"** section (only if a recent exists): one card showing challenge name
   (display 17/700), `Code XXXXXX · als <alias>` meta, and a circular dismiss "×" on the right
   (stops propagation; removes the recent).
4. **"Alle Challenges"** section: vertical list of cards. Each row: name + `Code · date` meta on
   the left; player count (`N Spieler`) + chevron-right on the right.

**Behaviour:** Primary → Create screen. Secondary → Join screen. Recent/list card → opens that
Challenge. Dismiss "×" → removes the recent entry.

### 2. Create Challenge (`BCCreate`)
**Purpose:** Configure a new challenge.

**Layout** (scroll column):
- Top bar: back button "‹ Zurück" (muted).
- Screen title **"Neue Challenge"**.
- Field **"Name der Challenge"** — text input, placeholder "z.B. Alle Vierer abklettern".
- Field **"Dein Name"** — text input, placeholder "z.B. Alex".
- Panel **"Spielmodus"** — 2-up segmented control:
  - **Klassisch** / sub "Feste Punkte"
  - **Multiplikator** / sub "Grad × Punkte"
  - Active option: `--accent` fill, white text. Hint text below explains the chosen mode.
- Panel **"Punkteregeln"** — three rows, each: a coloured icon chip + label + a stepper
  (− value +):
  - ⚡ "Punkte für Flash" (default 30, flash-coloured chip)
  - ✓ "Punkte für Top" (default 25, ok-coloured chip)
  - ✕ "Kosten pro Fehlversuch" (default 5, bad-coloured chip)
- Panel **"Minuspunkte"** — 3-up chips (two-line label + sub):
  - **Top nie negativ** / "Empfohlen" (default)
  - **Strikt** / "Kann negativ"
  - **Nur Fehlversuche** / "Kann negativ"
  - Active chip: `--accent` fill, white text. Hint text below.
- Footer primary button **"Challenge erstellen"** (disabled until name + your-name are filled).

**Behaviour:** Submitting creates the challenge (random 6-char code, you as the only player,
no boulders yet) and navigates into it.

### 3. Join Challenge (`BCJoin`)
**Purpose:** Join an existing challenge by code.

**Layout:** back bar; title **"Challenge beitreten"**; lead paragraph; field "Challenge-Code"
(monospace-style input, uppercased, max 6 chars, A–Z0–9 only); field "Dein Name"; footer
button **"Beitreten"** (enabled when code ≥ 4 chars and name present).

### 4. Challenge (`BCChallenge`) — the core screen
**Purpose:** Live scoreboard + per-boulder logging.

**Layout** (scroll column):
- Top bar: back **"‹ Übersicht"** (muted) on the left, **"Löschen"** (`--bad`) on the right.
- Screen title = challenge name.
- **Code bar:** a monospace code chip (tap → copies, shows "Kopiert ✓" for 1.4s) + a text
  **"Teilen"** button with share icon.
- **Rules row** (wrapping, `--muted`, 13px, dot-separated): e.g. `×Grad · ⚡6 Flash · ✓5 Top ·
  −1/Fehlsuch · Top nie negativ`. `×Grad` shows only in multiplier mode (accent, mono);
  the negativity-mode label is in `--ok`.
- **Leaderboard card** (`--surface`, header "LEADERBOARD"): one row per player, sorted by score
  desc (then tops, then flashes):
  - Rank chip (circle): 1=gold, 2=silver, 3=bronze, else `--surface-3`.
  - Name (display 17/700); the current user gets a small **"du"** tag (uppercase, `--ok` on
    `--ok-soft`). Meta line: `N Tops · M Flashes`.
  - Score on the right (numeric 30/700, tabular).
  - The current user's row is highlighted: `--ok-soft` background + inset `--ok` ring.
  - When the user's score changes, the row briefly pulses (accent-soft flash, ~0.65s).
- **Boulder section** header: `Boulder (N)` label + a small "＋ Hinzufügen" text button.
- **Boulder cards** (one per boulder):
  - Top row: number badge (`--surface-3`, 34×34, radius 11) · grade ("Grad N", or "Boulder"
    if no grade) + colour line (dot + colour label) · right side shows `N Tops` (only if >0)
    and an **edit pencil** button.
  - Action row: 3-up buttons **Flash** / **Top** / **Nicht** (each icon + label).
    - Inactive: `--surface-2` fill, `--border-strong` border, ink text.
    - Active Flash: `--accent` fill / white. Active Top: `--ok` fill / white.
    - Active Nicht: `--bad-soft` fill, `--bad` border + text.
    - Tapping the active state again clears it (back to "none").
  - **Fehlversuche row** (shown only when status is Top or Nicht): label "Fehlversuche" + a
    mini stepper (− value +). "−" disabled at 0.
  - **"Punkte:" line** (shown once a status is set, right-aligned): the player's points for
    that boulder, green if ≥0, red if negative.
  - A dashed **"＋ Boulder hinzufügen"** button closes the list.

### 5. Add / Edit Boulder — bottom sheet (`AddBoulderSheet`)
**Purpose:** Create a boulder, or edit/delete an existing one. Slides up from the bottom over a
dimmed, slightly blurred scrim; tapping the scrim closes it.

**Layout:** grab handle; title **"Boulder hinzufügen"** (or **"Boulder bearbeiten"** when
editing):
- **"Schwierigkeit / Wertung (optional)"** — a row of 7 square buttons labelled **1–7**. Tap to
  select; tap the selected one again to deselect (grade can be null). Active: `--accent` fill.
- **"Farbe"** — a 7-column grid of the 13 preset colour dots (two are two-tone). Selected dot
  gets a ring (`0 0 0 3px var(--surface), 0 0 0 5px var(--ink)`).
- **"Foto (optional)"** — two buttons: **"Foto aufnehmen"** (camera icon) and **"Aus Galerie"**
  (image icon). *In the prototype these are visual placeholders — wire them to your real
  camera/library pickers.*
- Footer: **"Abbrechen"** (ghost) + **"Hinzufügen"** / **"Speichern"** (primary).
- When editing, a red **"Boulder löschen"** text button appears below the footer.

---

## Interactions & Behaviour
- **Navigation** is screen-state based (home → create / join / challenge), no router needed at
  the prototype level; scroll resets to top on each screen change.
- **Opening a recent** that isn't yet a full challenge "promotes" it into one (demo data) —
  in production this just loads the challenge by code/id.
- **Toggling results** updates the player's cell `{ status, misses }` and immediately
  recomputes the leaderboard (re-sorts) with the user-row pulse.
- **Selecting Flash** forces `misses = 0` and hides the Fehlversuche stepper (a flash means a
  first-try send).
- **Stepper / mini-stepper** clamp at a minimum of 0.
- **Copy code** gives transient "Kopiert ✓" feedback.
- **Sheet** animates: scrim fades in (~0.2s), sheet slides up (~0.32s, ease-out). It is
  scrollable and capped at 90% height.
- Buttons have a subtle press scale (`:active { transform: scale(.93–.975) }`).
- Respect `prefers-reduced-motion` when porting animations.

## State Management
Per challenge:
```
Challenge {
  id, name, code (6 chars), date,
  rules: { mode: 'classic'|'multiplier', flash:int, top:int, miss:int,
           neg: 'topNeverNegative'|'strict'|'missesOnly' },
  players: [ { id, name } ],
  boulders: [ { id, grade: 1..7|null, color: <holdId> } ],
  results: { [playerId]: { [boulderId]: { status:'flash'|'top'|'nicht'|null, misses:int } } }
}
```
App-level: list of challenges, a `recent` pointer, and the current user's `youId`. UI-level:
current screen, active challenge id, the open sheet ('add' | boulderId | closed), and a
transient `bumpId` for the leaderboard pulse.

### Scoring (must match exactly)
Per boulder, for a player, with `f = (mode === 'multiplier' ? (grade || 1) : 1)` and `m = misses`:
- **flash** → `f * flash`
- **top** → `f * top − m * miss`
- **nicht** → `−m * miss`
- **none** → `0`
- If `neg === 'topNeverNegative'` and status is top/flash, clamp the boulder's points to `≥ 0`.

A player's **score** is the sum over boulders. **Tops** = count of flash+top boulders;
**Flashes** = count of flash boulders. Leaderboard sorts by score, then tops, then flashes.

Worked examples (classic, top 25 / miss 5): **Top + 1 Fehlversuch = 20**; **Nicht + 2
Fehlversuche = −10**. (Multiplier, flash base 6: a Grade-4 flash = `4 × 6 = 24`.)

## Assets
No external images. The phone bezel/status bar is a presentational device frame
(`ios-frame.jsx`) used only for the prototype — **drop it** when porting into a real app; render
the screen content directly. All icons are inline SVG (see Iconography). Fonts load from Google
Fonts (Bricolage Grotesque, Hanken Grotesk; the dark theme also pulls Space Grotesk + JetBrains
Mono, which you can ignore for Chalk).

## Files
- **`Chalk Reference.html`** — open this in a browser to see and click the light design (single
  phone, full flow). This is the primary visual reference.
- **`boulder-screens.jsx`** — presentational components: `BCHome`, `BCCreate`, `BCJoin`, icon set
  (`I`), the hold-colour palette (`HOLD_LIST` / `HOLD` / `HOLD_LABEL`), `Segmented`, `Stepper`.
- **`boulder-app.jsx`** — data model, scoring (`boulderPoints`, `computePlayer`, `leaderboard`),
  the `BCChallenge` screen, `AddBoulderSheet`, and the stateful `Phone` container with all
  handlers. **This file is the best reference for behaviour and the exact scoring math.**
- **`ios-frame.jsx`** — device frame only; not part of the app design.
- The full Chalk CSS lives in the `<style>` block of `Chalk Reference.html` under
  `.theme-paper` and the `.bc-*` component rules. (The same file also contains `.theme-volt`
  dark-theme rules — ignore them.)

> Note: the prototype uses React via in-browser Babel purely for convenience. Use your app's
> real build/framework; the JSX is a reference, not a dependency.
