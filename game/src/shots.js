// The screenshot scenes behind ?shot=start|play|alert|end. Each one plays the real
// rules forward from a fresh world, steered by a small autopilot that walks toward
// waypoints while refusing any step a guard could see, so the frame is what a real
// game looks like and the same seed always gives the same frame.
import { CAMERA, STEP } from './config.js';
import { EVENT_CAUGHT, SCREEN_LEVEL_DONE, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN, stepWorld } from './world.js';
import { canSee, canSeeFrom } from './guard.js';

const DIRS = [
  [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1],
];

/** Would any guard or camera see the thief at (x, y) right now? */
function wouldBeSeen(state, x, y) {
  const probe = { x, y, sneaking: true, hiddenInPlant: false };
  if (state.guards.some((g) => canSee(g, probe, state.level, state.time, state.smokes))) return true;
  return state.cameras.some((c) => canSeeFrom(c.x, c.y, c.dir, c.range, CAMERA.viewHalfAngle, probe, state.level, state.smokes));
}

/** One autopilot step: move toward the waypoint, never into a visible spot. */
function autopilotStep(world, target, sneaking) {
  const { state } = world;
  const p = state.player;
  const dx = target[0] - p.x;
  const dy = target[1] - p.y;
  if (Math.hypot(dx, dy) < 18) return true;
  const speed = sneaking ? 92 : 165;
  const stepLen = speed * STEP;
  let best = null;
  let bestScore = Infinity;
  for (const [ux, uy] of DIRS) {
    const len = Math.hypot(ux, uy);
    const nx = p.x + (ux / len) * stepLen;
    const ny = p.y + (uy / len) * stepLen;
    if (wouldBeSeen(state, nx, ny)) continue;
    const dist = Math.hypot(target[0] - nx, target[1] - ny);
    const align = (dx * ux + dy * uy) / (Math.hypot(dx, dy) * len || 1);
    const score = dist - align * 12;
    if (score < bestScore) {
      bestScore = score;
      best = { x: ux / len, y: uy / len };
    }
  }
  if (!best) {
    // Nowhere safe to go: hold still and sneak until a patrol moves on.
    stepWorld(world, { x: 0, y: 0 }, true);
    return false;
  }
  stepWorld(world, best, sneaking);
  return Math.hypot(target[0] - p.x, target[1] - p.y) < 18;
}

function walkPath(world, waypoints, maxSeconds, sneaking) {
  const maxSteps = Math.floor(maxSeconds / STEP);
  let step = 0;
  for (const target of waypoints) {
    let guard = 0;
    while (step < maxSteps && guard < maxSeconds * 4) {
      guard += 1;
      step += 1;
      if (autopilotStep(world, target, sneaking)) break;
    }
  }
  return step;
}

/**
 * Set `world` to the named scene and return the screen to draw over it.
 * start: title over heist 1 with the wardens mid-patrol. play: heist 4 (the
 * casino), one relic stolen, the thief sneaking along the bottom corridor
 * under the cameras. alert: heist 5 mid-chase, cones red, the thief fleeing
 * south past the lasers. end: the win screen.
 */
export function stageShot(name, world) {
  const { state } = world;
  world.reset();
  if (name === 'play') {
    walkPath(world, [[90, 640], [200, 600], [420, 640], [720, 600], [1000, 600], [1120, 560]], 90, true);
    state.player.sneaking = true;
    return { screen: SCREEN_PLAY, best: 0 };
  }
  if (name === 'alert') {
    // Stand in the first warden's southbound lane and wait in the open until
    // its cone fills the alarm, then run south while it gives chase.
    walkPath(world, [[300, 400]], 45, false);
    for (let i = 0; i < 8 / STEP; i += 1) {
      stepWorld(world, { x: 0, y: 0 }, false);
      if (state.alarmed) break;
    }
    for (let i = 0; i < 1.2 / STEP; i += 1) {
      stepWorld(world, { x: 0.5, y: 1 }, false);
    }
    return { screen: SCREEN_PLAY, best: 0 };
  }
  if (name === 'end') {
    for (const relic of state.relics) relic.taken = true;
    state.collected = state.relics.length;
    state.score = 5450;
    state.lootValue = 400;
    state.best = 5450;
    state.player.x = state.level.exit.x + 32;
    state.player.y = state.level.exit.y + 32;
    return { screen: SCREEN_WIN, best: 5450 };
  }
  // start (default): let the first gallery's wardens patrol for a while.
  for (let i = 0; i < 5 / STEP; i += 1) {
    stepWorld(world, { x: 0, y: 0 }, false);
    if (state.guards.some((g) => g.state === 'chase')) break;
  }
  return { screen: SCREEN_TITLE, best: 0 };
}
