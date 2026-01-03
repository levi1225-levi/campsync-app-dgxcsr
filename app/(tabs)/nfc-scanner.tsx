
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Alert,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { IconSymbol } from '@/components/IconSymbol';
import { colors, commonStyles } from '@/styles/commonStyles';
import { mockCampers } from '@/data/mockCampers';
import { Camper } from '@/types/camper';
import NfcManager, { NfcTech, Ndef } from 'react-native-nfc-manager';
import { supabase } from '@/app/integrations/supabase/client';

function NFCScannerScreenContent() {
  const { hasPermission } = useAuth();
  const [isScanning, setIsScanning] = useState(false);
  const [scannedCamper, setScannedCamper] = useState<Camper | null>(null);
  const [nfcSupported, setNfcSupported] = useState(false);
  const [nfcEnabled, setNfcEnabled] = useState(false);

  const canScan = hasPermission(['super-admin', 'camp-admin', 'staff']);

  useEffect(() => {
    initNFC();
    
    return () => {
      cleanupNFC();
    };
  }, []);

  const initNFC = async () => {
    try {
      console.log('Initializing NFC...');
      const supported = await NfcManager.isSupported();
      console.log('NFC supported:', supported);
      setNfcSupported(supported);
      
      if (supported) {
        await NfcManager.start();
        const enabled = await NfcManager.isEnabled();
        console.log('NFC enabled:', enabled);
        setNfcEnabled(enabled);
        console.log('NFC initialized successfully');
      } else {
        console.log('NFC not supported on this device');
      }
    } catch (error) {
      console.error('Error initializing NFC:', error);
      Alert.alert('NFC Error', 'Failed to initialize NFC. Please check your device settings.');
    }
  };

  const cleanupNFC = async () => {
    try {
      await NfcManager.cancelTechnologyRequest();
      console.log('NFC cleanup complete');
    } catch (error) {
      console.error('Error cleaning up NFC:', error);
    }
  };

  const handleScan = useCallback(async () => {
    if (!canScan) {
      Alert.alert('Access Denied', 'You do not have permission to scan NFC wristbands.');
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

    console.log('Starting NFC scan...');
    setIsScanning(true);
    
    try {
      // Request NFC technology
      await NfcManager.requestTechnology(NfcTech.Ndef);
      console.log('NFC technology requested');
      
      // Read NFC tag
      const tag = await NfcManager.getTag();
      console.log('NFC Tag detected:', JSON.stringify(tag, null, 2));
      
      if (tag) {
        let wristbandId = '';
        
        // Try to read NDEF message
        if (tag.ndefMessage && tag.ndefMessage.length > 0) {
          try {
            const ndefRecord = tag.ndefMessage[0];
            const payload = Ndef.text.decodePayload(ndefRecord.payload);
            wristbandId = payload;
            console.log('NDEF payload:', payload);
          } catch (ndefError) {
            console.error('Error decoding NDEF:', ndefError);
          }
        }
        
        // Use tag ID as fallback
        if (!wristbandId && tag.id) {
          wristbandId = tag.id;
          console.log('Using tag ID:', tag.id);
        }
        
        if (wristbandId) {
          await lookupCamper(wristbandId);
        } else {
          Alert.alert('Invalid Tag', 'Could not read wristband ID. Please try again.');
        }
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
  }, [canScan, nfcSupported, nfcEnabled]);

  const lookupCamper = async (wristbandId: string) => {
    try {
      console.log('Looking up camper with wristband ID:', wristbandId);
      
      // Query Supabase for camper with this wristband ID
      const { data, error } = await supabase
        .from('campers')
        .select('*')
        .eq('wristband_id', wristbandId)
        .single();
      
      if (error) {
        console.error('Error looking up camper:', error);
        
        // Fallback to mock data for testing
        const mockCamper = mockCampers.find(c => c.wristbandId === wristbandId);
        if (mockCamper) {
          setScannedCamper(mockCamper);
          Alert.alert('Camper Found', `${mockCamper.firstName} ${mockCamper.lastName}`);
        } else {
          Alert.alert('Not Found', 'No camper found with this wristband ID.');
        }
        return;
      }
      
      if (data) {
        // Convert database record to Camper type
        const camper: Camper = {
          id: data.id,
          firstName: data.first_name,
          lastName: data.last_name,
          age: calculateAge(data.date_of_birth),
          cabin: 'TBD', // You may need to add cabin info to the database
          checkInStatus: data.check_in_status as any,
          wristbandId: data.wristband_id || '',
          medicalInfo: {
            allergies: [],
            medications: [],
            conditions: [],
            notes: '',
          },
        };
        
        setScannedCamper(camper);
        Alert.alert('Camper Found', `${camper.firstName} ${camper.lastName}`);
      } else {
        Alert.alert('Not Found', 'No camper found with this wristband ID.');
      }
    } catch (error) {
      console.error('Error in lookupCamper:', error);
      Alert.alert('Error', 'Failed to lookup camper information.');
    }
  };

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

  const handleCheckIn = useCallback(async () => {
    if (scannedCamper) {
      try {
        console.log('Checking in camper:', scannedCamper.id);
        // Update check-in status in database
        const { error } = await supabase
          .from('campers')
          .update({
            check_in_status: 'checked-in',
            last_check_in: new Date().toISOString(),
          })
          .eq('id', scannedCamper.id);
        
        if (error) {
          console.error('Error checking in camper:', error);
          Alert.alert('Error', 'Failed to check in camper. Please try again.');
          return;
        }
        
        Alert.alert(
          'Check In Successful',
          `${scannedCamper.firstName} ${scannedCamper.lastName} has been checked in.`,
          [{ text: 'OK', onPress: () => setScannedCamper(null) }]
        );
      } catch (error) {
        console.error('Error in handleCheckIn:', error);
        Alert.alert('Error', 'Failed to check in camper.');
      }
    }
  }, [scannedCamper]);

  const handleCheckOut = useCallback(async () => {
    if (scannedCamper) {
      try {
        console.log('Checking out camper:', scannedCamper.id);
        // Update check-out status in database
        const { error } = await supabase
          .from('campers')
          .update({
            check_in_status: 'checked-out',
            last_check_out: new Date().toISOString(),
          })
          .eq('id', scannedCamper.id);
        
        if (error) {
          console.error('Error checking out camper:', error);
          Alert.alert('Error', 'Failed to check out camper. Please try again.');
          return;
        }
        
        Alert.alert(
          'Check Out Successful',
          `${scannedCamper.firstName} ${scannedCamper.lastName} has been checked out.`,
          [{ text: 'OK', onPress: () => setScannedCamper(null) }]
        );
      } catch (error) {
        console.error('Error in handleCheckOut:', error);
        Alert.alert('Error', 'Failed to check out camper.');
      }
    }
  }, [scannedCamper]);

  const handleLogIncident = useCallback(() => {
    if (scannedCamper) {
      Alert.alert(
        'Log Incident',
        `Opening incident form for ${scannedCamper.firstName} ${scannedCamper.lastName}`,
        [{ text: 'OK' }]
      );
      // TODO: Navigate to incident logging screen with camper pre-filled
    }
  }, [scannedCamper]);

  return (
    <View style={[commonStyles.container, styles.container]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>NFC Scanner</Text>
        <Text style={styles.headerSubtitle}>
          Scan camper wristbands for quick access
        </Text>
      </View>

      {/* NFC Status */}
      {!nfcSupported && (
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
      
      {nfcSupported && !nfcEnabled && (
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
          {isScanning ? 'Hold wristband near device...' : 'Tap to scan NFC wristband'}
        </Text>

        <TouchableOpacity
          style={[styles.scanButton, (isScanning || !canScan || !nfcSupported || !nfcEnabled) && styles.scanButtonDisabled]}
          onPress={handleScan}
          disabled={isScanning || !canScan || !nfcSupported || !nfcEnabled}
          activeOpacity={0.8}
        >
          <Text style={styles.scanButtonText}>
            {isScanning ? 'Scanning...' : 'Start Scan'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Scanned Camper Info */}
      {scannedCamper && (
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
                  {scannedCamper.firstName} {scannedCamper.lastName}
                </Text>
                <Text style={commonStyles.textSecondary}>
                  Age {scannedCamper.age} • Cabin {scannedCamper.cabin}
                </Text>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor:
                      scannedCamper.checkInStatus === 'checked-in'
                        ? colors.success
                        : scannedCamper.checkInStatus === 'checked-out'
                        ? colors.warning
                        : colors.textSecondary,
                  },
                ]}
              >
                <Text style={styles.statusBadgeText}>
                  {scannedCamper.checkInStatus === 'checked-in'
                    ? 'Checked In'
                    : scannedCamper.checkInStatus === 'checked-out'
                    ? 'Checked Out'
                    : 'Not Arrived'}
                </Text>
              </View>
            </View>

            <View style={commonStyles.divider} />

            {/* Medical Alerts */}
            {scannedCamper.medicalInfo.allergies.length > 0 && (
              <View style={styles.alertRow}>
                <IconSymbol
                  ios_icon_name="exclamationmark.triangle.fill"
                  android_material_icon_name="warning"
                  size={20}
                  color={colors.error}
                />
                <Text style={[commonStyles.textSecondary, { color: colors.error }]}>
                  Allergies: {scannedCamper.medicalInfo.allergies.join(', ')}
                </Text>
              </View>
            )}

            {scannedCamper.medicalInfo.medications.length > 0 && (
              <View style={styles.alertRow}>
                <IconSymbol
                  ios_icon_name="pills.fill"
                  android_material_icon_name="medication"
                  size={20}
                  color={colors.secondary}
                />
                <Text style={commonStyles.textSecondary}>
                  Medications: {scannedCamper.medicalInfo.medications.join(', ')}
                </Text>
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.success }]}
                onPress={handleCheckIn}
                activeOpacity={0.8}
              >
                <IconSymbol
                  ios_icon_name="checkmark.circle.fill"
                  android_material_icon_name="check-circle"
                  size={24}
                  color="#FFFFFF"
                />
                <Text style={styles.actionButtonText}>Check In</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.warning }]}
                onPress={handleCheckOut}
                activeOpacity={0.8}
              >
                <IconSymbol
                  ios_icon_name="arrow.right.circle.fill"
                  android_material_icon_name="exit-to-app"
                  size={24}
                  color="#FFFFFF"
                />
                <Text style={styles.actionButtonText}>Check Out</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.actionButton, styles.incidentButton]}
              onPress={handleLogIncident}
              activeOpacity={0.8}
            >
              <IconSymbol
                ios_icon_name="exclamationmark.triangle.fill"
                android_material_icon_name="report"
                size={24}
                color="#FFFFFF"
              />
              <Text style={styles.actionButtonText}>Log Incident</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Instructions */}
      <View style={styles.instructions}>
        <Text style={styles.instructionsTitle}>How to use:</Text>
        <Text style={commonStyles.textSecondary}>
          1. Tap &quot;Start Scan&quot; button
        </Text>
        <Text style={commonStyles.textSecondary}>
          2. Hold the device near the camper&apos;s NFC wristband
        </Text>
        <Text style={commonStyles.textSecondary}>
          3. Wait for the scan to complete
        </Text>
        <Text style={commonStyles.textSecondary}>
          4. Review camper information and take action
        </Text>
      </View>
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
    paddingTop: Platform.OS === 'android' ? 48 : 0,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 24,
    backgroundColor: colors.accent,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    fontWeight: '400',
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
  },
  scannerCircleActive: {
    borderColor: colors.primary,
    backgroundColor: '#E3F2FD',
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
    backgroundColor: colors.background,
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
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: 16,
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
  },
  incidentButton: {
    backgroundColor: colors.secondary,
    marginTop: 12,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  instructions: {
    paddingHorizontal: 16,
    marginTop: 'auto',
    paddingBottom: 120,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
});
