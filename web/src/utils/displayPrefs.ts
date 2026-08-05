import { useEffect, useState } from 'react';

export type TextScale = 'sm' | 'md' | 'lg' | 'xl';
export type Density   = 'compact' | 'cozy' | 'comfortable';

export interface DisplayPrefs {
  textScale: TextScale;
  density: Density;
  cvdSafe: boolean;
  /** Custom accent hex (e.g. "#7c3aed"); when set, overrides route + org accent. */
  customAccent: string | null;
}

const STORAGE_KEY = 'rp-display-prefs';

const DEFAULTS: DisplayPrefs = {
  textScale:    'md',
  density:      'compact',
  cvdSafe:      false,
  customAccent: null,
};

type Listener = (prefs: DisplayPrefs) => void;
let prefs: DisplayPrefs = readPersisted();
const listeners = new Set<Listener>();

function readPersisted(): DisplayPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw);
    return {
      textScale:    (['sm','md','lg','xl'] as TextScale[]).includes(parsed?.textScale) ? parsed.textScale : DEFAULTS.textScale,
      density:      (['compact','cozy','comfortable'] as Density[]).includes(parsed?.density) ? parsed.density : DEFAULTS.density,
      cvdSafe:      typeof parsed?.cvdSafe === 'boolean' ? parsed.cvdSafe : DEFAULTS.cvdSafe,
      customAccent: typeof parsed?.customAccent === 'string' && /^#[0-9a-f]{6}$/i.test(parsed.customAccent)
        ? parsed.customAccent : DEFAULTS.customAccent,
    };
  } catch { return { ...DEFAULTS }; }
}

function persist(): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs)); } catch {}
}
function emit(): void {
  const snap = { ...prefs };
  listeners.forEach(l => l(snap));
}

export const displayPrefs = {
  get(): DisplayPrefs { return { ...prefs }; },
  setTextScale(v: TextScale): void { if (prefs.textScale === v) return; prefs = { ...prefs, textScale: v }; persist(); emit(); },
  setDensity(v: Density):     void { if (prefs.density   === v) return; prefs = { ...prefs, density:   v }; persist(); emit(); },
  setCvdSafe(v: boolean):     void { if (prefs.cvdSafe   === v) return; prefs = { ...prefs, cvdSafe:   v }; persist(); emit(); },
  setCustomAccent(v: string | null): void {
    const next = v && /^#[0-9a-f]{6}$/i.test(v) ? v : null;
    if (prefs.customAccent === next) return;
    prefs = { ...prefs, customAccent: next };
    persist();
    emit();
  },
  reset(): void { prefs = { ...DEFAULTS }; persist(); emit(); },
  subscribe(fn: Listener): () => void {
    listeners.add(fn);
    fn({ ...prefs });
    return () => { listeners.delete(fn); };
  },
};

export function useDisplayPrefs(): DisplayPrefs {
  const [v, setV] = useState<DisplayPrefs>(() => displayPrefs.get());
  useEffect(() => displayPrefs.subscribe(setV), []);
  return v;
}
