import React from 'react';
import { Pressable, Text, StyleSheet, View, ViewStyle } from 'react-native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { colors, spacing } from '../../theme/tokens';

type Props = {
  onPress: () => void;
  label?: string;       
  style?: ViewStyle;
  testID?: string;
};

export default function FAB({ onPress, label = '+', style, testID }: Props) {

  const tabBarHeight = useBottomTabBarHeight?.() ?? 0;

  return (
    
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <Pressable
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel="Floating action button"
        onPress={onPress}
        style={({ pressed }) => [
          styles.fab,
          { bottom: tabBarHeight + spacing.lg },
          pressed && { opacity: 0.9 },
          style,
        ]}
      >
        <Text style={styles.plus}>{label}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
    zIndex: 1, 
  },
  plus: { color: '#fff', fontSize: 28, lineHeight: 28, fontWeight: '700', marginTop: -2 },
});
