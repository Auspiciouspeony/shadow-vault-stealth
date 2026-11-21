// Canvas painting: the moonlit floor, walls and cover, vision cones, guards,
// cameras and lasers, the thief, relics, loot, the exit, the HUD and every menu screen.
import { CAMERA, GUARD, LASER, LEVELS, SMOKE, WORLD_HEIGHT, WORLD_WIDTH } from './config.js';
import { SCREEN_BRIEF, SCREEN_CAUGHT, SCREEN_FAILED, SCREEN_LEVEL_DONE, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN, heatLevel, laserIsOn, playerInLight } from './world.js';

const TILE = 64;
const RUG_TINTS = [
  'rgba(122, 44, 66, 0.22)',
  'rgba(44, 90, 122, 0.22)',
  'rgba(90, 44, 122, 0.20)',
  'rgba(122, 90, 30, 0.24)',
  'rgba(30, 110, 90, 0.22)',
];

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');

  function fit() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = canvas.clientWidth || WORLD_WIDTH;
    const h = canvas.clientHeight || WORLD_HEIGHT;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    const scale = Math.min(canvas.width / WORLD_WIDTH, canvas.height / WORLD_HEIGHT);
    const ox = (canvas.width - WORLD_WIDTH * scale) / 2;
    const oy = (canvas.height - WORLD_HEIGHT * scale) / 2;
    return { scale, ox, oy, dpr };
  }

  function toWorld(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const t = fit();
    const px = (clientX - rect.left) * (canvas.width / rect.width);
    const py = (clientY - rect.top) * (canvas.height / rect.height);
    return { x: (px - t.ox) / t.scale, y: (py - t.oy) / t.scale };
  }

  function drawFloor(state) {
    // Moonlit checkerboard with a soft radial glow in the middle.
    for (let ty = 0; ty < WORLD_HEIGHT / TILE; ty += 1) {
      for (let tx = 0; tx < WORLD_WIDTH / TILE; tx += 1) {
        const even = (tx + ty) % 2 === 0;
        ctx.fillStyle = even ? '#1f2537' : '#191e2e';
        ctx.fillRect(tx * TILE, ty * TILE, TILE, TILE);
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.18)';
        ctx.lineWidth = 1;
        ctx.strokeRect(tx * TILE + 0.5, ty * TILE + 0.5, TILE, TILE);
      }
    }
    const glow = ctx.createRadialGradient(640, 360, 60, 640, 360, 620);
    glow.addColorStop(0, 'rgba(150, 180, 255, 0.10)');
    glow.addColorStop(1, 'rgba(0, 0, 0, 0.42)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    // Dust motes drifting in the moonlight.
    for (let i = 0; i < 36; i += 1) {
      const mx = ((i * 197.3) % WORLD_WIDTH) + Math.sin(state.time * 0.2 + i * 1.7) * 8;
      const my = ((i * 311.7) % WORLD_HEIGHT) + Math.cos(state.time * 0.15 + i * 2.3) * 6;
      ctx.fillStyle = `rgba(200, 220, 255, ${0.05 + (i % 3) * 0.03})`;
      ctx.beginPath();
      ctx.arc(mx, my, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
    // Rug runner down the middle, tinted per heist.
    ctx.fillStyle = RUG_TINTS[state.levelIndex % RUG_TINTS.length];
    ctx.fillRect(120, 300, 1040, 120);
    ctx.strokeStyle = 'rgba(220, 170, 90, 0.35)';
    ctx.lineWidth = 3;
    ctx.strokeRect(126, 306, 1028, 108);
  }

  function drawLamps(state) {
    for (const lamp of state.level.lamps) {
      const glow = ctx.createRadialGradient(lamp.x, lamp.y, 4, lamp.x, lamp.y, 130);
      glow.addColorStop(0, 'rgba(255, 190, 90, 0.16)');
      glow.addColorStop(1, 'rgba(255, 190, 90, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(lamp.x, lamp.y, 130, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#2c2c34';
      ctx.fillRect(lamp.x - 3, lamp.y - 3, 6, 6);
      ctx.fillStyle = '#ffd76a';
      ctx.beginPath();
      ctx.arc(lamp.x, lamp.y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 215, 106, 0.35)';
      ctx.beginPath();
      ctx.arc(lamp.x, lamp.y, 10, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawWalls(level) {
    for (const r of level.walls) {
      ctx.fillStyle = '#3a4157';
      ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.fillStyle = '#4d5878';
      ctx.fillRect(r.x, r.y, r.w, Math.min(6, r.h));
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.lineWidth = 2;
      ctx.strokeRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2);
    }
  }

  function drawCover(level) {
    for (const r of level.covers) {
      if (r.type === 'crate') {
        ctx.fillStyle = '#6b4f2a';
        ctx.fillRect(r.x, r.y, r.w, r.h);
        ctx.strokeStyle = '#3f2f17';
        ctx.lineWidth = 3;
        ctx.strokeRect(r.x + 2, r.y + 2, r.w - 4, r.h - 4);
        ctx.beginPath();
        ctx.moveTo(r.x, r.y);
        ctx.lineTo(r.x + r.w, r.y + r.h);
        ctx.moveTo(r.x + r.w, r.y);
        ctx.lineTo(r.x, r.y + r.h);
        ctx.stroke();
      } else if (r.type === 'statue') {
        ctx.fillStyle = '#5c6478';
        ctx.fillRect(r.x + r.w / 2 - 14, r.y + 10, 28, r.h - 20);
        ctx.beginPath();
        ctx.arc(r.x + r.w / 2, r.y + 16, 12, 0, Math.PI * 2);
        ctx.fillStyle = '#8b93a8';
        ctx.fill();
        ctx.fillStyle = '#454c60';
        ctx.fillRect(r.x + 4, r.y + r.h - 14, r.w - 8, 12);
      } else {
        // Display case: glass cabinet with a golden glint.
        ctx.fillStyle = '#2c3550';
        ctx.fillRect(r.x, r.y, r.w, r.h);
        ctx.fillStyle = 'rgba(140, 190, 255, 0.25)';
        ctx.fillRect(r.x + 6, r.y + 6, r.w - 12, r.h - 12);
        ctx.strokeStyle = '#d9a441';
        ctx.lineWidth = 3;
        ctx.strokeRect(r.x + 3, r.y + 3, r.w - 6, r.h - 6);
        ctx.beginPath();
        ctx.moveTo(r.x + 10, r.y + r.h - 10);
        ctx.lineTo(r.x + r.w - 10, r.y + 10);
        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
    for (const r of level.plants) {
      ctx.fillStyle = '#1e4d2e';
      for (let i = 0; i < 5; i += 1) {
        const px = r.x + 12 + (i % 3) * ((r.w - 24) / 2);
        const py = r.y + 14 + Math.floor(i / 3) * (r.h - 28);
        ctx.beginPath();
        ctx.arc(px, py, 16, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#2f7a44';
      ctx.beginPath();
      ctx.arc(r.x + r.w / 2, r.y + r.h / 2, 12, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawCone(guard) {
    const range = guard.state === 'chase' ? GUARD.viewRange + 30 : GUARD.viewRange;
    const hot = guard.suspicion > 55 || guard.state === 'chase';
    const warm = guard.suspicion > 25;
    const color = hot ? '255, 70, 60' : warm ? '255, 190, 60' : '255, 220, 90';
    const grad = ctx.createRadialGradient(guard.x, guard.y, 10, guard.x, guard.y, range);
    grad.addColorStop(0, `rgba(${color}, 0.34)`);
    grad.addColorStop(1, `rgba(${color}, 0.02)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(guard.x, guard.y);
    ctx.arc(guard.x, guard.y, range, guard.dir - GUARD.viewHalfAngle, guard.dir + GUARD.viewHalfAngle);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = `rgba(${color}, 0.5)`;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  function drawGuard(guard) {
    // Body: navy uniform with a brass badge and a cap brim toward facing.
    // (Its vision cone is painted earlier, under the walls, by draw().)
    ctx.fillStyle = '#1c2f57';
    ctx.beginPath();
    ctx.arc(guard.x, guard.y, GUARD.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#0e1830';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = '#d9a441';
    ctx.beginPath();
    ctx.arc(guard.x + Math.cos(guard.dir) * 6, guard.y + Math.sin(guard.dir) * 6, 4, 0, Math.PI * 2);
    ctx.fill();
    // Facing tick.
    ctx.strokeStyle = '#e8ecf5';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(guard.x + Math.cos(guard.dir) * 10, guard.y + Math.sin(guard.dir) * 10);
    ctx.lineTo(guard.x + Math.cos(guard.dir) * 18, guard.y + Math.sin(guard.dir) * 18);
    ctx.stroke();
    // Suspicion bubble: ? while curious, ! when alarmed.
    if (guard.suspicion > 25 || guard.state === 'chase') {
      const hot = guard.suspicion >= 100 || guard.state === 'chase';
      ctx.fillStyle = hot ? '#ff463c' : '#ffc93c';
      ctx.beginPath();
      ctx.arc(guard.x, guard.y - 26, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#14100a';
      ctx.font = 'bold 14px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(hot ? '!' : '?', guard.x, guard.y - 25);
    }
    // Suspicion arc under the guard.
    if (guard.suspicion > 2 && guard.suspicion < 100) {
      ctx.strokeStyle = 'rgba(255, 201, 60, 0.9)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(guard.x, guard.y, GUARD.radius + 7, -Math.PI / 2, -Math.PI / 2 + (guard.suspicion / 100) * Math.PI * 2);
      ctx.stroke();
    }
    // Investigating guards mutter what they heard.
    if (guard.state === 'investigate') {
      ctx.fillStyle = '#ffe9a8';
      ctx.font = 'bold 12px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText('WHAT WAS THAT?', guard.x, guard.y - 44);
    }
  }

  function drawCameraCone(camera) {
    const hot = camera.suspicion > 55;
    const warm = camera.suspicion > 25;
    const color = hot ? '255, 70, 60' : warm ? '255, 150, 60' : '255, 90, 80';
    const grad = ctx.createRadialGradient(camera.x, camera.y, 8, camera.x, camera.y, camera.range);
    grad.addColorStop(0, `rgba(${color}, 0.30)`);
    grad.addColorStop(1, `rgba(${color}, 0.02)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(camera.x, camera.y);
    ctx.arc(camera.x, camera.y, camera.range, camera.dir - CAMERA.viewHalfAngle, camera.dir + CAMERA.viewHalfAngle);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = `rgba(${color}, 0.45)`;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  function drawCamera(camera) {
    // Wall-mounted eye: dark housing, red lens toward its sweep.
    ctx.fillStyle = '#232733';
    ctx.fillRect(camera.x - 10, camera.y - 7, 20, 14);
    ctx.strokeStyle = '#0e1220';
    ctx.lineWidth = 2;
    ctx.strokeRect(camera.x - 10, camera.y - 7, 20, 14);
    ctx.fillStyle = camera.suspicion > 55 ? '#ff463c' : '#ff6b5e';
    ctx.beginPath();
    ctx.arc(camera.x + Math.cos(camera.dir) * 8, camera.y + Math.sin(camera.dir) * 8, 4, 0, Math.PI * 2);
    ctx.fill();
    if (camera.suspicion > 25) {
      ctx.fillStyle = '#ff463c';
      ctx.beginPath();
      ctx.arc(camera.x, camera.y - 22, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#14100a';
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('!', camera.x, camera.y - 21);
    }
    if (camera.suspicion > 2 && camera.suspicion < 100) {
      ctx.strokeStyle = 'rgba(255, 70, 60, 0.9)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(camera.x, camera.y, CAMERA.radius + 6, -Math.PI / 2, -Math.PI / 2 + (camera.suspicion / 100) * Math.PI * 2);
      ctx.stroke();
    }
  }

  function drawLasers(state) {
    for (const laser of state.lasers) {
      const on = laserIsOn(laser, state.time);
      // Emitter posts at both ends.
      for (const [ex, ey] of [[laser.x1, laser.y1], [laser.x2, laser.y2]]) {
        ctx.fillStyle = '#3a2026';
        ctx.fillRect(ex - 5, ey - 5, 10, 10);
        ctx.fillStyle = on ? '#ff2e3e' : '#7a3a42';
        ctx.beginPath();
        ctx.arc(ex, ey, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      if (on) {
        ctx.strokeStyle = 'rgba(255, 46, 62, 0.25)';
        ctx.lineWidth = 7;
        ctx.beginPath();
        ctx.moveTo(laser.x1, laser.y1);
        ctx.lineTo(laser.x2, laser.y2);
        ctx.stroke();
        ctx.strokeStyle = '#ff2e3e';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(laser.x1, laser.y1);
        ctx.lineTo(laser.x2, laser.y2);
        ctx.stroke();
      } else {
        ctx.strokeStyle = 'rgba(255, 46, 62, 0.25)';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 8]);
        ctx.beginPath();
        ctx.moveTo(laser.x1, laser.y1);
        ctx.lineTo(laser.x2, laser.y2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  }

  function drawSmoke(state) {
    for (const s of state.smokes) {
      const fade = s.age > SMOKE.life - 1.5 ? (SMOKE.life - s.age) / 1.5 : 1;
      for (let i = 0; i < 3; i += 1) {
        const wob = Math.sin(state.time * 2 + i * 2.1 + s.x) * 6;
        ctx.fillStyle = `rgba(205, 205, 215, ${0.30 * fade})`;
        ctx.beginPath();
        ctx.arc(s.x + (i - 1) * 26 + wob, s.y + ((i % 2) * 14 - 7), SMOKE.radius * 0.55, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.strokeStyle = `rgba(220, 220, 230, ${0.35 * fade})`;
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.arc(s.x, s.y, SMOKE.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  function drawLoot(state) {
    for (const pile of state.loot) {
      if (pile.taken) continue;
      const pulse = 0.6 + Math.sin(state.time * 3 + pile.x) * 0.25;
      const glow = ctx.createRadialGradient(pile.x, pile.y, 2, pile.x, pile.y, 30);
      glow.addColorStop(0, `rgba(255, 215, 106, ${0.4 * pulse})`);
      glow.addColorStop(1, 'rgba(255, 215, 106, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(pile.x, pile.y, 30, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#d9a441';
      for (const [ox, oy] of [[-7, 4], [6, 5], [0, -5]]) {
        ctx.beginPath();
        ctx.arc(pile.x + ox, pile.y + oy, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#8a6a1f';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
      ctx.fillStyle = '#ffe9a8';
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText('$100', pile.x, pile.y - 16);
    }
  }

  function drawPlayer(player, time) {
    const bob = player.moving ? Math.sin(time * 12) * 1.5 : 0;
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.ellipse(player.x, player.y + 12, 13, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    // Hooded cloak, dark teal with a pale face slit toward facing.
    ctx.fillStyle = '#0f766e';
    ctx.beginPath();
    ctx.arc(player.x, player.y + bob, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#0a4a45';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#f5e9c9';
    ctx.beginPath();
    ctx.arc(player.x + Math.cos(player.dir) * 5, player.y + Math.sin(player.dir) * 5 + bob, 5, 0, Math.PI * 2);
    ctx.fill();
    if (player.sneaking) {
      ctx.strokeStyle = 'rgba(245, 233, 201, 0.8)';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(player.x, player.y, 18, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    if (player.hiddenInPlant) {
      ctx.fillStyle = '#7ee787';
      ctx.font = 'bold 12px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText('HIDDEN', player.x, player.y + 30);
    }
  }

  function drawRelic(relic, time) {
    if (relic.taken) return;
    const pulse = 0.6 + Math.sin(time * 3) * 0.25;
    const glow = ctx.createRadialGradient(relic.x, relic.y, 2, relic.x, relic.y, 42);
    glow.addColorStop(0, `rgba(255, 190, 80, ${0.5 * pulse})`);
    glow.addColorStop(1, 'rgba(255, 190, 80, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(relic.x, relic.y, 42, 0, Math.PI * 2);
    ctx.fill();
    // Gem: faceted diamond.
    ctx.fillStyle = '#ff5d73';
    ctx.beginPath();
    ctx.moveTo(relic.x, relic.y - 13);
    ctx.lineTo(relic.x + 11, relic.y);
    ctx.lineTo(relic.x, relic.y + 13);
    ctx.lineTo(relic.x - 11, relic.y);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.beginPath();
    ctx.moveTo(relic.x, relic.y - 13);
    ctx.lineTo(relic.x + 11, relic.y);
    ctx.lineTo(relic.x, relic.y);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#f5e9c9';
    ctx.font = '600 13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(relic.name, relic.x, relic.y - 24);
  }

  function drawExit(state) {
    const exit = state.level.exit;
    const open = state.collected === state.relics.length;
    const pulse = open ? 0.7 + Math.sin(state.time * 4) * 0.3 : 0.35;
    ctx.fillStyle = open ? `rgba(60, 220, 120, ${0.25 * pulse + 0.15})` : 'rgba(120, 120, 120, 0.18)';
    ctx.fillRect(exit.x, exit.y, exit.w, exit.h);
    ctx.strokeStyle = open ? '#3cdc78' : '#8a8a8a';
    ctx.lineWidth = 4;
    ctx.strokeRect(exit.x + 2, exit.y + 2, exit.w - 4, exit.h - 4);
    ctx.fillStyle = open ? '#3cdc78' : '#b0b0b0';
    ctx.font = 'bold 26px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(open ? 'EXIT' : 'LOCKED', exit.x + exit.w / 2, exit.y + exit.h / 2 - 8);
    ctx.font = '600 12px system-ui, sans-serif';
    ctx.fillText(open ? 'go!' : `${state.collected}/${state.relics.length} relics`, exit.x + exit.w / 2, exit.y + exit.h / 2 + 16);
  }

  function drawCoins(state) {
    for (const coin of state.coins) {
      ctx.fillStyle = '#d9a441';
      ctx.beginPath();
      ctx.arc(coin.x, coin.y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#8a6a1f';
      ctx.lineWidth = 2;
      ctx.stroke();
      if (!coin.landed) {
        ctx.strokeStyle = 'rgba(217, 164, 65, 0.5)';
        ctx.beginPath();
        ctx.arc(coin.x, coin.y, 10 + coin.age * 40, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }

  function drawHud(state, screen) {
    const heat = heatLevel(state);
    const inLight = playerInLight(state);
    const hidden = state.player.hiddenInPlant;
    const detection = heat > 55 ? 'SEEN!' : heat > 25 ? 'SUSPICIOUS' : hidden ? 'HIDDEN' : inLight ? 'IN LIGHT' : 'UNSEEN';
    const detectionColor = heat > 55 ? '#ff463c' : heat > 25 ? '#ffc93c' : hidden ? '#7ee787' : inLight ? '#ffb45e' : '#7ee787';
    // Top bar, row 1: title, heist pips, strikes, detection badge.
    ctx.fillStyle = 'rgba(8, 10, 18, 0.88)';
    ctx.fillRect(0, 0, WORLD_WIDTH, 72);
    ctx.fillStyle = '#f5e9c9';
    ctx.font = 'bold 17px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const title = `SHADOW VAULT — ${state.level.name}`;
    ctx.fillText(title, 16, 23);
    const titleW = ctx.measureText(title).width;
    // Heist pips: five diamonds, filled up to this heist.
    for (let i = 0; i < LEVELS.length; i += 1) {
      const x = 16 + titleW + 26 + i * 20;
      ctx.fillStyle = i <= state.levelIndex ? '#ffd76a' : 'rgba(245,233,201,0.25)';
      ctx.beginPath();
      ctx.moveTo(x, 14);
      ctx.lineTo(x + 7, 23);
      ctx.lineTo(x, 32);
      ctx.lineTo(x - 7, 23);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = '#b9c2d8';
    ctx.font = '600 13px system-ui, sans-serif';
    ctx.fillText(`HEIST ${state.levelIndex + 1}/${LEVELS.length}`, 16 + titleW + 26 + LEVELS.length * 20 + 6, 23);
    // Strikes: three dots, lost ones dimmed.
    ctx.fillStyle = '#b9c2d8';
    ctx.fillText('STRIKES', 1010, 23);
    for (let i = 0; i < 3; i += 1) {
      ctx.fillStyle = i < state.strikes ? '#ff6b5e' : 'rgba(245,233,201,0.22)';
      ctx.beginPath();
      ctx.arc(1085 + i * 20, 23, 7, 0, Math.PI * 2);
      ctx.fill();
    }
    // Detection badge + alarm meter.
    ctx.fillStyle = detectionColor;
    ctx.fillRect(1140, 7, 124, 30);
    ctx.fillStyle = '#14100a';
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(detection, 1202, 23);
    ctx.fillStyle = 'rgba(245,233,201,0.2)';
    ctx.fillRect(1140, 40, 124, 4);
    ctx.fillStyle = detectionColor;
    ctx.fillRect(1140, 40, 124 * Math.min(1, heat / 100), 4);
    // Row 2: relics, coins, smoke, loot, time, score, ghost.
    ctx.textAlign = 'left';
    ctx.fillStyle = '#f5e9c9';
    ctx.font = '600 15px system-ui, sans-serif';
    state.relics.forEach((r, i) => {
      const x = 24 + i * 26;
      ctx.fillStyle = r.taken ? '#ff5d73' : 'rgba(245,233,201,0.25)';
      ctx.beginPath();
      ctx.moveTo(x, 50);
      ctx.lineTo(x + 8, 60);
      ctx.lineTo(x, 70);
      ctx.lineTo(x - 8, 60);
      ctx.closePath();
      ctx.fill();
    });
    ctx.fillStyle = '#f5e9c9';
    ctx.fillText(`Relics ${state.collected}/${state.relics.length}`, 110, 60);
    ctx.fillText(`Coins ${state.player.coins}`, 250, 60);
    ctx.fillText(`Smoke ${state.player.smoke}`, 350, 60);
    ctx.fillText(`Loot $${state.lootValue}`, 460, 60);
    const mins = Math.floor(state.levelTime / 60);
    const secs = Math.floor(state.levelTime % 60).toString().padStart(2, '0');
    ctx.fillText(`${mins}:${secs}`, 590, 60);
    ctx.fillText(`Score ${state.score}`, 680, 60);
    ctx.fillText(`Best ${state.best}`, 810, 60);
    ctx.fillStyle = state.spotted ? '#ff6b5e' : '#7ee787';
    ctx.textAlign = 'right';
    ctx.fillText(state.spotted ? 'SPOTTED — ghost bonus lost' : 'GHOST +1000 if unseen', 1264, 60);
    ctx.textAlign = 'left';
    // Heat vignette when the guards are on to you.
    if (heat > 25) {
      const a = Math.min(0.3, (heat / 100) * 0.35);
      const vg = ctx.createRadialGradient(640, 360, 240, 640, 360, 700);
      vg.addColorStop(0, 'rgba(255,40,30,0)');
      vg.addColorStop(1, `rgba(255,40,30,${a})`);
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    }
    if (screen === SCREEN_PLAY) {
      ctx.fillStyle = 'rgba(245,233,201,0.75)';
      ctx.font = '13px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('WASD / arrows move · Shift sneak · click / Space coin · Q smoke · collect relics + loot, then reach the EXIT', 640, 706);
    }
    if (state.message) {
      ctx.fillStyle = '#ffe9a8';
      ctx.font = 'bold 18px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(state.message, 640, 100);
    }
  }

  function panel(title, lines, accent) {
    ctx.fillStyle = 'rgba(5, 7, 14, 0.72)';
    ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    ctx.fillStyle = '#141a2c';
    ctx.strokeStyle = accent;
    ctx.lineWidth = 3;
    const w = 640;
    const h = 130 + lines.length * 30;
    const x = (WORLD_WIDTH - w) / 2;
    const y = (WORLD_HEIGHT - h) / 2;
    ctx.fillRect(x, y, w, h);
    ctx.strokeRect(x, y, w, h);
    ctx.fillStyle = accent;
    ctx.font = 'bold 34px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(title, 640, y + 58);
    ctx.fillStyle = '#e8ecf5';
    ctx.font = '17px system-ui, sans-serif';
    lines.forEach((line, i) => ctx.fillText(line, 640, y + 100 + i * 30));
  }

  function drawScreen(state, screen) {
    if (screen === SCREEN_TITLE) {
      ctx.fillStyle = 'rgba(5, 7, 14, 0.66)';
      ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
      ctx.fillStyle = '#ffd76a';
      ctx.font = 'bold 72px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText('SHADOW VAULT', 640, 250);
      ctx.fillStyle = '#e8ecf5';
      ctx.font = '21px system-ui, sans-serif';
      ctx.fillText('A top-down stealth heist across five moonlit galleries', 640, 295);
      ctx.font = '17px system-ui, sans-serif';
      ctx.fillText('Slip past the night wardens. Take every relic. Reach the exit unseen.', 640, 330);
      ctx.fillStyle = '#ffd76a';
      ctx.font = 'bold 19px system-ui, sans-serif';
      ctx.fillText('Press Enter or click to begin', 640, 420);
      ctx.fillStyle = '#b9c2d8';
      ctx.font = '15px system-ui, sans-serif';
      ctx.fillText('WASD / arrows — move    Shift — sneak    Click — toss a coin to distract    Q — smoke bomb', 640, 470);
      ctx.fillText('Stay out of the yellow cones. Cameras sweep the casino; lasers guard the Sky Palace.', 640, 496);
      ctx.fillText('Green plants hide you while you sneak. Three strikes and the heist fails.', 640, 522);
      if (state.best > 0) {
        ctx.fillStyle = '#7ee787';
        ctx.fillText(`Best score: ${state.best}`, 640, 566);
      }
    } else if (screen === SCREEN_BRIEF) {
      const lines = [
        `Relics to steal: ${state.relics.map((r) => r.name).join(', ')}`,
        `${state.guards.length} wardens patrol this heist. Their cones are their eyes.`,
      ];
      if (state.cameras.length > 0) lines.push(`${state.cameras.length} security cameras sweep the room — break their line of sight.`);
      if (state.lasers.length > 0) lines.push(`${state.lasers.length} laser tripwires blink on and off — cross while they are dark.`);
      lines.push(`Gold piles worth $${state.loot.reduce((sum, p) => sum + p.value, 0)} are yours for the taking.`);
      lines.push('Press Enter to slip in.');
      panel(state.level.name, lines, '#ffd76a');
    } else if (screen === SCREEN_PAUSED) {
      panel('Paused', ['Take a breath. The wardens wait.', 'P resume · R restart the heist · M mute'], '#b9c2d8');
    } else if (screen === SCREEN_LEVEL_DONE) {
      panel('Heist Cleared!', [
        `All relics taken. Score ${state.score}. Loot $${state.lootValue} pocketed.`,
        state.spotted ? 'You were spotted — no ghost bonus this time.' : 'Ghost bonus +1000: never spotted!',
        'Press Enter for the next heist.',
      ], '#3cdc78');
    } else if (screen === SCREEN_CAUGHT) {
      panel('Caught!', [
        'A warden laid hands on you in the dark.',
        `Strikes left: ${state.strikes} — three strikes ends the heist.`,
        `Score ${state.score} · Relics ${state.collected}/${state.relics.length}`,
        'Press R to try the heist again.',
      ], '#ff463c');
    } else if (screen === SCREEN_FAILED) {
      panel('Heist Failed!', [
        'Three strikes — the vault keeps its secrets tonight.',
        `Score ${state.score} · Loot $${state.lootValue} pocketed.`,
        'Press R to start the whole heist over.',
      ], '#ff463c');
    } else if (screen === SCREEN_WIN) {
      panel('The Vault Is Yours!', [
        'Every relic, every heist — five galleries, and no alarm that stuck.',
        `Final score ${state.score}. Loot $${state.lootValue}. Best ${Math.max(state.best, state.score)}.`,
        'Press Enter to play again.',
      ], '#ffd76a');
    }
  }

  return {
    toWorld,
    draw(state, screen) {
      const t = fit();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = '#0a0d16';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(t.scale, 0, 0, t.scale, t.ox, t.oy);
      drawFloor(state);
      drawLamps(state);
      // Cones first so walls and cover hide the parts behind them.
      for (const guard of state.guards) drawCone(guard);
      for (const camera of state.cameras) drawCameraCone(camera);
      drawWalls(state.level);
      drawCover(state.level);
      drawLasers(state);
      drawExit(state);
      drawLoot(state);
      for (const relic of state.relics) drawRelic(relic, state.time);
      drawCoins(state);
      for (const guard of state.guards) drawGuard(guard);
      for (const camera of state.cameras) drawCamera(camera);
      drawPlayer(state.player, state.time);
      drawSmoke(state);
      drawHud(state, screen);
      if (screen !== SCREEN_PLAY) drawScreen(state, screen);
    },
  };
}
