
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Alert,
  ScrollView,
  Animated,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { IconSymbol } from '@/components/IconSymbol';
import { colors, commonStyles } from '@/styles/commonStyles';
import NfcManager, { NfcTech, Ndef } from 'react-native-nfc-manager';
import { decryptWristbandData, WristbandCamperData } from '@/utils/wristbandEncryption';
import * as Network from 'expo-network';

const HEADER_MAX_HEIGHT = 180;
const HEADER_MIN_HEIGHT = 80;
const HEADER_SCROLL_DISTANCE = HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT;

function NFCScannerScreenContent() {
  const { hasPermission, isAuthenticated } = useAuth();
  const scrollY = useRef(new Animated.Value(0)).current;
  const [isScanning, setIsScanning] = useState(false);
  const [scannedData, setScannedData] = useState<(WristbandCamperData & { timestamp: number; isLocked: boolean }) | null>(null);
  const [nfcSupported, setNfcSupported] = useState(false);
  const [nfcEnabled, setNfcEnabled] = useState(false);
  const [nfcInitialized, setNfcInitialized] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  // Allow scanning if authenticated with permission OR if offline (emergency access)
  const canScan = isOffline || hasPermission(['super-admin', 'camp-admin', 'staff']);

  const headerHeight = scrollY.interpolate({
    inputRange: [0, HEADER_SCROLL_DISTANCE],
    outputRange: [HEADER_MAX_HEIGHT, HEADER_MIN_HEIGHT],
    extrapolate: 'clamp',
  });

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, HEADER_SCROLL_DISTANCE / 2, HEADER_SCROLL_DISTANCE],
    outputRange: [1, 0.5, 0],
    extrapolate: 'clamp',
  });

  // Check network status
  useEffect(() => {
    const checkNetwork = async () => {
      try {
        const networkState = await Network.getNetworkStateAsync();
        const offline = !networkState.isConnected || networkState.isInternetReachable === false;
        console.log('NFC Scanner - Network status:', offline ? 'OFFLINE' : 'ONLINE');
        setIsOffline(offline);
      } catch (error) {
        console.error('Error checking network:', error);
        setIsOffline(false);
      }
    };

    checkNetwork();
    const interval = setInterval(checkNetwork, 10000);
    return () => clearInterval(interval);
  }, []);

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
      console.log('Initializing NFC...');
      
      const supported = await NfcManager.isSupported();
      console.log('NFC supported:', supported);
      setNfcSupported(supported);
      
      if (supported) {
        await NfcManager.start();
        console.log('NFC manager started');
        
        const enabled = Platform.OS === 'ios' ? true : await NfcManager.isEnabled();
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
    if (!canScan && !isOffline) {
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
              if (Platform.OS === 'android') {
                NfcManager.goToNfcSetting();
              }
            }
          }
        ]
      );
      return;
    }

    console.log('User tapped Scan Wristband - Starting NFC scan...');
    if (isOffline) {
      console.log('🔌 OFFLINE MODE - Scanning wristband for offline data access');
    }
    
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
            console.log('Parent/Guardian:', decryptedData.parentGuardianName || 'Not set');
            console.log('Emergency Contact:', decryptedData.emergencyContactName || 'Not set');
            
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
  }, [canScan, nfcSupported, nfcEnabled, nfcInitialized, isOffline]);

  const camperAge = scannedData ? calculateAge(scannedData.dateOfBirth) : 0;
  const scanTimestamp = scannedData ? new Date(scannedData.timestamp).toLocaleString() : '';
  const lockStatusText = scannedData?.isLocked ? 'Locked & Secure' : 'Unlocked';
  const lockStatusColor = scannedData?.isLocked ? colors.success : colors.warning;
  const checkInStatusDisplay = scannedData?.checkInStatus === 'checked-in' ? 'Checked In' : 
                                scannedData?.checkInStatus === 'checked-out' ? 'Checked Out' : 'Not Arrived';

  const modeText = isOffline ? 'Offline Mode - Emergency Access' : 'Online Mode';
  const modeColor = isOffline ? colors.warning : colors.success;

  return (
    <View style={[commonStyles.container, styles.container]}>
      {/* Animated Header */}
      <Animated.View style={[styles.header, { height: headerHeight }]}>
        <Animated.View style={{ opacity: headerOpacity }}>
          <IconSymbol
            ios_icon_name="wave.3.right"
            android_material_icon_name="nfc"
            size={32}
            color="#FFFFFF"
          />
          <Text style={styles.headerTitle}>NFC Scanner</Text>
          <Text style={styles.headerSubtitle}>
            {isOffline ? 'Offline wristband scanning' : 'Scan wristbands to view camper details'}
          </Text>
        </Animated.View>
      </Animated.View>

      {/* Mode Status Banner */}
      <View style={[styles.statusBanner, { backgroundColor: modeColor }]}>
        <IconSymbol
          ios_icon_name={isOffline ? "wifi.slash" : "checkmark.circle.fill"}
          android_material_icon_name={isOffline ? "wifi-off" : "check-circle"}
          size={20}
          color="#FFFFFF"
        />
        <Text style={styles.statusText}>{modeText}</Text>
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
        <View style={[styles.statusBanner, { backgroundColor: colors.error }]}>
          <IconSymbol
            ios_icon_name="exclamationmark.triangle.fill"
            android_material_icon_name="warning"
            size={20}
            color="#FFFFFF"
          />
          <Text style={styles.statusText}>NFC is disabled - Enable in settings</Text>
        </View>
      )}

      <Animated.ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
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
            style={[styles.scanButton, (isScanning || !nfcSupported || !nfcEnabled || !nfcInitialized) && styles.scanButtonDisabled]}
            onPress={handleScan}
            disabled={isScanning || !nfcSupported || !nfcEnabled || !nfcInitialized}
            activeOpacity={0.7}
          >
            <Text style={styles.scanButtonText}>
              {!nfcInitialized ? 'Initializing...' : isScanning ? 'Scanning...' : 'Scan Wristband'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Scanned Camper Info */}
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
                    {scannedData.firstName}
                  </Text>
                  <Text style={styles.camperName}>
                    {scannedData.lastName}
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
                    <View style={{ flex: 1 }}>
                      <Text style={commonStyles.textSecondary}>
                        Swim Level:
                      </Text>
                      <Text style={commonStyles.textSecondary}>
                        {scannedData.swimLevel}
                      </Text>
                    </View>
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

              {/* Parent/Guardian Contact */}
              {scannedData.parentGuardianName && (
                <React.Fragment>
                  <View style={styles.infoRow}>
                    <IconSymbol
                      ios_icon_name="person.2.fill"
                      android_material_icon_name="people"
                      size={20}
                      color={colors.info}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={[commonStyles.textSecondary, { fontWeight: '700', marginBottom: 4 }]}>
                        Parent/Guardian:
                      </Text>
                      <Text style={commonStyles.textSecondary}>
                        {scannedData.parentGuardianName}
                      </Text>
                      {scannedData.parentGuardianPhone && (
                        <Text style={commonStyles.textSecondary}>
                          📞 {scannedData.parentGuardianPhone}
                        </Text>
                      )}
                      {scannedData.parentGuardianEmail && (
                        <Text style={commonStyles.textSecondary}>
                          ✉️ {scannedData.parentGuardianEmail}
                        </Text>
                      )}
                    </View>
                  </View>
                  <View style={commonStyles.divider} />
                </React.Fragment>
              )}

              {/* Emergency Contact */}
              {scannedData.emergencyContactName && (
                <React.Fragment>
                  <View style={styles.alertRow}>
                    <IconSymbol
                      ios_icon_name="phone.fill"
                      android_material_icon_name="phone"
                      size={20}
                      color={colors.error}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={[commonStyles.textSecondary, { color: colors.error, fontWeight: '700', marginBottom: 4 }]}>
                        Emergency Contact:
                      </Text>
                      <Text style={[commonStyles.textSecondary, { color: colors.error }]}>
                        {scannedData.emergencyContactName}
                      </Text>
                      {scannedData.emergencyContactPhone && (
                        <Text style={[commonStyles.textSecondary, { color: colors.error }]}>
                          📞 {scannedData.emergencyContactPhone}
                        </Text>
                      )}
                      {scannedData.emergencyContactRelationship && (
                        <Text style={[commonStyles.textSecondary, { color: colors.error }]}>
                          ({scannedData.emergencyContactRelationship})
                        </Text>
                      )}
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
                <View style={{ flex: 1 }}>
                  <Text style={commonStyles.textSecondary}>
                    Scanned:
                  </Text>
                  <Text style={commonStyles.textSecondary}>
                    {scanTimestamp}
                  </Text>
                </View>
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

        {/* Instructions */}
        {!scannedData && (
          <View style={styles.instructions}>
            <Text style={styles.instructionsTitle}>
              {isOffline ? 'Offline NFC Scanner' : 'NFC Scanner'}
            </Text>
            {isOffline && (
              <View style={styles.offlineWarning}>
                <IconSymbol
                  ios_icon_name="wifi.slash"
                  android_material_icon_name="wifi-off"
                  size={24}
                  color={colors.warning}
                />
                <Text style={styles.offlineWarningText}>
                  You are offline. You can still scan wristbands to view camper information stored on the wristbands.
                </Text>
              </View>
            )}
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
      </Animated.ScrollView>
    </View>
  );
}

export default function NFCScannerScreen() {
  return <NFCScannerScreenContent />;
}

const styles = StyleSheet.create({
  container: {
    paddingTop: Platform.OS === 'android' ? 48 : 0,
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
    backgroundColor: colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 12,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
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
  offlineWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.warningLight + '20',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.warning,
    marginBottom: 16,
  },
  offlineWarningText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.warning,
    flex: 1,
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
