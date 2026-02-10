
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import * as Network from 'expo-network';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, commonStyles } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { supabase } from '@/app/integrations/supabase/client';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function HomeScreenContent() {
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [isOnline, setIsOnline] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    checkedIn: 0,
    totalCampers: 0,
    checkedOut: 0,
    notArrived: 0,
  });

  const isSuperAdmin = user?.role === 'super-admin';

  const checkNetworkStatus = useCallback(async () => {
    try {
      const networkState = await Network.getNetworkStateAsync();
      setIsOnline(networkState.isConnected ?? false);
    } catch (error) {
      console.error('Error checking network status:', error);
    }
  }, []);

  const loadStats = useCallback(async () => {
    try {
      console.log('Loading camper stats...');
      
      // Use RPC to bypass RLS and get all campers
      const { data: campers, error } = await supabase.rpc('get_all_campers');
      
      if (error) {
        console.error('Error loading camper stats:', error);
        return;
      }
      
      if (campers) {
        // Count campers by status - handle both hyphen and underscore formats
        const checkedIn = campers.filter((c: any) => 
          c.check_in_status === 'checked-in' || c.check_in_status === 'checked_in'
        ).length;
        
        const checkedOut = campers.filter((c: any) => 
          c.check_in_status === 'checked-out' || c.check_in_status === 'checked_out'
        ).length;
        
        const notArrived = campers.filter((c: any) => 
          c.check_in_status === 'not-arrived' || c.check_in_status === 'not_arrived'
        ).length;
        
        setStats({
          checkedIn,
          totalCampers: campers.length,
          checkedOut,
          notArrived,
        });
        
        console.log('Stats loaded:', { checkedIn, totalCampers: campers.length, checkedOut, notArrived });
      }
    } catch (error) {
      console.error('Error in loadStats:', error);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([checkNetworkStatus(), loadStats()]);
    setRefreshing(false);
  }, [checkNetworkStatus, loadStats]);

  useEffect(() => {
    checkNetworkStatus();
    loadStats();
    const interval = setInterval(checkNetworkStatus, 30000);
    return () => clearInterval(interval);
  }, [checkNetworkStatus, loadStats]);

  const handleNavigation = useCallback((route: string) => {
    try {
      console.log('Navigating to:', route);
      router.push(route as any);
    } catch (error) {
      console.error('Navigation error:', error);
    }
  }, [router]);

  const handleStatCardPress = useCallback((type: 'total' | 'checkedIn' | 'checkedOut' | 'notArrived') => {
    console.log('User tapped stat card:', type);
    handleNavigation('/(tabs)/campers');
  }, [handleNavigation]);

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      <View style={{ paddingTop: insets.top }}>
        <LinearGradient 
          colors={[colors.primary, colors.primaryDark]} 
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerGreeting}>Welcome back,</Text>
              <Text style={styles.headerTitle}>{user?.fullName || user?.full_name || 'User'}</Text>
              <View style={styles.roleBadge}>
                <IconSymbol
                  ios_icon_name="person.circle.fill"
                  android_material_icon_name="account-circle"
                  size={16}
                  color="#FFFFFF"
                />
                <Text style={styles.roleText}>{user?.role || 'Staff'}</Text>
              </View>
            </View>
            <View style={[styles.statusIndicator, { backgroundColor: isOnline ? colors.success : colors.error }]}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>{isOnline ? 'Online' : 'Offline'}</Text>
            </View>
          </View>
        </LinearGradient>
      </View>

      <View style={styles.statsGrid}>
        <TouchableOpacity 
          style={[styles.statCard, styles.statCardPrimary]}
          onPress={() => handleStatCardPress('checkedIn')}
          activeOpacity={0.7}
        >
          <LinearGradient
            colors={[colors.success, colors.success + 'CC']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.statGradient}
          >
            <IconSymbol
              ios_icon_name="checkmark.circle.fill"
              android_material_icon_name="check-circle"
              size={32}
              color="#FFFFFF"
            />
            <Text style={styles.statNumber}>{stats.checkedIn}</Text>
            <Text style={styles.statLabel}>Checked In</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.statCard, styles.statCardSecondary]}
          onPress={() => handleStatCardPress('total')}
          activeOpacity={0.7}
        >
          <LinearGradient
            colors={[colors.primary, colors.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.statGradient}
          >
            <IconSymbol
              ios_icon_name="person.3.fill"
              android_material_icon_name="group"
              size={32}
              color="#FFFFFF"
            />
            <Text style={styles.statNumber}>{stats.totalCampers}</Text>
            <Text style={styles.statLabel}>Total Campers</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.statCard, styles.statCardWarning]}
          onPress={() => handleStatCardPress('checkedOut')}
          activeOpacity={0.7}
        >
          <LinearGradient
            colors={[colors.warning, colors.warning + 'CC']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.statGradient}
          >
            <IconSymbol
              ios_icon_name="arrow.right.circle.fill"
              android_material_icon_name="exit-to-app"
              size={32}
              color="#FFFFFF"
            />
            <Text style={styles.statNumber}>{stats.checkedOut}</Text>
            <Text style={styles.statLabel}>Checked Out</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.statCard, styles.statCardInfo]}
          onPress={() => handleStatCardPress('notArrived')}
          activeOpacity={0.7}
        >
          <LinearGradient
            colors={[colors.textSecondary, colors.textSecondary + 'CC']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.statGradient}
          >
            <IconSymbol
              ios_icon_name="clock.fill"
              android_material_icon_name="schedule"
              size={32}
              color="#FFFFFF"
            />
            <Text style={styles.statNumber}>{stats.notArrived}</Text>
            <Text style={styles.statLabel}>Not Arrived</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <View style={styles.quickActionsSection}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        
        <TouchableOpacity 
          style={styles.actionCard}
          onPress={() => handleNavigation('/(tabs)/nfc-scanner')}
          activeOpacity={0.7}
        >
          <LinearGradient
            colors={[colors.primary, colors.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.actionCardGradient}
          >
            <View style={styles.actionIconContainer}>
              <IconSymbol
                ios_icon_name="wave.3.right"
                android_material_icon_name="nfc"
                size={28}
                color="#FFFFFF"
              />
            </View>
            <View style={styles.actionTextContainer}>
              <Text style={styles.actionTitle}>NFC Scanner</Text>
              <Text style={styles.actionSubtitle}>Scan camper wristbands</Text>
            </View>
            <IconSymbol
              ios_icon_name="chevron.right"
              android_material_icon_name="arrow-forward"
              size={24}
              color="#FFFFFF"
            />
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionCard}
          onPress={() => handleNavigation('/(tabs)/campers')}
          activeOpacity={0.7}
        >
          <LinearGradient
            colors={[colors.secondary, colors.secondary + 'DD']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.actionCardGradient}
          >
            <View style={styles.actionIconContainer}>
              <IconSymbol
                ios_icon_name="person.3.fill"
                android_material_icon_name="group"
                size={28}
                color="#FFFFFF"
              />
            </View>
            <View style={styles.actionTextContainer}>
              <Text style={styles.actionTitle}>View Campers</Text>
              <Text style={styles.actionSubtitle}>Browse all campers</Text>
            </View>
            <IconSymbol
              ios_icon_name="chevron.right"
              android_material_icon_name="arrow-forward"
              size={24}
              color="#FFFFFF"
            />
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionCard}
          onPress={() => handleNavigation('/(tabs)/profile')}
          activeOpacity={0.7}
        >
          <LinearGradient
            colors={[colors.accent, colors.accent + 'DD']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.actionCardGradient}
          >
            <View style={styles.actionIconContainer}>
              <IconSymbol
                ios_icon_name="person.circle.fill"
                android_material_icon_name="account-circle"
                size={28}
                color="#FFFFFF"
              />
            </View>
            <View style={styles.actionTextContainer}>
              <Text style={styles.actionTitle}>My Profile</Text>
              <Text style={styles.actionSubtitle}>View and edit profile</Text>
            </View>
            <IconSymbol
              ios_icon_name="chevron.right"
              android_material_icon_name="arrow-forward"
              size={24}
              color="#FFFFFF"
            />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {isSuperAdmin && (
        <View style={styles.quickActionsSection}>
          <Text style={styles.sectionTitle}>Admin Actions</Text>
          
          <TouchableOpacity 
            style={styles.actionCard}
            onPress={() => handleNavigation('/manage-authorization-codes')}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={[colors.error, colors.error + 'DD']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.actionCardGradient}
            >
              <View style={styles.actionIconContainer}>
                <IconSymbol
                  ios_icon_name="key.fill"
                  android_material_icon_name="vpn-key"
                  size={28}
                  color="#FFFFFF"
                />
              </View>
              <View style={styles.actionTextContainer}>
                <Text style={styles.actionTitle}>Authorization Codes</Text>
                <Text style={styles.actionSubtitle}>Manage registration codes</Text>
              </View>
              <IconSymbol
                ios_icon_name="chevron.right"
                android_material_icon_name="arrow-forward"
                size={24}
                color="#FFFFFF"
              />
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionCard}
            onPress={() => handleNavigation('/user-management')}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={['#8B5CF6', '#7C3AED']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.actionCardGradient}
            >
              <View style={styles.actionIconContainer}>
                <IconSymbol
                  ios_icon_name="person.3.fill"
                  android_material_icon_name="group"
                  size={28}
                  color="#FFFFFF"
                />
              </View>
              <View style={styles.actionTextContainer}>
                <Text style={styles.actionTitle}>User Management</Text>
                <Text style={styles.actionSubtitle}>Manage users and roles</Text>
              </View>
              <IconSymbol
                ios_icon_name="chevron.right"
                android_material_icon_name="arrow-forward"
                size={24}
                color="#FFFFFF"
              />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

function HomeScreen() {
  return (
    <ProtectedRoute allowedRoles={['super-admin', 'camp-admin', 'staff', 'parent']}>
      <HomeScreenContent />
    </ProtectedRoute>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    paddingBottom: 120,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 32,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerTextContainer: {
    flex: 1,
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
    gap: 6,
  },
  roleText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
  },
  statCard: {
    width: '48%',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  statCardPrimary: {},
  statCardSecondary: {},
  statCardWarning: {},
  statCardInfo: {},
  statGradient: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 140,
  },
  statNumber: {
    fontSize: 40,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 12,
    marginBottom: 4,
    letterSpacing: -1,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
    opacity: 0.95,
    textAlign: 'center',
  },
  quickActionsSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  actionCard: {
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  actionCardGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    gap: 16,
  },
  actionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTextContainer: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  actionSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
    opacity: 0.9,
  },
});

export default HomeScreen;
