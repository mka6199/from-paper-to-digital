export const colors = {
  bg: '#F8F5EF',
  card: '#FFFFFF',
  text: '#111827',
  subtext: '#6B7280',
  divider: '#E5E7EB',

  brand: '#166534',
  brandPressed: '#14532D',

  secondary: '#E5E7EB',
  secondaryPressed: '#D1D5DB',

  danger: '#B91C1C',
  dangerPressed: '#7F1D1D',

  success: '#15803D',
  warn: '#92400E',

  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },

  focus: '#2563EB',

  primary: '#166534',
  primaryPressed: '#14532D',

  background: '#F8F5EF', 
  surface: '#FFFFFF',    
  border: '#E5E7EB',

  neutral100: '#F9FAFB',
  neutral200: '#E5E7EB',
  neutral300: '#D1D5DB',
  neutral700: '#374151',
  neutral800: '#1F2937',
  neutral900: '#111827',
};

export const colorsDark = {
  background: '#0B0F12', 
  surface: '#11161A',    
  surfaceElevated: '#171D22',

  text: '#E5E7EB',
  subtext: '#9CA3AF',

  border: '#27323A',
  divider: '#27323A',

  brand: '#22C55E',        
  brandPressed: '#16A34A',

  danger: '#EF4444',
  dangerPressed: '#B91C1C',

  success: '#22C55E',
  warn: '#F59E0B',
  focus: '#60A5FA',

  bg: '#0B0F12',
  card: '#11161A',
  primary: '#22C55E',
  primaryPressed: '#16A34A',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,
};

export const spacingCompact = {
  xs: 3,
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  '2xl': 28,
};

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
  xl: 20,
};

export const typography = {
  h1: { fontSize: 22 as const, fontWeight: '700' as const, color: colors.text },
  h2: { fontSize: 18 as const, fontWeight: '700' as const, color: colors.text },
  body: { fontSize: 16 as const, color: colors.text },
  small: { fontSize: 14 as const, color: colors.subtext },
};
