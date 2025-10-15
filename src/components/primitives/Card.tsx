import React from 'react';
import { View, ViewProps } from 'react-native';
import { colors, radii, spacing } from '../../theme/tokens';

export default function Card({ style, ...rest }: ViewProps) {
  return (
    <View
      style={[
        {
          backgroundColor: colors.card,
          borderRadius: radii.md,
          borderWidth: 1,
          borderColor: colors.divider,
          padding: spacing.md,
        },
        style,
      ]}
      {...rest}
    />
  );
}
