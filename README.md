# BLOCKFALL

A retro falling-block puzzle game. One self-contained HTML file — no build step, no
dependencies, no server required.

- 10 levels, each with its own line goal, gravity speed and junk-row handicap
- Keyboard arrow keys (↑ rotate, ←→ move, ↓ soft drop) — physical keys, no on-screen buttons
- Proper SRS rotation with wall kicks, 7-bag randomiser, lock delay, ghost piece, hold
- A different chiptune track on every level, all synthesised — no audio files
- Beat all ten levels and the dancers come out

## Run it locally

Double-click `index.html`, or:

```bash
open index.html                 # macOS
python3 -m http.server 8000     # then visit http://localhost:8000
```

The plain `open` route works fine — everything is inline. Use the local server if you
later add fetches, modules, or anything else that needs a real origin.

## Deploying

The repo carries config for both hosts. It's a static site either way — there is nothing
to build, so the build command is a no-op and the publish directory is the repo root.

**Render** (`render.yaml`) — the blueprint is picked up automatically. Point a new Static
Site at this repo, or use the Blueprint flow, and it deploys on push to `main`.

**Vercel** (`vercel.json`) — import the repo, accept the defaults (framework: Other, no
build command, output directory: `.`).

Both configs set `nosniff`, `SAMEORIGIN` and a sane referrer policy, and rewrite all
paths to `index.html`.

## Where things live

Everything is in `index.html`, split into numbered sections:

| Section | What's in it |
| --- | --- |
| 1. CONFIG | Board size, the `LEVELS` table, timing constants, colours |
| 2. PIECES | Tetromino shapes and the SRS wall-kick tables |
| 3. AUDIO | Chiptune synth, SFX, the `TRACKS` table, the looping music scheduler |
| 4. STATE | The `G` game-state object |
| 5–7. LOGIC | Collision, movement, rotation, locking, line clears, level flow |
| 8. DOM/HUD | Element lookups and HUD updates |
| 9. RENDER | Board, pieces, ghost, particles, next/hold panels |
| 10. VICTORY | The pixel dancer scene, drawn low-res and scaled 2× |
| 11. INPUT | Keyboard handling and auto-repeat (DAS/ARR) |
| 12. LOOP | The `requestAnimationFrame` loop |

## Tuning difficulty

The whole difficulty curve is one array near the top of the script:

```js
const LEVELS = [
  { goal: 5,  gravity: 800, garbage: 0, tempo: 120 },
  ...
];
```

- `goal` — lines you must clear to finish the level
- `gravity` — milliseconds per automatic 1-cell drop (lower = faster)
- `garbage` — junk rows the level starts with
- `tempo` — music BPM for that level

## The soundtrack

Every level has its own tune, defined in the `TRACKS` array next to `LEVELS`. The ramp
runs calm to frantic, with the original theme held back for level 10 and replayed faster
still over the victory screen.

| Level | Track | Source |
| --- | --- | --- |
| 1 | First Light | original |
| 2 | Minuet | Petzold, c.1725 — public domain |
| 3 | Elise | Beethoven, 1810 — public domain |
| 4 | Troika | original |
| 5 | Mountain King | Grieg, 1875 — public domain |
| 6 | Rondo | Mozart, 1783 — public domain |
| 7 | Galop | original |
| 8 | Ochi | original |
| 9 | Tell | Rossini, 1829 — public domain |
| 10 | Korobeiniki | Russian folk, 1861 — public domain |

Each entry is `{ name, bar, wave, bassWave, bass, melody }`. `melody` is `[note, beats]`
pairs; a `null` note is a rest. `bar` is beats per bar — 3 for the waltz-time pieces —
and the bass cycles one root per bar. Keep `wave` and `bassWave` different or the melody
disappears into its own bassline. `verify.js` checks every track's beats divide evenly
into whole bars and that each one actually emits notes.

Change numbers, reload, done. Add or remove entries and the "/ 10" HUD label follows —
just update the two places that say `10` if you change the level count.

## Debugging

`window.BLOCKFALL` is exposed for the devtools console:

```js
BLOCKFALL.startLevel(9)   // jump straight to level 10
BLOCKFALL.victory()       // watch the ending without playing 10 levels
BLOCKFALL.G.score = 99999
BLOCKFALL.Sound.toggleMute()
```

## Testing

`verify.js` drives the game in a headless browser and checks rotation states, wall kicks,
line clears, scoring and level progression, then screenshots each screen.

```bash
npm install playwright
npx playwright install chromium
node verify.js
```

## A note on names

"Tetris" is a registered trademark of The Tetris Company, and they enforce it against
clones. This is fine as a personal project, but if you ever publish it publicly, keep it
under an original name and original art (as it is now) rather than the Tetris branding.
