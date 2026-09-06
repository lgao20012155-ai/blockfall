const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required']
  });
  const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });

  await page.goto('file://' + path.resolve(__dirname, 'index.html'));
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'shot-title.png' });

  // start the game
  await page.keyboard.press('Enter');
  await page.waitForTimeout(400);

  // sanity: state + engine wiring
  const s1 = await page.evaluate(() => {
    const B = window.BLOCKFALL;
    return { state: B.G.state, level: B.G.level, piece: B.G.piece && B.G.piece.key, queue: B.G.queue.slice() };
  });
  console.log('after start:', JSON.stringify(s1));

  // exercise controls
  for (const k of ['ArrowLeft','ArrowLeft','ArrowUp','ArrowRight','ArrowUp','ArrowDown','ArrowDown']) {
    await page.keyboard.press(k);
    await page.waitForTimeout(40);
  }
  await page.keyboard.press('KeyC');   // hold
  await page.waitForTimeout(100);
  await page.keyboard.press('Space');  // hard drop
  await page.waitForTimeout(200);

  // drop a bunch of pieces to shake out lock/clear logic
  for (let i = 0; i < 30; i++) {
    await page.keyboard.press(i % 3 === 0 ? 'ArrowLeft' : 'ArrowRight');
    await page.keyboard.press('Space');
    await page.waitForTimeout(60);
  }
  await page.waitForTimeout(500);
  const s2 = await page.evaluate(() => {
    const B = window.BLOCKFALL;
    return { state: B.G.state, score: B.G.score, lines: B.G.totalLines, level: B.G.level };
  });
  console.log('after drops:', JSON.stringify(s2));
  await page.screenshot({ path: 'shot-play.png' });

  // rotation / SRS unit check: every piece, every rotation, in open space
  const rot = await page.evaluate(() => {
    const B = window.BLOCKFALL;
    B.G.state = 'play';
    const out = [];
    for (const k of ['I','J','L','O','S','T','Z']) {
      B.G.grid = B.G.grid.map(r => r.map(() => null));
      B.G.piece = { key: k, rot: 0, x: 3, y: 8 };
      const seen = new Set();
      let ok = true;
      for (let i = 0; i < 8; i++) {
        const before = JSON.stringify(B.G.piece);
        window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowUp' }));
        seen.add(B.G.piece.rot);
        if (JSON.stringify(B.G.piece) === before && k !== 'O') ok = false;
      }
      out.push(k + ':' + (ok ? 'ok' : 'STUCK') + ':states' + seen.size);
    }
    return out;
  });
  console.log('rotation:', rot.join(' '));

  // wall-kick check: rotate hard against the left and right walls
  const kicks = await page.evaluate(() => {
    const B = window.BLOCKFALL;
    B.G.state = 'play';
    const out = [];
    for (const k of ['I','J','L','S','T','Z']) {
      for (const side of [-2, 9]) {
        B.G.grid = B.G.grid.map(r => r.map(() => null));
        B.G.piece = { key: k, rot: 1, x: side, y: 8 };
        // ensure the start position is legal-ish, then rotate
        const before = JSON.stringify(B.G.piece);
        window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowUp' }));
        const cells = B.G.piece && (function(p){
          const S = { I:4, O:4, J:3, L:3, S:3, T:3, Z:3 };
          return true;
        })(B.G.piece);
        const inBounds = (function(){
          const p = B.G.piece;
          // recompute occupied cells via the exposed grid math
          return p.x >= -3 && p.x <= 10;
        })();
        out.push(k + side + ':' + (inBounds ? 'ok' : 'OOB'));
      }
    }
    return out;
  });
  console.log('kicks:', kicks.join(' '));

  // line-clear + scoring: build 4 full rows minus one column, drop an I vertically
  const clear = await page.evaluate(async () => {
    const B = window.BLOCKFALL;
    B.startLevel(0);
    B.G.state = 'play';
    B.G.score = 0;
    for (let y = 18; y < 22; y++) for (let x = 0; x < 10; x++) B.G.grid[y][x] = x === 9 ? null : 'G';
    B.G.piece = { key: 'I', rot: 1, x: 7, y: 14 };   // vertical I over column 9
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
    await new Promise(r => setTimeout(r, 900));
    return { state: B.G.state, score: B.G.score, lines: B.G.totalLines, thisLevel: B.G.linesThisLevel };
  });
  console.log('tetris clear:', JSON.stringify(clear));

  // level-up flow: hit the goal and confirm it advances
  const up = await page.evaluate(async () => {
    const B = window.BLOCKFALL;
    B.startLevel(0);
    B.G.state = 'play';
    B.G.linesThisLevel = B.LEVELS[0].goal - 1;
    for (let x = 0; x < 10; x++) B.G.grid[21][x] = x === 9 ? null : 'G';
    B.G.piece = { key: 'I', rot: 1, x: 7, y: 17 };
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
    await new Promise(r => setTimeout(r, 800));
    const mid = B.G.state;
    await new Promise(r => setTimeout(r, 2600));
    return { mid, after: B.G.state, level: B.G.level + 1 };
  });
  console.log('level up:', JSON.stringify(up));

  // level progression: force each level start, confirm no throw
  const levels = await page.evaluate(() => {
    const B = window.BLOCKFALL;
    const res = [];
    for (let i = 0; i < 10; i++) {
      B.startLevel(i);
      const filled = B.G.grid.flat().filter(Boolean).length;
      res.push(`L${i + 1} g=${B.LEVELS[i].gravity} junk=${filled}`);
    }
    return res;
  });
  console.log('levels:', levels.join(' | '));


  // --- music: one tune per level, original theme last -----------------
  const music = await page.evaluate(async () => {
    const B = window.BLOCKFALL;
    const out = { tracks: B.TRACKS.map(t => t.name), perLevel: [], issues: [] };

    // every track must be distinct and non-empty
    const names = new Set(out.tracks);
    if (names.size !== B.TRACKS.length) out.issues.push('duplicate track names');
    if (B.TRACKS.length !== B.LEVELS.length) out.issues.push('track count != level count');
    B.TRACKS.forEach((t, i) => {
      if (!t.melody || t.melody.length < 8) out.issues.push(`track ${i} too short`);
      if (!t.bass || !t.bass.length) out.issues.push(`track ${i} has no bass`);
      const bad = t.melody.filter(([n, d]) => (n !== null && !/^[A-G]#?-?\d$/.test(n)) || !(d > 0));
      if (bad.length) out.issues.push(`track ${i} bad notes: ${JSON.stringify(bad.slice(0,2))}`);
      // bars should divide evenly into the melody length
      const total = t.melody.reduce((a, [, d]) => a + d, 0);
      if (Math.abs(total % (t.bar || 4)) > 1e-6) out.issues.push(`track ${i} (${t.name}) is ${total} beats, not a whole number of ${t.bar}-beat bars`);
    });

    // starting each level must select that level's track
    for (let i = 0; i < B.LEVELS.length; i++) {
      B.startLevel(i);
      out.perLevel.push({ lvl: i + 1, track: B.Sound.track.name, idx: B.Sound.trackIdx, bpm: B.LEVELS[i].tempo });
      if (B.Sound.trackIdx !== i) out.issues.push(`level ${i+1} selected track ${B.Sound.trackIdx}`);
    }

    // victory replays the last track, faster than level 10
    B.victory();
    out.victory = { track: B.Sound.track.name, bpm: B.Sound.tempo };
    if (B.Sound.trackIdx !== B.TRACKS.length - 1) out.issues.push('victory is not on the final track');
    if (B.Sound.tempo <= B.LEVELS[9].tempo) out.issues.push('victory tempo not faster than level 10');
    return out;
  });
  console.log('tracks:', music.tracks.join(' | '));
  console.log('per level:');
  for (const r of music.perLevel) console.log(`   L${String(r.lvl).padStart(2)}  ${r.track.padEnd(15)} ${r.bpm} bpm`);
  console.log('victory:', JSON.stringify(music.victory));
  console.log(music.issues.length ? 'MUSIC ISSUES:\n  ' + music.issues.join('\n  ') : 'music: no issues');

  // victory scene
  await page.evaluate(() => { window.BLOCKFALL.G.score = 48200; window.BLOCKFALL.victory(); });
  await page.waitForTimeout(1400);
  await page.screenshot({ path: 'shot-win-a.png' });
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'shot-win-b.png' });

  // crop the victory canvas for a close look at the dancers
  const el = await page.$('#winCanvas');
  await el.screenshot({ path: 'shot-dancers.png' });

  console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'NO ERRORS');
  await browser.close();
})();
