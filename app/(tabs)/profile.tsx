
import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { IconSymbol } from '@/components/IconSymbol';
import { colors, commonStyles } from '@/styles/commonStyles';
import { LinearGradient } from 'expo-linear-gradient';
import { ConfirmModal } from '@/components/ConfirmModal';

function ProfileScreenContent() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [showSignOutModal, setShowSignOutModal] = useState(false);

  const handleEditProfile = useCallback(() => {
    try {
      console.log('Navigating to edit profile');
      router.push('/edit-profile');
    } catch (error) {
      console.error('Navigation error:', error);
    }
  }, [router]);

  const handleChangePassword = useCallback(() => {
    try {
      console.log('Navigating to change password');
      router.push('/forgot-password');
    } catch (error) {
      console.error('Navigation error:', error);
    }
  }, [router]);

  const handleUserManagement = useCallback(() => {
    try {
      console.log('Navigating to user management');
      router.push('/user-management');
    } catch (error) {
      console.error('Navigation error:', error);
    }
  }, [router]);

  const handleWristbandSettings = useCallback(() => {
    try {
      console.log('Navigating to wristband settings');
      router.push('/wristband-settings');
    } catch (error) {
      console.error('Navigation error:', error);
    }
  }, [router]);

  const handleSignOutPress = useCallback(() => {
    console.log('Sign out button pressed from profile');
    setShowSignOutModal(true);
  }, []);

  const handleConfirmSignOut = useCallback(async () => {
    console.log('User confirmed sign out');
    setShowSignOutModal(false);
    try {
      await signOut();
      console.log('Sign out successful');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  }, [signOut]);

  const handleCancelSignOut = useCallback(() => {
    console.log('User cancelled sign out');
    setShowSignOutModal(false);
  }, []);

  const displayName = user?.fullName || user?.full_name || 'User';
  const displayEmail = user?.email || '';
  const displayRole = user?.role || 'staff';

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'super-admin':
        return 'Super Administrator';
      case 'camp-admin':
        return 'Camp Administrator';
      case 'staff':
        return 'Staff Member';
      case 'parent':
        return 'Parent/Guardian';
      default:
        return 'User';
    }
  };

  return (
    <View style={[commonStyles.container, styles.container]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={[colors.primary, colors.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <IconSymbol
                ios_icon_name="person.fill"
                android_material_icon_name="person"
                size={48}
                color="#FFFFFF"
              />
            </View>
          </View>
          <Text style={styles.headerName}>{displayName}</Text>
          <Text style={styles.headerEmail}>{displayEmail}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>
              {getRoleDisplayName(displayRole)}
            </Text>
          </View>
        </LinearGradient>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Information</Text>
          
          <View style={commonStyles.card}>
            <View style={styles.infoRow}>
              <View style={styles.infoIconContainer}>
                <IconSymbol
                  ios_icon_name="person.fill"
                  android_material_icon_name="person"
                  size={20}
                  color={colors.primary}
                />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Full Name</Text>
                <Text style={styles.infoValue}>{displayName}</Text>
              </View>
            </View>

            <View style={commonStyles.divider} />

            <View style={styles.infoRow}>
              <View style={styles.infoIconContainer}>
                <IconSymbol
                  ios_icon_name="envelope.fill"
                  android_material_icon_name="email"
                  size={20}
                  color={colors.accent}
                />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Email</Text>
                <Text style={styles.infoValue}>{displayEmail}</Text>
              </View>
            </View>

            <View style={commonStyles.divider} />

            <View style={styles.infoRow}>
              <View style={styles.infoIconContainer}>
                <IconSymbol
                  ios_icon_name="shield.fill"
                  android_material_icon_name="security"
                  size={20}
                  color={colors.secondary}
                />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Role</Text>
                <Text style={styles.infoValue}>
                  {getRoleDisplayName(displayRole)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actions</Text>

          <TouchableOpacity
            style={commonStyles.card}
            onPress={handleEditProfile}
            activeOpacity={0.7}
          >
            <View style={styles.actionRow}>
              <View style={[styles.actionIconContainer, { backgroundColor: colors.primary }]}>
                <IconSymbol
                  ios_icon_name="pencil"
                  android_material_icon_name="edit"
                  size={20}
                  color="#FFFFFF"
                />
              </View>
              <Text style={styles.actionText}>Edit Profile</Text>
              <IconSymbol
                ios_icon_name="chevron.right"
                android_material_icon_name="chevron-right"
                size={20}
                color={colors.textSecondary}
              />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={commonStyles.card}
            onPress={handleChangePassword}
            activeOpacity={0.7}
          >
            <View style={styles.actionRow}>
              <View style={[styles.actionIconContainer, { backgroundColor: colors.accent }]}>
                <IconSymbol
                  ios_icon_name="lock.fill"
                  android_material_icon_name="lock"
                  size={20}
                  color="#FFFFFF"
                />
              </View>
              <Text style={styles.actionText}>Change Password</Text>
              <IconSymbol
                ios_icon_name="chevron.right"
                android_material_icon_name="chevron-right"
                size={20}
                color={colors.textSecondary}
              />
            </View>
          </TouchableOpacity>

          {(displayRole === 'super-admin' || displayRole === 'camp-admin') && (
            <TouchableOpacity
              style={commonStyles.card}
              onPress={handleWristbandSettings}
              activeOpacity={0.7}
            >
              <View style={styles.actionRow}>
                <View style={[styles.actionIconContainer, { backgroundColor: '#8B5CF6' }]}>
                  <IconSymbol
                    ios_icon_name="lock.shield.fill"
                    android_material_icon_name="security"
                    size={20}
                    color="#FFFFFF"
                  />
                </View>
                <Text style={styles.actionText}>Wristband Security</Text>
                <IconSymbol
                  ios_icon_name="chevron.right"
                  android_material_icon_name="chevron-right"
                  size={20}
                  color={colors.textSecondary}
                />
              </View>
            </TouchableOpacity>
          )}

          {displayRole === 'super-admin' && (
            <TouchableOpacity
              style={commonStyles.card}
              onPress={handleUserManagement}
              activeOpacity={0.7}
            >
              <View style={styles.actionRow}>
                <View style={[styles.actionIconContainer, { backgroundColor: colors.error }]}>
                  <IconSymbol
                    ios_icon_name="person.3.fill"
                    android_material_icon_name="group"
                    size={20}
                    color="#FFFFFF"
                  />
                </View>
                <Text style={styles.actionText}>User Management</Text>
                <IconSymbol
                  ios_icon_name="chevron.right"
                  android_material_icon_name="chevron-right"
                  size={20}
                  color={colors.textSecondary}
                />
              </View>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[commonStyles.card, { backgroundColor: colors.error }]}
            onPress={handleSignOutPress}
            activeOpacity={0.7}
          >
            <View style={styles.actionRow}>
              <View style={[styles.actionIconContainer, { backgroundColor: 'rgba(255, 255, 255, 0.2)' }]}>
                <IconSymbol
                  ios_icon_name="rectangle.portrait.and.arrow.right"
                  android_material_icon_name="logout"
                  size={20}
                  color="#FFFFFF"
                />
              </View>
              <Text style={[styles.actionText, { color: '#FFFFFF' }]}>Sign Out</Text>
              <IconSymbol
                ios_icon_name="chevron.right"
                android_material_icon_name="chevron-right"
                size={20}
                color="#FFFFFF"
              />
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <View style={styles.appInfo}>
            <Text style={styles.appInfoText}>CampSync v1.0.0</Text>
            <Text style={[styles.appInfoText, { marginTop: 4 }]}>
              © 2026 CampSync. All rights reserved.
            </Text>
          </View>
        </View>
      </ScrollView>

      <ConfirmModal
        visible={showSignOutModal}
        title="Sign Out"
        message="Are you sure you want to sign out?"
        confirmText="Sign Out"
        cancelText="Cancel"
        confirmStyle="destructive"
        onConfirm={handleConfirmSignOut}
        onCancel={handleCancelSignOut}
      />
    </View>
  );
}

export default function ProfileScreen() {
  return (
    <ProtectedRoute allowedRoles={['super-admin', 'camp-admin', 'staff', 'parent']}>
      <ProfileScreenContent />
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
    paddingTop: 32,
    paddingBottom: 32,
    alignItems: 'center',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  headerName: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  headerEmail: {
    fontSize: 16,
    fontWeight: '400',
    color: '#FFFFFF',
    opacity: 0.9,
    marginBottom: 12,
  },
  roleBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  roleBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  section: {
    paddingHorizontal: 16,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  infoIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  actionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  appInfo: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  appInfoText: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
