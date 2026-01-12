
import { useAuth } from '@/contexts/AuthContext';
import { colors, commonStyles } from '@/styles/commonStyles';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useRouter } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback } from 'react';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 30,
    marginBottom: 24,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#fff',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  email: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  roleBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: colors.accent,
  },
  roleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderRadius: 12,
    marginBottom: 10,
    minHeight: 65,
  },
  menuItemContent: {
    flex: 1,
    marginLeft: 16,
  },
  menuItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  menuItemSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
  },
  signOutButton: {
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 20,
    marginTop: 20,
  },
  footerText: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});

function ProfileScreenContent() {
  const router = useRouter();
  const { user, signOut } = useAuth();

  const handleEditProfile = useCallback(() => {
    try {
      router.push('/edit-profile');
    } catch (error) {
      console.error('Navigation error:', error);
    }
  }, [router]);

  const handleChangePassword = useCallback(() => {
    try {
      router.push('/forgot-password');
    } catch (error) {
      console.error('Navigation error:', error);
    }
  }, [router]);

  const handleUserManagement = useCallback(() => {
    try {
      router.push('/user-management');
    } catch (error) {
      console.error('Navigation error:', error);
    }
  }, [router]);

  const handleSignOut = useCallback(async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
            } catch (error) {
              console.error('Sign out error:', error);
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            }
          },
        },
      ]
    );
  }, [signOut]);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'super_admin':
      case 'super-admin':
        return 'Super Admin';
      case 'camp_admin':
      case 'camp-admin':
        return 'Camp Admin';
      case 'counselor':
        return 'Counselor';
      case 'parent':
        return 'Parent';
      default:
        return role;
    }
  };

  const userName = user?.fullName || user?.full_name || 'User';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.profileHeader}>
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>{getInitials(userName)}</Text>
        </View>
        <Text style={styles.name}>{userName}</Text>
        <Text style={styles.email}>{user?.email || ''}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>{getRoleLabel(user?.role || '')}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account Settings</Text>

        <TouchableOpacity onPress={handleEditProfile} activeOpacity={0.7}>
          <LinearGradient
            colors={['#2196F3', '#1976D2']}
            style={styles.menuItem}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <IconSymbol ios_icon_name="person.fill" android_material_icon_name="person" size={24} color="#fff" />
            <View style={styles.menuItemContent}>
              <Text style={styles.menuItemTitle}>Edit Profile</Text>
              <Text style={styles.menuItemSubtitle}>Update your personal information</Text>
            </View>
            <IconSymbol ios_icon_name="chevron.right" android_material_icon_name="chevron-right" size={20} color="rgba(255,255,255,0.7)" />
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleChangePassword} activeOpacity={0.7}>
          <LinearGradient
            colors={['#4CAF50', '#45a049']}
            style={styles.menuItem}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <IconSymbol ios_icon_name="lock.fill" android_material_icon_name="lock" size={24} color="#fff" />
            <View style={styles.menuItemContent}>
              <Text style={styles.menuItemTitle}>Change Password</Text>
              <Text style={styles.menuItemSubtitle}>Update your account password</Text>
            </View>
            <IconSymbol ios_icon_name="chevron.right" android_material_icon_name="chevron-right" size={20} color="rgba(255,255,255,0.7)" />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {(user?.role === 'super_admin' || user?.role === 'super-admin') && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Administration</Text>

          <TouchableOpacity onPress={handleUserManagement} activeOpacity={0.7}>
            <LinearGradient
              colors={['#9C27B0', '#7B1FA2']}
              style={styles.menuItem}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <IconSymbol ios_icon_name="person.badge.key.fill" android_material_icon_name="admin-panel-settings" size={24} color="#fff" />
              <View style={styles.menuItemContent}>
                <Text style={styles.menuItemTitle}>User Management</Text>
                <Text style={styles.menuItemSubtitle}>Manage staff and permissions</Text>
              </View>
              <IconSymbol ios_icon_name="chevron.right" android_material_icon_name="chevron-right" size={20} color="rgba(255,255,255,0.7)" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity onPress={handleSignOut} activeOpacity={0.7}>
        <LinearGradient
          colors={['#F44336', '#D32F2F']}
          style={styles.signOutButton}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={styles.signOutText}>Sign Out</Text>
        </LinearGradient>
      </TouchableOpacity>

      <View style={styles.footer}>
        <Text style={styles.footerText}>CampSync v1.0.0</Text>
        <Text style={[styles.footerText, { marginTop: 4 }]}>
          © 2026 CampSync. All rights reserved.
        </Text>
      </View>
    </ScrollView>
  );
}

function ProfileScreen() {
  return (
    <ProtectedRoute allowedRoles={['super_admin', 'super-admin', 'camp_admin', 'camp-admin', 'counselor', 'parent']}>
      <ProfileScreenContent />
    </ProtectedRoute>
  );
}

export default ProfileScreen;
