
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { colors, commonStyles } from '@/styles/commonStyles';
import { LinearGradient } from 'expo-linear-gradient';
import NfcManager, { NfcTech, Ndef } from 'react-native-nfc-manager';
import { useAuth } from '@/contexts/AuthContext';
import { decryptWristbandData, WristbandCamperData } from '@/utils/wristbandEncryption';
import { IconSymbol } from '@/components/IconSymbol';

function NFCScannerScreenContent() {
  const { hasPermission } = useAuth();
  const [isScanning, setIsScanning] = useState(false);
  const [scannedData, setScannedData] = useState<(WristbandCamperData & { timestamp: number; isLocked: boolean }) | null>(null);
  const [nfcSupported, setNfcSupported] = useState(false);
  const [nfcEnabled, setNfcEnabled] = useState(false);
  const [nfcInitialized, setNfcInitialized] = useState(false);

  const canScan = hasPermission(['super-admin', 'camp-admin', 'staff']);

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
        
        console.log('NFC initialized successfully on Android');
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
  const checkInStatusDisplay = scannedData?.checkInStatus === 'checked-in' ? 'Checked In' : 
                                scannedData?.checkInStatus === 'checked-out' ? 'Checked Out' : 'Not Arrived';

  return (
    <View style={[commonStyles.container, styles.container]}>
      <LinearGradient
        colors={['#8B5CF6', '#6366F1']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerIcon}>
          <IconSymbol
            ios_icon_name="wave.3.right"
            android_material_icon_name="nfc"
            size={40}
            color="#FFFFFF"
          />
        </View>
        <Text style={styles.headerTitle}>NFC Scanner</Text>
        <Text style={styles.headerSubtitle}>
          Scan wristbands to view camper details
        </Text>
      </LinearGradient>

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
            <LinearGradient
              colors={['#8B5CF6', '#6366F1']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.scanButtonGradient}
            >
              <Text style={styles.scanButtonText}>
                {!nfcInitialized ? 'Initializing...' : isScanning ? 'Scanning...' : 'Scan Wristband'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {scannedData && (
          <View style={styles.camperInfoContainer}>
            <View style={commonStyles.card}>
              <View style={styles.camperHeader}>
                <View style={styles.camperAvatar}>
                  <IconSymbol
                    ios_icon_name="person.fill"
                    android_material_icon_name="person"
                    size={40}
                    color={colors.primary}
                  />
                </View>
                <View style={styles.camperInfo}>
                  <Text style={styles.camperName}>
                    {scannedData.firstName} {scannedData.lastName}
                  </Text>
                  <Text style={commonStyles.textSecondary}>
                    Age {camperAge}
                  </Text>
                  {scannedData.cabin && (
                    <Text style={commonStyles.textSecondary}>
                      {scannedData.cabin}
                    </Text>
                  )}
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor:
                        scannedData.checkInStatus === 'checked-in'
                          ? colors.success
                          : scannedData.checkInStatus === 'checked-out'
                          ? colors.warning
                          : colors.textSecondary,
                    },
                  ]}
                >
                  <Text style={styles.statusBadgeText}>
                    {checkInStatusDisplay}
                  </Text>
                </View>
              </View>

              <View style={commonStyles.divider} />

              {/* Activity Information */}
              {scannedData.swimLevel && (
                <React.Fragment>
                  <View style={styles.infoRow}>
                    <IconSymbol
                      ios_icon_name="figure.pool.swim"
                      android_material_icon_name="pool"
                      size={20}
                      color={colors.info}
                    />
                    <Text style={[commonStyles.textSecondary, { flex: 1 }]}>
                      Swim Level: {scannedData.swimLevel}
                    </Text>
                  </View>
                  <View style={commonStyles.divider} />
                </React.Fragment>
              )}

              {/* Medical Alerts */}
              {scannedData.allergies.length > 0 && (
                <React.Fragment>
                  <View style={styles.alertRow}>
                    <IconSymbol
                      ios_icon_name="exclamationmark.triangle.fill"
                      android_material_icon_name="warning"
                      size={20}
                      color={colors.error}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={[commonStyles.textSecondary, { color: colors.error, fontWeight: '700', marginBottom: 4 }]}>
                        Allergies:
                      </Text>
                      {scannedData.allergies.map((allergy, index) => (
                        <Text key={index} style={[commonStyles.textSecondary, { color: colors.error }]}>
                          • {allergy}
                        </Text>
                      ))}
                    </View>
                  </View>
                  <View style={commonStyles.divider} />
                </React.Fragment>
              )}

              {scannedData.medications.length > 0 && (
                <React.Fragment>
                  <View style={styles.alertRow}>
                    <IconSymbol
                      ios_icon_name="pills.fill"
                      android_material_icon_name="medication"
                      size={20}
                      color={colors.secondary}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={[commonStyles.textSecondary, { fontWeight: '700', marginBottom: 4 }]}>
                        Medications:
                      </Text>
                      {scannedData.medications.map((medication, index) => (
                        <Text key={index} style={commonStyles.textSecondary}>
                          • {medication}
                        </Text>
                      ))}
                    </View>
                  </View>
                  <View style={commonStyles.divider} />
                </React.Fragment>
              )}

              {/* Scan Details */}
              <View style={styles.infoRow}>
                <IconSymbol
                  ios_icon_name="calendar"
                  android_material_icon_name="calendar-today"
                  size={20}
                  color={colors.textSecondary}
                />
                <Text style={[commonStyles.textSecondary, { flex: 1 }]}>
                  Scanned: {scanTimestamp}
                </Text>
              </View>

              <View style={commonStyles.divider} />

              <View style={styles.infoRow}>
                <IconSymbol
                  ios_icon_name={scannedData.isLocked ? "lock.fill" : "lock.open.fill"}
                  android_material_icon_name={scannedData.isLocked ? "lock" : "lock-open"}
                  size={20}
                  color={lockStatusColor}
                />
                <Text style={[commonStyles.textSecondary, { flex: 1, color: lockStatusColor }]}>
                  {lockStatusText}
                </Text>
              </View>

              <View style={commonStyles.divider} />

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
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 32,
    alignItems: 'center',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
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
  },
  headerSubtitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
    opacity: 0.95,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
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
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  scanButtonDisabled: {
    opacity: 0.5,
  },
  scanButtonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 48,
  },
  scanButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  camperInfoContainer: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  camperHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  camperAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primaryLight + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  camperInfo: {
    flex: 1,
  },
  camperName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 12,
    gap: 8,
  },
  offlineNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.successLight + '20',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.success,
    marginTop: 12,
  },
  offlineNoticeText: {
    fontSize: 14,
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
