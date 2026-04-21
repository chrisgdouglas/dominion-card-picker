# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Static, client-side Dominion (board game) Kingdom card randomizer. No build, no package manager, no tests, no server. Open `dominion.html` directly in a browser to run. All logic runs in-browser via two `<script>` tags.

## Run / Develop

- Open `dominion.html` in a browser (e.g. `xdg-open dominion.html`). The picker script is loaded as `<script type="module">`, so it must be served over `http://`/`https://` or opened via `file://` in a browser that allows module loading from the local filesystem (most do, but some block it — if module loading fails, run `python -m http.server` from the repo root and visit `http://localhost:8000/dominion.html`).
- Edits to `js/*.js` or `css/dominion.css` take effect on page reload.
- Pre-gen card sets are selectable via the dropdown OR via querystring: `dominion.html?5` loads pre-gen ID 5 on load (handled in `displayPicks()` via `location.search`).

## Architecture

Three data/logic layers:

1. **`js/card_data.js`** — pure data. Two globals:
   - `cards` — object keyed by numeric ID. Each entry: `{ id, set, name, cost, type, subType }`. `set` values: `base`, `intrigue`, `seaside`, `alchemy`, `prosperity`, `cornucopia`, `hinterlands`, `darkages`, `guilds`, `custom`. Promo cards use a regular `set` but are filtered by exact `name` match in `determineSets()`. `subType` is comma-joined tags: `action`, `card`, `buy`, `copper`, `potion`, `looter` — string `.indexOf()` checks gate the "Force at least" form options.
   - `preGenSets` — object keyed by numeric ID. Each entry: `{ name, cardSet, preGenSet: [10 or 11 card IDs] }`. An 11-element `preGenSet` implies Young Witch + Bane card (last element).
   - File contract (per `readme.txt`): trailing entry must NOT have a comma after `}`. IDs must be sequential. The `custom` set is the user-extension hook — entries with `set: 'custom'` render via the placeholder image `cards/000.png` plus text overlay.

2. **`js/dominion_picker.js`** — all behavior. Loaded as an ES module (so it runs in strict mode, `import`/`export` available, and nothing leaks to `window` except what it explicitly assigns). Reads `cards` and `preGenSets` from `window` (set by `card_data.js`, which is loaded as a classic script). Entry points are wired in a `DOMContentLoaded` handler at the bottom of the file:
   - `createPreGenMenu()` — builds the pre-gen `<select>` from `preGenSets` and attaches its "Go" button.
   - `displayPicks([selObj])` — orchestrator. Called once on load, again on each "New Random Cards" / "Go" click. Calls `pickCards()` (random) or `preGenCards()` (pre-built), then `makeTable()` / `ywTable()` / `gameType()` to render.
   - `toggleAllSets()` / `toggleAllPromos()` — checkbox toggles; rely on hardcoded checkbox `value` ranges (sets <20, promos 20–30, options 30+) to scope the toggle.

   Selection pipeline: `checkForm()` (validation + auto-corrections) → `determineSets()` (gather candidate IDs from checked sets, optionally filtering Attack cards; result is **memoized** in `previousRun` keyed on the concatenated checkbox-values string) → `pickCards()` (random pick, retrying until "Force at least" constraints in `checkSetOptions()` are satisfied) → optional reaction-card injection (`addReactionCards()` random or `smartAttackBalance()` rule-based per attack type) → `sortCards()` → Young Witch bane-card append (cost 2 or 3, no potion).

   Game-type detection (`gameType()`) is probabilistic: if Prosperity/Dark Ages cards are in the final tableau, a random card is drawn and if it matches that set, the variant rule (Colony / Shelter) is applied. Looter status is deterministic (any `subType` containing `looter`).

3. **HTML/CSS** — `dominion.html` is the only page. Form name `controlForm` is referenced as `document.forms.controlForm`; checkbox `name` attributes are the API contract between the form and `determineSets()` / `checkForm()`. Card display tables get their colors from `set-<setname>` CSS classes (see `css/dominion.css`); avoid putting colors back into JS.

## Card image assets

`cards/<id>.jpg` for every real card; `cards/000.png` is the custom-card placeholder. When adding a new card to `card_data.js`, add the matching `cards/<id>.jpg` or rendering will show a broken image.

## Conventions / gotchas

- The picker is an ES module — all variables are properly scoped (`const`/`let`), strict mode is implicit. No globals are leaked.
- `id="contols"` (typo, missing 'r') in HTML and the `Walled Village` / `Black Market` promos wired by exact name strings against `cards[].name` are load-bearing — don't rename without updating both sides.
- Suspected bug preserved across the ES6 refactor (with a `// NOTE:` comment): `addReactionCards()` includes non-Reaction `custom` cards (`type !== 'Reaction'` rather than `===`). Flag before "fixing" — verify against intent.
- `card_data.js` is intentionally untouched and uses old conventions (commented-out JS-style `//` lines at top, `new Array(...)` for pre-gen lists, sequential numeric keys). Per `readme.txt`, the trailing entry must NOT have a comma after `}` and IDs must stay sequential.
