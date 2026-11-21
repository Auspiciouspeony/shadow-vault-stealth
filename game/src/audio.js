// Synthesized sounds only (WebAudio, no audio files): footsteps, coin clinks,
// pickup chimes, the alert sting and the win arpeggio. Everything is lazy and
// guarded so a headless screenshot run never fails on audio.
export function createAudio() {
  let context = null;
  let muted = false;
  let stepFlip = false;

  function ensure() {
    if (context) return context;
    try {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return null;
      context = new Ctor();
    } catch {
      return null;
    }
    return context;
  }

  function tone(freq, seconds, type, gainValue, when = 0, slideTo = null) {
    const ctx = ensure();
    if (!ctx || muted) return;
    try {
      if (ctx.state === 'suspended') void ctx.resume();
      const start = ctx.currentTime + when;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, start);
      if (slideTo !== null) osc.frequency.exponentialRampToValueAtTime(slideTo, start + seconds);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(gainValue, start + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + seconds);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + seconds + 0.05);
    } catch {
      // Audio is decoration; a failure never stops the game.
    }
  }

  function noiseBurst(seconds, gainValue, lowpass) {
    const ctx = ensure();
    if (!ctx || muted) return;
    try {
      if (ctx.state === 'suspended') void ctx.resume();
      const start = ctx.currentTime;
      const length = Math.max(1, Math.floor(ctx.sampleRate * seconds));
      const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = lowpass;
      const gain = ctx.createGain();
      gain.gain.value = gainValue;
      source.connect(filter).connect(gain).connect(ctx.destination);
      source.start(start);
    } catch {
      // Ignore audio failures.
    }
  }

  return {
    unlock() {
      ensure();
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    isMuted() {
      return muted;
    },
    footstep(sneaking) {
      stepFlip = !stepFlip;
      if (sneaking) noiseBurst(0.05, 0.03, 500);
      else tone(stepFlip ? 150 : 120, 0.06, 'triangle', 0.05);
    },
    coin() {
      tone(1900, 0.09, 'sine', 0.08);
      tone(2500, 0.14, 'sine', 0.06, 0.07);
    },
    coinLand() {
      noiseBurst(0.08, 0.12, 3000);
      tone(1300, 0.1, 'sine', 0.05, 0.02);
    },
    pickup() {
      tone(660, 0.12, 'sine', 0.09);
      tone(990, 0.2, 'sine', 0.09, 0.09);
    },
    spotted() {
      tone(220, 0.35, 'sawtooth', 0.1, 0, 440);
      tone(110, 0.4, 'square', 0.05, 0.05, 220);
    },
    alarm() {
      tone(520, 0.16, 'square', 0.07);
      tone(392, 0.16, 'square', 0.07, 0.18);
      tone(520, 0.16, 'square', 0.07, 0.36);
    },
    caught() {
      tone(330, 0.5, 'sawtooth', 0.1, 0, 82);
    },
    levelClear() {
      [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, 'triangle', 0.08, i * 0.11));
    },
    win() {
      [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => tone(f, 0.3, 'triangle', 0.08, i * 0.13));
    },
    click() {
      tone(800, 0.05, 'sine', 0.05);
    },
  };
}
