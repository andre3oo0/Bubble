// Ambient sounds generated with the Web Audio API: no audio files to host, license
// or download, and they keep working offline. Each scene is shaped noise plus a few
// scheduled details (waves, birdsong, fire crackle).

export type SoundId = 'ocean' | 'forest' | 'sunset' | 'bedroom' | 'breathing';

type NoiseColor = 'white' | 'pink' | 'brown';
type Teardown = () => void;
type SoundBuilder = (ctx: AudioContext, out: AudioNode) => Teardown;

const FADE_SECONDS = 1.2;

const bufferCache = new WeakMap<AudioContext, Map<NoiseColor, AudioBuffer>>();

function noiseBuffer(ctx: AudioContext, color: NoiseColor): AudioBuffer {
  let cache = bufferCache.get(ctx);
  if (!cache) bufferCache.set(ctx, (cache = new Map()));
  const cached = cache.get(color);
  if (cached) return cached;

  const length = ctx.sampleRate * 4;
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0;

  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1;
    if (color === 'white') {
      data[i] = white;
    } else if (color === 'pink') {
      // Paul Kellet's refined pink noise filter
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.969 * b2 + white * 0.153852;
      b3 = 0.8665 * b3 + white * 0.3104856;
      b4 = 0.55 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.016898;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    } else {
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.5;
    }
  }

  cache.set(color, buffer);
  return buffer;
}

function loopedNoise(ctx: AudioContext, color: NoiseColor) {
  const source = ctx.createBufferSource();
  source.buffer = noiseBuffer(ctx, color);
  source.loop = true;
  return source;
}

function filter(ctx: AudioContext, type: BiquadFilterType, frequency: number, q = 0.7) {
  const node = ctx.createBiquadFilter();
  node.type = type;
  node.frequency.value = frequency;
  node.Q.value = q;
  return node;
}

function gain(ctx: AudioContext, value: number) {
  const node = ctx.createGain();
  node.gain.value = value;
  return node;
}

// Slow wobble on a parameter, e.g. the swell of waves
function lfo(ctx: AudioContext, frequency: number, depth: number, target: AudioParam) {
  const osc = ctx.createOscillator();
  osc.frequency.value = frequency;
  osc.connect(gain(ctx, depth)).connect(target);
  osc.start();
  return osc;
}

const sounds: Record<SoundId, SoundBuilder> = {
  ocean: (ctx, out) => {
    const surf = loopedNoise(ctx, 'brown');
    const tone = filter(ctx, 'lowpass', 600);
    const swell = gain(ctx, 0.55);
    surf.connect(tone).connect(swell).connect(out);
    const waves = lfo(ctx, 0.09, 0.35, swell.gain); // a wave roughly every 11 seconds
    const crest = lfo(ctx, 0.09, 250, tone.frequency); // brighter as each wave breaks
    surf.start();
    return () => [surf, waves, crest].forEach((n) => n.stop());
  },

  forest: (ctx, out) => {
    const wind = loopedNoise(ctx, 'pink');
    const leaves = filter(ctx, 'bandpass', 900);
    const level = gain(ctx, 0.18);
    wind.connect(leaves).connect(level).connect(out);
    const gusts = lfo(ctx, 0.07, 0.08, level.gain);
    const rustle = lfo(ctx, 0.03, 300, leaves.frequency);
    wind.start();

    let timer: ReturnType<typeof setTimeout>;
    const birdCall = () => {
      const start = ctx.currentTime + 0.05;
      const pitch = 2200 + Math.random() * 1800;
      const notes = 2 + Math.floor(Math.random() * 3);
      for (let i = 0; i < notes; i++) {
        const t = start + i * 0.14;
        const osc = ctx.createOscillator();
        const env = gain(ctx, 0);
        osc.frequency.setValueAtTime(pitch, t);
        osc.frequency.exponentialRampToValueAtTime(pitch * 1.35, t + 0.08);
        env.gain.setValueAtTime(0, t);
        env.gain.linearRampToValueAtTime(0.05, t + 0.01);
        env.gain.exponentialRampToValueAtTime(0.0001, t + 0.11);
        osc.connect(env).connect(out);
        osc.start(t);
        osc.stop(t + 0.13);
      }
      timer = setTimeout(birdCall, 2500 + Math.random() * 6000);
    };
    timer = setTimeout(birdCall, 1500);

    return () => {
      clearTimeout(timer);
      [wind, gusts, rustle].forEach((n) => n.stop());
    };
  },

  sunset: (ctx, out) => {
    const air = loopedNoise(ctx, 'pink');
    const band = filter(ctx, 'bandpass', 500, 1.2);
    const level = gain(ctx, 0.25);
    air.connect(band).connect(level).connect(out);
    const sweep = lfo(ctx, 0.06, 250, band.frequency);
    const breeze = lfo(ctx, 0.11, 0.1, level.gain);
    air.start();
    return () => [air, sweep, breeze].forEach((n) => n.stop());
  },

  bedroom: (ctx, out) => {
    const rumble = loopedNoise(ctx, 'brown');
    rumble.connect(filter(ctx, 'lowpass', 250)).connect(gain(ctx, 0.35)).connect(out);
    rumble.start();

    // Fire crackle: short random bursts of bright noise
    const crackleBuffer = noiseBuffer(ctx, 'white');
    const interval = setInterval(() => {
      if (Math.random() > 0.25) return;
      const t = ctx.currentTime + Math.random() * 0.04;
      const pop = ctx.createBufferSource();
      pop.buffer = crackleBuffer;
      const env = gain(ctx, 0);
      const peak = 0.05 + Math.random() * 0.2;
      const decay = 0.02 + Math.random() * 0.04;
      env.gain.setValueAtTime(peak, t);
      env.gain.exponentialRampToValueAtTime(0.0001, t + decay);
      pop.connect(filter(ctx, 'highpass', 1500 + Math.random() * 2500)).connect(env).connect(out);
      pop.start(t, Math.random() * 3, decay + 0.01);
    }, 40);

    return () => {
      clearInterval(interval);
      rumble.stop();
    };
  },

  // Soft chord that swells once per 12-second 4-2-4-2 breathing round
  breathing: (ctx, out) => {
    const level = gain(ctx, 0.08);
    level.connect(out);
    const tones = [174.61, 261.63].map((frequency) => {
      const osc = ctx.createOscillator();
      osc.frequency.value = frequency;
      osc.connect(level);
      osc.start();
      return osc;
    });
    const swell = lfo(ctx, 1 / 12, 0.04, level.gain);
    return () => [...tones, swell].forEach((n) => n.stop());
  },
};

class AmbientAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private volume = 0.35;
  private stopCurrent: (() => void) | null = null;

  // Created on first play, since browsers only allow audio after a user gesture
  private getContext() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return null;
      this.ctx = new AudioContextClass();
      this.master = gain(this.ctx, this.volume);
      this.master.connect(this.ctx.destination);
    }
    return this.ctx;
  }

  async play(id: SoundId): Promise<boolean> {
    const ctx = this.getContext();
    if (!ctx || !this.master) return false;
    if (ctx.state === 'suspended') await ctx.resume();

    this.stop();
    const bus = gain(ctx, 0);
    bus.gain.linearRampToValueAtTime(1, ctx.currentTime + FADE_SECONDS);
    bus.connect(this.master);
    const teardown = sounds[id](ctx, bus);

    this.stopCurrent = () => {
      const now = ctx.currentTime;
      bus.gain.cancelScheduledValues(now);
      bus.gain.setValueAtTime(bus.gain.value, now);
      bus.gain.linearRampToValueAtTime(0, now + FADE_SECONDS);
      setTimeout(() => {
        teardown();
        bus.disconnect();
      }, FADE_SECONDS * 1000 + 100);
    };
    return true;
  }

  stop() {
    this.stopCurrent?.();
    this.stopCurrent = null;
  }

  setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.ctx && this.master) {
      this.master.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.1);
    }
  }
}

const audioHandler = new AmbientAudio();
export default audioHandler;
