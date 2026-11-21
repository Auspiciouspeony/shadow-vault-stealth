// Guard patrol, suspicion and vision. A guard walks its waypoints, pauses at each,
// turns to look around, and watches a cone in front of it. Seeing the thief fills
// suspicion; a full meter raises the alarm and the guard chases the last seen spot.
// A thrown coin or a loud footstep pulls a guard to investigate instead.
import { GUARD } from './config.js';
import { segmentBlocked } from './world.js';

export const GUARD_PATROL = 'patrol';
export const GUARD_INVESTIGATE = 'investigate';
export const GUARD_CHASE = 'chase';
export const GUARD_RETURN = 'return';
export const GUARD_LOOK = 'look';

export function createGuard(def, index) {
  const start = def.waypoints[0];
  return {
    id: index,
    x: start[0],
    y: start[1],
    dir: 0,
    speed: def.speed || GUARD.patrolSpeed,
    waypoints: def.waypoints,
    waypointIndex: 1 % def.waypoints.length,
    state: GUARD_PATROL,
    pause: 0,
    suspicion: 0,
    lastSeen: null,
    lastSeenTime: -999,
    investigateTarget: null,
    lookTime: 0,
    searchTime: 0,
    moving: false,
  };
}

function angleTo(fromX, fromY, toX, toY) {
  return Math.atan2(toY - fromY, toX - fromX);
}

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

function turnToward(guard, targetAngle, turnRate, dt) {
  const diff = angleDiff(targetAngle, guard.dir);
  const step = Math.max(-turnRate * dt, Math.min(turnRate * dt, diff));
  guard.dir += step;
  return Math.abs(diff) < 0.05;
}

/** True when the thief is inside this guard's cone with a clear line of sight. */
export function canSee(guard, player, level, time) {
  const dx = player.x - guard.x;
  const dy = player.y - guard.y;
  const dist = Math.hypot(dx, dy);
  const range = guard.state === GUARD_CHASE ? GUARD.viewRange + 30 : GUARD.viewRange;
  if (dist > range) return false;
  if (dist > 30 && Math.abs(angleDiff(Math.atan2(dy, dx), guard.dir)) > GUARD.viewHalfAngle) return false;
  if (segmentBlocked(guard.x, guard.y, player.x, player.y, level)) return false;
  if (player.hiddenInPlant) return false;
  return true;
}

function moveToward(guard, tx, ty, speed, dt, level) {
  const dx = tx - guard.x;
  const dy = ty - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 4) return true;
  const step = Math.min(dist, speed * dt);
  const nx = guard.x + (dx / dist) * step;
  const ny = guard.y + (dy / dist) * step;
  guard.dir = angleTo(guard.x, guard.y, tx, ty);
  guard.x = nx;
  guard.y = ny;
  guard.moving = true;
  return dist - step < 4;
}

/**
 * Advance one guard. Returns an event string ('spotted', 'alarmed', 'calmed') or null.
 * `world` carries level, player, time, and callbacks onNoise/onSpotted.
 */
export function stepGuard(guard, world, dt) {
  const { level, player, time } = world;
  guard.moving = false;
  const sees = canSee(guard, player, level, time);
  let event = null;

  if (sees) {
    const dist = Math.hypot(player.x - guard.x, player.y - guard.y);
    const near = dist < 90;
    const rate = player.sneaking ? GUARD.suspectRiseFar * 0.55 : near ? GUARD.suspectRise : GUARD.suspectRiseFar;
    const before = guard.suspicion;
    // rate is suspicion per second; dt is in seconds (fixed 1/60 steps).
    guard.suspicion = Math.min(100, before + rate * dt);
    guard.lastSeen = { x: player.x, y: player.y };
    guard.lastSeenTime = time;
    if (guard.suspicion >= 100 && guard.state !== GUARD_CHASE) {
      guard.state = GUARD_CHASE;
      guard.searchTime = 0;
      event = guard.suspicion >= 100 && before < 100 ? 'alarmed' : null;
      if (before < 70) event = 'spotted';
    }
  } else {
    guard.suspicion = Math.max(0, guard.suspicion - GUARD.suspectFall * dt);
    if (guard.state === GUARD_CHASE && time - guard.lastSeenTime > GUARD.alertHoldSeconds) {
      guard.state = GUARD_LOOK;
      guard.lookTime = 0;
    }
  }

  switch (guard.state) {
    case GUARD_PATROL: {
      if (guard.pause > 0) {
        guard.pause -= dt;
        // Scan the room while waiting at a waypoint.
        guard.dir += Math.sin(time * 1.4 + guard.id) * 0.35 * dt;
        break;
      }
      const target = guard.waypoints[guard.waypointIndex];
      if (moveToward(guard, target[0], target[1], guard.speed, dt, level)) {
        guard.waypointIndex = (guard.waypointIndex + 1) % guard.waypoints.length;
        guard.pause = GUARD.waypointPause;
      }
      break;
    }
    case GUARD_INVESTIGATE: {
      const target = guard.investigateTarget;
      if (!target) {
        guard.state = GUARD_PATROL;
        break;
      }
      if (moveToward(guard, target.x, target.y, GUARD.investigateSpeed, dt, level)) {
        guard.state = GUARD_LOOK;
        guard.lookTime = 0;
      }
      break;
    }
    case GUARD_CHASE: {
      const target = guard.lastSeen || { x: player.x, y: player.y };
      moveToward(guard, target.x, target.y, GUARD.chaseSpeed, dt, level);
      break;
    }
    case GUARD_LOOK: {
      guard.lookTime += dt;
      guard.dir += 1.6 * dt;
      if (guard.lookTime > 2.2) {
        guard.state = GUARD_RETURN;
      }
      break;
    }
    case GUARD_RETURN: {
      const start = guard.waypoints[0];
      if (moveToward(guard, start[0], start[1], GUARD.investigateSpeed, dt, level)) {
        guard.state = GUARD_PATROL;
        guard.waypointIndex = 1 % guard.waypoints.length;
      }
      break;
    }
    default:
      guard.state = GUARD_PATROL;
  }
  return event;
}

/** Pull a guard toward a noise (coin landing or loud steps). */
export function alertGuardTo(guard, point, world) {
  if (guard.state === GUARD_CHASE) return;
  guard.state = GUARD_INVESTIGATE;
  guard.investigateTarget = { x: point.x, y: point.y };
}
