export type SoundName =
  | 'click'      // generic button tap
  | 'navigate'   // route change / link
  | 'toggle'     // switch / mode flip
  | 'open'       // panel / dropdown open
  | 'close'      // panel / dropdown close
  | 'success'   // completion / milestone
  | 'error'     // validation failure
  | 'pop';       // small confirm/dismiss

interface SoundConfig {
  freq: number;
  durMs: number;
  gain: number;
  waveform: OscillatorType;
  /** Optional frequency target — exponentially ramps to it over the duration. */
  sweepTo?: number;
}

const BANK: Record<SoundName, SoundConfig> = {
  click:    { freq: 880, durMs:  60, gain: 0.035, waveform: 'sine'     },
  navigate: { freq: 540, durMs: 110, gain: 0.04,  waveform: 'sine',     sweepTo: 880   },
  toggle:   { freq: 620, durMs:  55, gain: 0.035, waveform: 'triangle' },
  open:     { freq: 480, durMs: 100, gain: 0.04,  waveform: 'sine',     sweepTo: 720   },
  close:    { freq: 720, durMs: 100, gain: 0.04,  waveform: 'sine',     sweepTo: 480   },
  success:  { freq: 660, durMs: 220, gain: 0.05,  waveform: 'sine',     sweepTo: 1320  },
  error:    { freq: 260, durMs: 180, gain: 0.06,  waveform: 'square',   sweepTo: 180   },
  pop:      { freq: 980, durMs:  45, gain: 0.03,  waveform: 'sine'     },
};

const STORAGE_KEY = 'rp-sounds-enabled';

let ctx: AudioContext | null = null;
let enabled = readPersisted();

function readPersisted(): boolean {
  try { return localStorage.getItem(STORAGE_KEY) === 'true'; }
  catch { return false; }
}

function persist(): void {
  try { localStorage.setItem(STORAGE_KEY, String(enabled)); } catch {}
}

export const sounds = {
  isEnabled(): boolean {
    return enabled;
  },

  setEnabled(on: boolean): void {
    enabled = on;
    persist();
  },

  /** Play a named sound. Silent when disabled or audio unsupported. */
  play(name: SoundName): void {
    if (!enabled) return;
    try {
      if (!ctx) {
        const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!Ctor) return;
        ctx = new Ctor();
      }
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});

      const cfg = BANK[name];
      const t0 = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gn  = ctx.createGain();

      osc.type = cfg.waveform;
      osc.frequency.setValueAtTime(cfg.freq, t0);
      if (cfg.sweepTo) {
        osc.frequency.exponentialRampToValueAtTime(cfg.sweepTo, t0 + cfg.durMs / 1000);
      }
      gn.gain.setValueAtTime(0.0001, t0);
      gn.gain.exponentialRampToValueAtTime(cfg.gain, t0 + 0.006);
      gn.gain.exponentialRampToValueAtTime(0.0001, t0 + cfg.durMs / 1000);

      osc.connect(gn).connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + cfg.durMs / 1000 + 0.02);
    } catch { /* swallow — sound is non-essential */ }
  },
};

declare global {
  interface Window { rpSounds?: typeof sounds; }
}
if (typeof window !== 'undefined') {
  window.rpSounds = sounds;
}
