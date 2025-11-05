import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Card from './primitives/Card'; // adjust path if needed
import { spacing } from '../theme/tokens';
import { useCurrency } from '../context/CurrencyProvider';
import { useTheme } from '../theme/ThemeProvider';

export default function CurrencyPicker() {
  const { colors } = useTheme();
  const { currency, supported, setCurrency, format } = useCurrency();

  const previewAED = 100;

  const styles = React.useMemo(
    () =>
      StyleSheet.create({
        card: {
          padding: spacing.lg,
          gap: spacing.md,
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: 16,
        },
        title: { fontSize: 18, fontWeight: '700', color: colors.text },
        row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
        chip: {
          paddingVertical: 8,
          paddingHorizontal: 12,
          borderRadius: 999,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.card,
        },
        chipActive: {
          borderColor: colors.focus,
          backgroundColor: `${colors.focus}22`,
        },
        chipText: { color: colors.text, fontSize: 14, fontWeight: '600' },
        sub: { color: colors.subtext, fontSize: 14 },
      }),
    [colors]
  );

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>Currency</Text>
      <Text style={styles.sub}>
        Preview: 100 AED → {format(previewAED)}
      </Text>
      <View style={styles.row}>
        {supported.map((c) => (
          <Pressable
            key={c}
            onPress={() => setCurrency(c)}
            style={[styles.chip, c === currency && styles.chipActive]}
            accessibilityRole="button"
            accessibilityLabel={`Choose ${c}`}
          >
            <Text style={styles.chipText}>{c}</Text>
          </Pressable>
        ))}
      </View>
    </Card>
  );
}
