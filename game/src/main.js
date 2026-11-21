// Boot and the one loop: input is read every frame, the world advances in fixed
// 1/60 s steps, and the renderer paints what is there. The game moves between
// title, briefing, play, paused, level-clear, caught and win screens.
//
// ?seed=N fixes the guard patrols. ?shot=start|play|alert|end (with &seed=N)
// stages that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.
import { BEST_KEY, LEVELS, STEP } from './config.js';
import { createRandom } from './random.js';
import {
  EVENT_ALARM,
  EVENT_CAUGHT,
  EVENT_COIN,
  EVENT_LEVEL_CLEAR,
  EVENT_NOISE,
  EVENT_PICKUP,
  EVENT_SPOTTED,
  SCREEN_BRIEF,
  SCREEN_CAUGHT,
  SCREEN_LEVEL_DONE,
  SCREEN_PAUSED,
  SCREEN_PLAY,
  SCREEN_TITLE,
  SCREEN_WIN,
  createWorld,
  stepWorld,
  throwCoin,
} from './world.js';
import { ACTION_CONFIRM, ACTION_MUTE, ACTION_PAUSE, ACTION_RESTART, createInput } from './input.js';
import { createAudio } from './audio.js';
import { createRenderer } from './render.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;
const SHOT_LEVEL = { start: 0, play: 1, alert: 2, end: 2 };

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const renderer = createRenderer(canvas);
const audio = createAudio();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function makeWorld(levelIndex) {
  const world = createWorld(levelIndex, createRandom(seed + levelIndex * 7919));
  world.state.best = readBest();
  return world;
}

function runShot(name) {
  const levelIndex = SHOT_LEVEL[name] ?? 0;
  const world = makeWorld(levelIndex);
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else {
      window.__shotReady = true;
      document.documentElement.setAttribute('data-shot-ready', 'true');
    }
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let world = makeWorld(0);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();
  let lastStepX = 0;
  let lastStepY = 0;
  let strideAcc = 0;

  function announce(message) {
    status.textContent = message;
  }

  function startLevel(levelIndex) {
    world = makeWorld(levelIndex);
    world.state.best = best;
    screen = SCREEN_BRIEF;
    announce(`${LEVELS[levelIndex].name}. Steal every relic, then reach the exit.`);
  }

  function handleEvents(events) {
    const state = world.state;
    if (events & EVENT_PICKUP) {
      audio.pickup();
      const taken = state.relics.filter((r) => r.taken).pop();
      state.message = taken ? `${taken.name} taken!` : 'Relic taken!';
      state.messageTime = state.time;
      announce(state.message);
    }
    if (events & EVENT_SPOTTED) {
      audio.spotted();
      state.message = 'Spotted! Break line of sight!';
      state.messageTime = state.time;
    }
    if (events & EVENT_ALARM) {
      audio.alarm();
      state.message = 'ALARM! Run and hide!';
      state.messageTime = state.time;
      announce('Alarm! The wardens are chasing you.');
    }
    if (events & EVENT_NOISE) {
      state.message = 'They heard that...';
      state.messageTime = state.time;
    }
    if (events & EVENT_COIN) {
      audio.coinLand();
    }
    if (events & EVENT_CAUGHT) {
      audio.caught();
      screen = SCREEN_CAUGHT;
      announce('Caught! Press R to try the gallery again.');
    }
    if (events & EVENT_LEVEL_CLEAR) {
      audio.levelClear();
      if (world.state.levelIndex >= LEVELS.length - 1) {
        audio.win();
        best = Math.max(best, state.score);
        saveBest(best);
        state.best = best;
        screen = SCREEN_WIN;
        announce(`You cleared every gallery! Final score ${state.score}.`);
      } else {
        screen = SCREEN_LEVEL_DONE;
        announce(`Gallery cleared! Score ${state.score}. Press Enter for the next gallery.`);
      }
    }
  }

  function frame(now) {
    const delta = Math.min(MAX_FRAME, (now - last) / 1000);
    last = now;
    const state = world.state;

    if (state.message && state.time - state.messageTime > 2.5) state.message = '';

    if (input.consumeAction(ACTION_MUTE)) {
      const muted = audio.toggleMute();
      state.message = muted ? 'Sound off' : 'Sound on';
      state.messageTime = state.time;
    }

    if (screen === SCREEN_TITLE) {
      if (input.consumeAction(ACTION_CONFIRM) || input.consumeClick()) {
        audio.unlock();
        audio.click();
        startLevel(0);
      }
    } else if (screen === SCREEN_BRIEF) {
      if (input.consumeAction(ACTION_CONFIRM) || input.consumeClick()) {
        audio.click();
        screen = SCREEN_PLAY;
        announce('Playing. Stay out of the cones.');
      }
    } else if (screen === SCREEN_PLAY) {
      if (input.consumeAction(ACTION_PAUSE)) {
        screen = SCREEN_PAUSED;
      } else {
        const click = input.consumeClick();
        if (click) {
          const target = renderer.toWorld(click.x, click.y);
          if (throwCoin(world, target.x, target.y)) {
            audio.coin();
            state.message = 'Coin tossed — a warden will look.';
            state.messageTime = state.time;
          }
        } else if (input.consumeCoinKey()) {
          const target = { x: state.player.x + Math.cos(state.player.dir) * 120, y: state.player.y + Math.sin(state.player.dir) * 120 };
          if (throwCoin(world, target.x, target.y)) audio.coin();
        }
        const move = input.moveVector();
        const sneaking = input.sneaking();
        accumulator += delta;
        while (accumulator >= STEP) {
          accumulator -= STEP;
          const events = stepWorld(world, move, sneaking);
          handleEvents(events);
          if (screen !== SCREEN_PLAY) break;
        }
        // Footsteps: one soft tick per stride of travel.
        const moved = Math.hypot(state.player.x - lastStepX, state.player.y - lastStepY);
        strideAcc += moved;
        lastStepX = state.player.x;
        lastStepY = state.player.y;
        if (state.player.moving && strideAcc > 34) {
          audio.footstep(state.player.sneaking);
          strideAcc = 0;
        }
      }
    } else if (screen === SCREEN_PAUSED) {
      if (input.consumeAction(ACTION_PAUSE)) screen = SCREEN_PLAY;
      else if (input.consumeAction(ACTION_RESTART)) startLevel(world.state.levelIndex);
    } else if (screen === SCREEN_LEVEL_DONE) {
      if (input.consumeAction(ACTION_CONFIRM) || input.consumeClick()) {
        audio.click();
        startLevel(world.state.levelIndex + 1);
      }
    } else if (screen === SCREEN_CAUGHT) {
      if (input.consumeAction(ACTION_RESTART) || input.consumeAction(ACTION_CONFIRM)) {
        audio.click();
        startLevel(world.state.levelIndex);
      }
    } else if (screen === SCREEN_WIN) {
      if (input.consumeAction(ACTION_CONFIRM) || input.consumeClick()) {
        audio.click();
        startLevel(0);
      }
    }

    renderer.draw(world.state, screen);
    input.endFrame();
    requestAnimationFrame(frame);
  }

  announce('Shadow Vault. Press Enter to begin.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
