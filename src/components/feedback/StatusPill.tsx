import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radii, spacing, typography } from '../../theme/tokens';

type PillStatus = 'PAID' | 'DUE' | 'OVERDUE';
type Props = { status?: string };

export default function StatusPill({ status }: Props) {
  const key = String(status || '').toUpperCase() as PillStatus;

  const map: Record<PillStatus, { bg: string; fg: string; label: string }> = {
    PAID: { bg: '#E7F7EC', fg: colors.success, label: 'PAID' },
    DUE: { bg: '#FFF4E6', fg: colors.warn, label: 'Due' },
    OVERDUE: { bg: '#FCE8E8', fg: colors.danger, label: 'Overdue' },
  };

  const sty = map[key] ?? { bg: colors.divider, fg: colors.subtext, label: status ?? '—' };

  return (
    <View style={[styles.pill, { backgroundColor: sty.bg }]}>
      <Text style={[typography.small, { color: sty.fg, fontWeight: '700' }]}>
        {sty.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radii.pill },
});
