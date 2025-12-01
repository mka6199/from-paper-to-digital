# Custom Tab Bar - Implementation Guide

## Overview

This project uses a custom, professional bottom tab bar with consistent spacing and proper content visibility across all screens.

## Key Components

### 1. CustomTabBar (`src/components/navigation/CustomTabBar.tsx`)

A fintech-style tab bar with:
- **Clean Design**: Icons + labels with clear active states
- **Pill Indicator**: Subtle background highlight for active tab
- **Badge Support**: Shows notification counts
- **Keyboard Handling**: Automatically hides when keyboard appears
- **Safe Area Support**: Respects device notches/home indicators
- **Elevated Shadow**: Floating appearance
- **Theme Integration**: Uses your app's theme colors

**Constants:**
```typescript
export const TAB_BAR_HEIGHT = 60;
export const TAB_BAR_PADDING_BOTTOM = Platform.OS === 'ios' ? 8 : 12;
```

### 2. Layout Utilities (`src/utils/layout.ts`)

Helper functions for consistent spacing:

```typescript
// Get bottom padding for scrollable content
getContentBottomPadding(additionalPadding?: number): number

// Get position for floating action buttons
getFABBottomPosition(offset?: number): number

// Standard content style object
STANDARD_CONTENT_STYLE
```

## Usage Examples

### ScrollView with Proper Padding

```typescript
import { getContentBottomPadding } from '../../utils/layout';

<ScrollView
  contentContainerStyle={{
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: getContentBottomPadding(),
    gap: spacing.lg,
  }}
>
  {/* Your content */}
</ScrollView>
```

### FlatList with Proper Padding

```typescript
import { getContentBottomPadding } from '../../utils/layout';

<FlatList
  data={items}
  renderItem={renderItem}
  contentContainerStyle={{
    paddingHorizontal: spacing.lg,
    paddingBottom: getContentBottomPadding(),
  }}
/>
```

### Floating Action Button (FAB) Positioning

```typescript
import { getFABBottomPosition } from '../../utils/layout';

<View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
  <Pressable
    style={{
      position: 'absolute',
      bottom: getFABBottomPosition(), // Positions just above tab bar
      right: spacing.lg,
      // ... other FAB styles
    }}
  >
    <Text>+</Text>
  </Pressable>
</View>
```

### Adding Badge to Tab

In your navigator setup:

```typescript
<Tab.Screen
  name="Notifications"
  component={NotificationsScreen}
  options={{
    tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
  }}
/>
```

## Architecture

### Tab Bar Height Calculation

```
Total Height = TAB_BAR_HEIGHT (60px) 
             + Safe Area Bottom Inset (varies by device)
             + TAB_BAR_PADDING_BOTTOM (8-12px)
```

### Content Padding Calculation

```
Bottom Padding = TAB_BAR_HEIGHT (60px)
               + TAB_BAR_PADDING_BOTTOM (8-12px)
               + Extra Buffer (20px)
               + Optional Additional Padding
```

This ensures:
- ✅ All content remains visible
- ✅ No content hidden behind tab bar
- ✅ Smooth scrolling experience
- ✅ FAB buttons positioned correctly
- ✅ Consistent across all screens

## Keyboard Behavior

The tab bar automatically hides when the keyboard appears:

```typescript
React.useEffect(() => {
  const showSub = Keyboard.addListener('keyboardDidShow', () => {
    setKeyboardVisible(true);
  });
  const hideSub = Keyboard.addListener('keyboardDidHide', () => {
    setKeyboardVisible(false);
  });
  return () => {
    showSub.remove();
    hideSub.remove();
  };
}, []);
```

## Customization

### Changing Tab Icons

Edit `ICON_MAP` in `CustomTabBar.tsx`:

```typescript
const ICON_MAP: Record<string, { active: IconName; inactive: IconName }> = {
  Dashboard: { active: 'home', inactive: 'home-outline' },
  // ... add your tabs
};
```

### Changing Tab Labels

Edit `LABEL_MAP` in `CustomTabBar.tsx`:

```typescript
const LABEL_MAP: Record<string, string> = {
  Dashboard: 'Home',
  // ... add your labels
};
```

### Adjusting Heights

Modify constants in `CustomTabBar.tsx`:

```typescript
export const TAB_BAR_HEIGHT = 60; // Change this
export const TAB_BAR_PADDING_BOTTOM = Platform.OS === 'ios' ? 8 : 12;
```

All screens will automatically adjust!

## Best Practices

1. **Always use the layout utilities** for bottom padding
2. **Never hardcode bottom padding values** (e.g., `paddingBottom: 100`)
3. **Test on devices with different safe areas** (iPhone 14 Pro, iPhone SE, etc.)
4. **Use FAB positioning utility** for floating buttons
5. **Verify keyboard doesn't overlap inputs** on all forms

## Migration Checklist

When adding a new screen:

- [ ] Import `getContentBottomPadding` from `utils/layout`
- [ ] Apply to ScrollView/FlatList `contentContainerStyle`
- [ ] If using FAB, import `getFABBottomPosition`
- [ ] Test scrolling to bottom
- [ ] Test with keyboard (if form inputs present)
- [ ] Test on different device sizes

## Example Screen Template

```typescript
import React from 'react';
import { ScrollView, View, Text, Pressable, StyleSheet } from 'react-native';
import Screen from '../../components/layout/Screen';
import { spacing } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeProvider';
import { getContentBottomPadding, getFABBottomPosition } from '../../utils/layout';

export default function ExampleScreen() {
  const { colors } = useTheme();

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.md,
          paddingBottom: getContentBottomPadding(),
        }}
      >
        <Text>Your scrollable content here...</Text>
        {/* Add many items to test scrolling */}
      </ScrollView>

      {/* Optional FAB */}
      <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
        <Pressable
          style={{
            position: 'absolute',
            bottom: getFABBottomPosition(),
            right: spacing.lg,
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: colors.brand,
            alignItems: 'center',
            justifyContent: 'center',
            elevation: 8,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
          }}
        >
          <Text style={{ color: '#fff', fontSize: 24 }}>+</Text>
        </Pressable>
      </View>
    </Screen>
  );
}
```

## Troubleshooting

### Content still hidden behind tab bar
- Check if you're using `getContentBottomPadding()`
- Verify you haven't overridden padding elsewhere
- Check parent container doesn't have `flex: 1` without proper height

### FAB covered by tab bar
- Use `getFABBottomPosition()` instead of hardcoded values
- Ensure FAB is in absolute positioned container

### Tab bar appears different on some screens
- All screens should use `CustomTabBar` component
- Check RootNavigator uses `tabBar={(props) => <CustomTabBar {...props} />}`
- Verify no screen-specific tabBarStyle overrides
