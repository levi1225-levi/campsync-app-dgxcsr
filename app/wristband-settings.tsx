
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Share,
  TextInput,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, commonStyles } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { GlassCard } from '@/components/GlassCard';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getWristbandLockCode, setWristbandLockCode, resetWristbandLockCode, clearLockCodeCache } from '@/utils/wristbandEncryption';
import * as Clipboard from 'expo-clipboard';

function WristbandSettingsContent() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [lockCode, setLockCode] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [showChangeModal, setShowChangeModal] = useState(false);
  const [newLockCode, setNewLockCode] = useState('');
  const [confirmLockCode, setConfirmLockCode] = useState('');
  const [isChanging, setIsChanging] = useState(false);

  useEffect(() => {
    loadLockCode();
  }, []);

  const loadLockCode = async () => {
    console.log('Loading current wristband lock code...');
    setIsLoading(true);
    try {
      const code = await getWristbandLockCode();
      setLockCode(code);
      console.log('Lock code loaded successfully');
    } catch (error) {
      console.error('Error loading lock code:', error);
      Alert.alert('Error', 'Failed to load lock code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyLockCode = async () => {
    console.log('User tapped Copy Lock Code');
    await Clipboard.setStringAsync(lockCode);
    Alert.alert(
      'Copied! ✅',
      'The wristband lock code has been copied to your clipboard.',
      [{ text: 'OK' }]
    );
  };

  const handleShareLockCode = async () => {
    console.log('User tapped Share Lock Code');
    try {
      await Share.share({
        message: `CampSync Wristband Lock Code: ${lockCode}\n\nThis code is used to unlock NFC wristbands programmed by the CampSync system. Keep this code secure and only share with authorized administrators.`,
        title: 'CampSync Wristband Lock Code',
      });
    } catch (error) {
      console.error('Error sharing lock code:', error);
    }
  };

  const handleChangeLockCode = () => {
    console.log('User tapped Change Lock Code');
    setNewLockCode('');
    setConfirmLockCode('');
    setShowChangeModal(true);
  };

  const handleSaveNewLockCode = async () => {
    console.log('User attempting to save new lock code');

    // Validation
    if (!newLockCode || !confirmLockCode) {
      Alert.alert('Error', 'Please enter and confirm the new lock code.');
      return;
    }

    if (newLockCode !== confirmLockCode) {
      Alert.alert('Error', 'Lock codes do not match. Please try again.');
      return;
    }

    if (newLockCode.length < 8) {
      Alert.alert('Error', 'Lock code must be at least 8 characters long.');
      return;
    }

    if (newLockCode.length > 32) {
      Alert.alert('Error', 'Lock code must be 32 characters or less.');
      return;
    }

    setIsChanging(true);

    try {
      const result = await setWristbandLockCode(newLockCode);

      if (!result.success) {
        Alert.alert('Error', result.error || 'Failed to update lock code');
        return;
      }

      // Clear cache and reload
      clearLockCodeCache();
      await loadLockCode();

      setShowChangeModal(false);
      Alert.alert(
        'Success! ✅',
        'Your wristband lock code has been updated successfully.\n\n⚠️ IMPORTANT: Make sure to share this new code with all authorized staff. Wristbands programmed with the old code can still be unlocked with the old code.',
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      console.error('Error changing lock code:', error);
      Alert.alert('Error', error.message || 'Failed to update lock code');
    } finally {
      setIsChanging(false);
    }
  };

  const handleResetToDefault = () => {
    console.log('User tapped Reset to Default');
    Alert.alert(
      'Reset to Default Code?',
      'This will reset your wristband lock code to the default: CAMPSYNC2024LOCK\n\nAre you sure you want to continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            setIsLoading(true);
            try {
              const result = await resetWristbandLockCode();
              if (!result.success) {
                Alert.alert('Error', result.error || 'Failed to reset lock code');
                return;
              }

              clearLockCodeCache();
              await loadLockCode();

              Alert.alert('Success! ✅', 'Lock code has been reset to default.');
            } catch (error: any) {
              console.error('Error resetting lock code:', error);
              Alert.alert('Error', error.message || 'Failed to reset lock code');
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleBack = () => {
    console.log('User tapped Back button');
    router.back();
  };

  const isDefaultCode = lockCode === 'CAMPSYNC2024LOCK';

  return (
    <View style={[commonStyles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.headerContainer}>
        <LinearGradient
          colors={['#6366F1', '#8B5CF6', '#EC4899']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
            activeOpacity={0.7}
          >
            <IconSymbol
              ios_icon_name="chevron.left"
              android_material_icon_name="arrow-back"
              size={24}
              color="#FFFFFF"
            />
          </TouchableOpacity>

          <View style={styles.headerIcon}>
            <IconSymbol
              ios_icon_name="lock.shield.fill"
              android_material_icon_name="security"
              size={40}
              color="#FFFFFF"
            />
          </View>
          <Text style={styles.headerTitle}>Wristband Security</Text>
          <Text style={styles.headerSubtitle}>
            Manage your custom lock code
          </Text>
        </LinearGradient>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Current Lock Code Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔐 Your Lock Code</Text>
          <GlassCard>
            <View style={styles.lockCodeHeader}>
              <IconSymbol
                ios_icon_name="key.fill"
                android_material_icon_name="vpn-key"
                size={32}
                color="#8B5CF6"
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.lockCodeTitle}>Current Wristband Lock Code</Text>
                <Text style={styles.lockCodeDescription}>
                  This code locks and unlocks ALL wristbands in your system
                </Text>
              </View>
            </View>

            <View style={commonStyles.divider} />

            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Loading lock code...</Text>
              </View>
            ) : (
              <>
                <View style={styles.lockCodeDisplay}>
                  <Text style={styles.lockCodeLabel}>Your Lock Code:</Text>
                  <Text style={styles.lockCodeText}>{lockCode}</Text>
                  {isDefaultCode && (
                    <View style={styles.defaultBadge}>
                      <Text style={styles.defaultBadgeText}>⚠️ Default Code</Text>
                    </View>
                  )}
                  <Text style={styles.lockCodeHint}>
                    Use this code to unlock any wristband programmed by this system
                  </Text>
                </View>

                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={handleCopyLockCode}
                    activeOpacity={0.7}
                  >
                    <LinearGradient
                      colors={['#6366F1', '#8B5CF6']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.buttonGradient}
                    >
                      <IconSymbol
                        ios_icon_name="doc.on.doc.fill"
                        android_material_icon_name="content-copy"
                        size={20}
                        color="#FFFFFF"
                      />
                      <Text style={styles.actionButtonText}>Copy</Text>
                    </LinearGradient>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={handleShareLockCode}
                    activeOpacity={0.7}
                  >
                    <LinearGradient
                      colors={['#10B981', '#059669']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.buttonGradient}
                    >
                      <IconSymbol
                        ios_icon_name="square.and.arrow.up.fill"
                        android_material_icon_name="share"
                        size={20}
                        color="#FFFFFF"
                      />
                      <Text style={styles.actionButtonText}>Share</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </GlassCard>
        </View>

        {/* Change Lock Code Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔧 Manage Lock Code</Text>
          <GlassCard>
            <TouchableOpacity
              style={styles.manageButton}
              onPress={handleChangeLockCode}
              activeOpacity={0.7}
            >
              <View style={styles.manageButtonIcon}>
                <IconSymbol
                  ios_icon_name="pencil.circle.fill"
                  android_material_icon_name="edit"
                  size={28}
                  color="#6366F1"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.manageButtonTitle}>Change Lock Code</Text>
                <Text style={styles.manageButtonDescription}>
                  Set a custom code to prevent unauthorized access
                </Text>
              </View>
              <IconSymbol
                ios_icon_name="chevron.right"
                android_material_icon_name="arrow-forward"
                size={20}
                color="#6B7280"
              />
            </TouchableOpacity>

            {!isDefaultCode && (
              <>
                <View style={commonStyles.divider} />
                <TouchableOpacity
                  style={styles.manageButton}
                  onPress={handleResetToDefault}
                  activeOpacity={0.7}
                >
                  <View style={[styles.manageButtonIcon, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                    <IconSymbol
                      ios_icon_name="arrow.counterclockwise.circle.fill"
                      android_material_icon_name="refresh"
                      size={28}
                      color="#EF4444"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.manageButtonTitle}>Reset to Default</Text>
                    <Text style={styles.manageButtonDescription}>
                      Restore the default lock code: CAMPSYNC2024LOCK
                    </Text>
                  </View>
                  <IconSymbol
                    ios_icon_name="chevron.right"
                    android_material_icon_name="arrow-forward"
                    size={20}
                    color="#6B7280"
                  />
                </TouchableOpacity>
              </>
            )}
          </GlassCard>
        </View>

        {/* Security Warning */}
        {isDefaultCode && (
          <View style={styles.section}>
            <GlassCard>
              <View style={styles.warningBox}>
                <IconSymbol
                  ios_icon_name="exclamationmark.triangle.fill"
                  android_material_icon_name="warning"
                  size={32}
                  color="#F59E0B"
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.warningTitle}>⚠️ Security Recommendation</Text>
                  <Text style={styles.warningDescription}>
                    You&apos;re using the default lock code. For better security, we recommend setting a custom code that only your authorized staff know.
                  </Text>
                </View>
              </View>
            </GlassCard>
          </View>
        )}

        {/* How It Works */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📖 How Lock Codes Work</Text>
          <GlassCard>
            <View style={styles.infoBox}>
              <IconSymbol
                ios_icon_name="lock.fill"
                android_material_icon_name="lock"
                size={28}
                color="#8B5CF6"
              />
              <Text style={styles.infoBoxText}>
                When you check in a camper, their wristband is automatically locked with your custom code. This prevents unauthorized people from tampering with or erasing the wristband data.
              </Text>
            </View>
            
            <View style={[styles.infoBox, { backgroundColor: 'rgba(16, 185, 129, 0.1)', borderColor: '#10B981', marginTop: 12 }]}>
              <IconSymbol
                ios_icon_name="lock.open.fill"
                android_material_icon_name="lock-open"
                size={28}
                color="#10B981"
              />
              <Text style={styles.infoBoxText}>
                ✅ NOT PERMANENT: Wristbands can be unlocked and erased using your lock code during check-out. The lock only prevents unauthorized modifications.
              </Text>
            </View>

            <View style={[styles.infoBox, { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: '#EF4444', marginTop: 12 }]}>
              <IconSymbol
                ios_icon_name="key.fill"
                android_material_icon_name="vpn-key"
                size={28}
                color="#EF4444"
              />
              <Text style={styles.infoBoxText}>
                🔐 IMPORTANT: Wristbands programmed with an old code will still need that old code to unlock. Changing your code only affects NEW wristbands you program.
              </Text>
            </View>
          </GlassCard>
        </View>

        {/* Security Best Practices */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🛡️ Security Best Practices</Text>
          <GlassCard>
            <View style={styles.practiceItem}>
              <View style={styles.practiceNumber}>
                <Text style={styles.practiceNumberText}>1</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.practiceTitle}>Use a Strong, Unique Code</Text>
                <Text style={styles.practiceDescription}>
                  Choose a code that&apos;s at least 12 characters long with a mix of letters, numbers, and symbols.
                </Text>
              </View>
            </View>

            <View style={commonStyles.divider} />

            <View style={styles.practiceItem}>
              <View style={styles.practiceNumber}>
                <Text style={styles.practiceNumberText}>2</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.practiceTitle}>Keep It Confidential</Text>
                <Text style={styles.practiceDescription}>
                  Only share the lock code with authorized administrators and staff who need it.
                </Text>
              </View>
            </View>

            <View style={commonStyles.divider} />

            <View style={styles.practiceItem}>
              <View style={styles.practiceNumber}>
                <Text style={styles.practiceNumberText}>3</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.practiceTitle}>Change Periodically</Text>
                <Text style={styles.practiceDescription}>
                  Consider changing your lock code at the start of each camp season for added security.
                </Text>
              </View>
            </View>

            <View style={commonStyles.divider} />

            <View style={styles.practiceItem}>
              <View style={styles.practiceNumber}>
                <Text style={styles.practiceNumberText}>4</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.practiceTitle}>Document Securely</Text>
                <Text style={styles.practiceDescription}>
                  Store your lock code in a secure password manager or locked file cabinet.
                </Text>
              </View>
            </View>
          </GlassCard>
        </View>
      </ScrollView>

      {/* Change Lock Code Modal */}
      <Modal
        visible={showChangeModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowChangeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change Lock Code</Text>
              <TouchableOpacity
                onPress={() => setShowChangeModal(false)}
                style={styles.modalCloseButton}
              >
                <IconSymbol
                  ios_icon_name="xmark.circle.fill"
                  android_material_icon_name="close"
                  size={28}
                  color="#6B7280"
                />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDescription}>
              Enter a new lock code for your wristbands. This code will be used to lock all future wristbands you program.
            </Text>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>New Lock Code</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter new lock code (8-32 characters)"
                placeholderTextColor="#9CA3AF"
                value={newLockCode}
                onChangeText={setNewLockCode}
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry={false}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Confirm Lock Code</Text>
              <TextInput
                style={styles.input}
                placeholder="Re-enter lock code to confirm"
                placeholderTextColor="#9CA3AF"
                value={confirmLockCode}
                onChangeText={setConfirmLockCode}
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry={false}
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setShowChangeModal(false)}
                disabled={isChanging}
              >
                <Text style={styles.modalButtonTextCancel}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSave]}
                onPress={handleSaveNewLockCode}
                disabled={isChanging}
              >
                {isChanging ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalButtonTextSave}>Save Code</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

export default function WristbandSettingsScreen() {
  return (
    <ProtectedRoute allowedRoles={['super-admin', 'camp-admin']}>
      <WristbandSettingsContent />
    </ProtectedRoute>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    overflow: 'hidden',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 32,
    alignItems: 'center',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  backButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  headerIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 8,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#FFFFFF',
    opacity: 0.95,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 120,
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 28,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  lockCodeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 20,
  },
  lockCodeTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  lockCodeDescription: {
    fontSize: 14,
    fontWeight: '400',
    color: '#6B7280',
    lineHeight: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 12,
  },
  lockCodeDisplay: {
    backgroundColor: '#1F2937',
    borderRadius: 16,
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 3,
    borderColor: '#8B5CF6',
  },
  lockCodeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9CA3AF',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  lockCodeText: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 3,
    fontFamily: 'monospace',
    marginBottom: 12,
  },
  defaultBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 12,
  },
  defaultBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F59E0B',
  },
  lockCodeHint: {
    fontSize: 13,
    fontWeight: '500',
    color: '#8B5CF6',
    textAlign: 'center',
    lineHeight: 18,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  manageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 16,
  },
  manageButtonIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  manageButtonTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  manageButtonDescription: {
    fontSize: 14,
    fontWeight: '400',
    color: '#6B7280',
    lineHeight: 20,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#F59E0B',
  },
  warningTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },
  warningDescription: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    lineHeight: 20,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#8B5CF6',
  },
  infoBoxText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: colors.text,
    lineHeight: 22,
  },
  practiceItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    paddingVertical: 16,
  },
  practiceNumber: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  practiceNumberText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  practiceTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },
  practiceDescription: {
    fontSize: 14,
    fontWeight: '400',
    color: '#6B7280',
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.background,
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 500,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
  },
  modalCloseButton: {
    padding: 4,
  },
  modalDescription: {
    fontSize: 15,
    fontWeight: '500',
    color: '#6B7280',
    lineHeight: 22,
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonCancel: {
    backgroundColor: '#E5E7EB',
  },
  modalButtonSave: {
    backgroundColor: colors.primary,
  },
  modalButtonTextCancel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  modalButtonTextSave: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
