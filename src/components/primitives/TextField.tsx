import React, { useMemo, useState } from 'react';
import { Pressable, Text, TextInput, TextInputProps, View } from 'react-native';
import { colors, radii, spacing, typography } from '../../theme/tokens';

type Props = Omit<TextInputProps, 'onChange'> & {
  label?: string;
  helperText?: string;
  errorText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onRightIconPress?: () => void;
};

export default function TextField({
  label,
  helperText,
  errorText,
  leftIcon,
  rightIcon,
  onRightIconPress,
  secureTextEntry,
  multiline,
  style,
  ...inputProps
}: Props) {
  const [reveal, setReveal] = useState(false);
  const isPassword = !!secureTextEntry;
  const showSecure = useMemo(() => (isPassword ? !reveal : false), [isPassword, reveal]);

  return (
    <View style={{ marginBottom: spacing.md }}>
      {label ? <Text style={{ ...typography.small, marginBottom: 6 }}>{label}</Text> : null}

      <View
        style={{
          flexDirection: 'row',
          alignItems: multiline ? 'flex-start' : 'center',
          gap: 8,
          backgroundColor: colors.card,
          borderRadius: radii.md,
          borderWidth: 1,
          borderColor: errorText ? colors.danger : colors.divider,
          paddingHorizontal: spacing.md,
          paddingVertical: multiline ? spacing.sm : 0,
          minHeight: 44,
        }}
      >
        {leftIcon}
        <TextInput
          style={[{ flex: 1, paddingVertical: 10, color: colors.text }, style]}
          placeholderTextColor={colors.subtext}
          secureTextEntry={showSecure}
          multiline={multiline}
          {...inputProps}
        />
        {isPassword ? (
          <Pressable
            onPress={() => setReveal((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel={reveal ? 'Hide password' : 'Show password'}
          >
            <Text style={{ color: colors.subtext }}>{reveal ? '🙈' : '👁️'}</Text>
          </Pressable>
        ) : rightIcon ? (
          <Pressable onPress={onRightIconPress} accessibilityRole="button">
            {rightIcon}
          </Pressable>
        ) : null}
      </View>

      {errorText ? (
        <Text style={{ color: colors.danger, marginTop: 4 }}>{errorText}</Text>
      ) : helperText ? (
        <Text style={{ color: colors.subtext, marginTop: 4 }}>{helperText}</Text>
      ) : null}
    </View>
  );
}
