// Keyboard + mouse input. WASD/arrows move, Shift sneaks, Space or click tosses a
// coin, Q throws a smoke bomb, E interacts, P pauses, M mutes, Enter/Space confirms on menus.
export const ACTION_CONFIRM = 'confirm';
export const ACTION_PAUSE = 'pause';
export const ACTION_MUTE = 'mute';
export const ACTION_RESTART = 'restart';
export const ACTION_COIN = 'coin';
export const ACTION_SMOKE = 'smoke';

const KEY_ACTIONS = {
  Enter: ACTION_CONFIRM,
  ' ': ACTION_CONFIRM,
  p: ACTION_PAUSE,
  P: ACTION_PAUSE,
  Escape: ACTION_PAUSE,
  m: ACTION_MUTE,
  M: ACTION_MUTE,
  r: ACTION_RESTART,
  R: ACTION_RESTART,
  q: ACTION_SMOKE,
  Q: ACTION_SMOKE,
};

export function createInput(canvas) {
  const keys = new Set();
  const pressed = new Set();
  const mouse = { x: 0, y: 0, clicked: false, clickX: 0, clickY: 0 };
  const listeners = [];

  function onKeyDown(event) {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) {
      event.preventDefault();
    }
    if (!event.repeat) pressed.add(event.key);
    keys.add(event.key);
  }
  function onKeyUp(event) {
    keys.delete(event.key);
  }
  function onMouseMove(event) {
    const rect = canvas.getBoundingClientRect();
    mouse.x = event.clientX - rect.left;
    mouse.y = event.clientY - rect.top;
  }
  function onClick(event) {
    onMouseMove(event);
    mouse.clicked = true;
    mouse.clickX = mouse.x;
    mouse.clickY = mouse.y;
  }
  function onBlur() {
    keys.clear();
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('click', onClick);
  listeners.push(['keydown', onKeyDown], ['keyup', onKeyUp], ['blur', onBlur]);

  function moveVector() {
    let x = 0;
    let y = 0;
    if (keys.has('a') || keys.has('A') || keys.has('ArrowLeft')) x -= 1;
    if (keys.has('d') || keys.has('D') || keys.has('ArrowRight')) x += 1;
    if (keys.has('w') || keys.has('W') || keys.has('ArrowUp')) y -= 1;
    if (keys.has('s') || keys.has('S') || keys.has('ArrowDown')) y += 1;
    if (x !== 0 && y !== 0) {
      const len = Math.hypot(x, y);
      x /= len;
      y /= len;
    }
    return { x, y };
  }

  return {
    moveVector,
    sneaking() {
      return keys.has('Shift');
    },
    consumeAction(action) {
      for (const key of [...pressed]) {
        if (KEY_ACTIONS[key] === action) {
          pressed.delete(key);
          return true;
        }
      }
      return false;
    },
    consumeCoinKey() {
      // Space is both confirm and coin: menus consume confirm first.
      if (pressed.has(' ')) {
        pressed.delete(' ');
        return true;
      }
      return false;
    },
    consumeClick() {
      if (!mouse.clicked) return null;
      mouse.clicked = false;
      return { x: mouse.clickX, y: mouse.clickY };
    },
    mouse() {
      return { x: mouse.x, y: mouse.y };
    },
    endFrame() {
      pressed.clear();
      mouse.clicked = false;
    },
    destroy() {
      for (const [type, fn] of listeners) window.removeEventListener(type, fn);
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('click', onClick);
    },
  };
}
