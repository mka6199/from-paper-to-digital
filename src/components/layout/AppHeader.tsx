import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { spacing, typography } from '../../theme/tokens';

type Props = {
  title?: string;
  subtitle?: string;
  onBack?: () => void;
  right?: React.ReactNode;
};

export default function AppHeader({ title, subtitle, onBack, right }: Props) {
  return (
    <View style={{ marginBottom: spacing.lg, flexDirection: 'row', alignItems: 'center' }}>
      {onBack ? (
        <TouchableOpacity onPress={onBack} style={{ marginRight: spacing.md }}>
          <Text style={typography.small}>← Back</Text>
        </TouchableOpacity>
      ) : null}

      <View style={{ flex: 1 }}>
        {title ? <Text style={typography.h1}>{title}</Text> : null}
        {subtitle ? <Text style={[typography.small, { marginTop: spacing.xs }]}>{subtitle}</Text> : null}
      </View>

      {right ? <View>{right}</View> : null}
    </View>
  );
}
