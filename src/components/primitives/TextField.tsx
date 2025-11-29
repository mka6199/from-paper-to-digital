import React from 'react';
import { View, TextInput, Text, StyleSheet, TextInputProps } from 'react-native';
import { spacing, radii } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeProvider';

type Props = TextInputProps & {
  hint?: string;
  errorText?: string;

  label?: string;
};

export default function TextField(props: Props) {
  const { colors } = useTheme();
  const { label, style, placeholderTextColor, hint, errorText, ...inputProps } = props;

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
      {hint ? (
        <Text style={{ marginTop: 4, fontSize: 12, color: '#6B7280' }}>{hint}</Text>
      ) : null}
      {errorText ? (
        <Text style={{ marginTop: 4, fontSize: 12, color: '#B91C1C' }}>{errorText}</Text>
      ) : null}
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
