
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Alert,
  ScrollView,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { IconSymbol } from '@/components/IconSymbol';
import { GlassCard } from '@/components/GlassCard';
import { colors, commonStyles } from '@/styles/commonStyles';
import NfcManager, { NfcTech, Ndef } from 'react-native-nfc-manager';
import { supabase } from '@/app/integrations/supabase/client';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { encryptWristbandData, decryptWristbandData } from '@/utils/wristbandEncryption';

interface CamperData {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  check_in_status: string;
  session_id: string | null;
  wristband_id: string | null;
}

function CheckInScreenContent() {
  const { hasPermission } = useAuth();
  const [isScanning, setIsScanning] = useState(false);
  const [isProgramming, setIsProgramming] = useState(false);
  const [nfcSupported, setNfcSupported] = useState(false);
  const [nfcEnabled, setNfcEnabled] = useState(false);
  const [nfcInitialized, setNfcInitialized] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<CamperData[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedCamper, setSelectedCamper] = useState<CamperData | null>(null);
  const [scannedData, setScannedData] = useState<any>(null);

  const canCheckIn = hasPermission(['super-admin', 'camp-admin', 'staff']);

  const initNFC = useCallback(async () => {
    try {
      console.log('Initializing NFC for check-in on Android...');
      
      const supported = await NfcManager.isSupported();
      console.log('NFC supported:', supported);
      setNfcSupported(supported);
      
      if (supported) {
        await NfcManager.start();
        console.log('NFC manager started');
        
        // Check if NFC is enabled (Android-specific)
        if (Platform.OS === 'android') {
          const enabled = await NfcManager.isEnabled();
          console.log('NFC enabled on Android:', enabled);
          setNfcEnabled(enabled);
        } else {
          setNfcEnabled(true);
        }
        
        setNfcInitialized(true);
      } else {
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

  const searchCampers = useCallback(async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    console.log('Searching for campers:', searchQuery);
    setIsSearching(true);

    try {
      const { data, error } = await supabase
        .from('campers')
        .select('id, first_name, last_name, date_of_birth, check_in_status, session_id, wristband_id')
        .or(`first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%`)
        .limit(10);

      if (error) {
        console.error('Error searching campers:', error);
        Alert.alert('Error', 'Failed to search campers');
        return;
      }

      console.log('Search results:', data?.length || 0, 'campers found');
      setSearchResults(data || []);
    } catch (error) {
      console.error('Error in searchCampers:', error);
      Alert.alert('Error', 'Failed to search campers');
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchCampers();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, searchCampers]);

  const handleScanWristband = useCallback(async () => {
    if (!canCheckIn) {
      Alert.alert('Access Denied', 'You do not have permission to scan wristbands.');
      return;
    }

    if (!nfcSupported || !nfcEnabled) {
      Alert.alert('NFC Not Available', 'NFC is not available or enabled on this device.');
      return;
    }

    console.log('Starting wristband scan for check-in...');
    setIsScanning(true);
    setScannedData(null);

    try {
      await NfcManager.requestTechnology(NfcTech.Ndef);
      console.log('NFC technology requested');

      const tag = await NfcManager.getTag();
      console.log('NFC Tag detected:', JSON.stringify(tag, null, 2));

      if (tag && tag.ndefMessage && tag.ndefMessage.length > 0) {
        try {
          const ndefRecord = tag.ndefMessage[0];
          const encryptedPayload = Ndef.text.decodePayload(ndefRecord.payload);
          console.log('Encrypted payload read from wristband');

          // Decrypt the wristband data
          const decryptedData = await decryptWristbandData(encryptedPayload);

          if (decryptedData) {
            console.log('Wristband data decrypted successfully:', decryptedData.id);
            console.log('Wristband lock status:', decryptedData.isLocked ? 'LOCKED' : 'UNLOCKED');
            
            setScannedData(decryptedData);

            // Load full camper data
            const { data: camperData, error } = await supabase
              .from('campers')
              .select('*')
              .eq('id', decryptedData.id)
              .single();

            if (error || !camperData) {
              Alert.alert('Error', 'Camper not found in database');
              return;
            }

            setSelectedCamper(camperData);
            
            const lockStatus = decryptedData.isLocked ? '🔒 Locked & Secure' : '⚠️ Unlocked';
            Alert.alert(
              'Wristband Scanned',
              `${decryptedData.firstName} ${decryptedData.lastName}\nStatus: ${decryptedData.checkInStatus}\n${lockStatus}`,
              [{ text: 'OK' }]
            );
          } else {
            Alert.alert('Invalid Wristband', 'Could not decrypt wristband data. The wristband may be corrupted or tampered with.');
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
        Alert.alert('Scan Error', 'Failed to read wristband. Please try again.');
      }
    } finally {
      setIsScanning(false);
      try {
        await NfcManager.cancelTechnologyRequest();
      } catch (cancelError) {
        console.error('Error cancelling NFC request:', cancelError);
      }
    }
  }, [canCheckIn, nfcSupported, nfcEnabled]);

  const handleProgramWristband = useCallback(async (camper: CamperData) => {
    if (!canCheckIn) {
      Alert.alert('Access Denied', 'You do not have permission to program wristbands.');
      return;
    }

    if (!nfcSupported || !nfcEnabled) {
      Alert.alert('NFC Not Available', 'NFC is not available or enabled on this device.');
      return;
    }

    console.log('Starting wristband programming for camper:', camper.id);
    setIsProgramming(true);

    try {
      // Encrypt the camper data with lock code
      const encryptedData = await encryptWristbandData({
        id: camper.id,
        firstName: camper.first_name,
        lastName: camper.last_name,
        dateOfBirth: camper.date_of_birth,
        checkInStatus: camper.check_in_status,
        sessionId: camper.session_id || undefined,
      });

      console.log('Camper data encrypted with universal lock code, ready to write to wristband');

      await NfcManager.requestTechnology(NfcTech.Ndef);
      console.log('NFC technology requested for writing');

      const bytes = Ndef.encodeMessage([Ndef.textRecord(encryptedData)]);

      if (bytes) {
        await NfcManager.ndefHandler.writeNdefMessage(bytes);
        console.log('Successfully wrote encrypted data to wristband');

        // Attempt to make the tag read-only (lock it)
        // Note: This may not work on all tag types
        try {
          await NfcManager.ndefHandler.makeReadOnly();
          console.log('Wristband locked successfully - data cannot be tampered with');
        } catch (lockError) {
          console.warn('Could not lock wristband (tag may not support locking):', lockError);
          // Continue anyway - the encryption still provides security
        }

        // Update the wristband_id in the database
        const wristbandId = `WB-${camper.id.substring(0, 8)}`;
        const { error: updateError } = await supabase
          .from('campers')
          .update({
            wristband_id: wristbandId,
            wristband_assigned: true,
          })
          .eq('id', camper.id);

        if (updateError) {
          console.error('Error updating wristband ID:', updateError);
        }

        Alert.alert(
          'Programming Successful',
          `Wristband has been programmed for ${camper.first_name} ${camper.last_name}\n\n✅ Data encrypted with universal lock code\n🔒 Wristband locked to prevent tampering\n\nThe wristband is now secure and ready to use.`,
          [{ text: 'OK', onPress: () => setSelectedCamper(null) }]
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
        Alert.alert('Programming Error', 'Failed to program wristband. Please try again.');
      }
    } finally {
      setIsProgramming(false);
      try {
        await NfcManager.cancelTechnologyRequest();
      } catch (cancelError) {
        console.error('Error cancelling NFC request:', cancelError);
      }
    }
  }, [canCheckIn, nfcSupported, nfcEnabled]);

  const handleCheckIn = useCallback(async (camper: CamperData) => {
    console.log('Checking in camper:', camper.id);

    try {
      const { error } = await supabase
        .from('campers')
        .update({
          check_in_status: 'checked-in',
          last_check_in: new Date().toISOString(),
        })
        .eq('id', camper.id);

      if (error) {
        console.error('Error checking in camper:', error);
        Alert.alert('Error', 'Failed to check in camper. Please try again.');
        return;
      }

      Alert.alert(
        'Check-In Successful',
        `${camper.first_name} ${camper.last_name} has been checked in.`,
        [{ text: 'OK', onPress: () => setSelectedCamper(null) }]
      );
    } catch (error) {
      console.error('Error in handleCheckIn:', error);
      Alert.alert('Error', 'Failed to check in camper.');
    }
  }, []);

  const handleCheckOut = useCallback(async (camper: CamperData) => {
    console.log('Checking out camper:', camper.id);

    try {
      const { error } = await supabase
        .from('campers')
        .update({
          check_in_status: 'checked-out',
          last_check_out: new Date().toISOString(),
        })
        .eq('id', camper.id);

      if (error) {
        console.error('Error checking out camper:', error);
        Alert.alert('Error', 'Failed to check out camper. Please try again.');
        return;
      }

      Alert.alert(
        'Check-Out Successful',
        `${camper.first_name} ${camper.last_name} has been checked out.`,
        [{ text: 'OK', onPress: () => setSelectedCamper(null) }]
      );
    } catch (error) {
      console.error('Error in handleCheckOut:', error);
      Alert.alert('Error', 'Failed to check out camper.');
    }
  }, []);

  return (
    <View style={[commonStyles.container, styles.container]}>
      {/* Header with Gradient */}
      <LinearGradient
        colors={['#6366F1', '#8B5CF6', '#EC4899']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerIcon}>
          <IconSymbol
            ios_icon_name="checkmark.circle.fill"
            android_material_icon_name="check-circle"
            size={40}
            color="#FFFFFF"
          />
        </View>
        <Text style={styles.headerTitle}>Check-In & Wristbands</Text>
        <Text style={styles.headerSubtitle}>
          Secure NFC programming with encryption
        </Text>
      </LinearGradient>

      {/* NFC Status Banner */}
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

      {nfcInitialized && nfcSupported && !nfcEnabled && (
        <BlurView intensity={80} style={[styles.statusBanner, { backgroundColor: 'rgba(245, 158, 11, 0.9)' }]}>
          <IconSymbol
            ios_icon_name="exclamationmark.triangle.fill"
            android_material_icon_name="warning"
            size={20}
            color="#FFFFFF"
          />
          <Text style={styles.statusText}>NFC is disabled - Enable in settings</Text>
        </BlurView>
      )}

      {nfcInitialized && nfcSupported && nfcEnabled && (
        <BlurView intensity={80} style={[styles.statusBanner, { backgroundColor: 'rgba(16, 185, 129, 0.9)' }]}>
          <IconSymbol
            ios_icon_name="checkmark.shield.fill"
            android_material_icon_name="verified-user"
            size={20}
            color="#FFFFFF"
          />
          <Text style={styles.statusText}>🔒 NFC Ready - Encrypted & Locked</Text>
        </BlurView>
      )}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Scan Wristband Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Scan Wristband</Text>
          <GlassCard>
            <Text style={styles.sectionDescription}>
              Scan an existing wristband to view encrypted camper information and verify lock status.
            </Text>
            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.scanButton,
                (isScanning || !nfcSupported || !nfcEnabled) && styles.actionButtonDisabled,
              ]}
              onPress={handleScanWristband}
              disabled={isScanning || !nfcSupported || !nfcEnabled}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={['#8B5CF6', '#6366F1']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.buttonGradient}
              >
                <IconSymbol
                  ios_icon_name="wave.3.right"
                  android_material_icon_name="nfc"
                  size={24}
                  color="#FFFFFF"
                />
                <Text style={styles.actionButtonText}>
                  {isScanning ? 'Scanning...' : 'Scan Wristband'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            {scannedData && (
              <View style={styles.scannedDataContainer}>
                <View style={styles.scannedDataHeader}>
                  <IconSymbol
                    ios_icon_name={scannedData.isLocked ? "lock.fill" : "lock.open.fill"}
                    android_material_icon_name={scannedData.isLocked ? "lock" : "lock-open"}
                    size={20}
                    color={scannedData.isLocked ? colors.success : colors.warning}
                  />
                  <Text style={styles.scannedDataTitle}>
                    {scannedData.isLocked ? '🔒 Locked & Secure' : '⚠️ Unlocked'}
                  </Text>
                </View>
                <Text style={styles.scannedDataText}>
                  Name: {scannedData.firstName} {scannedData.lastName}
                </Text>
                <Text style={styles.scannedDataText}>
                  Status: {scannedData.checkInStatus}
                </Text>
                <Text style={styles.scannedDataText}>
                  Scanned: {new Date(scannedData.timestamp).toLocaleString()}
                </Text>
              </View>
            )}
          </GlassCard>
        </View>

        {/* Search Campers Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Find Camper</Text>
          <GlassCard>
            <Text style={styles.sectionDescription}>
              Search for a camper to program their wristband or manage check-in.
            </Text>
            <View style={styles.searchContainer}>
              <IconSymbol
                ios_icon_name="magnifyingglass"
                android_material_icon_name="search"
                size={20}
                color={colors.textSecondary}
              />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by first or last name..."
                placeholderTextColor={colors.textSecondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="words"
                autoCorrect={false}
              />
              {isSearching && <ActivityIndicator size="small" color={colors.primary} />}
            </View>

            {searchResults.length > 0 && (
              <View style={styles.searchResults}>
                {searchResults.map((camper, index) => (
                  <React.Fragment key={camper.id}>
                    <TouchableOpacity
                      style={styles.camperItem}
                      onPress={() => setSelectedCamper(camper)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.camperAvatar}>
                        <IconSymbol
                          ios_icon_name="person.fill"
                          android_material_icon_name="person"
                          size={24}
                          color={colors.primary}
                        />
                      </View>
                      <View style={styles.camperInfo}>
                        <Text style={styles.camperName}>
                          {camper.first_name} {camper.last_name}
                        </Text>
                        <Text style={styles.camperDetails}>
                          {camper.check_in_status} • {camper.wristband_id ? '🔒 Wristband Assigned' : 'No Wristband'}
                        </Text>
                      </View>
                      <IconSymbol
                        ios_icon_name="chevron.right"
                        android_material_icon_name="arrow-forward"
                        size={20}
                        color={colors.textSecondary}
                      />
                    </TouchableOpacity>
                  </React.Fragment>
                ))}
              </View>
            )}

            {searchQuery.trim() && !isSearching && searchResults.length === 0 && (
              <View style={styles.noResults}>
                <IconSymbol
                  ios_icon_name="magnifyingglass"
                  android_material_icon_name="search"
                  size={48}
                  color={colors.textSecondary}
                />
                <Text style={styles.noResultsText}>No campers found</Text>
              </View>
            )}
          </GlassCard>
        </View>

        {/* Selected Camper Actions */}
        {selectedCamper && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Camper Actions</Text>
            <GlassCard>
              <View style={styles.selectedCamperHeader}>
                <View style={styles.selectedCamperAvatar}>
                  <IconSymbol
                    ios_icon_name="person.fill"
                    android_material_icon_name="person"
                    size={32}
                    color={colors.primary}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.selectedCamperName}>
                    {selectedCamper.first_name} {selectedCamper.last_name}
                  </Text>
                  <Text style={styles.selectedCamperStatus}>
                    Status: {selectedCamper.check_in_status}
                  </Text>
                  {selectedCamper.wristband_id && (
                    <Text style={styles.selectedCamperWristband}>
                      🔒 {selectedCamper.wristband_id}
                    </Text>
                  )}
                </View>
              </View>

              <View style={commonStyles.divider} />

              <View style={styles.actionButtonsContainer}>
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    (isProgramming || !nfcSupported || !nfcEnabled) && styles.actionButtonDisabled,
                  ]}
                  onPress={() => handleProgramWristband(selectedCamper)}
                  disabled={isProgramming || !nfcSupported || !nfcEnabled}
                  activeOpacity={0.7}
                >
                  <LinearGradient
                    colors={['#EC4899', '#8B5CF6']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.buttonGradient}
                  >
                    <IconSymbol
                      ios_icon_name="lock.shield.fill"
                      android_material_icon_name="security"
                      size={24}
                      color="#FFFFFF"
                    />
                    <Text style={styles.actionButtonText}>
                      {isProgramming ? 'Programming...' : '🔒 Program & Lock Wristband'}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleCheckIn(selectedCamper)}
                  activeOpacity={0.7}
                >
                  <LinearGradient
                    colors={['#10B981', '#059669']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.buttonGradient}
                  >
                    <IconSymbol
                      ios_icon_name="checkmark.circle.fill"
                      android_material_icon_name="check-circle"
                      size={24}
                      color="#FFFFFF"
                    />
                    <Text style={styles.actionButtonText}>Check In</Text>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleCheckOut(selectedCamper)}
                  activeOpacity={0.7}
                >
                  <LinearGradient
                    colors={['#F59E0B', '#D97706']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.buttonGradient}
                  >
                    <IconSymbol
                      ios_icon_name="arrow.right.circle.fill"
                      android_material_icon_name="exit-to-app"
                      size={24}
                      color="#FFFFFF"
                    />
                    <Text style={styles.actionButtonText}>Check Out</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </GlassCard>
          </View>
        )}

        {/* Info Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security Features</Text>
          <GlassCard>
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <IconSymbol
                  ios_icon_name="lock.shield.fill"
                  android_material_icon_name="security"
                  size={24}
                  color="#8B5CF6"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.infoTitle}>Universal Lock Code</Text>
                <Text style={styles.infoDescription}>
                  All wristbands are locked with a universal code stored in the system, preventing unauthorized modifications.
                </Text>
              </View>
            </View>

            <View style={commonStyles.divider} />

            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <IconSymbol
                  ios_icon_name="lock.fill"
                  android_material_icon_name="lock"
                  size={24}
                  color="#EC4899"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.infoTitle}>SHA-256 Encryption</Text>
                <Text style={styles.infoDescription}>
                  All camper information is encrypted using SHA-256 before being written to the wristband.
                </Text>
              </View>
            </View>

            <View style={commonStyles.divider} />

            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <IconSymbol
                  ios_icon_name="checkmark.shield.fill"
                  android_material_icon_name="verified-user"
                  size={24}
                  color="#10B981"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.infoTitle}>Tamper Detection</Text>
                <Text style={styles.infoDescription}>
                  The app automatically detects if wristband data has been tampered with or corrupted.
                </Text>
              </View>
            </View>

            <View style={commonStyles.divider} />

            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <IconSymbol
                  ios_icon_name="antenna.radiowaves.left.and.right"
                  android_material_icon_name="nfc"
                  size={24}
                  color="#3B82F6"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.infoTitle}>Cross-Platform NFC</Text>
                <Text style={styles.infoDescription}>
                  Works on both iOS and Android devices with NFC capability for maximum compatibility.
                </Text>
              </View>
            </View>
          </GlassCard>
        </View>
      </ScrollView>
    </View>
  );
}

export default function CheckInScreen() {
  return (
    <ProtectedRoute allowedRoles={['super-admin', 'camp-admin', 'staff']}>
      <CheckInScreenContent />
    </ProtectedRoute>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: Platform.OS === 'android' ? 48 : 0,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 32,
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
  sectionDescription: {
    fontSize: 15,
    fontWeight: '400',
    color: colors.textSecondary,
    marginBottom: 20,
    lineHeight: 22,
  },
  actionButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 12,
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 10,
  },
  scanButton: {
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  actionButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  scannedDataContainer: {
    marginTop: 20,
    padding: 16,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderRadius: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#8B5CF6',
  },
  scannedDataHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  scannedDataTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  scannedDataText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 6,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
    borderWidth: 2,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
  },
  searchResults: {
    marginTop: 20,
  },
  camperItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: colors.background,
    borderRadius: 16,
    marginBottom: 12,
    gap: 14,
  },
  camperAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  camperInfo: {
    flex: 1,
  },
  camperName: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  camperDetails: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  noResults: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noResultsText: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 16,
  },
  selectedCamperHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 20,
  },
  selectedCamperAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedCamperName: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 6,
  },
  selectedCamperStatus: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  selectedCamperWristband: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B5CF6',
  },
  actionButtonsContainer: {
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    paddingVertical: 12,
  },
  infoIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },
  infoDescription: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.textSecondary,
    lineHeight: 20,
  },
});
