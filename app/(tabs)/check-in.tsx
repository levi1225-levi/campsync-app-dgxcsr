
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
import { colors, commonStyles } from '@/styles/commonStyles';
import NfcManager, { NfcTech, Ndef } from 'react-native-nfc-manager';
import { supabase } from '@/app/integrations/supabase/client';
import { LinearGradient } from 'expo-linear-gradient';
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
      console.log('Initializing NFC for check-in...');
      
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
      Alert.alert('NFC Not Available', 'NFC is not available on this device.');
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
            Alert.alert(
              'Wristband Scanned',
              `${decryptedData.firstName} ${decryptedData.lastName}\nStatus: ${decryptedData.checkInStatus}`,
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
      Alert.alert('NFC Not Available', 'NFC is not available on this device.');
      return;
    }

    console.log('Starting wristband programming for camper:', camper.id);
    setIsProgramming(true);

    try {
      // Encrypt the camper data
      const encryptedData = await encryptWristbandData({
        id: camper.id,
        firstName: camper.first_name,
        lastName: camper.last_name,
        dateOfBirth: camper.date_of_birth,
        checkInStatus: camper.check_in_status,
        sessionId: camper.session_id || undefined,
      });

      console.log('Camper data encrypted, ready to write to wristband');

      await NfcManager.requestTechnology(NfcTech.Ndef);
      console.log('NFC technology requested for writing');

      const bytes = Ndef.encodeMessage([Ndef.textRecord(encryptedData)]);

      if (bytes) {
        await NfcManager.ndefHandler.writeNdefMessage(bytes);
        console.log('Successfully wrote encrypted data to wristband');

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
          `Wristband has been programmed for ${camper.first_name} ${camper.last_name}\n\nThe wristband now contains encrypted camper information.`,
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
      {/* Header */}
      <LinearGradient
        colors={[colors.primary, colors.primaryDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <IconSymbol
          ios_icon_name="checkmark.circle.fill"
          android_material_icon_name="check-circle"
          size={32}
          color="#FFFFFF"
        />
        <Text style={styles.headerTitle}>Check-In & Wristbands</Text>
        <Text style={styles.headerSubtitle}>
          Program wristbands and manage check-ins
        </Text>
      </LinearGradient>

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
          <Text style={styles.statusText}>NFC Ready - Encrypted Read & Write</Text>
        </View>
      )}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Scan Wristband Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Scan Wristband</Text>
          <View style={commonStyles.card}>
            <Text style={styles.sectionDescription}>
              Scan an existing wristband to view encrypted camper information and check-in status.
            </Text>
            <TouchableOpacity
              style={[
                styles.actionButton,
                { backgroundColor: colors.accent },
                (isScanning || !nfcSupported || !nfcEnabled) && styles.actionButtonDisabled,
              ]}
              onPress={handleScanWristband}
              disabled={isScanning || !nfcSupported || !nfcEnabled}
              activeOpacity={0.7}
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
            </TouchableOpacity>

            {scannedData && (
              <View style={styles.scannedDataContainer}>
                <Text style={styles.scannedDataTitle}>Decrypted Data:</Text>
                <Text style={styles.scannedDataText}>
                  Name: {scannedData.firstName} {scannedData.lastName}
                </Text>
                <Text style={styles.scannedDataText}>
                  Status: {scannedData.checkInStatus}
                </Text>
                <Text style={styles.scannedDataText}>
                  Timestamp: {new Date(scannedData.timestamp).toLocaleString()}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Search Campers Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Find Camper</Text>
          <View style={commonStyles.card}>
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
                {searchResults.map((camper) => (
                  <TouchableOpacity
                    key={camper.id}
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
                        {camper.check_in_status} • {camper.wristband_id ? 'Wristband Assigned' : 'No Wristband'}
                      </Text>
                    </View>
                    <IconSymbol
                      ios_icon_name="chevron.right"
                      android_material_icon_name="arrow-forward"
                      size={20}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>
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
          </View>
        </View>

        {/* Selected Camper Actions */}
        {selectedCamper && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Camper Actions</Text>
            <View style={commonStyles.card}>
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
                      Wristband: {selectedCamper.wristband_id}
                    </Text>
                  )}
                </View>
              </View>

              <View style={commonStyles.divider} />

              <View style={styles.actionButtonsContainer}>
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    { backgroundColor: colors.secondary },
                    (isProgramming || !nfcSupported || !nfcEnabled) && styles.actionButtonDisabled,
                  ]}
                  onPress={() => handleProgramWristband(selectedCamper)}
                  disabled={isProgramming || !nfcSupported || !nfcEnabled}
                  activeOpacity={0.7}
                >
                  <IconSymbol
                    ios_icon_name="wave.3.right"
                    android_material_icon_name="nfc"
                    size={24}
                    color="#FFFFFF"
                  />
                  <Text style={styles.actionButtonText}>
                    {isProgramming ? 'Programming...' : 'Program Wristband'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: colors.success }]}
                  onPress={() => handleCheckIn(selectedCamper)}
                  activeOpacity={0.7}
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
                  onPress={() => handleCheckOut(selectedCamper)}
                  activeOpacity={0.7}
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
            </View>
          </View>
        )}

        {/* Info Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How It Works</Text>
          <View style={commonStyles.card}>
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <IconSymbol
                  ios_icon_name="lock.fill"
                  android_material_icon_name="lock"
                  size={24}
                  color={colors.accent}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.infoTitle}>Encrypted Data</Text>
                <Text style={styles.infoDescription}>
                  All camper information is encrypted before being written to the wristband using SHA-256 encryption.
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
                  color={colors.success}
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
                  ios_icon_name="arrow.clockwise"
                  android_material_icon_name="sync"
                  size={24}
                  color={colors.info}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.infoTitle}>Real-Time Updates</Text>
                <Text style={styles.infoDescription}>
                  Check-in status is updated in real-time and synced across all devices.
                </Text>
              </View>
            </View>
          </View>
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
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 32,
    alignItems: 'center',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
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
  section: {
    paddingHorizontal: 16,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  sectionDescription: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.textSecondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
    marginTop: 8,
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  scannedDataContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: colors.primaryLight + '20',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: colors.accent,
  },
  scannedDataTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  scannedDataText: {
    fontSize: 13,
    fontWeight: '400',
    color: colors.text,
    marginBottom: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '400',
    color: colors.text,
  },
  searchResults: {
    marginTop: 16,
  },
  camperItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: colors.background,
    borderRadius: 12,
    marginBottom: 8,
    gap: 12,
  },
  camperAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryLight + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  camperInfo: {
    flex: 1,
  },
  camperName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  camperDetails: {
    fontSize: 13,
    fontWeight: '400',
    color: colors.textSecondary,
  },
  noResults: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  noResultsText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.textSecondary,
    marginTop: 12,
  },
  selectedCamperHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  selectedCamperAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primaryLight + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedCamperName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  selectedCamperStatus: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: 2,
  },
  selectedCamperWristband: {
    fontSize: 13,
    fontWeight: '400',
    color: colors.accent,
  },
  actionButtonsContainer: {
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 8,
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  infoDescription: {
    fontSize: 13,
    fontWeight: '400',
    color: colors.textSecondary,
    lineHeight: 18,
  },
});
