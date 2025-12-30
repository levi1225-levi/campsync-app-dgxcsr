
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { IconSymbol } from '@/components/IconSymbol';
import { colors, commonStyles } from '@/styles/commonStyles';
import { mockCampers } from '@/data/mockCampers';
import * as Network from 'expo-network';
import { LinearGradient } from 'expo-linear-gradient';

function HomeScreenContent() {
  const router = useRouter();
  const { user, signOut, hasPermission } = useAuth();
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    checkNetworkStatus();
    
    // Check network status every 10 seconds
    const interval = setInterval(checkNetworkStatus, 10000);
    
    return () => clearInterval(interval);
  }, []);

  const checkNetworkStatus = async () => {
    try {
      const networkState = await Network.getNetworkStateAsync();
      setIsOnline(networkState.isConnected === true && networkState.isInternetReachable !== false);
    } catch (error) {
      console.error('Error checking network status:', error);
      // Assume online if we can't check
      setIsOnline(true);
    }
  };

  const checkedInCount = mockCampers.filter(c => c.checkInStatus === 'checked-in').length;
  const totalCampers = mockCampers.length;

  const quickActions = [
    {
      title: 'Camper Management',
      description: 'View and manage camper profiles',
      icon: 'people' as const,
      route: '/(tabs)/campers',
      color: colors.primary,
      roles: ['super-admin', 'camp-admin', 'staff'] as const,
    },
    {
      title: 'NFC Scanner',
      description: 'Scan wristbands for quick access',
      icon: 'nfc' as const,
      route: '/(tabs)/nfc-scanner',
      color: colors.accent,
      roles: ['super-admin', 'camp-admin', 'staff'] as const,
    },
    {
      title: 'Bulk Import',
      description: 'Import campers from CSV',
      icon: 'upload' as const,
      route: '/bulk-import-campers',
      color: colors.secondary,
      roles: ['super-admin', 'camp-admin'] as const,
    },
  ];

  // Filter actions based on user role
  const availableActions = quickActions.filter(action => 
    hasPermission(action.roles as any)
  );

  return (
    <View style={[commonStyles.container, styles.container]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Header with Gradient */}
        <LinearGradient
          colors={[colors.primary, colors.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.headerGreeting}>Welcome back,</Text>
              <Text style={styles.headerTitle}>{user?.name}</Text>
              <View style={styles.roleBadge}>
                <Text style={styles.roleBadgeText}>
                  {user?.role === 'super-admin' && 'Super Admin'}
                  {user?.role === 'camp-admin' && 'Camp Admin'}
                  {user?.role === 'staff' && 'Staff Member'}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={signOut} style={styles.signOutButton}>
              <IconSymbol
                ios_icon_name="rectangle.portrait.and.arrow.right"
                android_material_icon_name="logout"
                size={24}
                color="#FFFFFF"
              />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Stats Overview */}
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, { backgroundColor: colors.primary }]}>
            <View style={styles.statIconContainer}>
              <IconSymbol
                ios_icon_name="person.2.fill"
                android_material_icon_name="people"
                size={28}
                color="#FFFFFF"
              />
            </View>
            <Text style={styles.statNumber}>{checkedInCount}/{totalCampers}</Text>
            <Text style={styles.statLabel}>Checked In Today</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: colors.accent }]}>
            <View style={styles.statIconContainer}>
              <IconSymbol
                ios_icon_name="checkmark.circle.fill"
                android_material_icon_name="check-circle"
                size={28}
                color="#FFFFFF"
              />
            </View>
            <Text style={styles.statNumber}>{totalCampers}</Text>
            <Text style={styles.statLabel}>Total Campers</Text>
          </View>
        </View>

        {/* Quick Actions */}
        {availableActions.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            {availableActions.map((action, index) => (
              <React.Fragment key={index}>
                <TouchableOpacity
                  style={commonStyles.card}
                  onPress={() => router.push(action.route as any)}
                  activeOpacity={0.7}
                >
                  <View style={styles.actionCard}>
                    <View style={[styles.actionIconContainer, { backgroundColor: action.color }]}>
                      <IconSymbol
                        ios_icon_name={action.icon}
                        android_material_icon_name={action.icon}
                        size={24}
                        color="#FFFFFF"
                      />
                    </View>
                    <View style={styles.actionContent}>
                      <Text style={commonStyles.cardTitle}>{action.title}</Text>
                      <Text style={commonStyles.textSecondary}>{action.description}</Text>
                    </View>
                    <IconSymbol
                      ios_icon_name="chevron.right"
                      android_material_icon_name="chevron-right"
                      size={24}
                      color={colors.textSecondary}
                    />
                  </View>
                </TouchableOpacity>
              </React.Fragment>
            ))}
          </View>
        )}

        {/* Today's Activity */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today&apos;s Activity</Text>
          <View style={commonStyles.card}>
            <View style={styles.activityHeader}>
              <IconSymbol
                ios_icon_name="clock.fill"
                android_material_icon_name="schedule"
                size={24}
                color={colors.info}
              />
              <Text style={styles.activityTitle}>Recent Check-ins</Text>
            </View>
            <Text style={commonStyles.textSecondary}>
              {checkedInCount} campers checked in today. All systems operational.
            </Text>
            <View style={styles.activityTime}>
              <Text style={[commonStyles.textSecondary, { fontSize: 12 }]}>
                Last updated: {new Date().toLocaleTimeString()}
              </Text>
            </View>
          </View>

          <View style={commonStyles.card}>
            <View style={styles.activityHeader}>
              <IconSymbol
                ios_icon_name="sun.max.fill"
                android_material_icon_name="wb-sunny"
                size={24}
                color={colors.warning}
              />
              <Text style={styles.activityTitle}>Camp Status</Text>
            </View>
            <Text style={commonStyles.textSecondary}>
              All activities running smoothly. Weather is perfect for outdoor activities!
            </Text>
          </View>
        </View>

        {/* Admin Tools Section */}
        {(user?.role === 'super-admin' || user?.role === 'camp-admin') && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Admin Tools</Text>
            
            <TouchableOpacity
              style={commonStyles.card}
              onPress={() => router.push('/manage-authorization-codes' as any)}
              activeOpacity={0.7}
            >
              <View style={styles.actionCard}>
                <View style={[styles.actionIconContainer, { backgroundColor: colors.warning }]}>
                  <IconSymbol
                    ios_icon_name="key.fill"
                    android_material_icon_name="vpn-key"
                    size={24}
                    color="#FFFFFF"
                  />
                </View>
                <View style={styles.actionContent}>
                  <Text style={commonStyles.cardTitle}>Authorization Codes</Text>
                  <Text style={commonStyles.textSecondary}>
                    Manage registration codes and invitations
                  </Text>
                </View>
                <IconSymbol
                  ios_icon_name="chevron.right"
                  android_material_icon_name="chevron-right"
                  size={24}
                  color={colors.textSecondary}
                />
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* Offline Notice - Only show when actually offline */}
        {!isOnline && (
          <View style={[styles.offlineNotice, { backgroundColor: colors.warning }]}>
            <IconSymbol
              ios_icon_name="wifi.slash"
              android_material_icon_name="wifi-off"
              size={20}
              color="#FFFFFF"
            />
            <Text style={styles.offlineText}>
              Offline mode - Data will sync when connected
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

export default function HomeScreen() {
  return (
    <ProtectedRoute allowedRoles={['super-admin', 'camp-admin', 'staff']}>
      <HomeScreenContent />
    </ProtectedRoute>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: Platform.OS === 'android' ? 48 : 0,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 120,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 32,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerGreeting: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
    opacity: 0.9,
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  roleBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  signOutButton: {
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: -20,
    marginBottom: 24,
    gap: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    boxShadow: '0px 4px 16px rgba(0, 0, 0, 0.12)',
    elevation: 4,
  },
  statIconContainer: {
    marginBottom: 12,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#FFFFFF',
    opacity: 0.9,
    textAlign: 'center',
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  activityTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
  },
  activityTime: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  actionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionContent: {
    flex: 1,
  },
  offlineNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginBottom: 24,
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  offlineText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
  },
});
