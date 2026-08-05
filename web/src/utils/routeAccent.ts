export interface RouteAccent {
  accent: string;
  accentHover: string;
  accentSubtle: string;
  label: string;
}

const RECOVERPRO_GREEN: RouteAccent = {
  accent:        '#0AA550',
  accentHover:   '#088a42',
  accentSubtle:  'rgba(10,165,80,.10)',
  label:         'green',
};

export function getRouteAccent(_pathname: string): RouteAccent {
  return RECOVERPRO_GREEN;
}

export function makeAccentFromHex(hex: string): RouteAccent | null {
  const m = hex.replace('#', '').trim();
  if (!/^([0-9a-f]{3}|[0-9a-f]{6})$/i.test(m)) return null;
  const full = m.length === 3 ? m.split('').map(c => c + c).join('') : m;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  const darken = (c: number) => Math.max(0, Math.round(c * 0.84));
  const toHex = (c: number) => c.toString(16).padStart(2, '0');
  const hoverHex = `#${toHex(darken(r))}${toHex(darken(g))}${toHex(darken(b))}`;
  return {
    accent:       `#${full}`,
    accentHover:  hoverHex,
    accentSubtle: `rgba(${r},${g},${b},0.10)`,
    label:        'custom',
  };
}

export function applyAccent(el: HTMLElement, accent: RouteAccent): void {
  el.style.setProperty('--accent',         accent.accent);
  el.style.setProperty('--accent-hover',   accent.accentHover);
  el.style.setProperty('--accent-subtle',  accent.accentSubtle);
  el.setAttribute('data-accent', accent.label);
}
