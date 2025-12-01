import React from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSyncStatus } from '../../context/SyncProvider';
import { useTheme } from '../../theme/ThemeProvider';

export default function OfflineIndicator() {
  const { isOnline, isSyncing, pendingCount, syncNow } = useSyncStatus();
  const { colors } = useTheme();

  if (isOnline && pendingCount === 0 && !isSyncing) {
    return null; // Don't show anything when online and no pending items
  }

  return (
    <View style={[styles.container, { backgroundColor: isOnline ? '#f59e0b' : '#ef4444' }]}>
      <View style={styles.content}>
        {!isOnline && (
          <>
            <Ionicons name="cloud-offline-outline" size={16} color="#fff" />
            <Text style={styles.text}>Offline Mode</Text>
          </>
        )}
        
        {isOnline && isSyncing && (
          <>
            <ActivityIndicator size="small" color="#fff" />
            <Text style={styles.text}>Syncing...</Text>
          </>
        )}
        
        {isOnline && !isSyncing && pendingCount > 0 && (
          <>
            <Ionicons name="cloud-upload-outline" size={16} color="#fff" />
            <Text style={styles.text}>{pendingCount} pending</Text>
            <Pressable onPress={syncNow} style={styles.syncButton}>
              <Text style={styles.syncText}>Sync Now</Text>
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  text: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  syncButton: {
    marginLeft: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 4,
  },
  syncText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
});
