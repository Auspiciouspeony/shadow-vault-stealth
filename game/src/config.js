// Shared constants and the three gallery levels of Shadow Vault.
// The world is a fixed 1280x720 floor plan; the renderer scales it to the window.
export const WORLD_WIDTH = 1280;
export const WORLD_HEIGHT = 720;
export const STEP = 1 / 60;
export const BEST_KEY = 'shadow-vault-best';

// Player tuning.
export const PLAYER = {
  radius: 13,
  walkSpeed: 165,
  sneakSpeed: 92,
  noiseRadius: 95,
  sneakNoiseRadius: 26,
  coinRange: 280,
  coinsPerLevel: 3,
};

// Guard tuning.
export const GUARD = {
  radius: 14,
  patrolSpeed: 78,
  chaseSpeed: 148,
  investigateSpeed: 110,
  viewRange: 205,
  viewHalfAngle: 0.58, // ~33 degrees each side
  catchRadius: 27,
  suspectRise: 55, // suspicion per second, point blank in cone
  suspectRiseFar: 30,
  suspectFall: 25,
  alertHoldSeconds: 3.0, // chase on after losing sight this long
  waypointPause: 1.4,
};

export const COIN = { radius: 6, attractRadius: 230 };

// A wall blocks movement and sight. Cover blocks movement and sight too, but is
// low furniture the thief can slip behind; plants hide a sneaking thief inside them.
export function wall(x, y, w, h) {
  return { x, y, w, h, kind: 'wall' };
}
export function cover(x, y, w, h, type) {
  return { x, y, w, h, kind: 'cover', type };
}
export function plant(x, y, w, h) {
  return { x, y, w, h, kind: 'plant', type: 'plant' };
}

// Levels: name, par seconds, player start, exit rect, relic spots, guard patrols,
// walls, cover and plants. Coordinates are world pixels.
export const LEVELS = [
  {
    name: 'The Ember Gallery',
    par: 75,
    start: { x: 90, y: 620 },
    exit: { x: 1170, y: 60, w: 64, h: 64 },
    relics: [
      { id: 'ember-ruby', name: 'Ember Ruby', x: 640, y: 150 },
      { id: 'gilded-fox', name: 'Gilded Fox', x: 1080, y: 560 },
    ],
    guards: [
      { waypoints: [[420, 180], [420, 520], [760, 520], [760, 180]], speed: 78 },
      { waypoints: [[980, 180], [980, 470], [1120, 470], [1120, 180]], speed: 72 },
      { waypoints: [[240, 330], [640, 330], [640, 430], [240, 430]], speed: 66 },
    ],
    walls: [
      wall(0, 0, 1280, 28), wall(0, 692, 1280, 28), wall(0, 0, 28, 720), wall(1252, 0, 28, 720),
      wall(300, 120, 220, 26), wall(760, 120, 220, 26),
      wall(300, 560, 220, 26), wall(760, 560, 220, 26),
      wall(600, 300, 26, 120),
    ],
    covers: [
      cover(360, 250, 90, 60, 'crate'),
      cover(830, 250, 90, 60, 'case'),
      cover(560, 430, 110, 56, 'statue'),
      cover(940, 380, 80, 80, 'crate'),
      cover(150, 150, 80, 80, 'case'),
    ],
    plants: [
      plant(180, 500, 90, 70),
      plant(1010, 90, 90, 70),
      plant(660, 600, 90, 60),
    ],
  },
  {
    name: 'The Moonlit Hall',
    par: 95,
    start: { x: 90, y: 90 },
    exit: { x: 1170, y: 600, w: 64, h: 64 },
    relics: [
      { id: 'moon-pearl', name: 'Moon Pearl', x: 640, y: 360 },
      { id: 'ember-ruby', name: 'Ember Ruby', x: 200, y: 560 },
      { id: 'silver-owl', name: 'Silver Owl', x: 1120, y: 140 },
    ],
    guards: [
      { waypoints: [[330, 150], [330, 560], [560, 560], [560, 150]], speed: 82 },
      { waypoints: [[760, 150], [1020, 150], [1020, 560], [760, 560]], speed: 80 },
      { waypoints: [[640, 240], [900, 240], [900, 480], [640, 480]], speed: 74 },
      { waypoints: [[180, 330], [460, 330], [460, 430], [180, 430]], speed: 68 },
    ],
    walls: [
      wall(0, 0, 1280, 28), wall(0, 692, 1280, 28), wall(0, 0, 28, 720), wall(1252, 0, 28, 720),
      wall(240, 220, 26, 200), wall(1010, 220, 26, 200),
      wall(480, 120, 320, 26), wall(480, 574, 320, 26),
      wall(620, 300, 26, 120),
    ],
    covers: [
      cover(360, 300, 90, 60, 'statue'),
      cover(830, 430, 90, 60, 'crate'),
      cover(560, 200, 80, 80, 'case'),
      cover(950, 300, 80, 80, 'statue'),
      cover(150, 430, 80, 80, 'crate'),
      cover(700, 500, 110, 56, 'case'),
    ],
    plants: [
      plant(420, 90, 90, 70),
      plant(90, 250, 90, 70),
      plant(1080, 480, 90, 70),
      plant(300, 600, 90, 60),
    ],
  },
  {
    name: 'The Vault of Echoes',
    par: 120,
    start: { x: 640, y: 640 },
    exit: { x: 90, y: 90, w: 64, h: 64 },
    relics: [
      { id: 'crown-of-tides', name: 'Crown of Tides', x: 640, y: 120 },
      { id: 'ember-ruby', name: 'Ember Ruby', x: 160, y: 360 },
      { id: 'moon-pearl', name: 'Moon Pearl', x: 1120, y: 360 },
    ],
    guards: [
      { waypoints: [[300, 160], [300, 560], [560, 560], [560, 160]], speed: 88 },
      { waypoints: [[720, 160], [980, 160], [980, 560], [720, 560]], speed: 86 },
      { waypoints: [[640, 200], [640, 520], [900, 520], [900, 200]], speed: 80 },
      { waypoints: [[200, 280], [480, 280], [480, 440], [200, 440]], speed: 76 },
      { waypoints: [[800, 280], [1080, 280], [1080, 440], [800, 440]], speed: 76 },
    ],
    walls: [
      wall(0, 0, 1280, 28), wall(0, 692, 1280, 28), wall(0, 0, 28, 720), wall(1252, 0, 28, 720),
      wall(420, 120, 26, 180), wall(834, 120, 26, 180),
      wall(420, 420, 26, 180), wall(834, 420, 26, 180),
      wall(560, 330, 160, 26), wall(560, 364, 160, 26),
    ],
    covers: [
      cover(330, 330, 80, 80, 'statue'),
      cover(870, 330, 80, 80, 'statue'),
      cover(600, 180, 80, 80, 'case'),
      cover(600, 460, 80, 80, 'case'),
      cover(220, 120, 90, 60, 'crate'),
      cover(970, 540, 90, 60, 'crate'),
    ],
    plants: [
      plant(500, 90, 90, 70),
      plant(700, 560, 90, 70),
      plant(90, 500, 90, 70),
      plant(1100, 90, 90, 70),
    ],
  },
];
