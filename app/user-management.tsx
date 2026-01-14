
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { IconSymbol } from '@/components/IconSymbol';
import { colors, commonStyles } from '@/styles/commonStyles';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/app/integrations/supabase/client';

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  role: string;
  registration_complete: boolean;
  created_at: string;
}

function UserManagementContent() {
  const router = useRouter();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      console.log('Loading all users...');
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading users:', error);
        Alert.alert('Error', 'Failed to load users');
        return;
      }

      console.log('Loaded users:', data?.length);
      setUsers(data || []);
    } catch (error) {
      console.error('Error loading users:', error);
      Alert.alert('Error', 'Failed to load users');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendPasswordReset = async (user: UserProfile) => {
    Alert.alert(
      'Send Password Reset',
      `Send a password reset link to ${user.email}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          onPress: async () => {
            try {
              console.log('Sending password reset to:', user.email);
              
              const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
                redirectTo: 'https://natively.dev/reset-password',
              });

              if (error) {
                console.error('Error sending password reset:', error);
                Alert.alert('Error', 'Failed to send password reset email');
                return;
              }

              Alert.alert(
                'Success',
                `Password reset link sent to ${user.email}. The user will receive an email with instructions to reset their password.`
              );
            } catch (error) {
              console.error('Error sending password reset:', error);
              Alert.alert('Error', 'Failed to send password reset email');
            }
          },
        },
      ]
    );
  };

  const handleDeleteUser = async (user: UserProfile) => {
    Alert.alert(
      'Delete User',
      `Are you sure you want to delete ${user.full_name} (${user.email})? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('Deleting user:', user.id);
              
              // Delete user profile (this will cascade to related records)
              const { error } = await supabase
                .from('user_profiles')
                .delete()
                .eq('id', user.id);

              if (error) {
                console.error('Error deleting user:', error);
                Alert.alert('Error', 'Failed to delete user');
                return;
              }

              Alert.alert('Success', 'User deleted successfully');
              loadUsers();
            } catch (error) {
              console.error('Error deleting user:', error);
              Alert.alert('Error', 'Failed to delete user');
            }
          },
        },
      ]
    );
  };

  const handleChangeRole = async (user: UserProfile) => {
    const roles = ['super-admin', 'camp-admin', 'staff', 'parent'];
    const roleLabels = {
      'super-admin': 'Super Admin',
      'camp-admin': 'Camp Admin',
      'staff': 'Staff',
      'parent': 'Parent',
    };

    Alert.alert(
      'Change Role',
      `Select new role for ${user.full_name}:`,
      [
        ...roles.map(role => ({
          text: roleLabels[role as keyof typeof roleLabels],
          onPress: async () => {
            try {
              console.log('Changing role for user:', user.id, 'to:', role);
              
              const { error } = await supabase
                .from('user_profiles')
                .update({ role })
                .eq('id', user.id);

              if (error) {
                console.error('Error changing role:', error);
                Alert.alert('Error', 'Failed to change role');
                return;
              }

              Alert.alert('Success', `Role changed to ${roleLabels[role as keyof typeof roleLabels]}`);
              loadUsers();
            } catch (error) {
              console.error('Error changing role:', error);
              Alert.alert('Error', 'Failed to change role');
            }
          },
        })),
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleToggleRegistrationComplete = async (user: UserProfile) => {
    const newStatus = !user.registration_complete;
    Alert.alert(
      'Toggle Registration Status',
      `Mark ${user.full_name}'s registration as ${newStatus ? 'complete' : 'incomplete'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              console.log('Toggling registration status for user:', user.id);
              
              const { error } = await supabase
                .from('user_profiles')
                .update({ registration_complete: newStatus })
                .eq('id', user.id);

              if (error) {
                console.error('Error updating registration status:', error);
                Alert.alert('Error', 'Failed to update registration status');
                return;
              }

              Alert.alert('Success', `Registration marked as ${newStatus ? 'complete' : 'incomplete'}`);
              loadUsers();
            } catch (error) {
              console.error('Error updating registration status:', error);
              Alert.alert('Error', 'Failed to update registration status');
            }
          },
        },
      ]
    );
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'super-admin':
        return colors.error;
      case 'camp-admin':
        return colors.primary;
      case 'staff':
        return colors.accent;
      case 'parent':
        return colors.secondary;
      default:
        return colors.textSecondary;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'super-admin':
        return 'Super Admin';
      case 'camp-admin':
        return 'Camp Admin';
      case 'staff':
        return 'Staff';
      case 'parent':
        return 'Parent';
      default:
        return role;
    }
  };

  const handleBack = () => {
    console.log('Navigating back to home screen');
    try {
      router.push('/(tabs)/(home)');
    } catch (error) {
      console.error('Navigation error:', error);
      router.back();
    }
  };

  const handleScroll = (event: any) => {
    const currentScrollY = event.nativeEvent.contentOffset.y;
    setScrollY(currentScrollY);
  };

  const filteredUsers = users.filter(user =>
    user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const headerHeight = Math.max(0, 140 - scrollY);
  const headerOpacity = Math.max(0, 1 - scrollY / 100);

  return (
    <View style={[commonStyles.container, styles.container]}>
      {/* Collapsible Header with Gradient */}
      {headerHeight > 0 && (
        <LinearGradient
          colors={[colors.error, '#C81E1E']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.header, { height: headerHeight, opacity: headerOpacity }]}
        >
          <View style={styles.headerTop}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleBack}
            >
              <IconSymbol
                ios_icon_name="chevron.left"
                android_material_icon_name="arrow-back"
                size={24}
                color="#FFFFFF"
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.refreshButton}
              onPress={loadUsers}
            >
              <IconSymbol
                ios_icon_name="arrow.clockwise"
                android_material_icon_name="refresh"
                size={24}
                color="#FFFFFF"
              />
            </TouchableOpacity>
          </View>
          <Text style={styles.headerTitle}>User Management</Text>
          <Text style={styles.headerSubtitle}>
            {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''}
          </Text>
        </LinearGradient>
      )}

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <IconSymbol
          ios_icon_name="magnifyingglass"
          android_material_icon_name="search"
          size={20}
          color={colors.textSecondary}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, email, or role..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <IconSymbol
              ios_icon_name="xmark.circle.fill"
              android_material_icon_name="cancel"
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Users List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[commonStyles.textSecondary, { marginTop: 16 }]}>
            Loading users...
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
        >
          {filteredUsers.length === 0 ? (
            <View style={styles.emptyState}>
              <IconSymbol
                ios_icon_name="person.slash.fill"
                android_material_icon_name="person-off"
                size={64}
                color={colors.textSecondary}
              />
              <Text style={styles.emptyText}>No users found</Text>
              <Text style={commonStyles.textSecondary}>
                {searchQuery ? 'Try a different search term' : 'No users in the system'}
              </Text>
            </View>
          ) : (
            filteredUsers.map((user, index) => (
              <React.Fragment key={index}>
                <TouchableOpacity
                  style={commonStyles.card}
                  onPress={() => setSelectedUser(selectedUser?.id === user.id ? null : user)}
                  activeOpacity={0.7}
                >
                  <View style={styles.userHeader}>
                    <View style={[styles.userAvatar, { backgroundColor: getRoleBadgeColor(user.role) + '20' }]}>
                      <IconSymbol
                        ios_icon_name="person.fill"
                        android_material_icon_name="person"
                        size={28}
                        color={getRoleBadgeColor(user.role)}
                      />
                    </View>
                    <View style={styles.userInfo}>
                      <Text style={commonStyles.cardTitle}>{user.full_name}</Text>
                      <Text style={commonStyles.textSecondary}>{user.email}</Text>
                    </View>
                    <View style={[styles.roleBadge, { backgroundColor: getRoleBadgeColor(user.role) }]}>
                      <Text style={styles.roleBadgeText}>{getRoleLabel(user.role)}</Text>
                    </View>
                  </View>

                  {/* Expanded Details */}
                  {selectedUser?.id === user.id && (
                    <>
                      <View style={commonStyles.divider} />
                      
                      {/* User Details */}
                      <View style={styles.detailRow}>
                        <IconSymbol
                          ios_icon_name="envelope.fill"
                          android_material_icon_name="email"
                          size={20}
                          color={colors.info}
                        />
                        <Text style={commonStyles.textSecondary}>Email: {user.email}</Text>
                      </View>

                      {user.phone && (
                        <View style={styles.detailRow}>
                          <IconSymbol
                            ios_icon_name="phone.fill"
                            android_material_icon_name="phone"
                            size={20}
                            color={colors.accent}
                          />
                          <Text style={commonStyles.textSecondary}>Phone: {user.phone}</Text>
                        </View>
                      )}

                      <View style={styles.detailRow}>
                        <IconSymbol
                          ios_icon_name="calendar.fill"
                          android_material_icon_name="calendar-today"
                          size={20}
                          color={colors.secondary}
                        />
                        <Text style={commonStyles.textSecondary}>
                          Joined: {new Date(user.created_at).toLocaleDateString()}
                        </Text>
                      </View>

                      <TouchableOpacity 
                        style={styles.detailRow}
                        onPress={() => handleToggleRegistrationComplete(user)}
                      >
                        <IconSymbol
                          ios_icon_name={user.registration_complete ? 'checkmark.circle.fill' : 'xmark.circle.fill'}
                          android_material_icon_name={user.registration_complete ? 'check-circle' : 'cancel'}
                          size={20}
                          color={user.registration_complete ? colors.success : colors.warning}
                        />
                        <Text style={commonStyles.textSecondary}>
                          Registration: {user.registration_complete ? 'Complete' : 'Incomplete'}
                        </Text>
                        <Text style={[commonStyles.textSecondary, { fontSize: 12, marginLeft: 8 }]}>
                          (Tap to toggle)
                        </Text>
                      </TouchableOpacity>

                      {/* Action Buttons */}
                      <View style={styles.actionButtons}>
                        <TouchableOpacity 
                          style={[styles.actionButton, { backgroundColor: colors.primary }]}
                          onPress={() => handleChangeRole(user)}
                        >
                          <IconSymbol
                            ios_icon_name="person.badge.key.fill"
                            android_material_icon_name="admin-panel-settings"
                            size={20}
                            color="#FFFFFF"
                          />
                          <Text style={[styles.actionButtonText, { color: '#FFFFFF' }]}>Change Role</Text>
                        </TouchableOpacity>

                        <TouchableOpacity 
                          style={[styles.actionButton, { backgroundColor: colors.accent }]}
                          onPress={() => handleSendPasswordReset(user)}
                        >
                          <IconSymbol
                            ios_icon_name="key.fill"
                            android_material_icon_name="vpn-key"
                            size={20}
                            color="#FFFFFF"
                          />
                          <Text style={[styles.actionButtonText, { color: '#FFFFFF' }]}>Reset Password</Text>
                        </TouchableOpacity>
                      </View>

                      <View style={styles.actionButtons}>
                        <TouchableOpacity 
                          style={[styles.actionButton, { backgroundColor: colors.error, flex: 1 }]}
                          onPress={() => handleDeleteUser(user)}
                        >
                          <IconSymbol
                            ios_icon_name="trash.fill"
                            android_material_icon_name="delete"
                            size={20}
                            color="#FFFFFF"
                          />
                          <Text style={[styles.actionButtonText, { color: '#FFFFFF' }]}>Delete User</Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  )}
                </TouchableOpacity>
              </React.Fragment>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

export default function UserManagementScreen() {
  return (
    <ProtectedRoute allowedRoles={['super-admin']}>
      <UserManagementContent />
    </ProtectedRoute>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: Platform.OS === 'android' ? 48 : 0,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButton: {
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
  },
  refreshButton: {
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
    opacity: 0.9,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    marginHorizontal: 16,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 12,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.08)',
    elevation: 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 120,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  userInfo: {
    flex: 1,
  },
  roleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 12,
    gap: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
    elevation: 2,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});
