import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  Keyboard,
} from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeProvider';
// Animation imports removed - using simple Pressable animation

// Constants for consistent layout
export const TAB_BAR_HEIGHT = 60;
export const TAB_BAR_PADDING_BOTTOM = Platform.OS === 'ios' ? 8 : 12;

type IconName = keyof typeof Ionicons.glyphMap;

const ICON_MAP: Record<string, { active: IconName; inactive: IconName }> = {
  Dashboard: { active: 'home', inactive: 'home-outline' },
  Workers: { active: 'people', inactive: 'people-outline' },
  Notifications: { active: 'notifications', inactive: 'notifications-outline' },
  History: { active: 'time', inactive: 'time-outline' },
  Settings: { active: 'settings', inactive: 'settings-outline' },
  'Admin Panel': { active: 'shield-checkmark', inactive: 'shield-checkmark-outline' },
};

const LABEL_MAP: Record<string, string> = {
  Dashboard: 'Home',
  Workers: 'Workers',
  Notifications: 'Alerts',
  History: 'History',
  Settings: 'Settings',
  'Admin Panel': 'Admin',
};

export default function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [isKeyboardVisible, setKeyboardVisible] = React.useState(false);

  // Handle keyboard visibility
  React.useEffect(() => {
    const showSubscription = Keyboard.addListener('keyboardDidShow', () => {
      setKeyboardVisible(true);
    });
    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardVisible(false);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  // Calculate total height including safe area
  const totalHeight = TAB_BAR_HEIGHT + insets.bottom + TAB_BAR_PADDING_BOTTOM;

  // Hide tab bar when keyboard is visible
  if (isKeyboardVisible) {
    return null;
  }

  return (
    <View
      style={[
        styles.container,
        {
          height: totalHeight,
          paddingBottom: insets.bottom + TAB_BAR_PADDING_BOTTOM,
          backgroundColor: colors.surface,
          shadowColor: colors.text,
          borderTopColor: colors.border,
        },
      ]}
    >
      <View style={styles.content}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;

          // Get badge from options
          const badge = options.tabBarBadge;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: 'tabLongPress',
              target: route.key,
            });
          };

          const icons = ICON_MAP[route.name] || { active: 'ellipse', inactive: 'ellipse-outline' };
          const label = LABEL_MAP[route.name] || route.name;

          return (
            <TabButton
              key={route.key}
              isFocused={isFocused}
              onPress={onPress}
              onLongPress={onLongPress}
              iconActive={icons.active}
              iconInactive={icons.inactive}
              label={label}
              badge={badge}
              colors={colors}
            />
          );
        })}
      </View>
    </View>
  );
}

type TabButtonProps = {
  isFocused: boolean;
  onPress: () => void;
  onLongPress: () => void;
  iconActive: IconName;
  iconInactive: IconName;
  label: string;
  badge?: string | number;
  colors: any;
};

function TabButton({
  isFocused,
  onPress,
  onLongPress,
  iconActive,
  iconInactive,
  label,
  badge,
  colors,
}: TabButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
      accessibilityLabel={`${label} tab`}
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [
        styles.tab,
        pressed && { opacity: 0.7, transform: [{ scale: 0.95 }] },
      ]}
    >
      <View style={styles.tabContent}>
        {/* Icon with pill indicator */}
        <View style={styles.iconContainer}>
          <Ionicons
            name={isFocused ? iconActive : iconInactive}
            size={24}
            color={isFocused ? colors.brand : colors.subtext}
          />

          {/* Active pill indicator */}
          {isFocused && (
            <View
              style={[
                styles.activePill,
                { backgroundColor: colors.brand + '20' },
              ]}
            />
          )}

          {/* Badge */}
          {badge !== undefined && badge !== null && Number(badge) > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {Number(badge) > 99 ? '99+' : String(badge)}
              </Text>
            </View>
          )}
        </View>

        {/* Label */}
        <Text
          style={[
            styles.label,
            {
              color: isFocused ? colors.brand : colors.subtext,
              fontWeight: isFocused ? '700' : '600',
            },
          ]}
          numberOfLines={1}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    // Elevated shadow
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 16,
      },
    }),
  },
  content: {
    flexDirection: 'row',
    height: TAB_BAR_HEIGHT,
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  iconContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 32,
  },
  activePill: {
    position: 'absolute',
    width: 48,
    height: 36,
    borderRadius: 18,
    zIndex: -1,
  },
  label: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 2,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
});
