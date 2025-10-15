import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radii, spacing, typography } from '../../theme/tokens';

type PillStatus = 'PAID' | 'DUE' | 'OVERDUE';
type Props = { status?: string };

export default function StatusPill({ status }: Props) {
  const key = String(status || '').toUpperCase() as PillStatus;

  const map: Record<PillStatus, { bg: string; fg: string; label: string }> = {
    PAID:     { bg: colors.pillPaidBg, fg: colors.pillPaidFg, label: 'PAID' },
    DUE:      { bg: colors.pillDueBg,  fg: colors.pillDueFg,  label: 'Due' },
    OVERDUE:  { bg: colors.pillOverBg, fg: colors.pillOverFg, label: 'Overdue' },
  };

  const sty = map[key] ?? { bg: colors.divider, fg: colors.subtext, label: status ?? '—' };

  return (
    <View style={[styles.pill, { backgroundColor: sty.bg }]}>
      <Text style={[typography.small, { color: sty.fg, fontWeight: '700' }]}>{sty.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radii.pill },
});
