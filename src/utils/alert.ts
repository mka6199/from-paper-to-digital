import { Alert, Platform } from 'react-native';

/**
 * Cross-platform alert that works on both web and mobile
 */
export function showAlert(
  title: string,
  message?: string,
  buttons?: Array<{
    text: string;
    onPress?: () => void;
    style?: 'default' | 'cancel' | 'destructive';
  }>
) {
  if (Platform.OS === 'web') {
    const msg = message ? `${title}\n\n${message}` : title;
    
    if (!buttons || buttons.length === 0) {
      alert(msg);
      return;
    }

    if (buttons.length === 1) {
      alert(msg);
      buttons[0].onPress?.();
      return;
    }

    // For multiple buttons, use confirm
    const confirmed = confirm(msg);
    if (confirmed) {
      // Find first non-cancel button and call it
      const actionButton = buttons.find(b => b.style !== 'cancel');
      actionButton?.onPress?.();
    } else {
      // Call cancel button if exists
      const cancelButton = buttons.find(b => b.style === 'cancel');
      cancelButton?.onPress?.();
    }
  } else {
    Alert.alert(title, message, buttons as any);
  }
}

/**
 * Cross-platform prompt that works on both web and mobile
 */
export function showPrompt(
  title: string,
  message?: string,
  callback?: (value: string | null) => void,
  type?: 'plain-text' | 'secure-text' | 'login-password' | 'default',
  defaultValue?: string
) {
  if (Platform.OS === 'web') {
    const msg = message ? `${title}\n\n${message}` : title;
    const value = prompt(msg, defaultValue || '');
    callback?.(value);
  } else {
    Alert.prompt(title, message, callback, type, defaultValue);
  }
}
