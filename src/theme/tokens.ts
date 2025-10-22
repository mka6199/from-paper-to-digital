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
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, '2xl': 32 };
export const radii = { sm: 8, md: 12, lg: 16, pill: 999 };
export const typography = {
  h1: { fontSize: 22 as const, fontWeight: '700' as const, color: colors.text },
  h2: { fontSize: 18 as const, fontWeight: '700' as const, color: colors.text },
  body: { fontSize: 16 as const, color: colors.text },
  small: { fontSize: 14 as const, color: colors.subtext },
};
