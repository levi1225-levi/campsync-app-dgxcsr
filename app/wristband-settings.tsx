
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Share,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, commonStyles } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { GlassCard } from '@/components/GlassCard';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getWristbandLockCode } from '@/utils/wristbandEncryption';
import * as Clipboard from 'expo-clipboard';

function WristbandSettingsContent() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [showLockCode, setShowLockCode] = useState(true);
  
  const lockCode = getWristbandLockCode();
  const lockCodeDisplay = 'CAMPSYNC2024LOCK';

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

  const handleBack = () => {
    console.log('User tapped Back button');
    router.back();
  };

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
            Universal lock code and settings
          </Text>
        </LinearGradient>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Universal Lock Code Section - ALWAYS VISIBLE */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔐 Universal Lock Code</Text>
          <GlassCard>
            <View style={styles.lockCodeHeader}>
              <IconSymbol
                ios_icon_name="key.fill"
                android_material_icon_name="vpn-key"
                size={32}
                color="#8B5CF6"
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.lockCodeTitle}>CampSync System Lock Code</Text>
                <Text style={styles.lockCodeDescription}>
                  This code unlocks ALL wristbands programmed by CampSync
                </Text>
              </View>
            </View>

            <View style={commonStyles.divider} />

            {/* ALWAYS SHOW THE LOCK CODE */}
            <View style={styles.lockCodeDisplay}>
              <Text style={styles.lockCodeLabel}>Your Universal Lock Code:</Text>
              <Text style={styles.lockCodeText}>{lockCodeDisplay}</Text>
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
                  <Text style={styles.actionButtonText}>Copy Code</Text>
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
                  <Text style={styles.actionButtonText}>Share Code</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </GlassCard>
        </View>

        {/* Why Wristbands Get Locked */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔒 Why Wristbands Are Locked</Text>
          <GlassCard>
            <View style={styles.infoBox}>
              <IconSymbol
                ios_icon_name="checkmark.shield.fill"
                android_material_icon_name="verified-user"
                size={28}
                color="#10B981"
              />
              <Text style={styles.infoBoxText}>
                When you check in a camper, the wristband is automatically locked with the code <Text style={styles.codeInline}>{lockCodeDisplay}</Text> to prevent tampering and ensure data security.
              </Text>
            </View>
          </GlassCard>
        </View>

        {/* How to Unlock & Erase Wristbands */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📖 How to Unlock & Erase</Text>
          <GlassCard>
            <View style={styles.instructionStep}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.stepTitle}>Use the Check-Out Feature</Text>
                <Text style={styles.stepDescription}>
                  The easiest way is to use the Check-Out button in the Check-In screen. The system will automatically unlock and erase the wristband.
                </Text>
              </View>
            </View>

            <View style={commonStyles.divider} />

            <View style={styles.instructionStep}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.stepTitle}>Manual Unlock (Advanced)</Text>
                <Text style={styles.stepDescription}>
                  If you need to manually unlock a wristband, use an NFC app like &quot;NFC Tools&quot; and enter the lock code: <Text style={styles.codeInline}>{lockCodeDisplay}</Text>
                </Text>
              </View>
            </View>

            <View style={commonStyles.divider} />

            <View style={styles.instructionStep}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.stepTitle}>Reuse the Wristband</Text>
                <Text style={styles.stepDescription}>
                  After erasing, the wristband can be reprogrammed for a new camper using the Check-In screen.
                </Text>
              </View>
            </View>
          </GlassCard>
        </View>

        {/* Troubleshooting */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔧 Troubleshooting</Text>
          <GlassCard>
            <View style={styles.troubleshootItem}>
              <Text style={styles.troubleshootQuestion}>
                ❌ Error: &quot;Failed to unlock wristband&quot;
              </Text>
              <Text style={styles.troubleshootAnswer}>
                <Text style={styles.boldText}>Solution:</Text> Make sure you&apos;re using the correct lock code: <Text style={styles.codeInline}>{lockCodeDisplay}</Text>. The code is case-sensitive and must be entered exactly as shown.
              </Text>
            </View>

            <View style={commonStyles.divider} />

            <View style={styles.troubleshootItem}>
              <Text style={styles.troubleshootQuestion}>
                ❌ Error: &quot;Wristband is write-protected&quot;
              </Text>
              <Text style={styles.troubleshootAnswer}>
                <Text style={styles.boldText}>Solution:</Text> This is normal! The wristband is locked for security. Use the Check-Out feature in the app, which will automatically unlock it with the system code.
              </Text>
            </View>

            <View style={commonStyles.divider} />

            <View style={styles.troubleshootItem}>
              <Text style={styles.troubleshootQuestion}>
                ❓ Can I change the lock code?
              </Text>
              <Text style={styles.troubleshootAnswer}>
                <Text style={styles.boldText}>Answer:</Text> The lock code is set in the system configuration and applies to all wristbands. Changing it would require updating the app code. Already-programmed wristbands will keep their original lock code.
              </Text>
            </View>

            <View style={commonStyles.divider} />

            <View style={styles.troubleshootItem}>
              <Text style={styles.troubleshootQuestion}>
                ❓ What if I programmed a wristband and now can&apos;t erase it?
              </Text>
              <Text style={styles.troubleshootAnswer}>
                <Text style={styles.boldText}>Answer:</Text> Use the Check-Out feature in the Check-In screen. The system knows the lock code and will automatically unlock and erase the wristband. If that doesn&apos;t work, use an NFC app and manually enter: <Text style={styles.codeInline}>{lockCodeDisplay}</Text>
              </Text>
            </View>
          </GlassCard>
        </View>

        {/* Important Security Notes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚠️ Security Notes</Text>
          <GlassCard>
            <View style={styles.noteItem}>
              <IconSymbol
                ios_icon_name="exclamationmark.triangle.fill"
                android_material_icon_name="warning"
                size={24}
                color="#F59E0B"
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.noteTitle}>Keep the Code Secure</Text>
                <Text style={styles.noteDescription}>
                  This lock code protects all wristbands in your camp. Only share it with authorized administrators.
                </Text>
              </View>
            </View>

            <View style={commonStyles.divider} />

            <View style={styles.noteItem}>
              <IconSymbol
                ios_icon_name="lock.shield.fill"
                android_material_icon_name="security"
                size={24}
                color="#10B981"
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.noteTitle}>Universal Across All Wristbands</Text>
                <Text style={styles.noteDescription}>
                  This code works for ALL wristbands programmed by your CampSync system, ensuring consistent security and easy management.
                </Text>
              </View>
            </View>

            <View style={commonStyles.divider} />

            <View style={styles.noteItem}>
              <IconSymbol
                ios_icon_name="checkmark.shield.fill"
                android_material_icon_name="verified-user"
                size={24}
                color="#8B5CF6"
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.noteTitle}>Automatic Locking</Text>
                <Text style={styles.noteDescription}>
                  Wristbands are automatically locked after programming to prevent tampering. This ensures data integrity and camper safety.
                </Text>
              </View>
            </View>
          </GlassCard>
        </View>
      </ScrollView>
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
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#10B981',
  },
  infoBoxText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: colors.text,
    lineHeight: 22,
  },
  instructionStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    paddingVertical: 16,
  },
  stepNumber: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },
  stepDescription: {
    fontSize: 14,
    fontWeight: '400',
    color: '#6B7280',
    lineHeight: 20,
  },
  codeInline: {
    fontFamily: 'monospace',
    fontWeight: '700',
    color: '#8B5CF6',
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    fontSize: 15,
  },
  noteItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    paddingVertical: 12,
  },
  noteTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  noteDescription: {
    fontSize: 14,
    fontWeight: '400',
    color: '#6B7280',
    lineHeight: 20,
  },
  troubleshootItem: {
    paddingVertical: 12,
  },
  troubleshootQuestion: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
    lineHeight: 22,
  },
  troubleshootAnswer: {
    fontSize: 14,
    fontWeight: '400',
    color: '#6B7280',
    lineHeight: 22,
  },
  boldText: {
    fontWeight: '700',
    color: colors.text,
  },
});
