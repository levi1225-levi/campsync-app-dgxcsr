
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  TextInput,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { colors, commonStyles, buttonStyles } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { useAuth } from '@/contexts/AuthContext';
import {
  listAuthorizationCodes,
  createAuthorizationCode,
  deactivateAuthorizationCode,
} from '@/services/authorizationCode.service';
import { AuthorizationCode, AuthorizationCodeRole } from '@/types/authorizationCode';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ManageAuthorizationCodesScreen() {
  const { user, hasPermission } = useAuth();
  const insets = useSafeAreaInsets();
  const [codes, setCodes] = useState<AuthorizationCode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedRole, setSelectedRole] = useState<AuthorizationCodeRole>('staff');
  const [maxUses, setMaxUses] = useState('');
  const [expiryDays, setExpiryDays] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    loadCodes();
  }, []);

  const loadCodes = async () => {
    console.log('Loading authorization codes...');
    setIsLoading(true);
    try {
      const data = await listAuthorizationCodes();
      console.log('Loaded authorization codes:', data.length, 'codes');
      setCodes(data);
    } catch (error) {
      console.error('Error loading codes:', error);
      Alert.alert('Error', 'Failed to load authorization codes');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateCode = async () => {
    console.log('User tapped Generate Code button');
    setIsCreating(true);
    
    try {
      const params: any = {
        role: selectedRole,
      };

      if (maxUses) {
        params.max_uses = parseInt(maxUses, 10);
      }

      if (expiryDays) {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + parseInt(expiryDays, 10));
        params.expires_at = expiresAt;
      }

      console.log('Creating authorization code with params:', params);
      const newCode = await createAuthorizationCode(params);

      if (newCode) {
        console.log('Authorization code created successfully:', newCode.code);
        Alert.alert('Success', `Authorization code created: ${newCode.code}`);
        setShowCreateForm(false);
        setMaxUses('');
        setExpiryDays('');
        loadCodes();
      } else {
        console.error('Failed to create authorization code - returned null');
        Alert.alert('Error', 'Failed to create authorization code. Please try again.');
      }
    } catch (error: any) {
      console.error('Error creating code:', error);
      Alert.alert('Error', `An error occurred: ${error?.message || 'Unknown error'}`);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeactivateCode = async (codeId: string, code: string) => {
    Alert.alert(
      'Deactivate Code',
      `Are you sure you want to deactivate the code: ${code}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deactivate',
          style: 'destructive',
          onPress: async () => {
            const success = await deactivateAuthorizationCode(codeId);
            if (success) {
              Alert.alert('Success', 'Code deactivated');
              loadCodes();
            } else {
              Alert.alert('Error', 'Failed to deactivate code');
            }
          },
        },
      ]
    );
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

  // Check permissions
  if (!hasPermission(['super-admin', 'camp-admin'])) {
    return (
      <View style={[commonStyles.container, { paddingTop: Platform.OS === 'android' ? 48 + insets.top : insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={handleBack}
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          >
            <IconSymbol
              ios_icon_name="chevron.left"
              android_material_icon_name="arrow-back"
              size={24}
              color={colors.primary}
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Authorization Codes</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centerContent}>
          <IconSymbol
            ios_icon_name="exclamationmark.triangle.fill"
            android_material_icon_name="warning"
            size={64}
            color={colors.error}
          />
          <Text style={styles.errorText}>Access Denied</Text>
          <Text style={commonStyles.textSecondary}>
            You do not have permission to manage authorization codes
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[commonStyles.container, { paddingTop: Platform.OS === 'android' ? 48 + insets.top : insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={handleBack}
          hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
        >
          <IconSymbol
            ios_icon_name="chevron.left"
            android_material_icon_name="arrow-back"
            size={24}
            color={colors.primary}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Authorization Codes</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowCreateForm(!showCreateForm)}
          hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
        >
          <IconSymbol
            ios_icon_name={showCreateForm ? 'xmark' : 'plus'}
            android_material_icon_name={showCreateForm ? 'close' : 'add'}
            size={24}
            color={colors.primary}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Create Form */}
        {showCreateForm && (
          <View style={[commonStyles.card, styles.createForm]}>
            <Text style={styles.formTitle}>Create New Code</Text>

            <Text style={styles.label}>Role</Text>
            <View style={styles.roleSelector}>
              {(['staff', 'camp-admin'] as AuthorizationCodeRole[]).map((role) => (
                <TouchableOpacity
                  key={role}
                  style={[
                    styles.roleButton,
                    selectedRole === role && styles.roleButtonActive,
                  ]}
                  onPress={() => setSelectedRole(role)}
                >
                  <Text
                    style={[
                      styles.roleButtonText,
                      selectedRole === role && styles.roleButtonTextActive,
                    ]}
                  >
                    {role.replace('-', ' ').toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Max Uses (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Leave empty for unlimited"
              placeholderTextColor={colors.textSecondary}
              value={maxUses}
              onChangeText={setMaxUses}
              keyboardType="number-pad"
            />

            <Text style={styles.label}>Expiry (days, optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Leave empty for no expiry"
              placeholderTextColor={colors.textSecondary}
              value={expiryDays}
              onChangeText={setExpiryDays}
              keyboardType="number-pad"
            />

            <TouchableOpacity
              style={[buttonStyles.primary, { marginTop: 16 }]}
              onPress={handleCreateCode}
              disabled={isCreating}
            >
              {isCreating ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={buttonStyles.text}>Generate Code</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Codes List */}
        {isLoading ? (
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[commonStyles.textSecondary, { marginTop: 16 }]}>
              Loading authorization codes...
            </Text>
          </View>
        ) : codes.length === 0 ? (
          <View style={styles.centerContent}>
            <IconSymbol
              ios_icon_name="key.fill"
              android_material_icon_name="vpn-key"
              size={64}
              color={colors.textSecondary}
            />
            <Text style={styles.emptyText}>No authorization codes</Text>
            <Text style={commonStyles.textSecondary}>
              Create a code to get started
            </Text>
          </View>
        ) : (
          <View style={styles.codesList}>
            {codes.map((code) => (
              <View key={code.id} style={[commonStyles.card, styles.codeCard]}>
                <View style={styles.codeHeader}>
                  <View style={styles.codeInfo}>
                    <Text style={styles.codeText}>{code.code}</Text>
                    <View style={styles.codeBadge}>
                      <Text style={styles.codeBadgeText}>
                        {code.role.replace('-', ' ').toUpperCase()}
                      </Text>
                    </View>
                  </View>
                  {code.is_active && (
                    <TouchableOpacity
                      onPress={() => handleDeactivateCode(code.id, code.code)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <IconSymbol
                        ios_icon_name="xmark.circle.fill"
                        android_material_icon_name="cancel"
                        size={24}
                        color={colors.error}
                      />
                    </TouchableOpacity>
                  )}
                </View>

                <View style={styles.codeDetails}>
                  <View style={styles.codeDetailRow}>
                    <Text style={styles.codeDetailLabel}>Status:</Text>
                    <Text
                      style={[
                        styles.codeDetailValue,
                        { color: code.is_active ? colors.success : colors.error },
                      ]}
                    >
                      {code.is_active ? 'Active' : 'Inactive'}
                    </Text>
                  </View>

                  <View style={styles.codeDetailRow}>
                    <Text style={styles.codeDetailLabel}>Uses:</Text>
                    <Text style={styles.codeDetailValue}>
                      {code.used_count}
                      {code.max_uses ? ` / ${code.max_uses}` : ' / ∞'}
                    </Text>
                  </View>

                  {code.expires_at && (
                    <View style={styles.codeDetailRow}>
                      <Text style={styles.codeDetailLabel}>Expires:</Text>
                      <Text style={styles.codeDetailValue}>
                        {new Date(code.expires_at).toLocaleDateString()}
                      </Text>
                    </View>
                  )}

                  {code.linked_camper_ids && code.linked_camper_ids.length > 0 && (
                    <View style={styles.codeDetailRow}>
                      <Text style={styles.codeDetailLabel}>Linked Campers:</Text>
                      <Text style={styles.codeDetailValue}>
                        {code.linked_camper_ids.length}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: 8,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
    textAlign: 'center',
  },
  addButton: {
    padding: 8,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 120,
  },
  createForm: {
    marginBottom: 16,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginTop: 12,
    marginBottom: 8,
  },
  roleSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  roleButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
  },
  roleButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  roleButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  roleButtonTextActive: {
    color: '#FFFFFF',
  },
  input: {
    backgroundColor: colors.card,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  errorText: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  codesList: {
    gap: 12,
  },
  codeCard: {
    padding: 16,
  },
  codeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  codeInfo: {
    flex: 1,
  },
  codeText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  codeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  codeBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  codeDetails: {
    gap: 8,
  },
  codeDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  codeDetailLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  codeDetailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
});
