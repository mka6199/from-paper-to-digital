import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { spacing, typography } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeProvider';
import StatusPill from '../feedback/StatusPill';
import Money from '../Money';

type Props = {
  name: string;
  role?: string;
  onPress?: () => void;

  /** Optional extras (safe to omit) */
  employeeId?: string;           // e.g., "WK-000123"
  monthlySalaryAED?: number;     // shows at right if provided
  dueAtMs?: number;              // next salary due timestamp (ms) -> renders DUE/OVERDUE pill
};

export default function WorkerListItem(props: Props) {
  const { colors } = useTheme();
  const { name, role, onPress, employeeId, monthlySalaryAED, dueAtMs } = props;

  const initials = (name || '')
    .split(' ')
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const status = React.useMemo<'DUE' | 'OVERDUE' | undefined>(() => {
    if (!dueAtMs) return undefined;
    const now = Date.now();
    if (dueAtMs < now) return 'OVERDUE';
    const week = 7 * 24 * 60 * 60 * 1000;
    return dueAtMs - now <= week ? 'DUE' : undefined;
  }, [dueAtMs]);

  const showMoney =
    Number.isFinite(Number(monthlySalaryAED)) && Number(monthlySalaryAED) > 0;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, { opacity: pressed ? 0.95 : 1 }]}
    >
      {/* Avatar */}
      <View style={[styles.avatar, { backgroundColor: colors.brand }]}>
        <Text style={styles.avatarText}>{initials || 'W'}</Text>
      </View>

      {/* Main text */}
      <View style={{ flex: 1 }}>
        <Text
          style={[styles.name, { color: colors.text }]}
          numberOfLines={1}
        >
          {name}
        </Text>
        {!!role && (
          <Text style={[styles.role, { color: colors.subtext }]} numberOfLines={1}>
            {role}
          </Text>
        )}
        {!!employeeId && (
          <Text style={[styles.eid, { color: colors.subtext }]} numberOfLines={1}>
            ID: {employeeId}
          </Text>
        )}
      </View>

      {/* Right side: status + salary */}
      <View style={{ alignItems: 'flex-end', gap: 6, marginLeft: spacing.md }}>
        {status ? <StatusPill status={status} /> : null}
        {showMoney ? (
          <Money
            amountAED={Number(monthlySalaryAED)}
            style={[typography.small, { color: colors.text }]}
          />
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
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
  eid: {
    fontSize: 12,
    marginTop: 2,
    opacity: 0.75,
  },
});
