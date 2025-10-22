import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../../theme/tokens';

type Props = {
  name: string;
  role?: string;
  avatarUrl?: string | null;
  right?: React.ReactNode;
  onPress?: () => void;
};

function initials(name?: string) {
  if (!name) return '';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join('');
}

export default function WorkerListItem({ name, role, avatarUrl, right, onPress }: Props) {
  return (
    <Pressable onPress={onPress} style={styles.row}>
      {avatarUrl ? (
        <View style={[styles.badge, { backgroundColor: colors.card }]} />
      ) : (
        <View style={styles.badge}>
          <Text style={{ color: '#fff', fontWeight: '700' }}>{initials(name)}</Text>
        </View>
      )}

      <View style={{ flex: 1 }}>
        <Text style={typography.h2}>{name}</Text>
        {!!role && <Text style={typography.small}>{role}</Text>}
      </View>
      {right}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
  badge: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.brand,
  },
});
