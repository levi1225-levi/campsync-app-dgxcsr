
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';

interface SessionMonitorProps {
  showDetails?: boolean;
}

export function SessionMonitor({ showDetails = false }: SessionMonitorProps) {
  const { sessionExpiresAt, refreshSession, isAuthenticated } = useAuth();
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [isExpiringSoon, setIsExpiringSoon] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !sessionExpiresAt) {
      setTimeRemaining('');
      return;
    }

    const updateTimeRemaining = () => {
      const now = Math.floor(Date.now() / 1000);
      const remaining = sessionExpiresAt - now;

      if (remaining <= 0) {
        setTimeRemaining('Expired');
        setIsExpiringSoon(true);
        return;
      }

      const hours = Math.floor(remaining / 3600);
      const minutes = Math.floor((remaining % 3600) / 60);
      const seconds = remaining % 60;

      if (hours > 0) {
        const timeText = `${hours}h ${minutes}m`;
        setTimeRemaining(timeText);
      } else if (minutes > 0) {
        const timeText = `${minutes}m ${seconds}s`;
        setTimeRemaining(timeText);
      } else {
        const timeText = `${seconds}s`;
        setTimeRemaining(timeText);
      }

      // Mark as expiring soon if less than 5 minutes
      setIsExpiringSoon(remaining < 300);
    };

    updateTimeRemaining();
    const interval = setInterval(updateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, [sessionExpiresAt, isAuthenticated]);

  const handleRefresh = async () => {
    console.log('User requested session refresh');
    await refreshSession();
  };

  if (!isAuthenticated || !showDetails) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.statusRow}>
        <IconSymbol
          ios_icon_name="checkmark.circle.fill"
          android_material_icon_name="check-circle"
          size={16}
          color={isExpiringSoon ? colors.warning : colors.success}
        />
        <Text style={[styles.statusText, isExpiringSoon && styles.warningText]}>
          {timeRemaining ? `Session expires in ${timeRemaining}` : 'Session active'}
        </Text>
      </View>
      
      {isExpiringSoon && (
        <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh}>
          <IconSymbol
            ios_icon_name="arrow.clockwise"
            android_material_icon_name="refresh"
            size={14}
            color={colors.primary}
          />
          <Text style={styles.refreshText}>Refresh</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.cardBackground,
    borderRadius: 8,
    marginHorizontal: 16,
    marginVertical: 8,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  warningText: {
    color: colors.warning,
    fontWeight: '600',
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.primary + '20',
    borderRadius: 6,
  },
  refreshText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
});
