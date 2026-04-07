# Gym Tracker

**Live gym busyness tracker — know before you go.**

GymTracker is a single-file web app that lets gym-goers report how busy their gym is in real time, flag equipment that's in use, share how many reps they have left on a machine, and get AI-suggested alternative workouts when things are too crowded. It works on any device — phone, tablet, or desktop — and saves your data locally so nothing is lost between visits.

---

## Table of Contents

- [What It Does (Simplified)](#what-it-does-plain-english)
- [How to Open It](#how-to-open-it)
- [Features at a Glance](#features-at-a-glance)
- [For Developers](#for-developers)
  - [Project Structure](#project-structure)
  - [Tech Stack](#tech-stack)
  - [State Management](#state-management)
  - [Layout System](#layout-system)
  - [AI Integration](#ai-integration)
  - [Accessibility](#accessibility)
  - [Known Limitations](#known-limitations)
- [Changelog](#changelog)

---

## What It Does

Imagine showing up to the gym and finding every squat rack taken and the cardio section packed. GymTracker helps you avoid that — or deal with it when it happens.

Here's what you can do with it:

**Find your gym.** Type in the name of your gym or a zip code. A dropdown will suggest matching gyms as you type.

**See how busy it is.** A color-coded meter shows the current busyness level — green for quiet, yellow for moderate, orange for busy, red for very busy. The meter updates based on reports from other users.

**Report the busyness yourself.** Hit "It's Busy" or "Not Busy" to contribute a live report. This helps everyone else plan their visit.

**Plan your arrival.** Tap "Suggest Best Arrival" and the app will recommend the best time to come based on current conditions.

**See a busyness heatmap.** A visual chart shows which hours of the day are typically quiet or packed at your gym, so you can plan ahead.

**Mark equipment as in use.** If the squat rack or the bench press is taken, flag it so others know. Reports disappear automatically after 30 minutes so the list stays accurate.

**Share your reps and sets.** If you're using a piece of equipment, you can share how many sets and reps you have left. Other members can see this and decide whether to wait.

**Get alternative workout suggestions.** If your gym is too busy or key equipment is unavailable, the app suggests workouts you can do at home, outdoors, or in a free part of the gym. You can choose your fitness goal — strength, cardio, mobility, or fat loss — and the suggestions adjust accordingly.

---

## How to Open It

There is nothing to install. The app is a single HTML file.

1. Download `gymtracker.html`
2. Open it in any modern web browser (Chrome, Firefox, Safari, Edge)
3. That's it

Your gym, busyness reports, equipment flags, and reps are all saved automatically in your browser. They'll still be there the next time you open the file.

> **Note:** The AI workout suggestions require an internet connection. Everything else works offline.

---

## Features at a Glance

| Feature | Details |
|---|---|
| Gym search | Autocomplete dropdown, keyboard navigable |
| Live busyness meter | Color-coded 0–100% bar with status label |
| Busy reporting | Crowd-sourced votes update the meter |
| Arrival planner | Context-aware time suggestion |
| Hourly heatmap | Typical busyness pattern across 18 time slots |
| Equipment status | Tag items as in use with 30-minute auto-expiry |
| Reps & sets sharing | Shows sets left, reps per set, total reps |
| AI workout alternatives | Goal-specific suggestions via Claude API |
| Persistent storage | `localStorage` — survives page refresh |
| Responsive layout | Sidebar + grid on desktop, bottom nav on mobile |
| Accessibility | WCAG 2.1 AA — labels, ARIA, keyboard, focus rings |

---

## For Developers

### Project Structure

The entire app lives in one file: `gymtracker.html`.

```
gymtracker.html
├── <head>
│   ├── Meta tags (viewport, theme-color, Apple PWA)
│   └── Google Fonts (Space Grotesk + DM Mono)
├── <style>
│   ├── CSS custom properties (design tokens)
│   ├── Mobile layout (< 900px) — bottom nav, page panels
│   ├── Desktop layout (≥ 900px) — sidebar, 2-col grid
│   └── Shared component styles (cards, inputs, buttons, etc.)
├── <body>
│   ├── #desktopShell — sidebar + scrollable content (hidden on mobile)
│   │   ├── #sidebar — fixed left nav
│   │   └── #desktopContent — section grid
│   └── #mobileShell — header + page panels + bottom nav (hidden on desktop)
│       ├── #mobileHeader
│       ├── #mobileMain — page-find, page-equip, page-alts
│       └── #bottomNav
└── <script>
    ├── Responsive switch (matchMedia)
    ├── State management (localStorage)
    ├── Autocomplete logic
    ├── Heatmap renderer
    ├── Busy meter
    ├── Equipment + expiry timers
    ├── Reps & sets
    ├── Goal chips
    ├── AI alternatives (Anthropic API)
    ├── renderAll() — syncs both UIs from shared state
    └── Boot (restores persisted state on load)
```

---

### Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Language | Vanilla HTML/CSS/JS | No build step, no dependencies |
| Fonts | Google Fonts (Space Grotesk, DM Mono) | Loaded via CDN |
| AI | Anthropic `/v1/messages` (claude-sonnet-4-20250514) | Workout suggestions |
| Storage | `localStorage` | Zero-config persistence |
| Layout | CSS Grid + Flexbox + `matchMedia` | Responsive without a framework |

No npm, no bundler, no framework. Open the file and it works.

---

### State Management

All application state lives in a single `state` object that is read and written by every function.

```js
const DEF = {
  gymId: null,          // string — selected gym identifier
  gymName: '',          // string — display name
  gymAddr: '',          // string — address
  busyLevel: 0,         // number — 0–100, current busyness percentage
  busyVotes: {          // object — vote tallies
    busy: 0,
    ok: 0
  },
  equipment: [],        // array — { name: string, expires: timestamp }
  sets: 0,              // number — sets remaining
  reps: 0,              // number — reps per set
  goal: 'strength'      // string — 'strength' | 'cardio' | 'mobility' | 'fat loss'
};
```

**Persistence:** State is serialized to `localStorage` under the key `gymtracker_v4` on every mutation via `save()`. On load, expired equipment entries are pruned before the state is used.

**Rendering:** A `renderAll()` function iterates over both the `'m'` (mobile) and `'d'` (desktop) UI trees and updates every element from the current state. This keeps both layouts in sync without duplication or event wiring. Every user action calls `save()` then `renderAll()`.

**Element lookup:** A helper `el(id, prefix)` wraps `document.getElementById(prefix + '-' + id)` to handle the `m-` / `d-` namespacing of duplicate DOM elements across both layouts.

---

### Layout System

The app renders two separate DOM trees — one for desktop, one for mobile — and shows only the appropriate one based on a `matchMedia` query at `900px`.

```js
const MQ = window.matchMedia('(min-width: 900px)');
MQ.addEventListener('change', e => applyLayout(e.matches));
applyLayout(MQ.matches); // runs on load
```

**Why two DOM trees instead of one responsive layout?**

The mobile and desktop layouts differ enough in navigation pattern (bottom tabs vs. sidebar), content arrangement (page-by-page vs. all-at-once), and card structure (stacked vs. grid) that a single DOM tree with purely CSS overrides would be fragile and hard to maintain. The two-tree approach keeps each layout clean and independently testable. State is shared, rendering is duplicated.

**Desktop layout:**
- Fixed 220px sidebar (`#sidebar`) with smooth-scroll anchor links
- Scrollable main content area (`#desktopContent`) offset by sidebar width
- Cards arranged in 2-column CSS Grid (`.card-grid`)
- Workout suggestions shown in a 3-column grid
- Heatmap renders full-width without horizontal scroll

**Mobile layout:**
- Sticky top header
- Three page panels (`#page-find`, `#page-equip`, `#page-alts`) — only one visible at a time
- Fixed bottom nav switches pages and sets `aria-current="page"`
- Heatmap scrolls horizontally on narrow screens via `-webkit-overflow-scrolling: touch`
- All inputs sized to at least 44px height (WCAG touch target minimum)

---

### AI Integration

Workout suggestions are fetched from the Anthropic API when:
- Gym busyness reaches 60% or higher, **or**
- Two or more pieces of equipment are flagged as in use, **or**
- The user taps "Get Suggestions Now" manually

```js
async function triggerAlternatives(force = false, p = 'm') {
  // Guarded by altInFlight flag to prevent concurrent requests
  // Updates both 'm' and 'd' UI trees simultaneously
  // Falls back to getFallbacks(goal) if the API call fails
}
```

**Prompt structure:**

```
Gym {busyLevel}% busy. Equipment in use: {blocked}. User goal: {goal}.
Suggest 3 alternative workouts. Return ONLY valid JSON array, no markdown.
Schema: [{"title": string, "badge": string, "desc": string}]
```

The response is parsed as JSON and rendered into both UI trees via `renderAlts()`. If parsing fails for any reason, `getFallbacks(goal)` returns a hardcoded set of goal-specific suggestions so the user always sees something useful.

**Model:** `claude-sonnet-4-20250514`
**Max tokens:** `1000`
**Auth:** Handled externally by the API proxy — no key is embedded in the file.

---

### Accessibility

The app targets WCAG 2.1 Level AA. Key implementations:

| Requirement | Implementation |
|---|---|
| Skip navigation | `.skip-link` anchors to `#main-content`, visible on focus |
| Landmark roles | `<header role="banner">`, `<nav aria-label="...">`, `<main>`, `<section aria-labelledby="...">` |
| Inputs | Every input has a visible `<label>` with matching `for`/`id` |
| Error messages | `role="alert"` + `aria-live="assertive"` — announced immediately |
| Toggle buttons | `aria-pressed="true/false"` on Busy/Not Busy and goal chips |
| Progress bar | `role="progressbar"` + `aria-valuenow` updated on every state change |
| Heatmap cells | `tabindex="0"` + `role="img"` + descriptive `aria-label` per cell |
| Autocomplete | `role="combobox"` + `aria-expanded` + `aria-autocomplete="list"` |
| Live regions | `aria-live="polite"` on gym result, plan box, equipment list, alt suggestions |
| Current page | `aria-current="page"` on active nav button |
| Focus rings | `:focus-visible` on all interactive elements — never suppressed |
| Touch targets | All buttons/inputs min 44×44px |
| Color contrast | Status text always accompanies color on the meter — color is never the only signal |
| Reduced motion | `@media (prefers-reduced-motion: reduce)` disables all animations |
| iOS zoom | All inputs explicitly `font-size: 16px` to prevent auto-zoom on focus |

---

### Known Limitations

- **No real gym database.** The gym list is a small hardcoded array of NYC locations. Real deployment would swap this for a Google Places API integration.
- **No real-time multi-user sync.** Busyness reports and equipment flags are local to each browser session. A backend (e.g. Firebase, Supabase) would be needed to share reports across users.
- **Single file.** Convenient for distribution but the CSS/JS would benefit from being split into separate files as the codebase grows.
- **No authentication.** Any user can report any gym. Production use would require rate limiting and basic identity.

---

## Changelog

All notable changes are documented here, newest first.

---

### v4 — Desktop-Responsive Layout *(current)*

**What changed for users:**
On a desktop or laptop, the app now shows a proper sidebar and displays all sections at once — no more clicking through tabs. On a phone, everything looks and works exactly the same as before.

**What changed for developers:**
- Added `#desktopShell` — a fixed sidebar (`#sidebar`, 220px) plus a scrollable main content area (`#desktopContent`)
- Added `#mobileShell` containing the existing header, bottom nav, and page panels — unchanged from v3
- `applyLayout(isDesktop)` toggles between shells using `matchMedia('(min-width: 900px)')` with a live `change` listener so the layout adapts without a page reload
- All interactive elements are now prefixed `d-` (desktop) or `m-` (mobile); a helper `el(id, prefix)` resolves the correct element
- `renderAll()` iterates over both prefixes and syncs every piece of UI from the shared `state` object — no duplication of logic, only of DOM
- Desktop card layout uses `.card-grid` (CSS Grid, 2 columns); workout cards use a 3-column grid (`grid-template-columns: repeat(3, 1fr)`)
- Sidebar navigation uses `scrollIntoView({ behavior: 'smooth' })` anchored to section IDs
- Heatmap renders full-width on desktop (no horizontal scroll needed)
- `localStorage` key bumped to `gymtracker_v4`

---

### v3 — Mobile-First Redesign + Full Accessibility Pass

**What changed for users:**
The app was rebuilt from scratch for phones. A bottom navigation bar replaces the long scroll. Buttons are bigger and easier to tap. The app now works properly with screen readers, keyboard navigation, and reduced-motion preferences.

**What changed for developers:**
- Bottom tab nav (`#bottomNav`) with three pages: Find, Equipment, Workouts
- `switchPage(btn)` shows one `.page` panel at a time and sets `aria-current="page"`
- All inputs set to `font-size: 16px` to prevent iOS auto-zoom on focus
- All interactive elements meet 44px minimum touch target (WCAG 2.5.5)
- `touch-action: manipulation` and `-webkit-tap-highlight-color: transparent` on buttons to remove 300ms tap delay
- Safe area insets applied via `env(safe-area-inset-*)` for notched iPhones
- `overscroll-behavior: none` prevents rubber-band flash on iOS
- `viewport-fit=cover` in the meta viewport tag
- `@media (prefers-reduced-motion: reduce)` disables all CSS animations and transitions
- Skip link (`.skip-link`) visible on focus, anchored to `#main-content`
- Every input has a visible `<label>` element (not just `sr-only`)
- Error messages use `role="alert"` + `aria-live="assertive"`
- Heatmap cells are keyboard-focusable with `tabindex="0"` and full descriptive `aria-label`
- `aria-pressed` on all toggle buttons; `role="progressbar"` + `aria-valuenow` on busy meter
- `localStorage` key bumped to `gymtracker_v3`

---

### v2 — Six Feature Improvements

**What changed for users:**
Your gym and settings are now remembered between visits. Equipment badges show a countdown timer and disappear automatically. A busyness heatmap shows the best hours to visit. Workout suggestions now match your fitness goal.

**What changed for developers:**

**localStorage persistence**
- All state serialized to `localStorage` key `gymtracker_v2` via `save()` on every mutation
- Expired equipment pruned on load; state merged with `DEF` defaults for forward compatibility

**Autocomplete gym search**
- Debounced `input` listener (180ms) filters `GYMS` array by name, zip, and address
- Dropdown rendered with `role="listbox"` / `role="option"`; keyboard navigable via ArrowUp/Down/Enter/Escape
- `pointerdown` (not `click`) used on list items to prevent iOS focus loss

**Equipment auto-expiry**
- Each equipment report stores an `expires` timestamp (`Date.now() + 30 * 60 * 1000`)
- `setInterval` per tag updates the displayed countdown every 30 seconds and calls `removeEquip(i)` at zero
- Expired items also pruned on `renderEquipList()` and on boot

**Hourly busyness heatmap**
- 18 cells covering 6am–midnight rendered as a CSS Grid
- Cell color mapped to four bands: green < 30%, yellow < 55%, orange < 75%, red ≥ 75%
- Pattern seeded by gym ID using a deterministic pseudo-random function (`Math.sin`-based) — consistent across reloads, different per gym
- Cells are keyboard-focusable with tooltip on hover/focus
- Horizontally scrollable on narrow screens via `.heatmap-scroll`

**Goal-based AI alternatives**
- Four goal chips added: Strength, Cardio, Mobility, Fat Loss
- `state.goal` included in the Anthropic API prompt
- Re-fetch triggered automatically when goal changes while alternatives are visible
- `getFallbacks(goal)` returns goal-specific hardcoded suggestions on API failure

**Input validation**
- `showErr(id, inputId, p)` / `clearErr(id, inputId, p)` helpers show inline error messages
- `aria-invalid="true"` set on invalid inputs; focus moved to the offending field
- Error containers use `role="alert"` + `aria-live="assertive"`
- Reps inputs validate range (0–99) and NaN before updating state

---

### v1 — Initial Release

**What this version included:**
- Basic gym search (hardcoded list, no autocomplete)
- Busyness meter with two report buttons (Busy / Not Busy)
- Equipment in-use reporting with removable tags
- Reps & sets input with totals display
- AI-powered workout suggestions via Anthropic API (triggered at 60% busyness or 2+ equipment reports)
- Fallback workout suggestions when API is unavailable
- Dark theme with Space Grotesk and DM Mono fonts
- Single scrolling page layout
- No persistence — all state lost on refresh

---

*GymTracker is a client-side web app. All data is stored locally in your browser. Nothing is sent to any server except the AI workout suggestion requests, which go to the Anthropic API.*
