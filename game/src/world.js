// The world: level state, collision, line of sight, pickups, coins, the exit,
// and the fixed-step update that ties the player and the guards together.
import { COIN, GUARD, LEVELS, PLAYER, STEP, WORLD_HEIGHT, WORLD_WIDTH } from './config.js';
import { alertGuardTo, createGuard, stepGuard } from './guard.js';

export const EVENT_NONE = 0;
export const EVENT_PICKUP = 1;
export const EVENT_SPOTTED = 2;
export const EVENT_ALARM = 4;
export const EVENT_CAUGHT = 8;
export const EVENT_LEVEL_CLEAR = 16;
export const EVENT_COIN = 32;
export const EVENT_NOISE = 64;

export const SCREEN_TITLE = 'title';
export const SCREEN_BRIEF = 'brief';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_LEVEL_DONE = 'level-done';
export const SCREEN_CAUGHT = 'caught';
export const SCREEN_WIN = 'win';

function rectsOf(level) {
  return [...level.walls, ...level.covers];
}

/** True when the segment crosses any wall or cover (both block sight). */
export function segmentBlocked(x1, y1, x2, y2, level) {
  for (const r of rectsOf(level)) {
    if (segmentHitsRect(x1, y1, x2, y2, r)) return true;
  }
  return false;
}

function segmentHitsRect(x1, y1, x2, y2, r) {
  // Slab test: reject when the segment misses the rectangle on either axis.
  const dx = x2 - x1;
  const dy = y2 - y1;
  let tMin = 0;
  let tMax = 1;
  if (Math.abs(dx) < 1e-9) {
    if (x1 < r.x || x1 > r.x + r.w) return false;
  } else {
    let t1 = (r.x - x1) / dx;
    let t2 = (r.x + r.w - x1) / dx;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tMin = Math.max(tMin, t1);
    tMax = Math.min(tMax, t2);
    if (tMin > tMax) return false;
  }
  if (Math.abs(dy) < 1e-9) {
    if (y1 < r.y || y1 > r.y + r.h) return false;
  } else {
    let t1 = (r.y - y1) / dy;
    let t2 = (r.y + r.h - y1) / dy;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tMin = Math.max(tMin, t1);
    tMax = Math.min(tMax, t2);
    if (tMin > tMax) return false;
  }
  return true;
}

/** Circle-vs-rect collision: push the circle out of every solid rect. */
export function collideCircle(entity, radius, level) {
  for (const r of rectsOf(level)) {
    const cx = Math.max(r.x, Math.min(entity.x, r.x + r.w));
    const cy = Math.max(r.y, Math.min(entity.y, r.y + r.h));
    const dx = entity.x - cx;
    const dy = entity.y - cy;
    const distSq = dx * dx + dy * dy;
    if (distSq < radius * radius) {
      const dist = Math.sqrt(distSq) || 0.001;
      entity.x = cx + (dx / dist) * radius;
      entity.y = cy + (dy / dist) * radius;
    }
  }
  entity.x = Math.max(radius + 2, Math.min(WORLD_WIDTH - radius - 2, entity.x));
  entity.y = Math.max(radius + 2, Math.min(WORLD_HEIGHT - radius - 2, entity.y));
}

function pointInRect(x, y, r) {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

export function createWorld(levelIndex, random) {
  const level = LEVELS[levelIndex];
  const state = {
    levelIndex,
    level,
    time: 0,
    screen: SCREEN_TITLE,
    player: {
      x: level.start.x,
      y: level.start.y,
      dir: -Math.PI / 2,
      sneaking: false,
      moving: false,
      coins: PLAYER.coinsPerLevel,
      hiddenInPlant: false,
      stepAcc: 0,
    },
    guards: level.guards.map((g, i) => createGuard(g, i)),
    relics: level.relics.map((r) => ({ ...r, taken: false })),
    coins: [],
    collected: 0,
    score: 0,
    spotted: false,
    alarmed: false,
    alarmTime: 0,
    noise: null,
    noiseTime: -999,
    message: '',
    messageTime: -999,
    levelTime: 0,
    best: 0,
  };
  return { state, random, reset: () => resetWorld(state) };
}

function resetWorld(state) {
  const level = state.level;
  state.time = 0;
  state.levelTime = 0;
  state.player.x = level.start.x;
  state.player.y = level.start.y;
  state.player.dir = -Math.PI / 2;
  state.player.sneaking = false;
  state.player.moving = false;
  state.player.coins = PLAYER.coinsPerLevel;
  state.player.hiddenInPlant = false;
  state.guards = level.guards.map((g, i) => createGuard(g, i));
  state.relics = level.relics.map((r) => ({ ...r, taken: false }));
  state.coins = [];
  state.collected = 0;
  state.spotted = false;
  state.alarmed = false;
  state.noise = null;
  state.message = '';
}

/** Throw a coin toward a world point (mouse click). Returns true when thrown. */
export function throwCoin(world, tx, ty) {
  const { state } = world;
  const p = state.player;
  if (p.coins <= 0) return false;
  const dx = tx - p.x;
  const dy = ty - p.y;
  const dist = Math.hypot(dx, dy);
  if (dist > PLAYER.coinRange) {
    tx = p.x + (dx / dist) * PLAYER.coinRange;
    ty = p.y + (dy / dist) * PLAYER.coinRange;
  }
  p.coins -= 1;
  state.coins.push({ x: tx, y: ty, radius: COIN.radius, landed: false, age: 0 });
  return true;
}

function updateCoins(world, dt) {
  const { state } = world;
  for (const coin of state.coins) {
    coin.age += dt;
    if (!coin.landed && coin.age > 0.25) {
      coin.landed = true;
      state.noise = { x: coin.x, y: coin.y };
      state.noiseTime = state.time;
      for (const guard of state.guards) {
        if (Math.hypot(guard.x - coin.x, guard.y - coin.y) < COIN.attractRadius) {
          alertGuardTo(guard, coin, world);
        }
      }
    }
  }
}

function updatePlayer(world, move, sneaking, dt) {
  const { state } = world;
  const p = state.player;
  p.sneaking = sneaking;
  const speed = sneaking ? PLAYER.sneakSpeed : PLAYER.walkSpeed;
  p.moving = move.x !== 0 || move.y !== 0;
  if (p.moving) {
    p.x += move.x * speed * dt;
    p.y += move.y * speed * dt;
    p.dir = Math.atan2(move.y, move.x);
    collideCircle(p, PLAYER.radius, state.level);
    // Footstep noise: running is loud, sneaking is quiet.
    p.stepAcc += speed * dt;
    if (p.stepAcc > (sneaking ? 46 : 34)) {
      p.stepAcc = 0;
      const radius = sneaking ? PLAYER.sneakNoiseRadius : PLAYER.noiseRadius;
      for (const guard of state.guards) {
        const d = Math.hypot(guard.x - p.x, guard.y - p.y);
        if (!sneaking && d < radius && guard.state === 'patrol') {
          alertGuardTo(guard, { x: p.x, y: p.y }, world);
          return EVENT_NOISE;
        }
      }
    }
  }
  // Hiding: a sneaking thief inside a plant bed cannot be seen.
  p.hiddenInPlant = sneaking && state.level.plants.some((r) => pointInRect(p.x, p.y, r));
  return EVENT_NONE;
}

/**
 * One fixed step of play. `move` is a unit vector, `sneaking` a boolean.
 * Returns a bitmask of EVENT_* flags.
 */
export function stepWorld(world, move, sneaking, dt = STEP) {
  const { state } = world;
  state.time += dt;
  state.levelTime += dt;
  let events = EVENT_NONE;

  events |= updatePlayer(world, move, sneaking, dt);
  updateCoins(world, dt);

  for (const guard of state.guards) {
    const e = stepGuard(guard, state, dt);
    if (e === 'spotted') {
      state.spotted = true;
      events |= EVENT_SPOTTED;
    } else if (e === 'alarmed') {
      state.alarmed = true;
      state.alarmTime = state.time;
      events |= EVENT_ALARM;
    }
  }

  // Caught: an alerted guard reaches the thief.
  const chasing = state.guards.some((g) => g.state === 'chase');
  state.alarmed = chasing || state.guards.some((g) => g.suspicion >= 100);
  for (const guard of state.guards) {
    if (guard.state === 'chase' && Math.hypot(guard.x - state.player.x, guard.y - state.player.y) < GUARD.catchRadius) {
      events |= EVENT_CAUGHT;
    }
  }

  // Pick up a relic by walking over it.
  for (const relic of state.relics) {
    if (!relic.taken && Math.hypot(relic.x - state.player.x, relic.y - state.player.y) < 30) {
      relic.taken = true;
      state.collected += 1;
      state.score += 500;
      events |= EVENT_PICKUP;
    }
  }

  // The exit opens once every relic is taken.
  const exit = state.level.exit;
  const allTaken = state.collected === state.relics.length;
  if (allTaken && pointInRect(state.player.x, state.player.y, exit)) {
    const timeBonus = Math.max(0, Math.round((state.level.par - state.levelTime) * 10));
    const ghostBonus = state.spotted ? 0 : 1000;
    state.score += timeBonus + ghostBonus;
    events |= EVENT_LEVEL_CLEAR;
  }
  return events;
}

export function levelComplete(state) {
  return state.collected === state.relics.length && pointInRect(state.player.x, state.player.y, state.level.exit);
}

export function heatLevel(state) {
  return Math.max(0, ...state.guards.map((g) => g.suspicion));
}
