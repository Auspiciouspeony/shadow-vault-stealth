// Shared constants and the five heist levels of Shadow Vault.
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
  smokePerLevel: 2,
  smokeRange: 90,
  smokeLife: 6,
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

// Security camera tuning: a wall-mounted eye that sweeps its cone. Spotting the
// thief fills its suspicion; a full meter sounds the alarm like a guard's.
export const CAMERA = {
  radius: 10,
  viewRange: 200,
  viewHalfAngle: 0.5,
  suspectRise: 45,
  suspectFall: 30,
};

// A laser tripwire: crossing the beam while it is lit trips the alarm. Beams
// blink on a timer, so the thief times the crossing.
export const LASER = { tripRadius: 13, tripCooldown: 3 };

// A smoke bomb: a grey cloud that blocks sight for a few seconds.
export const SMOKE = { radius: 72, life: 6 };

export const COIN = { radius: 6, attractRadius: 230 };
export const LOOT_VALUE = 100; // dollars per gold pile
export const MAX_STRIKES = 3; // caught this many times and the heist fails

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
    lamps: [
      { x: 640, y: 360 },
      { x: 200, y: 200 },
      { x: 1080, y: 520 },
    ],
    loot: [
      { x: 300, y: 600, value: 100 },
      { x: 980, y: 300, value: 100 },
      { x: 640, y: 600, value: 100 },
    ],
    cameras: [],
    lasers: [],
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
    lamps: [
      { x: 640, y: 360 },
      { x: 200, y: 200 },
      { x: 1080, y: 520 },
      { x: 200, y: 520 },
    ],
    loot: [
      { x: 300, y: 150, value: 100 },
      { x: 980, y: 560, value: 100 },
      { x: 640, y: 170, value: 100 },
      { x: 1120, y: 480, value: 100 },
    ],
    cameras: [],
    lasers: [],
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
    lamps: [
      { x: 640, y: 360 },
      { x: 200, y: 200 },
      { x: 1080, y: 200 },
      { x: 200, y: 520 },
      { x: 1080, y: 520 },
    ],
    loot: [
      { x: 160, y: 120, value: 100 },
      { x: 1120, y: 600, value: 100 },
      { x: 640, y: 600, value: 100 },
      { x: 640, y: 120, value: 100 },
    ],
    cameras: [],
    lasers: [],
  },
  {
    name: 'The Gilded Casino',
    par: 130,
    start: { x: 90, y: 620 },
    exit: { x: 1170, y: 60, w: 64, h: 64 },
    relics: [
      { id: 'golden-idol', name: 'Golden Idol', x: 640, y: 140 },
      { id: 'jade-mask', name: 'Jade Mask', x: 150, y: 330 },
      { id: 'ruby-scepter', name: 'Ruby Scepter', x: 1120, y: 560 },
    ],
    guards: [
      { waypoints: [[330, 180], [330, 520], [520, 520], [520, 180]], speed: 84 },
      { waypoints: [[760, 180], [1000, 180], [1000, 520], [760, 520]], speed: 82 },
      { waypoints: [[700, 240], [980, 240], [980, 470], [700, 470]], speed: 76 },
      { waypoints: [[180, 330], [460, 330], [460, 430], [180, 430]], speed: 70 },
      { waypoints: [[820, 330], [1100, 330], [1100, 430], [820, 430]], speed: 72 },
    ],
    walls: [
      wall(0, 0, 1280, 28), wall(0, 692, 1280, 28), wall(0, 0, 28, 720), wall(1252, 0, 28, 720),
      wall(300, 120, 220, 26), wall(760, 120, 220, 26),
      wall(300, 574, 220, 26), wall(760, 574, 220, 26),
      wall(620, 300, 26, 120),
    ],
    covers: [
      cover(360, 250, 90, 60, 'crate'),
      cover(830, 250, 90, 60, 'case'),
      cover(560, 430, 110, 56, 'statue'),
      cover(1020, 470, 80, 80, 'crate'),
      cover(150, 150, 80, 80, 'case'),
      cover(640, 500, 110, 56, 'case'),
    ],
    plants: [
      plant(180, 500, 90, 70),
      plant(1010, 90, 90, 70),
      plant(660, 600, 90, 60),
      plant(420, 90, 90, 70),
    ],
    lamps: [
      { x: 640, y: 360 },
      { x: 200, y: 200 },
      { x: 1080, y: 200 },
      { x: 200, y: 520 },
      { x: 1080, y: 520 },
    ],
    loot: [
      { x: 300, y: 150, value: 100 },
      { x: 980, y: 150, value: 100 },
      { x: 700, y: 360, value: 100 },
      { x: 200, y: 600, value: 100 },
      { x: 1080, y: 300, value: 100 },
    ],
    cameras: [
      { x: 640, y: 40, base: Math.PI / 2, sweep: 0.7, period: 6, phase: 0, range: 200 },
      { x: 40, y: 360, base: 0, sweep: 0.6, period: 7, phase: 1, range: 200 },
      { x: 1240, y: 360, base: Math.PI, sweep: 0.6, period: 7, phase: 3, range: 200 },
    ],
    lasers: [],
  },
  {
    name: 'The Sky Palace',
    par: 150,
    start: { x: 90, y: 90 },
    exit: { x: 1170, y: 600, w: 64, h: 64 },
    relics: [
      { id: 'star-sapphire', name: 'Star Sapphire', x: 640, y: 360 },
      { id: 'crown-of-tides', name: 'Crown of Tides', x: 200, y: 560 },
      { id: 'moon-pearl', name: 'Moon Pearl', x: 1120, y: 140 },
    ],
    guards: [
      { waypoints: [[300, 160], [300, 560], [380, 560], [380, 160]], speed: 88 },
      { waypoints: [[900, 160], [900, 560], [980, 560], [980, 160]], speed: 86 },
      { waypoints: [[600, 200], [600, 300], [680, 300], [680, 200]], speed: 80 },
      { waypoints: [[600, 420], [600, 520], [680, 520], [680, 420]], speed: 78 },
      { waypoints: [[200, 280], [400, 280], [400, 440], [200, 440]], speed: 76 },
    ],
    walls: [
      wall(0, 0, 1280, 28), wall(0, 692, 1280, 28), wall(0, 0, 28, 720), wall(1252, 0, 28, 720),
      wall(420, 120, 26, 180), wall(834, 120, 26, 180),
      wall(420, 420, 26, 180), wall(834, 420, 26, 180),
      wall(560, 330, 160, 26), wall(560, 364, 160, 26),
    ],
    covers: [
      cover(480, 330, 80, 80, 'statue'),
      cover(1040, 330, 80, 80, 'statue'),
      cover(700, 140, 80, 60, 'case'),
      cover(500, 500, 80, 80, 'case'),
      cover(180, 120, 90, 60, 'crate'),
      cover(1000, 540, 90, 60, 'crate'),
    ],
    plants: [
      plant(500, 90, 90, 70),
      plant(700, 560, 90, 70),
      plant(90, 500, 90, 70),
      plant(1100, 90, 90, 70),
    ],
    lamps: [
      { x: 640, y: 360 },
      { x: 200, y: 200 },
      { x: 1080, y: 200 },
      { x: 200, y: 520 },
      { x: 1080, y: 520 },
    ],
    loot: [
      { x: 300, y: 600, value: 100 },
      { x: 980, y: 600, value: 100 },
      { x: 640, y: 120, value: 100 },
      { x: 120, y: 360, value: 100 },
      { x: 1160, y: 360, value: 100 },
    ],
    cameras: [
      { x: 640, y: 40, base: Math.PI / 2, sweep: 0.8, period: 5, phase: 0, range: 210 },
      { x: 40, y: 360, base: 0, sweep: 0.6, period: 7, phase: 1, range: 200 },
      { x: 1240, y: 360, base: Math.PI, sweep: 0.6, period: 7, phase: 3, range: 200 },
    ],
    lasers: [
      { x1: 470, y1: 330, x2: 810, y2: 330, period: 4, onFrac: 0.6, offset: 0, lastTrip: -999 },
      { x1: 470, y1: 390, x2: 810, y2: 390, period: 4, onFrac: 0.6, offset: 2, lastTrip: -999 },
      { x1: 1100, y1: 540, x2: 1100, y2: 660, period: 5, onFrac: 0.5, offset: 0.5, lastTrip: -999 },
    ],
  },
];
