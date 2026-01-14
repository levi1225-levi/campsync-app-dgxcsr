
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
import { supabase } from '@/app/integrations/supabase/client';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { encryptWristbandData, decryptWristbandData } from '@/utils/wristbandEncryption';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface CamperData {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  check_in_status: string;
  session_id: string | null;
  wristband_id: string | null;
}

function NFCScannerScreenContent() {
  const { hasPermission } = useAuth();
  const insets = useSafeAreaInsets();
  const [isScanning, setIsScanning] = useState(false);
  const [isWriting, setIsWriting] = useState(false);
  const [scannedCamper, setScannedCamper] = useState<CamperData | null>(null);
  const [scannedData, setScannedData] = useState<any>(null);
  const [nfcSupported, setNfcSupported] = useState(false);
  const [nfcEnabled, setNfcEnabled] = useState(false);
  const [nfcInitialized, setNfcInitialized] = useState(false);

  const canScan = hasPermission(['super-admin', 'camp-admin', 'staff']);

  const initNFC = useCallback(async () => {
    try {
      console.log('Initializing NFC on iOS...');
      
      const supported = await NfcManager.isSupported();
      console.log('NFC supported:', supported);
      setNfcSupported(supported);
      
      if (supported) {
        await NfcManager.start();
        console.log('NFC manager started successfully');
        
        setNfcEnabled(true);
        setNfcInitialized(true);
        
        console.log('NFC initialized successfully on iOS');
      } else {
        console.log('NFC not supported on this device');
        setNfcInitialized(true);
      }
    } catch (error) {
      console.error('Error initializing NFC:', error);
      setNfcInitialized(true);
      setNfcSupported(false);
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
      Alert.alert('NFC Not Supported', 'Your device does not support NFC scanning. Please ensure you are using an iPhone 7 or newer with iOS 16 or later.');
      return;
    }

    console.log('Starting NFC scan...');
    setIsScanning(true);
    setScannedData(null);
    setScannedCamper(null);
    
    try {
      await NfcManager.requestTechnology(NfcTech.Ndef);
      console.log('NFC technology requested successfully');
      
      const tag = await NfcManager.getTag();
      console.log('NFC Tag detected:', JSON.stringify(tag, null, 2));
      
      if (tag && tag.ndefMessage && tag.ndefMessage.length > 0) {
        try {
          const ndefRecord = tag.ndefMessage[0];
          const encryptedPayload = Ndef.text.decodePayload(ndefRecord.payload);
          console.log('Encrypted payload read from wristband');

          const decryptedData = await decryptWristbandData(encryptedPayload);

          if (decryptedData) {
            console.log('Wristband data decrypted successfully:', decryptedData.id);
            setScannedData(decryptedData);

            const { data: camperData, error } = await supabase
              .from('campers')
              .select('*')
              .eq('id', decryptedData.id)
              .single();

            if (error || !camperData) {
              Alert.alert('Error', 'Camper not found in database');
              return;
            }

            setScannedCamper(camperData);
            
            const lockStatus = decryptedData.isLocked ? '🔒 Locked & Secure' : '⚠️ Unlocked';
            Alert.alert(
              'Wristband Scanned',
              `${decryptedData.firstName} ${decryptedData.lastName}\n${lockStatus}`,
              [{ text: 'OK' }]
            );
          } else {
            Alert.alert('Invalid Wristband', 'Could not decrypt wristband data.');
          }
        } catch (decryptError) {
          console.error('Error decrypting wristband data:', decryptError);
          Alert.alert('Decryption Error', 'Failed to decrypt wristband data.');
        }
      } else {
        Alert.alert('Empty Wristband', 'This wristband has not been programmed yet.');
      }
    } catch (error: any) {
      console.error('NFC scan error:', error);
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      
      if (!errorMessage.includes('cancelled') && !errorMessage.includes('cancel')) {
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
  }, [canScan, nfcSupported, nfcInitialized]);

  const handleProgramWristband = useCallback(async () => {
    if (!scannedCamper) return;

    if (!canScan) {
      Alert.alert('Access Denied', 'You do not have permission to program wristbands.');
      return;
    }

    if (!nfcSupported) {
      Alert.alert('NFC Not Supported', 'Your device does not support NFC writing.');
      return;
    }

    console.log('Starting NFC write for camper:', scannedCamper.id);
    setIsWriting(true);

    try {
      const encryptedData = await encryptWristbandData({
        id: scannedCamper.id,
        firstName: scannedCamper.first_name,
        lastName: scannedCamper.last_name,
        dateOfBirth: scannedCamper.date_of_birth,
        checkInStatus: scannedCamper.check_in_status,
        sessionId: scannedCamper.session_id || undefined,
      });

      console.log('Camper data encrypted, ready to write to wristband');

      await NfcManager.requestTechnology(NfcTech.Ndef);
      console.log('NFC technology requested for writing');

      const bytes = Ndef.encodeMessage([Ndef.textRecord(encryptedData)]);
      
      if (bytes) {
        await NfcManager.ndefHandler.writeNdefMessage(bytes);
        console.log('Successfully wrote encrypted data to wristband');

        try {
          await NfcManager.ndefHandler.makeReadOnly();
          console.log('Wristband locked successfully');
        } catch (lockError) {
          console.warn('Could not lock wristband:', lockError);
        }

        const wristbandId = `WB-${scannedCamper.id.substring(0, 8)}`;
        const { error: updateError } = await supabase
          .from('campers')
          .update({
            wristband_id: wristbandId,
            wristband_assigned: true,
          })
          .eq('id', scannedCamper.id);

        if (updateError) {
          console.error('Error updating wristband ID:', updateError);
        }

        Alert.alert(
          'Programming Successful',
          `Wristband has been programmed for ${scannedCamper.first_name} ${scannedCamper.last_name}\n\n✅ Data encrypted\n🔒 Wristband locked`,
          [{ text: 'OK', onPress: () => { setScannedCamper(null); setScannedData(null); } }]
        );
      }
    } catch (error: any) {
      console.error('NFC write error:', error);
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      
      if (errorMessage.includes('cancelled') || errorMessage.includes('cancel')) {
        console.log('NFC write cancelled by user');
      } else if (errorMessage.includes('read-only') || errorMessage.includes('readonly')) {
        Alert.alert('Write Error', 'This wristband is read-only and cannot be programmed.');
      } else {
        Alert.alert('Write Error', 'Failed to write to NFC tag. Please try again.');
      }
    } finally {
      setIsWriting(false);
      try {
        await NfcManager.cancelTechnologyRequest();
      } catch (cancelError) {
        console.error('Error cancelling NFC request:', cancelError);
      }
    }
  }, [canScan, nfcSupported, scannedCamper]);

  return (
    <View style={[commonStyles.container, { paddingTop: insets.top }]}>
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
        <Text style={styles.headerTitle}>NFC Wristband Manager</Text>
        <Text style={styles.headerSubtitle}>
          Read and program camper wristbands
        </Text>
      </LinearGradient>

      {nfcInitialized && !nfcSupported && (
        <BlurView intensity={80} style={[styles.statusBanner, { backgroundColor: 'rgba(239, 68, 68, 0.9)' }]}>
          <IconSymbol
            ios_icon_name="exclamationmark.triangle.fill"
            android_material_icon_name="error"
            size={20}
            color="#FFFFFF"
          />
          <Text style={styles.statusText}>NFC not supported on this device</Text>
        </BlurView>
      )}

      {nfcInitialized && nfcSupported && nfcEnabled && (
        <BlurView intensity={80} style={[styles.statusBanner, { backgroundColor: 'rgba(139, 92, 246, 0.9)' }]}>
          <IconSymbol
            ios_icon_name="checkmark.shield.fill"
            android_material_icon_name="verified-user"
            size={20}
            color="#FFFFFF"
          />
          <Text style={styles.statusText}>NFC Ready - Read & Write Enabled</Text>
        </BlurView>
      )}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.scannerContainer}>
          <View style={[styles.scannerCircle, (isScanning || isWriting) && styles.scannerCircleActive]}>
            <IconSymbol
              ios_icon_name="wave.3.right"
              android_material_icon_name="nfc"
              size={80}
              color={(isScanning || isWriting) ? colors.primary : colors.textSecondary}
            />
          </View>

          <Text style={styles.scannerText}>
            {isWriting 
              ? 'Writing to wristband...' 
              : isScanning 
              ? 'Hold wristband near device...' 
              : 'Tap to scan NFC wristband'}
          </Text>

          <TouchableOpacity
            style={[styles.scanButton, (isScanning || isWriting || !canScan || !nfcSupported || !nfcInitialized) && styles.scanButtonDisabled]}
            onPress={handleScan}
            disabled={isScanning || isWriting || !canScan || !nfcSupported || !nfcInitialized}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={['#8B5CF6', '#6366F1']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.scanButtonGradient}
            >
              <Text style={styles.scanButtonText}>
                {!nfcInitialized ? 'Initializing...' : isWriting ? 'Writing...' : isScanning ? 'Scanning...' : 'Scan Wristband'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {scannedCamper && scannedData && (
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
                    {scannedCamper.first_name} {scannedCamper.last_name}
                  </Text>
                  <Text style={commonStyles.textSecondary}>
                    Status: {scannedCamper.check_in_status}
                  </Text>
                </View>
                <View style={[styles.lockBadge, { backgroundColor: scannedData.isLocked ? colors.success : colors.warning }]}>
                  <IconSymbol
                    ios_icon_name={scannedData.isLocked ? "lock.fill" : "lock.open.fill"}
                    android_material_icon_name={scannedData.isLocked ? "lock" : "lock-open"}
                    size={16}
                    color="#FFFFFF"
                  />
                  <Text style={styles.lockBadgeText}>
                    {scannedData.isLocked ? 'Locked' : 'Unlocked'}
                  </Text>
                </View>
              </View>

              <View style={commonStyles.divider} />

              <View style={styles.detailRow}>
                <IconSymbol
                  ios_icon_name="calendar.fill"
                  android_material_icon_name="calendar-today"
                  size={20}
                  color={colors.info}
                />
                <Text style={commonStyles.textSecondary}>
                  Scanned: {new Date(scannedData.timestamp).toLocaleString()}
                </Text>
              </View>

              {scannedCamper.wristband_id && (
                <View style={styles.detailRow}>
                  <IconSymbol
                    ios_icon_name="wave.3.right"
                    android_material_icon_name="nfc"
                    size={20}
                    color={colors.accent}
                  />
                  <Text style={commonStyles.textSecondary}>
                    Wristband ID: {scannedCamper.wristband_id}
                  </Text>
                </View>
              )}

              <TouchableOpacity
                style={[styles.actionButton, { marginTop: 20 }]}
                onPress={handleProgramWristband}
                disabled={isWriting || !nfcSupported}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={['#EC4899', '#8B5CF6']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.actionButtonGradient}
                >
                  <IconSymbol
                    ios_icon_name="lock.shield.fill"
                    android_material_icon_name="security"
                    size={24}
                    color="#FFFFFF"
                  />
                  <Text style={styles.actionButtonText}>
                    {isWriting ? 'Programming...' : 'Update Wristband Data'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={styles.instructions}>
          <Text style={styles.instructionsTitle}>NFC Wristband Manager</Text>
          <View style={styles.instructionRow}>
            <View style={styles.instructionNumber}>
              <Text style={styles.instructionNumberText}>1</Text>
            </View>
            <Text style={commonStyles.textSecondary}>
              Scan a wristband to read encrypted camper data
            </Text>
          </View>
          <View style={styles.instructionRow}>
            <View style={styles.instructionNumber}>
              <Text style={styles.instructionNumberText}>2</Text>
            </View>
            <Text style={commonStyles.textSecondary}>
              View camper information and wristband lock status
            </Text>
          </View>
          <View style={styles.instructionRow}>
            <View style={styles.instructionNumber}>
              <Text style={styles.instructionNumberText}>3</Text>
            </View>
            <Text style={commonStyles.textSecondary}>
              Update wristband if camper info has changed
            </Text>
          </View>
          <View style={styles.instructionRow}>
            <View style={styles.instructionNumber}>
              <Text style={styles.instructionNumberText}>4</Text>
            </View>
            <Text style={commonStyles.textSecondary}>
              All data is encrypted and locked for security
            </Text>
          </View>
        </View>
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
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 40,
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
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 8,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
    opacity: 0.95,
    textAlign: 'center',
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 10,
  },
  statusText: {
    fontSize: 15,
    fontWeight: '700',
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
  lockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  lockBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 12,
  },
  actionButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  actionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 10,
  },
  actionButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  instructions: {
    paddingHorizontal: 16,
    marginTop: 'auto',
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
