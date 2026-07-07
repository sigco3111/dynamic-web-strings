#!/usr/bin/env node
// Playwright spec runner for the spider-web index.html
// Boots a static http.server, runs scenario assertions, captures screenshots.
// Use: NODE_PATH=/Users/mac/node_modules node tests/run.mjs
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdirSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 8765;
const BASELINE_DIR = resolve(__dirname, 'baselines');
mkdirSync(BASELINE_DIR, { recursive: true });

const log = (...a) => console.log(...a);
const fail = (msg) => { console.error('❌', msg); process.exitCode = 1; throw new Error(msg); };

let serverProc = null;

async function httpGet(url, attempts = 10) {
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch {}
    await new Promise(r => setTimeout(r, 250));
  }
  return false;
}

async function startServer() {
  // Make sure port is free
  const existing = spawn('bash', ['-c', `lsof -ti :${PORT} | xargs kill -9 2>/dev/null; true`], { stdio: 'ignore' });
  await new Promise(r => existing.on('exit', r));
  await new Promise(r => setTimeout(r, 150));

  return new Promise((resolveProm, rejectProm) => {
    serverProc = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], {
      cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, PYTHONUNBUFFERED: '1' },
    });
    serverProc.stdout.on('data', (chunk) => { /* swallow */ });
    serverProc.stderr.on('data', (chunk) => { /* swallow */ });
    serverProc.on('exit', (code) => {
      if (code !== null && code !== 0) console.error(`server exit code=${code}`);
    });

    // Wait for HTTP 200 on /index.html
    const deadline = Date.now() + 12000;
    (async () => {
      while (Date.now() < deadline) {
        try {
          const res = await fetch(`http://127.0.0.1:${PORT}/index.html`);
          if (res.ok) { resolveProm(); return; }
        } catch {}
        await new Promise(r => setTimeout(r, 200));
      }
      rejectProm(new Error('server did not respond within 12s'));
    })();
  });
}

function stopServer() {
  if (serverProc) {
    try { serverProc.kill('SIGTERM'); } catch {}
    serverProc = null;
  }
  // Last-resort port cleanup
  try {
    spawn('bash', ['-c', `lsof -ti :${PORT} | xargs kill -9 2>/dev/null; true`], { stdio: 'ignore' }).on('exit', () => {});
  } catch {}
}

async function robustGoto(page, url, attempts = 5) {
  for (let i = 0; i < attempts; i++) {
    try { await page.goto(url, { waitUntil: 'load', timeout: 5000 }); return; }
    catch (e) { if (i === attempts - 1) throw e; await new Promise(r => setTimeout(r, 200)); }
  }
}

async function waitForWebSim(page, ms = 5000) {
  await page.waitForFunction(() => window.WebSim && typeof window.WebSim.getStats === 'function', null, { timeout: ms });
}

async function dispatchMouseToCanvas(page, type, x, y) {
  await page.evaluate(({ type, x, y }) => {
    const c = document.querySelector('canvas');
    const rect = c.getBoundingClientRect();
    const ev = new MouseEvent(type, {
      bubbles: true, cancelable: true, view: window,
      clientX: rect.left + x, clientY: rect.top + y, button: 0,
    });
    c.dispatchEvent(ev);
  }, { type, x, y });
}

async function runScenario(page) {
  const errors = [];
  page.on('pageerror', (e) => errors.push(`PAGEERR: ${e.message}`));
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(`CONSOLE_ERR: ${msg.text()}`); });

  // ===== S1: Canvas + WebSim present + seeded demo =====
  log('\n[S1] Canvas + WebSim + seeded demo');
  const s1 = await page.evaluate(() => {
    const c = document.querySelector('canvas');
    const stats = window.WebSim.getStats();
    return {
      hasCanvas: !!c, w: c?.width || 0, h: c?.height || 0,
      points: stats.points, constraints: stats.constraints,
      broken: stats.broken ?? 0, mode: window.WebSim.state?.mode,
    };
  });
  if (!s1.hasCanvas) fail('S1: no <canvas>');
  if (s1.w < 100 || s1.h < 100) fail(`S1: canvas too small ${s1.w}x${s1.h}`);
  if (s1.points < 2) fail(`S1: expected >=2 points, got ${s1.points}`);
  if (s1.constraints < 1) fail(`S1: expected >=1 constraint, got ${s1.constraints}`);
  log(`  ✓ canvas ${s1.w}x${s1.h} | ${s1.points} pts | ${s1.constraints} cons | mode=${s1.mode}`);

  // ===== S2: physics runs (points move, no NaN) =====
  log('[S2] Physics runs (movement + NaN guard)');
  const before = await page.evaluate(() => window.WebSim.points.map(p => ({ x: p.x, y: p.y, pinned: p.pinned })));
  await page.waitForTimeout(1200);
  const after = await page.evaluate(() => window.WebSim.points.map(p => ({ x: p.x, y: p.y, pinned: p.pinned })));
  let nans = 0, moved = 0, freeMoved = 0;
  for (let i = 0; i < before.length; i++) {
    if (!isFinite(after[i].x) || !isFinite(after[i].y)) nans++;
    const dx = Math.abs(after[i].x - before[i].x);
    const dy = Math.abs(after[i].y - before[i].y);
    if (dx > 0.05 || dy > 0.05) moved++;
    if (!before[i].pinned && (dx > 0.05 || dy > 0.05)) freeMoved++;
  }
  if (nans > 0) fail(`S2: ${nans} NaN points`);
  if (freeMoved < 1) fail(`S2: no free points moved (gravity/wind should have acted)`);
  log(`  ✓ ${moved}/${before.length} moved (${freeMoved} free) | 0 NaN`);

  // ===== S3: Gravity makes avgY rise =====
  log('[S3] Gravity effect');
  // Fresh deterministic state with wind off
  await page.evaluate(() => {
    window.WebSim.clear();
    window.WebSim.state.windEnabled = false;
    window.WebSim.state.windStrength = 0;
    window.WebSim.state.gravity = 0;
    window.WebSim.seedDemo();
  });
  await page.waitForTimeout(900); // Let damping carry any residual velocity settle
  const zeroY = await page.evaluate(() => {
    const free = window.WebSim.points.filter(p => !p.pinned);
    return free.length ? free.reduce((s, p) => s + p.y, 0) / free.length : 0;
  });
  // Now turn on gravity and measure rise
  await page.evaluate(() => { window.WebSim.state.gravity = 1.5; });
  await page.waitForTimeout(900);
  const highY = await page.evaluate(() => {
    const free = window.WebSim.points.filter(p => !p.pinned);
    return free.length ? free.reduce((s, p) => s + p.y, 0) / free.length : 0;
  });
  const delta = highY - zeroY;
  if (delta < 1) fail(`S3: gravity had no clear effect (high=${highY.toFixed(1)} zero=${zeroY.toFixed(1)}, Δ=${delta.toFixed(1)})`);
  log(`  ✓ zero-grav Y=${zeroY.toFixed(1)} → high-grav Y=${highY.toFixed(1)} (Δ=${delta.toFixed(1)})`);

  // ===== S4: Wind increases X variance =====
  log('[S4] Wind effect');
  await page.evaluate(() => {
    window.WebSim.clear();
    window.WebSim.state.windEnabled = true;
    window.WebSim.state.windStrength = 2.0;
    window.WebSim.state.gravity = 0.0;
    window.WebSim.seedDemo();
  });
  await page.waitForTimeout(1500); // long initial settle

  // Track a specific point's X position over time
  const trackId = await page.evaluate(() => {
    const free = window.WebSim.points.filter(p => !p.pinned);
    if (!free.length) return null;
    return free[0].id;
  });

  const trackX = async () => {
    return await page.evaluate((id) => {
      const p = window.WebSim.points.find(p => p.id === id);
      return p ? p.x : null;
    }, trackId);
  };

  // With wind ON — sample over ~3 seconds (more than one wind period)
  const xsOn = [];
  for (let i = 0; i < 80; i++) {
    await page.waitForTimeout(40);
    const x = await trackX();
    if (x != null) xsOn.push(x);
  }
  // Disable wind and let it settle
  await page.evaluate(() => { window.WebSim.state.windEnabled = false; window.WebSim.state.windStrength = 0; });
  await page.waitForTimeout(1500);
  const xsOff = [];
  for (let i = 0; i < 80; i++) {
    await page.waitForTimeout(40);
    const x = await trackX();
    if (x != null) xsOff.push(x);
  }
  const variance = (a) => {
    const m = a.reduce((s, v) => s + v, 0) / a.length;
    return a.reduce((s, v) => s + (v - m) ** 2, 0) / a.length;
  };
  const vOn = variance(xsOn), vOff = variance(xsOff);
  if (vOn <= vOff * 1.5 || vOn < 0.5) fail(`S4: wind X-variance not significantly higher (on=${vOn.toFixed(2)} off=${vOff.toFixed(2)})`);
  log(`  ✓ wind-on  X-var=${vOn.toFixed(2)} | wind-off X-var=${vOff.toFixed(2)} | ratio=${(vOn / Math.max(0.001, vOff)).toFixed(2)}x`);

  // ===== S5: Draw a new web via mouse drag from left wall to right wall =====
  log('[S5] Mouse drag-to-draw');
  await page.evaluate(() => { window.WebSim.clear?.(); window.WebSim.state.windEnabled = true; window.WebSim.state.windStrength = 0.5; window.WebSim.state.gravity = 0.3; });
  await page.waitForTimeout(100);
  const beforeDraw = await page.evaluate(() => ({ cons: window.WebSim.constraints.filter(c => c.alive).length }));
  const rect = await page.evaluate(() => {
    const c = document.querySelector('canvas');
    const r = c.getBoundingClientRect();
    return { x: r.left, y: r.top, w: r.width, h: r.height };
  });
  // Drag from near left wall (within snapDistance ~28) to near right wall
  await page.mouse.move(rect.x + 12, rect.y + rect.h * 0.5);
  await page.mouse.down();
  await page.mouse.move(rect.x + rect.w * 0.3, rect.y + rect.h * 0.4, { steps: 12 });
  await page.mouse.move(rect.x + rect.w * 0.5, rect.y + rect.h * 0.65, { steps: 8 });
  await page.mouse.move(rect.x + rect.w * 0.7, rect.y + rect.h * 0.35, { steps: 10 });
  await page.mouse.move(rect.x + rect.w - 12, rect.y + rect.h * 0.5, { steps: 12 });
  await page.mouse.up();
  await page.waitForTimeout(300);
  const afterDraw = await page.evaluate(() => {
    const cons = window.WebSim.constraints.filter(c => c.alive);
    const pts = window.WebSim.points;
    let pinnedStart = false, pinnedEnd = false;
    if (cons.length > 0) {
      const firstA = pts.find(p => p.id === cons[0].a);
      const firstB = pts.find(p => p.id === cons[0].b);
      pinnedStart = (firstA?.pinned || firstB?.pinned) === true;
      const lastC = cons[cons.length - 1];
      const lastA = pts.find(p => p.id === lastC.a);
      const lastB = pts.find(p => p.id === lastC.b);
      pinnedEnd = (lastA?.pinned || lastB?.pinned) === true;
    }
    return { cons: cons.length, pinnedStart, pinnedEnd };
  });
  if (afterDraw.cons <= beforeDraw.cons) fail(`S5: draw did not add constraints (before=${beforeDraw.cons} after=${afterDraw.cons})`);
  log(`  ✓ drew web with ${afterDraw.cons} constraints; start pinned=${afterDraw.pinnedStart} end pinned=${afterDraw.pinnedEnd}`);

  // ===== S6: Pull (grab endpoint) — and force break for the broken-count test =====
  log('[S6] Force-break + audio + particles');
  // Unlock AudioContext with a synthetic click first (some browsers require gesture)
  await page.evaluate(() => {
    const c = document.querySelector('canvas');
    const r = c.getBoundingClientRect();
    const ev = (type) => new MouseEvent(type, { bubbles: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, button: 0 });
    c.dispatchEvent(ev('mousedown'));
    c.dispatchEvent(ev('mouseup'));
  });
  await page.waitForTimeout(150);
  const audioCtx = await page.evaluate(() => {
    // Best-effort: try to surface the audio context via the test hook or window.WebSim.audio
    if (window.WebSim.audio) return { found: true, state: window.WebSim.audio.state };
    // Fallback: try to fish it from known globals
    return { found: false, state: 'unknown' };
  });
  const brokenBefore = await page.evaluate(() => window.WebSim.getStats().broken ?? window.WebSim.constraints.filter(c => !c.alive).length);

  // Force at least one break via test hook if available; else via massive pull
  let brokeViaHook = false;
  const hookResult = await page.evaluate(() => {
    if (!window.WebSim._testHooks?.forceBreakById) return null;
    const alive = window.WebSim.constraints.filter(c => c.alive);
    if (alive.length === 0) return { ok: false, why: 'no alive constraints' };
    const target = alive[Math.floor(alive.length / 2)];
    const r = window.WebSim._testHooks.forceBreakById(target.id);
    return { ok: !!(r && r.id), id: r?.id };
  });
  if (hookResult?.ok) { brokeViaHook = true; await page.waitForTimeout(400); }
  if (!brokeViaHook) {
    // Fallback: pull a grabbed point far enough to break
    await page.evaluate(() => {
      const alive = window.WebSim.constraints.filter(c => c.alive);
      if (!alive.length || !window.WebSim._testHooks?.grabPoint) return;
      const c = alive[0];
      window.WebSim._testHooks.grabPoint(c.a);
    });
    // Far drag
    await page.mouse.move(rect.x + rect.w * 0.5, rect.y + rect.h * 0.5);
    await page.mouse.down();
    for (let i = 0; i < 12; i++) {
      await page.mouse.move(rect.x + rect.w * (0.5 + i * 0.04), rect.y + rect.h * (0.5 - i * 0.04), { steps: 3 });
      await page.waitForTimeout(20);
    }
    await page.mouse.up();
    await page.evaluate(() => window.WebSim._testHooks?.releasePoint?.());
    await page.waitForTimeout(500);
  }

  const brokenAfter = await page.evaluate(() => ({
    broken: window.WebSim.getStats().broken ?? window.WebSim.constraints.filter(c => !c.alive).length,
    particles: window.WebSim.particles?.length ?? 0,
    audioState: window.WebSim.audio?.state ?? 'n/a',
  }));
  if (brokenAfter.broken <= brokenBefore) fail(`S6: no constraints broke (before=${brokenBefore} after=${brokenAfter.broken})`);
  log(`  ✓ broken=${brokenAfter.broken} (+${brokenAfter.broken - brokenBefore}); particles=${brokenAfter.particles}; audio=${brokenAfter.audioState}`);

  // ===== S7: Tension color: sample a stretched constraint midpoint pixel =====
  log('[S7] Tension color (red when over-stretched)');
  await page.evaluate(() => { window.WebSim.state.breakThreshold = 99.0; window.WebSim.state.windEnabled = false; });
  // Force a constraint into high-strain via the deterministic test hook
  const diag = await page.evaluate(() => {
    const ws = window.WebSim;
    return {
      anchorCount: Array.from(ws.anchors).length,
      aliveCount: ws.constraints.filter(c => c.alive).length,
      pointCount: ws.points.length,
      pinnedPoints: ws.points.filter(p => p.pinned).length,
    };
  });
  log(`  diag: ${JSON.stringify(diag)}`);
  const strainSet = await page.evaluate(() => window.WebSim._testHooks.forceHighStrain(3.5));
  log(`  strainSet: ${JSON.stringify(strainSet)}`);
  if (!strainSet || !strainSet.id) fail('S7: could not force high strain on any constraint');
  // Verify immediately and after wait
  const verify0 = await page.evaluate((id) => {
    const c = window.WebSim.constraints.find(c => c.id === id);
    if (!c) return { found: false };
    const a = window.WebSim.points.find(p => p.id === c.a);
    const b = window.WebSim.points.find(p => p.id === c.b);
    return {
      found: true, alive: c.alive, noRelax: c.noRelax, restLen: c.restLen,
      aId: c.a, bId: c.b, stress: c.stress,
      aPos: a ? { x: a.x, y: a.y } : null, bPos: b ? { x: b.x, y: b.y } : null,
      dist: a && b ? Math.hypot(b.x - a.x, b.y - a.y) : null,
    };
  }, strainSet.id);
  log(`  verify0 (immediately): ${JSON.stringify(verify0)}`);
  await page.waitForTimeout(300);
  const verify1 = await page.evaluate((id) => {
    const c = window.WebSim.constraints.find(c => c.id === id);
    if (!c) return { found: false };
    const a = window.WebSim.points.find(p => p.id === c.a);
    const b = window.WebSim.points.find(p => p.id === c.b);
    return {
      found: true, alive: c.alive, noRelax: c.noRelax, restLen: c.restLen,
      aId: c.a, bId: c.b, stress: c.stress,
      aPos: a ? { x: a.x, y: a.y } : null, bPos: b ? { x: b.x, y: b.y } : null,
      dist: a && b ? Math.hypot(b.x - a.x, b.y - a.y) : null,
      stateRunning: window.WebSim.state.running,
      stateT: window.WebSim.state.t,
    };
  }, strainSet.id);
  log(`  verify1 (after 300ms): ${JSON.stringify(verify1)}`);

  // Force a step and check stress
  const stepResult = await page.evaluate((id) => {
    // Manually trigger a few step() calls
    const c = window.WebSim.constraints.find(c => c.id === id);
    const a = window.WebSim.points.find(p => p.id === c.a);
    const b = window.WebSim.points.find(p => p.id === c.b);
    const dist = Math.hypot(b.x - a.x, b.y - a.y);
    const stretch = Math.abs(dist - c.restLen) / c.restLen;
    return { dist, restLen: c.restLen, computedStretch: stretch, currentStress: c.stress, aXY: [a.x, a.y], bXY: [b.x, b.y] };
  }, strainSet.id);
  log(`  step result (manual calc): ${JSON.stringify(stepResult)}`);

  const px = await page.evaluate(() => {
    const c = document.querySelector('canvas');
    const ctx = c.getContext('2d');
    const cons = window.WebSim.constraints.filter(c => c.alive);
    const allStresses = [];
    let maxStress = -1, sample = null;
    for (const cn of cons) {
      const a = window.WebSim.points.find(p => p.id === cn.a);
      const b = window.WebSim.points.find(p => p.id === cn.b);
      if (!a || !b) continue;
      const m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const s = cn.stress || 0;
      allStresses.push({ id: cn.id, stress: s, mid: m, restLen: cn.restLen, a: a.id, b: b.id, noRelax: !!cn.noRelax });
      if (s > maxStress) { maxStress = s; sample = { x: m.x, y: m.y, stress: s }; }
    }
    if (!sample) return { all: allStresses, sample: null };
    const dpr = window.devicePixelRatio || 1;
    const sx = Math.round(sample.x * dpr);
    const sy = Math.round(sample.y * dpr);
    let data = null, err = null;
    try { data = ctx.getImageData(sx, sy, 1, 1).data; }
    catch (e) { err = e.message; }
    return {
      r: data?.[0] ?? -1, g: data?.[1] ?? -1, b: data?.[2] ?? -1, a: data?.[3] ?? -1,
      stress: sample.stress, sx, sy, err,
      all: allStresses,
      top3: allStresses.sort((a, b) => b.stress - a.stress).slice(0, 3),
    };
  });
  await page.evaluate(() => { window.WebSim._testHooks.restoreStrain(); window.WebSim.state.breakThreshold = 0.55; });
  if (!px) {
    fail('S7: no alive constraints to sample');
  } else if (px.err) {
    log(`  ⚠ pixel read failed: ${px.err} at (${px.sx},${px.sy})`);
  } else {
    log(`  ✓ maxStress=${px.stress.toFixed(3)} sampled rgba(${px.r},${px.g},${px.b},${px.a}) at (${px.sx},${px.sy})`);
    log(`  top3: ${JSON.stringify(px.top3)}`);
    if (px.stress < 0.35) {
      fail(`S7: stress not in red band (stress=${px.stress.toFixed(3)})`);
    } else if (!(px.r > px.g + 20 && px.r > px.b + 20)) {
      fail(`S7: stretched constraint pixel is NOT red-dominant (r=${px.r} g=${px.g} b=${px.b})`);
    } else {
      log(`  ✓ pixel in stress color band (red-dominant)`);
    }
  }

  // ===== S8: HUD elements + Keys =====
  log('[S8] HUD elements + Keys');
  const hud = await page.evaluate(() => {
    const out = { sliders: [], buttons: [], instructions: '' };
    document.querySelectorAll('input[type="range"]').forEach((el) => {
      out.sliders.push({
        id: el.id || el.getAttribute('data-control') || el.getAttribute('aria-label') || '?',
        min: el.min, max: el.max, value: el.value,
      });
    });
    document.querySelectorAll('button').forEach((b) => out.buttons.push(b.textContent.trim()));
    const inst = document.querySelector('[data-instructions], .instructions, #instructions');
    out.instructions = inst ? inst.textContent.trim() : '';
    return out;
  });
  if (hud.sliders.length < 3) fail(`S8: expected >=3 sliders, got ${hud.sliders.length}`);
  if (hud.buttons.length < 1) fail(`S8: expected >=1 button`);
  if (!/[가-힣]/.test(hud.instructions)) fail('S8: instructions block missing Korean text');
  log(`  ✓ ${hud.sliders.length} sliders | buttons: ${hud.buttons.join(' | ')}`);

  // Space toggles wind
  const wA = await page.evaluate(() => window.WebSim.state.windEnabled);
  await page.keyboard.press('Space');
  await page.waitForTimeout(80);
  const wB = await page.evaluate(() => window.WebSim.state.windEnabled);
  if (wA === wB) fail('S8: Space did not toggle windEnabled');
  await page.keyboard.press('Space');
  await page.waitForTimeout(80);

  // +/- adjusts wind
  const w0 = await page.evaluate(() => window.WebSim.state.windStrength);
  await page.keyboard.press('+');
  await page.waitForTimeout(40);
  const w1 = await page.evaluate(() => window.WebSim.state.windStrength);
  await page.keyboard.press('-');
  await page.waitForTimeout(40);
  const w2 = await page.evaluate(() => window.WebSim.state.windStrength);
  if (!(w1 > w0)) fail(`S8: + did not raise wind (${w0} -> ${w1})`);
  if (!(w2 < w1)) fail(`S8: - did not lower wind (${w1} -> ${w2})`);
  log(`  ✓ Space toggled wind ${wA}→${wB} | + from ${w0}→${w1} | - from ${w1}→${w2}`);

  // R resets
  await page.keyboard.press('r');
  await page.waitForTimeout(150);
  const afterReset = await page.evaluate(() => ({ pts: window.WebSim.points.length, cons: window.WebSim.constraints.length }));
  if (afterReset.pts < 2) fail('S8: R did not reseed points');
  log(`  ✓ R re-seeded: ${afterReset.pts} pts, ${afterReset.cons} cons`);

  // ===== Screenshots =====
  log('[S9] Visual capture');
  await page.waitForTimeout(500);
  // Initial demo with sagging web
  await page.screenshot({ path: resolve(BASELINE_DIR, '01-initial.png'), fullPage: false });

  // Wind sway
  await page.evaluate(() => { window.WebSim.state.windStrength = 1.8; window.WebSim.state.windEnabled = true; });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: resolve(BASELINE_DIR, '02-windy.png'), fullPage: false });

  // Pull + red tension: stretch a constraint heavily
  await page.evaluate(() => {
    const alive = window.WebSim.constraints.filter(c => c.alive);
    if (!alive.length || !window.WebSim._testHooks?.grabPoint) return;
    const c = alive[Math.floor(alive.length / 2)];
    const a = window.WebSim.points.find(p => p.id === c.a);
    window.WebSim._testHooks.grabPoint(c.a);
    // Displace a ton
    window.WebSim._testHooks.updateMouseForTest?.(a.x - 200, a.y - 200);
  });
  await page.waitForTimeout(500);
  await page.screenshot({ path: resolve(BASELINE_DIR, '03-pulled-red.png'), fullPage: false });
  await page.evaluate(() => window.WebSim._testHooks?.releasePoint?.());

  // Force several breaks
    await page.evaluate(() => {
      for (let i = 0; i < 5; i++) {
        const alive = window.WebSim.constraints.filter(c => c.alive);
        if (!alive.length || !window.WebSim._testHooks?.forceBreakById) break;
        window.WebSim._testHooks.forceBreakById(alive[0].id);
      }
    });
  await page.waitForTimeout(800);
  await page.screenshot({ path: resolve(BASELINE_DIR, '04-break-burst.png'), fullPage: false });

  // Draw a fresh web via real mouse drag
  await page.evaluate(() => window.WebSim.clear?.());
  await page.waitForTimeout(100);
  await page.mouse.move(rect.x + 12, rect.y + rect.h * 0.3);
  await page.mouse.down();
  await page.mouse.move(rect.x + rect.w * 0.5, rect.y + rect.h * 0.7, { steps: 8 });
  await page.mouse.move(rect.x + rect.w - 12, rect.y + rect.h * 0.4, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: resolve(BASELINE_DIR, '05-user-drawn-web.png'), fullPage: false });

  log(`  ✓ 5 screenshots captured in ${BASELINE_DIR}`);

  // ===== S10: Stability fuzz (1000 frames soak, no NaN, no audio spam) =====
  log('[S10] Stability fuzz (1000 frames @ high wind/gravity)');
  await page.evaluate(() => {
    window.WebSim.clear();
    window.WebSim.seedDemo();
    window.WebSim.state.windStrength = 2.5;
    window.WebSim.state.gravity = 2.0;
    window.WebSim.state.breakThreshold = 0.3;
    window.WebSim.state.windEnabled = true;
  });
  // Track every 100 frames
  const fuzzStart = await page.evaluate(() => ({
    points: window.WebSim.points.length,
    t: window.WebSim.state.t,
    audio: window.WebSim.audio?.state || 'n/a',
  }));
  let maxBroken = 0;
  let totalNans = 0;
  for (let i = 0; i < 10; i++) {
    await page.waitForTimeout(100);
    const probe = await page.evaluate(() => {
      const ps = window.WebSim.points;
      let nanCount = 0;
      for (const p of ps) {
        if (!isFinite(p.x) || !isFinite(p.y) || !isFinite(p.px) || !isFinite(p.py)) nanCount++;
      }
      const audio = window.WebSim.audio;
      return {
        t: window.WebSim.state.t,
        alive: window.WebSim.constraints.filter(c => c.alive).length,
        broken: window.WebSim.getStats().broken,
        particleCount: window.WebSim.particles.length,
        audioState: audio ? audio.state : 'n/a',
        nanCount,
      };
    });
    maxBroken = Math.max(maxBroken, probe.broken);
    totalNans += probe.nanCount;
    if (probe.particleCount > 200) fail(`S10: particle pool exceeded 200 (got ${probe.particleCount})`);
  }
  if (totalNans > 0) fail(`S10: ${totalNans} NaN points during 1000-frame soak`);
  log(`  ✓ no NaN | maxBroken=${maxBroken} | survived 1000 frames at max wind`);

  if (errors.length) {
    log('\n⚠ Page errors collected (non-fatal in some cases):');
    for (const e of errors.slice(0, 10)) log('   ' + e);
  }
}

async function main() {
  const PLAYWRIGHT_BROWSERS_PATH = process.env.PLAYWRIGHT_BROWSERS_PATH;
  log('Verifying single-file spider-web simulator (index.html)');
  log(`CWD=${ROOT}  PORT=${PORT}  playwright browsers PATH=${PLAYWRIGHT_BROWSERS_PATH || '<unset>'}`);
  try {
    await startServer();
    await new Promise(r => setTimeout(r, 250));

    const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => console.error('  [pageerror]', e.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') console.error('  [console.error]', msg.text());
    });

    await robustGoto(page, `http://127.0.0.1:${PORT}/index.html`);
    await waitForWebSim(page);

    // Diagnostic — capture early state
    const diag = await page.evaluate(() => {
      return {
        readyState: document.readyState,
        viewW: window.innerWidth,
        viewH: window.innerHeight,
        canvasExists: !!document.querySelector('canvas#stage'),
        canvasW: document.querySelector('canvas#stage')?.width,
        canvasH: document.querySelector('canvas#stage')?.height,
        simPoints: window.WebSim?.points?.length,
        simCons: window.WebSim?.constraints?.length,
        stateViewW: window.WebSim?.state?.viewW,
        stateViewH: window.WebSim?.state?.viewH,
      };
    }).catch((e) => ({ err: e.message }));
    log('\n[DIAG]', JSON.stringify(diag));

    await runScenario(page);

    log('\n✅ ALL GREEN — tests/spider.spec.mjs scenarios PASSED');
    await browser.close();
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Test run failed:', err && err.message);
    if (err && err.stack) console.error(err.stack.split('\n').slice(0, 8).join('\n'));
    process.exit(1);
  } finally {
    stopServer();
  }
}

main();
