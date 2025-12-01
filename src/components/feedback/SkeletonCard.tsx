import React from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';

export function SkeletonCard() {
  const { colors } = useTheme();
  const shimmerAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1200,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [shimmerAnim]);

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <View style={styles.content}>
        <Animated.View
          style={[
            styles.avatar,
            { backgroundColor: colors.border, opacity },
          ]}
        />
        <View style={styles.textContainer}>
          <Animated.View
            style={[
              styles.titleBar,
              { backgroundColor: colors.border, opacity },
            ]}
          />
          <Animated.View
            style={[
              styles.subtitleBar,
              { backgroundColor: colors.border, opacity },
            ]}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  textContainer: {
    flex: 1,
    gap: 8,
  },
  titleBar: {
    height: 16,
    width: '60%',
    borderRadius: 4,
  },
  subtitleBar: {
    height: 12,
    width: '40%',
    borderRadius: 4,
  },
});
