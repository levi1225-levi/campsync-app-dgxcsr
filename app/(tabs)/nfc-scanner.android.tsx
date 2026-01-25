
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { IconSymbol } from '@/components/IconSymbol';
import { colors, commonStyles } from '@/styles/commonStyles';
import NfcManager, { NfcTech, Ndef } from 'react-native-nfc-manager';
import { LinearGradient } from 'expo-linear-gradient';
import { decryptWristbandData, WristbandCamperData } from '@/utils/wristbandEncryption';

function NFCScannerScreenContent() {
  const { hasPermission } = useAuth();
  const [isScanning, setIsScanning] = useState(false);
  const [scannedData, setScannedData] = useState<(WristbandCamperData & { timestamp: number; isLocked: boolean }) | null>(null);
  const [nfcSupported, setNfcSupported] = useState(false);
  const [nfcEnabled, setNfcEnabled] = useState(false);
  const [nfcInitialized, setNfcInitialized] = useState(false);

  const canScan = hasPermission(['super-admin', 'camp-admin', 'staff']);

  const calculateAge = (dateOfBirth: string): number => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const initNFC = useCallback(async () => {
    try {
      console.log('Initializing NFC on Android...');
      
      const supported = await NfcManager.isSupported();
      console.log('NFC supported:', supported);
      setNfcSupported(supported);
      
      if (supported) {
        await NfcManager.start();
        console.log('NFC manager started');
        
        const enabled = await NfcManager.isEnabled();
        console.log('NFC enabled:', enabled);
        setNfcEnabled(enabled);
        setNfcInitialized(true);
        
        console.log('NFC initialized successfully');
      } else {
        console.log('NFC not supported on this device');
        setNfcInitialized(true);
      }
    } catch (error) {
      console.error('Error initializing NFC:', error);
      setNfcInitialized(true);
    }
  }, []);

  const cleanupNFC = useCallback(async () => {
    try {
      await NfcManager.cancelTechnologyRequest();
      console.log('NFC cleanup complete');
    } catch (error) {
      console.error('Error cleaning up NFC:', error);
    }
  }, []);

  useEffect(() => {
    initNFC();
    
    return () => {
      cleanupNFC();
    };
  }, [initNFC, cleanupNFC]);

  const handleScan = useCallback(async () => {
    if (!canScan) {
      Alert.alert('Access Denied', 'You do not have permission to scan NFC wristbands.');
      return;
    }

    if (!nfcInitialized) {
      Alert.alert('NFC Initializing', 'Please wait for NFC to initialize.');
      return;
    }

    if (!nfcSupported) {
      Alert.alert('NFC Not Supported', 'Your device does not support NFC scanning.');
      return;
    }

    if (!nfcEnabled) {
      Alert.alert(
        'NFC Disabled',
        'Please enable NFC in your device settings to scan wristbands.',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Open Settings', 
            onPress: () => {
              NfcManager.goToNfcSetting();
            }
          }
        ]
      );
      return;
    }

    console.log('User tapped Scan Wristband - Starting NFC scan...');
    setIsScanning(true);
    setScannedData(null);
    
    try {
      await NfcManager.requestTechnology(NfcTech.Ndef);
      console.log('NFC technology requested');
      
      const tag = await NfcManager.getTag();
      console.log('NFC Tag detected');
      
      if (tag && tag.ndefMessage && tag.ndefMessage.length > 0) {
        try {
          const ndefRecord = tag.ndefMessage[0];
          const encryptedPayload = Ndef.text.decodePayload(ndefRecord.payload);
          console.log('Encrypted payload read from wristband');

          const decryptedData = await decryptWristbandData(encryptedPayload);

          if (decryptedData) {
            console.log('✅ Wristband data decrypted successfully - displaying offline data');
            console.log('Camper:', decryptedData.firstName, decryptedData.lastName);
            console.log('Allergies:', decryptedData.allergies.length);
            console.log('Medications:', decryptedData.medications.length);
            console.log('Swim Level:', decryptedData.swimLevel || 'Not set');
            console.log('Cabin:', decryptedData.cabin || 'Not assigned');
            
            setScannedData(decryptedData);
          } else {
            Alert.alert('Invalid Wristband', 'Could not decrypt wristband data. The wristband may be corrupted or from another system.');
          }
        } catch (decryptError) {
          console.error('Error decrypting wristband data:', decryptError);
          Alert.alert('Decryption Error', 'Failed to decrypt wristband data. The wristband may be corrupted.');
        }
      } else {
        Alert.alert('Empty Wristband', 'This wristband has not been programmed yet.');
      }
    } catch (error: any) {
      console.error('NFC scan error:', error);
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      if (errorMessage.includes('cancelled') || errorMessage.includes('cancel')) {
        console.log('NFC scan cancelled by user');
      } else {
        Alert.alert('Scan Error', 'Failed to read NFC tag. Please try again.');
      }
    } finally {
      setIsScanning(false);
      try {
        await NfcManager.cancelTechnologyRequest();
      } catch (cancelError) {
        console.error('Error cancelling NFC request:', cancelError);
      }
    }
  }, [canScan, nfcSupported, nfcEnabled, nfcInitialized]);

  const camperAge = scannedData ? calculateAge(scannedData.dateOfBirth) : 0;
  const scanTimestamp = scannedData ? new Date(scannedData.timestamp).toLocaleString() : '';
  const lockStatusText = scannedData?.isLocked ? 'Locked & Secure' : 'Unlocked';
  const lockStatusColor = scannedData?.isLocked ? colors.success : colors.warning;

  return (
    <View style={[commonStyles.container, styles.container]}>
      {/* Fixed Header */}
      <View style={styles.header}>
        <IconSymbol
          ios_icon_name="wave.3.right"
          android_material_icon_name="nfc"
          size={32}
          color="#FFFFFF"
        />
        <Text style={styles.headerTitle}>NFC Scanner</Text>
        <Text style={styles.headerSubtitle}>
          Scan wristbands to view camper details
        </Text>
      </View>

      {/* NFC Status */}
      {nfcInitialized && !nfcSupported && (
        <View style={[styles.statusBanner, { backgroundColor: colors.error }]}>
          <IconSymbol
            ios_icon_name="exclamationmark.triangle.fill"
            android_material_icon_name="error"
            size={20}
            color="#FFFFFF"
          />
          <Text style={styles.statusText}>NFC not supported on this device</Text>
        </View>
      )}
      
      {nfcInitialized && nfcSupported && !nfcEnabled && (
        <View style={[styles.statusBanner, { backgroundColor: colors.warning }]}>
          <IconSymbol
            ios_icon_name="exclamationmark.triangle.fill"
            android_material_icon_name="warning"
            size={20}
            color="#FFFFFF"
          />
          <Text style={styles.statusText}>NFC is disabled - Enable in settings</Text>
        </View>
      )}

      {nfcInitialized && nfcSupported && nfcEnabled && (
        <View style={[styles.statusBanner, { backgroundColor: colors.success }]}>
          <IconSymbol
            ios_icon_name="checkmark.circle.fill"
            android_material_icon_name="check-circle"
            size={20}
            color="#FFFFFF"
          />
          <Text style={styles.statusText}>NFC Ready - Offline Mode Enabled</Text>
        </View>
      )}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Scanner Area */}
        <View style={styles.scannerContainer}>
          <View style={[styles.scannerCircle, isScanning && styles.scannerCircleActive]}>
            <IconSymbol
              ios_icon_name="wave.3.right"
              android_material_icon_name="nfc"
              size={80}
              color={isScanning ? colors.primary : colors.textSecondary}
            />
          </View>

          <Text style={styles.scannerText}>
            {isScanning 
              ? 'Hold wristband near device...' 
              : 'Tap to scan NFC wristband'}
          </Text>

          <TouchableOpacity
            style={[styles.scanButton, (isScanning || !canScan || !nfcSupported || !nfcEnabled || !nfcInitialized) && styles.scanButtonDisabled]}
            onPress={handleScan}
            disabled={isScanning || !canScan || !nfcSupported || !nfcEnabled || !nfcInitialized}
            activeOpacity={0.7}
          >
            <Text style={styles.scanButtonText}>
              {!nfcInitialized ? 'Initializing...' : isScanning ? 'Scanning...' : 'Scan Wristband'}
            </Text>
          </TouchableOpacity>
        </View>

        {scannedData && (
          <View style={styles.camperDetailsContainer}>
            {/* Camper Header Card */}
            <View style={styles.camperHeaderCard}>
              <LinearGradient
                colors={['#6366F1', '#8B5CF6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.camperHeaderGradient}
              >
                <View style={styles.camperAvatarLarge}>
                  <IconSymbol
                    ios_icon_name="person.fill"
                    android_material_icon_name="person"
                    size={48}
                    color="#FFFFFF"
                  />
                </View>
                <Text style={styles.camperNameLarge}>
                  {scannedData.firstName}
                </Text>
                <Text style={styles.camperNameLarge}>
                  {scannedData.lastName}
                </Text>
                <View style={styles.camperAgeBadge}>
                  <Text style={styles.camperAgeText}>
                    Age {camperAge}
                  </Text>
                </View>
              </LinearGradient>
            </View>

            {/* Status Card */}
            <View style={commonStyles.card}>
              <View style={styles.statusRow}>
                <View style={styles.statusItem}>
                  <IconSymbol
                    ios_icon_name="checkmark.circle.fill"
                    android_material_icon_name="check-circle"
                    size={24}
                    color={colors.success}
                  />
                  <Text style={styles.statusLabel}>Status</Text>
                  <Text style={styles.statusValue}>{scannedData.checkInStatus}</Text>
                </View>
                <View style={styles.statusDivider} />
                <View style={styles.statusItem}>
                  <IconSymbol
                    ios_icon_name={scannedData.isLocked ? "lock.fill" : "lock.open.fill"}
                    android_material_icon_name={scannedData.isLocked ? "lock" : "lock-open"}
                    size={24}
                    color={lockStatusColor}
                  />
                  <Text style={styles.statusLabel}>Security</Text>
                  <Text style={styles.statusValue}>{lockStatusText}</Text>
                </View>
              </View>
            </View>

            {/* Medical Information Card */}
            {(scannedData.allergies.length > 0 || scannedData.medications.length > 0) && (
              <View style={commonStyles.card}>
                <View style={styles.sectionHeader}>
                  <IconSymbol
                    ios_icon_name="cross.case.fill"
                    android_material_icon_name="medical-services"
                    size={24}
                    color={colors.error}
                  />
                  <Text style={styles.sectionTitle}>Medical Information</Text>
                </View>

                {scannedData.allergies.length > 0 && (
                  <View style={styles.medicalSection}>
                    <View style={styles.medicalHeader}>
                      <IconSymbol
                        ios_icon_name="exclamationmark.triangle.fill"
                        android_material_icon_name="warning"
                        size={20}
                        color={colors.error}
                      />
                      <Text style={styles.medicalLabel}>Allergies</Text>
                    </View>
                    {scannedData.allergies.map((allergy, index) => (
                      <View key={index} style={styles.medicalItem}>
                        <View style={styles.medicalBullet} />
                        <Text style={styles.medicalText}>{allergy}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {scannedData.medications.length > 0 && (
                  <View style={styles.medicalSection}>
                    <View style={styles.medicalHeader}>
                      <IconSymbol
                        ios_icon_name="pills.fill"
                        android_material_icon_name="medication"
                        size={20}
                        color={colors.secondary}
                      />
                      <Text style={styles.medicalLabel}>Medications</Text>
                    </View>
                    {scannedData.medications.map((medication, index) => (
                      <View key={index} style={styles.medicalItem}>
                        <View style={styles.medicalBullet} />
                        <Text style={styles.medicalText}>{medication}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* Activity Information Card */}
            <View style={commonStyles.card}>
              <View style={styles.sectionHeader}>
                <IconSymbol
                  ios_icon_name="figure.pool.swim"
                  android_material_icon_name="pool"
                  size={24}
                  color={colors.info}
                />
                <Text style={styles.sectionTitle}>Activity Information</Text>
              </View>

              <View style={styles.infoRow}>
                <View style={styles.infoIconContainer}>
                  <IconSymbol
                    ios_icon_name="figure.pool.swim"
                    android_material_icon_name="pool"
                    size={20}
                    color={colors.info}
                  />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Swim Level</Text>
                  <Text style={styles.infoValue}>
                    {scannedData.swimLevel || 'Not set'}
                  </Text>
                </View>
              </View>

              <View style={commonStyles.divider} />

              <View style={styles.infoRow}>
                <View style={styles.infoIconContainer}>
                  <IconSymbol
                    ios_icon_name="house.fill"
                    android_material_icon_name="home"
                    size={20}
                    color={colors.accent}
                  />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Cabin Assignment</Text>
                  <Text style={styles.infoValue}>
                    {scannedData.cabin || 'Not assigned'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Scan Details Card */}
            <View style={commonStyles.card}>
              <View style={styles.sectionHeader}>
                <IconSymbol
                  ios_icon_name="info.circle.fill"
                  android_material_icon_name="info"
                  size={24}
                  color={colors.textSecondary}
                />
                <Text style={styles.sectionTitle}>Scan Details</Text>
              </View>

              <View style={styles.infoRow}>
                <View style={styles.infoIconContainer}>
                  <IconSymbol
                    ios_icon_name="calendar.fill"
                    android_material_icon_name="calendar-today"
                    size={20}
                    color={colors.textSecondary}
                  />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Scanned At</Text>
                  <Text style={styles.infoValue}>{scanTimestamp}</Text>
                </View>
              </View>

              <View style={commonStyles.divider} />

              <View style={styles.infoRow}>
                <View style={styles.infoIconContainer}>
                  <IconSymbol
                    ios_icon_name="wave.3.right"
                    android_material_icon_name="nfc"
                    size={20}
                    color={colors.primary}
                  />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Data Source</Text>
                  <Text style={styles.infoValue}>Offline - Wristband Storage</Text>
                </View>
              </View>
            </View>

            {/* Offline Notice */}
            <View style={styles.offlineNotice}>
              <IconSymbol
                ios_icon_name="wifi.slash"
                android_material_icon_name="wifi-off"
                size={20}
                color={colors.success}
              />
              <Text style={styles.offlineNoticeText}>
                ✅ All data loaded from wristband - No internet required
              </Text>
            </View>
          </View>
        )}

        {!scannedData && (
          <View style={styles.instructions}>
            <Text style={styles.instructionsTitle}>Offline NFC Scanner</Text>
            <View style={styles.instructionRow}>
              <View style={styles.instructionNumber}>
                <Text style={styles.instructionNumberText}>1</Text>
              </View>
              <Text style={commonStyles.textSecondary}>
                Tap &quot;Scan Wristband&quot; button above
              </Text>
            </View>
            <View style={styles.instructionRow}>
              <View style={styles.instructionNumber}>
                <Text style={styles.instructionNumberText}>2</Text>
              </View>
              <Text style={commonStyles.textSecondary}>
                Hold the device near the camper&apos;s NFC wristband
              </Text>
            </View>
            <View style={styles.instructionRow}>
              <View style={styles.instructionNumber}>
                <Text style={styles.instructionNumberText}>3</Text>
              </View>
              <Text style={commonStyles.textSecondary}>
                View complete camper details instantly - even offline
              </Text>
            </View>
            <View style={styles.instructionRow}>
              <View style={styles.instructionNumber}>
                <Text style={styles.instructionNumberText}>4</Text>
              </View>
              <Text style={commonStyles.textSecondary}>
                All data is encrypted and stored securely on the wristband
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

export default function NFCScannerScreen() {
  return (
    <ProtectedRoute allowedRoles={['super-admin', 'camp-admin', 'staff']}>
      <NFCScannerScreenContent />
    </ProtectedRoute>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 48,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 12,
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
    opacity: 0.9,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 120,
  },
  scannerContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  scannerCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 4,
    borderColor: colors.border,
    elevation: 4,
  },
  scannerCircleActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight + '20',
  },
  scannerText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 24,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  scanButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 12,
    elevation: 4,
  },
  scanButtonDisabled: {
    opacity: 0.5,
  },
  scanButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  camperDetailsContainer: {
    paddingHorizontal: 16,
    gap: 16,
  },
  camperHeaderCard: {
    borderRadius: 24,
    overflow: 'hidden',
    elevation: 6,
  },
  camperHeaderGradient: {
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  camperAvatarLarge: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  camperNameLarge: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  camperAgeBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    marginTop: 12,
  },
  camperAgeText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
  },
  statusDivider: {
    width: 1,
    height: 60,
    backgroundColor: colors.border,
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 8,
  },
  statusValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginTop: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  medicalSection: {
    marginBottom: 16,
  },
  medicalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  medicalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  medicalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    paddingLeft: 28,
  },
  medicalBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.error,
  },
  medicalText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text,
    flex: 1,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  infoIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  offlineNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.successLight + '20',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.success,
  },
  offlineNoticeText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.success,
    flex: 1,
  },
  instructions: {
    paddingHorizontal: 16,
    marginTop: 24,
    paddingBottom: 40,
  },
  instructionsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  instructionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  instructionNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  instructionNumberText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
