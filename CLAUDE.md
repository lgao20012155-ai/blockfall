# Project context for Claude Code

## What this is

BLOCKFALL — a retro falling-block puzzle game in a single self-contained `index.html`.
Vanilla JS, canvas rendering, WebAudio synth. No framework, no build step, no bundler,
no `node_modules` needed to run it.

## Ground rules

- **Keep it a single file.** `index.html` holds the HTML, CSS and JS. Don't split it into
  separate `.css`/`.js` files or introduce a build step unless I explicitly ask.
- **No dependencies at runtime.** No CDN scripts, no npm packages in the game itself.
  Playwright is a dev-only dependency for `verify.js`.
- **The code is organised in numbered sections** (`1. CONFIG` … `13. BOOT`). Put new code
  in the section it belongs to rather than appending to the end of the file.
- **Difficulty lives in the `LEVELS` array.** Tune gameplay there before touching logic.
- Prefer small, surgical edits over rewrites. This file is long; use targeted edits.

## Architecture at a glance

- `G` is the single mutable game-state object (grid, piece, score, level, timers).
- `G.state` is a simple state machine: `title → play → clearing → levelup → play … win`,
  plus `pause` and `over`. Most bugs come from a transition that forgets to set state.
- The grid is `TOTAL_ROWS × COLS` where `TOTAL_ROWS = ROWS + BUFFER`. The top `BUFFER`
  rows are the hidden spawn area — they exist in the array but aren't drawn.
- Rotation is real SRS: `PIECES[key][rot]` holds the four precomputed states, and the
  kick tables (`KICK_JLSTZ`, `KICK_I`) are already converted to screen coordinates where
  **y grows downward**. If you touch them, remember the published SRS tables use y-up.
- Audio is fully synthesised. `Sound.tone()` is the primitive; the music scheduler runs on
  a `setInterval` that queues notes ~250ms ahead against `AudioContext.currentTime`.
  Never schedule audio off `requestAnimationFrame` — it drifts.
- The victory scene draws into a 150×300 canvas that is CSS-scaled to 300×600, i.e. an
  exact 2× integer scale. **Keep that ratio** — any other size makes the pixel art blurry
  or stretched. `drawDancer()` is procedural; all its primitives snap to whole pixels.

## Deployment

Static site on Render, deployed from `main` via `render.yaml` (blueprint at the repo root).
`vercel.json` is kept in sync as an alternate host. There is **no build step** on either —
`index.html` is served straight from the repo root. If you add a bundler, both configs and
this note need updating together.

## Testing

`node verify.js` runs the whole suite headlessly (rotation, kicks, line clears, scoring,
level progression) and writes `shot-*.png`. Run it after any gameplay change. It needs
`npm install playwright && npx playwright install chromium` once.

## Things I'd like help with eventually

- Wiring a high-score table to Supabase (I use Flask + Supabase on my other projects)
- Custom domain on the Render static site
- Mobile support — deliberately keyboard-only right now, so phones need a rethink
