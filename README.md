# BLOCKFALL

A retro falling-block puzzle game. One self-contained HTML file — no build step, no
dependencies, no server required.

- 10 levels, each with its own line goal, gravity speed and junk-row handicap
- Arrow-key controls (↑ rotate, ←→ move, ↓ soft drop) plus an on-screen D-pad
- Proper SRS rotation with wall kicks, 7-bag randomiser, lock delay, ghost piece, hold
- CRT/scanline retro presentation and a WebAudio chiptune soundtrack (no audio files)
- Beat all ten levels and the dancers come out

## Run it

Double-click `index.html`, or:

```bash
open index.html                 # macOS
python3 -m http.server 8000     # then visit http://localhost:8000
```

The plain `open` route works fine — everything is inline. Use the local server if you
later add fetches, modules, or anything else that needs a real origin.

## Where things live

Everything is in `index.html`, split into numbered sections:

| Section | What's in it |
| --- | --- |
| 1. CONFIG | Board size, the `LEVELS` table, timing constants, colours |
| 2. PIECES | Tetromino shapes and the SRS wall-kick tables |
| 3. AUDIO | Chiptune synth, SFX, the looping music scheduler |
| 4. STATE | The `G` game-state object |
| 5–7. LOGIC | Collision, movement, rotation, locking, line clears, level flow |
| 8. DOM/HUD | Element lookups and HUD updates |
| 9. RENDER | Board, pieces, ghost, particles, next/hold panels |
| 10. VICTORY | The pixel dancer scene, drawn low-res and scaled 2× |
| 11. INPUT | Keyboard, auto-repeat (DAS/ARR), on-screen D-pad |
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
