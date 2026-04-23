# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**芯組みシミュレーター Ver.1.3** — a single-page web tool for Japanese woodworking professionals. It calculates cutting dimensions and renders a 2D diagram of the internal core structure (芯組み) of wooden doors and furniture panels.

## Running the Application

No build step, no dependencies. Open `index.html` directly in a browser, or serve with any static HTTP server:

```bash
python -m http.server
```

There are no automated tests, no linting tools, and no CI configuration.

## Architecture

Three files, no frameworks:

| File | Role |
|---|---|
| `index.html` | DOM structure, form inputs, canvas element, inline event handlers |
| `shingumi.js` | All calculation logic and canvas rendering |
| `shingumi.css` | Layout (CSS grid: 360px left panel + flexible right), custom properties for colors |

**Data flow:**

1. User changes an HTML form input → `oninput="calculate()"` or `onchange="onTypeChange()"`
2. `onTypeChange()` switches between 建具 (door) and 家具 (furniture) modes, updating field labels and default values
3. `calculate()` reads all input values, computes component dimensions and positions, then calls:
   - `renderTable(list)` — writes the materials list as HTML into `#resultBody`
   - `drawDoor(...)` — repaints the `#doorCanvas` canvas with the structural diagram

No state object or module pattern is used. All state lives in the DOM inputs; `calculate()` is idempotent and called on every change.

## Domain Concepts

Understanding these terms is necessary to work with the code:

- **芯組み (shingumi):** The inner core frame of a door/panel
- **縦桟 (tatebashira / 縦桟):** Vertical stiles — full-height side members, qty 2
- **上桟 / 下桟 (kami/shimo-san):** Top and bottom rails
- **中桟 (naka-san):** Middle horizontal rails, count set by user, evenly spaced with center alignment
- **引手補強 (hikite hokyo):** Handle reinforcement block (~300mm tall, centered at 900mm height), added to both faces when checked
- **LVL / 無垢 (muku):** Laminated veneer lumber vs. solid wood — affects which input fields are visible
- **カット寸法 (katto sunpou):** Raw cutting dimensions entered by the user; the code adds 10mm to derive the production core size

## Key Calculation Logic

`calculate()` in `shingumi.js`:
- Adds 10mm to raw H/W inputs to get core production dimensions
- Stile length = full height; stile qty = 2
- Top/bottom rail length = W − (2 × LVL width)
- Middle rails are distributed evenly, centered; when a middle rail overlaps the handle reinforcement zone, it is split into two shorter pieces
- Handle reinforcement pieces are 4 total (2 per face), inserted only when the checkbox is checked

`drawDoor()` scales all dimensions to fit the canvas bounds and renders components in draw order: stiles → top/bottom rails → reinforcement (orange, semi-transparent) → middle rails → outer border.

## Code Conventions

- Variable names are short and domain-specific: `H`, `W`, `D`, `LVL`, `NUKI`, `N`, `hikite`
- UI text and comments are in Japanese; function and variable names follow English-style camelCase
- No external libraries — use only browser-native APIs (Canvas 2D, DOM)
- The materials list is built as an array of objects and rendered via `Array.map().join('')` directly into `innerHTML`
