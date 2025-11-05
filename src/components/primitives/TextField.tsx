import React from 'react';
import { View, TextInput, Text, StyleSheet, TextInputProps } from 'react-native';
import { spacing, radii } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeProvider';

type Props = TextInputProps & {
  label?: string;
};

export default function TextField(props: Props) {
  const { colors } = useTheme();
  const { label, style, placeholderTextColor, ...inputProps } = props;

  return (
    <View style={{ marginBottom: spacing.md }}>
      {label ? (
        <Text style={{ marginBottom: 6, color: colors.subtext, fontWeight: '600' }}>
          {label}
        </Text>
      ) : null}

      <TextInput
        placeholderTextColor={placeholderTextColor ?? colors.subtext}
        style={[
          styles.input,
          {
            color: colors.text,
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
          style, 
        ]}
        {...inputProps}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    minHeight: 44,
  },
});
