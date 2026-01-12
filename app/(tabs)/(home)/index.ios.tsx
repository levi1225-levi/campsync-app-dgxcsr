
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import * as Network from 'expo-network';
import { mockCampers } from '@/data/mockCampers';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, commonStyles } from '@/styles/commonStyles';

function HomeScreenContent() {
  const { user } = useAuth();
  const router = useRouter();
  const [isOnline, setIsOnline] = useState(true);

  const checkNetworkStatus = useCallback(async () => {
    try {
      const networkState = await Network.getNetworkStateAsync();
      setIsOnline(networkState.isConnected ?? false);
    } catch (error) {
      console.error('Error checking network status:', error);
    }
  }, []);

  useEffect(() => {
    checkNetworkStatus();
    const interval = setInterval(checkNetworkStatus, 30000);
    return () => clearInterval(interval);
  }, [checkNetworkStatus]);

  const handleNavigation = useCallback((route: string) => {
    try {
      console.log('Navigating to:', route);
      router.push(route as any);
    } catch (error) {
      console.error('Navigation error:', error);
    }
  }, [router]);

  const checkedInCount = mockCampers.filter(c => c.check_in_status === 'checked_in').length;
  const totalCampers = mockCampers.length;

  return (
    <ScrollView style={styles.container}>
      <LinearGradient colors={[colors.primary, colors.secondary]} style={styles.header}>
        <Text style={styles.headerTitle}>Welcome, {user?.fullName || user?.full_name || 'User'}</Text>
        <Text style={styles.headerSubtitle}>{user?.role || 'Staff'}</Text>
        <View style={[styles.statusBadge, { backgroundColor: isOnline ? colors.success : colors.error }]}>
          <Text style={styles.statusText}>{isOnline ? '● Online' : '● Offline'}</Text>
        </View>
      </LinearGradient>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{checkedInCount}</Text>
          <Text style={styles.statLabel}>Checked In</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{totalCampers}</Text>
          <Text style={styles.statLabel}>Total Campers</Text>
        </View>
      </View>

      <View style={styles.quickActions}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        
        <TouchableOpacity 
          style={[commonStyles.button, styles.actionButton]}
          onPress={() => handleNavigation('/(tabs)/nfc-scanner')}
          activeOpacity={0.7}
        >
          <Text style={styles.actionIcon}>📱</Text>
          <Text style={styles.actionButtonText}>NFC Scanner</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[commonStyles.button, styles.actionButton]}
          onPress={() => handleNavigation('/(tabs)/campers')}
          activeOpacity={0.7}
        >
          <Text style={styles.actionIcon}>👥</Text>
          <Text style={styles.actionButtonText}>View Campers</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function HomeScreen() {
  return (
    <ProtectedRoute allowedRoles={['camp_admin', 'counselor', 'parent']}>
      <HomeScreenContent />
    </ProtectedRoute>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : 48,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginTop: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 2,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.primary,
  },
  statLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  quickActions: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 12,
  },
  actionIcon: {
    fontSize: 24,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default HomeScreen;
