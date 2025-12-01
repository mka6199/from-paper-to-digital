import { Platform } from 'react-native';
import { TAB_BAR_HEIGHT, TAB_BAR_PADDING_BOTTOM } from '../components/navigation/CustomTabBar';

/**
 * Get the standard bottom padding for scrollable content
 * This ensures content is not hidden behind the tab bar
 * 
 * @param additionalPadding - Extra padding if needed (e.g., for FAB buttons)
 * @returns The total bottom padding in pixels
 */
export function getContentBottomPadding(additionalPadding: number = 0): number {
  // Tab bar height + iOS safe area estimate + standard padding
  const basePadding = TAB_BAR_HEIGHT + TAB_BAR_PADDING_BOTTOM + 20;
  return basePadding + additionalPadding;
}

/**
 * Standard content container style for FlatList/ScrollView
 * Use this to ensure consistent bottom padding across all screens
 */
export const STANDARD_CONTENT_STYLE = {
  paddingBottom: getContentBottomPadding(),
};

/**
 * Get the bottom position for a floating action button (FAB)
 * Positions it just above the tab bar
 * 
 * @param offset - Additional offset from tab bar (default: 16)
 * @returns Bottom position in pixels
 */
export function getFABBottomPosition(offset: number = 16): number {
  return TAB_BAR_HEIGHT + TAB_BAR_PADDING_BOTTOM + offset;
}
