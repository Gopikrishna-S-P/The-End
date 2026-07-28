// Ported 1:1 from the web app's brand tokens (web/DESIGN_SYSTEM.md,
// web/src/styles/design-tokens.css) so the mobile app reads as the same
// product: warm-stone neutrals + the shared accent green, flipping the same
// way in dark mode.

export const LightColors = {
  canvas: '#FAFAF9',
  surface: '#FFFFFF',
  subtle: '#F5F5F4',
  border: '#E7E5E4',
  borderStrong: '#D6D3D1',
  ink1: '#0C0A09',
  ink2: '#57534E',
  ink3: '#A8A29E',
  accent: '#0AA550',
  accentHover: '#088A42',
  accentSubtle: 'rgba(10,165,80,0.10)',
  success: '#15803D',
  successSubtle: 'rgba(21,128,61,0.08)',
  error: '#B91C1C',
  errorSubtle: '#FEF2F2',
  warnBg: '#FFFBEB',
  warnBorder: '#F59E0B',
  warnInk: '#92400E',
  white: '#FFFFFF',
  overlay: 'rgba(12,10,9,0.5)',
};

export const DarkColors = {
  canvas: '#0C0A09',
  surface: '#111110',
  subtle: '#1C1A19',
  border: '#282624',
  borderStrong: '#3A3633',
  ink1: '#FAFAF9',
  ink2: '#A8A29E',
  ink3: '#57534E',
  accent: '#22C55E',
  accentHover: '#4ADE80',
  accentSubtle: 'rgba(34,197,94,0.12)',
  success: '#22C55E',
  successSubtle: 'rgba(34,197,94,0.10)',
  error: '#EF4444',
  errorSubtle: '#1F1315',
  warnBg: '#1F1B0F',
  warnBorder: '#F59E0B',
  warnInk: '#FBBF24',
  white: '#FFFFFF',
  overlay: 'rgba(0,0,0,0.6)',
};

export type ThemeColors = typeof LightColors;

// 8px grid, matches --rp-s1..s6
export const Spacing = { s1: 4, s2: 8, s3: 12, s4: 16, s5: 24, s6: 32, s7: 40, s8: 48 } as const;

export const Radius = { sm: 4, md: 8, lg: 12, xl: 16, pill: 999 } as const;

export const FontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

export const Type = {
  title: { fontSize: 24, lineHeight: 30, fontWeight: FontWeight.bold },
  headline: { fontSize: 18, lineHeight: 24, fontWeight: FontWeight.semibold },
  body: { fontSize: 15, lineHeight: 22, fontWeight: FontWeight.regular },
  bodyMedium: { fontSize: 15, lineHeight: 22, fontWeight: FontWeight.medium },
  label: { fontSize: 13, lineHeight: 18, fontWeight: FontWeight.medium },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: FontWeight.regular },
  eyebrow: { fontSize: 11, lineHeight: 14, fontWeight: FontWeight.semibold, letterSpacing: 0.6 },
} as const;

export const Shadow = {
  sm: { shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  md: { shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  lg: { shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 6 },
} as const;
