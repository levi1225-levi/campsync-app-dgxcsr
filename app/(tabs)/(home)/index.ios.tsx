
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { colors, commonStyles } from '@/styles/commonStyles';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import * as Network from 'expo-network';
import { LinearGradient } from 'expo-linear-gradient';
import { mockCampers } from '@/data/mockCampers';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
    paddingTop: 10,
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: colors.grey,
  },
  statsContainer: {
    marginBottom: 24,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  statCard: {
    width: '48%',
    margin: '1%',
    padding: 18,
    borderRadius: 16,
    minHeight: 110,
  },
  statIcon: {
    marginBottom: 10,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  quickActionsContainer: {
    marginBottom: 24,
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
    padding: 18,
    borderRadius: 16,
    marginBottom: 12,
    minHeight: 70,
  },
  actionContent: {
    flex: 1,
    marginLeft: 16,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  actionSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
  },
  networkStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    backgroundColor: colors.backgroundAlt,
    marginBottom: 20,
  },
  networkText: {
    marginLeft: 10,
    fontSize: 14,
    color: colors.text,
  },
});

function HomeScreenContent() {
  const router = useRouter();
  const { user } = useAuth();
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    checkNetworkStatus();
  }, []);

  const checkNetworkStatus = async () => {
    try {
      const networkState = await Network.getNetworkStateAsync();
      setIsOnline(networkState.isConnected ?? false);
    } catch (error) {
      console.error('Error checking network status:', error);
    }
  };

  const handleViewCampers = useCallback(() => {
    try {
      router.push('/(tabs)/campers');
    } catch (error) {
      console.error('Navigation error:', error);
    }
  }, [router]);

  const handleScanNFC = useCallback(() => {
    try {
      router.push('/(tabs)/nfc-scanner');
    } catch (error) {
      console.error('Navigation error:', error);
    }
  }, [router]);

  const handleViewIncidents = useCallback(() => {
    try {
      router.push('/incidents');
    } catch (error) {
      console.error('Navigation error:', error);
    }
  }, [router]);

  const handleManageStaff = useCallback(() => {
    try {
      router.push('/user-management');
    } catch (error) {
      console.error('Navigation error:', error);
    }
  }, [router]);

  const totalCampers = mockCampers.length;
  const checkedInCampers = mockCampers.filter(c => c.check_in_status === 'checked_in').length;
  const activeSessions = 3;
  const pendingIncidents = 2;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Welcome back, {user?.full_name || 'User'}!</Text>
        <Text style={styles.subtitle}>Here's what's happening at camp today</Text>
      </View>

      <View style={styles.networkStatus}>
        <IconSymbol
          ios_icon_name={isOnline ? 'wifi' : 'wifi.slash'}
          android_material_icon_name={isOnline ? 'wifi' : 'wifi-off'}
          size={20}
          color={isOnline ? '#4CAF50' : '#FF9800'}
        />
        <Text style={styles.networkText}>
          {isOnline ? 'Online - Data syncing' : 'Offline - Changes will sync later'}
        </Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statsGrid}>
          <LinearGradient
            colors={['#4CAF50', '#45a049']}
            style={styles.statCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <IconSymbol ios_icon_name="person.3.fill" android_material_icon_name="people" size={28} color="#fff" style={styles.statIcon} />
            <Text style={styles.statValue}>{totalCampers}</Text>
            <Text style={styles.statLabel}>Total Campers</Text>
          </LinearGradient>

          <LinearGradient
            colors={['#2196F3', '#1976D2']}
            style={styles.statCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <IconSymbol ios_icon_name="checkmark.circle.fill" android_material_icon_name="check-circle" size={28} color="#fff" style={styles.statIcon} />
            <Text style={styles.statValue}>{checkedInCampers}</Text>
            <Text style={styles.statLabel}>Checked In</Text>
          </LinearGradient>

          <LinearGradient
            colors={['#FF9800', '#F57C00']}
            style={styles.statCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <IconSymbol ios_icon_name="calendar" android_material_icon_name="event" size={28} color="#fff" style={styles.statIcon} />
            <Text style={styles.statValue}>{activeSessions}</Text>
            <Text style={styles.statLabel}>Active Sessions</Text>
          </LinearGradient>

          <LinearGradient
            colors={['#F44336', '#D32F2F']}
            style={styles.statCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <IconSymbol ios_icon_name="exclamationmark.triangle.fill" android_material_icon_name="warning" size={28} color="#fff" style={styles.statIcon} />
            <Text style={styles.statValue}>{pendingIncidents}</Text>
            <Text style={styles.statLabel}>Pending Incidents</Text>
          </LinearGradient>
        </View>
      </View>

      <View style={styles.quickActionsContainer}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>

        <TouchableOpacity onPress={handleViewCampers} activeOpacity={0.7}>
          <LinearGradient
            colors={['#2196F3', '#1976D2']}
            style={styles.actionButton}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <IconSymbol ios_icon_name="person.2.fill" android_material_icon_name="people" size={28} color="#fff" />
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>View All Campers</Text>
              <Text style={styles.actionSubtitle}>Browse and manage camper profiles</Text>
            </View>
            <IconSymbol ios_icon_name="chevron.right" android_material_icon_name="chevron-right" size={24} color="rgba(255,255,255,0.7)" />
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleScanNFC} activeOpacity={0.7}>
          <LinearGradient
            colors={['#4CAF50', '#45a049']}
            style={styles.actionButton}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <IconSymbol ios_icon_name="wave.3.right" android_material_icon_name="nfc" size={28} color="#fff" />
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Scan NFC Wristband</Text>
              <Text style={styles.actionSubtitle}>Quick check-in and camper lookup</Text>
            </View>
            <IconSymbol ios_icon_name="chevron.right" android_material_icon_name="chevron-right" size={24} color="rgba(255,255,255,0.7)" />
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleViewIncidents} activeOpacity={0.7}>
          <LinearGradient
            colors={['#FF9800', '#F57C00']}
            style={styles.actionButton}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <IconSymbol ios_icon_name="exclamationmark.triangle.fill" android_material_icon_name="warning" size={28} color="#fff" />
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>View Incidents</Text>
              <Text style={styles.actionSubtitle}>Review and manage incident reports</Text>
            </View>
            <IconSymbol ios_icon_name="chevron.right" android_material_icon_name="chevron-right" size={24} color="rgba(255,255,255,0.7)" />
          </LinearGradient>
        </TouchableOpacity>

        {user?.role === 'super_admin' && (
          <TouchableOpacity onPress={handleManageStaff} activeOpacity={0.7}>
            <LinearGradient
              colors={['#9C27B0', '#7B1FA2']}
              style={styles.actionButton}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <IconSymbol ios_icon_name="person.badge.key.fill" android_material_icon_name="admin-panel-settings" size={28} color="#fff" />
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>Manage Staff</Text>
                <Text style={styles.actionSubtitle}>User management and permissions</Text>
              </View>
              <IconSymbol ios_icon_name="chevron.right" android_material_icon_name="chevron-right" size={24} color="rgba(255,255,255,0.7)" />
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

function HomeScreen() {
  return (
    <ProtectedRoute allowedRoles={['super_admin', 'camp_admin', 'counselor']}>
      <HomeScreenContent />
    </ProtectedRoute>
  );
}

export default HomeScreen;
