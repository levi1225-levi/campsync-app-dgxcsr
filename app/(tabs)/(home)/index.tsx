
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { IconSymbol } from '@/components/IconSymbol';
import { colors, commonStyles } from '@/styles/commonStyles';
import { mockCampers } from '@/data/mockCampers';
import { mockIncidents } from '@/data/mockIncidents';

function HomeScreenContent() {
  const router = useRouter();
  const { user, signOut, hasPermission } = useAuth();

  const checkedInCount = mockCampers.filter(c => c.checkInStatus === 'checked-in').length;
  const totalCampers = mockCampers.length;
  const openIncidents = mockIncidents.filter(i => i.status === 'open' || i.status === 'in-progress').length;

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
      title: 'Incident Reporting',
      description: 'Log and track incidents',
      icon: 'report' as const,
      route: '/(tabs)/incidents',
      color: colors.secondary,
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
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>CampSync</Text>
            <Text style={styles.headerSubtitle}>
              {user?.role === 'super-admin' && 'Super Admin Dashboard'}
              {user?.role === 'camp-admin' && 'Camp Admin Dashboard'}
              {user?.role === 'staff' && 'Staff Dashboard'}
            </Text>
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

        {/* User Info Badge */}
        <View style={styles.userBadge}>
          <IconSymbol
            ios_icon_name="person.circle.fill"
            android_material_icon_name="account-circle"
            size={24}
            color={colors.primary}
          />
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user?.name}</Text>
            <Text style={styles.userRole}>
              {user?.role === 'super-admin' && 'Super Administrator'}
              {user?.role === 'camp-admin' && 'Camp Administrator'}
              {user?.role === 'staff' && 'Staff Member'}
            </Text>
          </View>
        </View>

        {/* Stats Overview */}
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, { backgroundColor: colors.primary }]}>
            <IconSymbol
              ios_icon_name="person.2.fill"
              android_material_icon_name="people"
              size={32}
              color="#FFFFFF"
            />
            <Text style={styles.statNumber}>{checkedInCount}/{totalCampers}</Text>
            <Text style={styles.statLabel}>Checked In</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: colors.secondary }]}>
            <IconSymbol
              ios_icon_name="exclamationmark.triangle.fill"
              android_material_icon_name="warning"
              size={32}
              color="#FFFFFF"
            />
            <Text style={styles.statNumber}>{openIncidents}</Text>
            <Text style={styles.statLabel}>Open Incidents</Text>
          </View>
        </View>

        {/* Announcements */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today&apos;s Announcements</Text>
          <View style={commonStyles.card}>
            <View style={styles.announcementHeader}>
              <IconSymbol
                ios_icon_name="megaphone.fill"
                android_material_icon_name="campaign"
                size={24}
                color={colors.accent}
              />
              <Text style={styles.announcementTitle}>Welcome to Camp!</Text>
            </View>
            <Text style={commonStyles.textSecondary}>
              All staff: Please ensure camper wristbands are properly registered. Check-in closes at 5 PM today.
            </Text>
            <Text style={[commonStyles.textSecondary, styles.announcementTime]}>
              Posted 2 hours ago
            </Text>
          </View>

          <View style={commonStyles.card}>
            <View style={styles.announcementHeader}>
              <IconSymbol
                ios_icon_name="sun.max.fill"
                android_material_icon_name="wb-sunny"
                size={24}
                color={colors.highlight}
              />
              <Text style={styles.announcementTitle}>Weather Alert</Text>
            </View>
            <Text style={commonStyles.textSecondary}>
              Sunny weather expected all week. Remember to apply sunscreen and stay hydrated!
            </Text>
            <Text style={[commonStyles.textSecondary, styles.announcementTime]}>
              Posted 5 hours ago
            </Text>
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
                        size={28}
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

        {/* Admin Tools Section */}
        {(user?.role === 'super-admin' || user?.role === 'camp-admin') && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {user?.role === 'super-admin' ? 'Super Admin Tools' : 'Admin Tools'}
            </Text>
            
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
                    size={28}
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

            {user?.role === 'super-admin' && (
              <>
                <View style={commonStyles.card}>
                  <View style={styles.actionCard}>
                    <View style={[styles.actionIconContainer, { backgroundColor: colors.highlight }]}>
                      <IconSymbol
                        ios_icon_name="building.2.fill"
                        android_material_icon_name="business"
                        size={28}
                        color="#FFFFFF"
                      />
                    </View>
                    <View style={styles.actionContent}>
                      <Text style={commonStyles.cardTitle}>Manage Camps</Text>
                      <Text style={commonStyles.textSecondary}>
                        Create and configure camp settings
                      </Text>
                    </View>
                    <IconSymbol
                      ios_icon_name="chevron.right"
                      android_material_icon_name="chevron-right"
                      size={24}
                      color={colors.textSecondary}
                    />
                  </View>
                </View>

                <View style={commonStyles.card}>
                  <View style={styles.actionCard}>
                    <View style={[styles.actionIconContainer, { backgroundColor: colors.success }]}>
                      <IconSymbol
                        ios_icon_name="person.badge.key.fill"
                        android_material_icon_name="admin-panel-settings"
                        size={28}
                        color="#FFFFFF"
                      />
                    </View>
                    <View style={styles.actionContent}>
                      <Text style={commonStyles.cardTitle}>User Management</Text>
                      <Text style={commonStyles.textSecondary}>
                        Assign roles and manage access
                      </Text>
                    </View>
                    <IconSymbol
                      ios_icon_name="chevron.right"
                      android_material_icon_name="chevron-right"
                      size={24}
                      color={colors.textSecondary}
                    />
                  </View>
                </View>
              </>
            )}
          </View>
        )}

        {/* Offline Notice */}
        <View style={[styles.offlineNotice, { backgroundColor: colors.accent }]}>
          <IconSymbol
            ios_icon_name="wifi.slash"
            android_material_icon_name="wifi-off"
            size={20}
            color="#FFFFFF"
          />
          <Text style={styles.offlineText}>
            Offline mode enabled - Data will sync when connected
          </Text>
        </View>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 24,
    backgroundColor: colors.primary,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    fontWeight: '400',
    color: '#FFFFFF',
    opacity: 0.9,
  },
  signOutButton: {
    padding: 8,
  },
  userBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    marginHorizontal: 16,
    marginTop: -20,
    marginBottom: 16,
    padding: 12,
    borderRadius: 12,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
    elevation: 3,
    gap: 12,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  userRole: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 24,
    gap: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.15)',
    elevation: 4,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
    opacity: 0.9,
    marginTop: 4,
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  announcementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  announcementTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  announcementTime: {
    fontSize: 12,
    marginTop: 8,
    fontStyle: 'italic',
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionIconContainer: {
    width: 56,
    height: 56,
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
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  offlineText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
  },
});
