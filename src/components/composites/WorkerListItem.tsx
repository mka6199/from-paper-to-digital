import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { spacing } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeProvider';

type Props = {
  name: string;
  role?: string;
  onPress?: () => void;
};

function initials(s?: string) {
  const t = (s || '').trim();
  if (!t) return '?';
  const parts = t.split(/\s+/);
  const a = parts[0]?.[0] || '';
  const b = parts[1]?.[0] || '';
  return (a + b).toUpperCase();
}

export default function WorkerListItem({ name, role, onPress }: Props) {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: colors.card, borderColor: colors.border },
        pressed && { opacity: 0.94 },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`Open worker ${name}`}
    >
      <View
        style={[
          styles.avatar,
          { backgroundColor: colors.brand, borderColor: colors.brand },
        ]}
      >
        <Text style={styles.avatarText}>{initials(name)}</Text>
      </View>

      <View style={{ flex: 1 }}>
        <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
          {name || '—'}
        </Text>
        {!!role && (
          <Text style={[styles.role, { color: colors.subtext }]} numberOfLines={1}>
            {role}
          </Text>
        )}
      </View>

      <Text style={{ color: colors.subtext, fontSize: 18, marginLeft: spacing.sm }}>
        ›
      </Text>
    </Pressable>
  );
}

const AVATAR = 40;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: 16,
    borderWidth: 1,
  },
  avatar: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  avatarText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
  },
  role: {
    fontSize: 14,
    marginTop: 2,
  },
});
