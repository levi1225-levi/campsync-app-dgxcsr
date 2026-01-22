
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
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
import { encryptWristbandData, decryptWristbandData, WristbandCamperData } from '@/utils/wristbandEncryption';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface CamperData {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  check_in_status: string;
  session_id: string | null;
  wristband_id: string | null;
  swim_level: string | null;
  cabin_assignment: string | null;
}

function CheckInScreenContent() {
  const { hasPermission } = useAuth();
  const insets = useSafeAreaInsets();
  const [isScanning, setIsScanning] = useState(false);
  const [isProgramming, setIsProgramming] = useState(false);
  const [nfcSupported, setNfcSupported] = useState(false);
  const [nfcEnabled, setNfcEnabled] = useState(false);
  const [nfcInitialized, setNfcInitialized] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<CamperData[]>([]);
  const [allCampers, setAllCampers] = useState<CamperData[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedCamper, setSelectedCamper] = useState<CamperData | null>(null);
  const [scannedData, setScannedData] = useState<any>(null);

  const canCheckIn = hasPermission(['super-admin', 'camp-admin', 'staff']);

  const initNFC = useCallback(async () => {
    try {
      console.log('Initializing NFC for check-in on iOS...');
      
      const supported = await NfcManager.isSupported();
      console.log('NFC supported:', supported);
      setNfcSupported(supported);
      
      if (supported) {
        await NfcManager.start();
        console.log('NFC manager started');
        setNfcEnabled(true);
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

  // Load all campers once using RPC function to bypass RLS
  useEffect(() => {
    const loadAllCampers = async () => {
      console.log('Loading all campers for check-in search...');
      try {
        const { data, error } = await supabase.rpc('get_all_campers');
        
        if (error) {
          console.error('Error loading campers via RPC:', error);
          setAllCampers([]);
          return;
        }

        console.log('Loaded campers for search:', data?.length || 0);
        setAllCampers(data || []);
      } catch (error: any) {
        console.error('Error in loadAllCampers:', error);
        setAllCampers([]);
      }
    };

    loadAllCampers();
  }, []);

  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    searchTimeoutRef.current = setTimeout(() => {
      console.log('Searching for campers with query:', searchQuery);

      try {
        const query = searchQuery.toLowerCase().trim();
        const filtered = allCampers.filter(camper => {
          const fullName = `${camper.first_name} ${camper.last_name}`.toLowerCase();
          return fullName.includes(query);
        });

        console.log('Search results found:', filtered.length, 'campers');
        setSearchResults(filtered);
      } catch (error: any) {
        console.error('Error in search:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, allCampers]);

  const fetchComprehensiveCamperData = async (camperId: string): Promise<WristbandCamperData | null> => {
    try {
      console.log('Fetching comprehensive camper data for NFC write:', camperId);
      
      // Fetch camper basic info
      const { data: camperData, error: camperError } = await supabase
        .from('campers')
        .select('id, first_name, last_name, date_of_birth, check_in_status, session_id, swim_level, cabin_assignment')
        .eq('id', camperId)
        .single();
      
      if (camperError || !camperData) {
        console.error('Error fetching camper data:', camperError);
        return null;
      }
      
      // Fetch medical info
      const { data: medicalData, error: medicalError } = await supabase
        .from('camper_medical_info')
        .select('allergies, medications')
        .eq('camper_id', camperId)
        .maybeSingle();
      
      if (medicalError) {
        console.error('Error fetching medical data:', medicalError);
      }
      
      const allergiesList = medicalData?.allergies || [];
      const medicationsList = medicalData?.medications || [];
      
      const allergiesArray = Array.isArray(allergiesList) ? allergiesList : [];
      const medicationsArray = Array.isArray(medicationsList) ? medicationsList : [];
      
      console.log('Comprehensive data fetched:');
      console.log('- Name:', camperData.first_name, camperData.last_name);
      console.log('- Allergies:', allergiesArray.length);
      console.log('- Medications:', medicationsArray.length);
      console.log('- Swim Level:', camperData.swim_level || 'Not set');
      console.log('- Cabin:', camperData.cabin_assignment || 'Not assigned');
      
      return {
        id: camperData.id,
        firstName: camperData.first_name,
        lastName: camperData.last_name,
        dateOfBirth: camperData.date_of_birth,
        allergies: allergiesArray,
        medications: medicationsArray,
        swimLevel: camperData.swim_level,
        cabin: camperData.cabin_assignment,
        checkInStatus: 'checked-in',
        sessionId: camperData.session_id || undefined,
      };
    } catch (error) {
      console.error('Error in fetchComprehensiveCamperData:', error);
      return null;
    }
  };

  const writeNFCTag = useCallback(async (camper: CamperData) => {
    console.log('User tapped Check In - starting NFC write immediately for camper:', camper.id);
    setIsProgramming(true);
    let nfcWriteSuccess = false;

    try {
      // Fetch comprehensive data including medical info FIRST
      console.log('Fetching comprehensive camper data...');
      const comprehensiveData = await fetchComprehensiveCamperData(camper.id);
      
      if (!comprehensiveData) {
        throw new Error('Failed to fetch comprehensive camper data');
      }
      
      // Encrypt the comprehensive camper data
      console.log('Encrypting comprehensive camper data...');
      const encryptedData = await encryptWristbandData(comprehensiveData);
      console.log('Comprehensive camper data encrypted successfully, size:', encryptedData.length, 'bytes');

      // Request NFC technology - THIS MUST HAPPEN IMMEDIATELY
      console.log('Requesting NFC technology - hold wristband near device...');
      await NfcManager.requestTechnology(NfcTech.Ndef, {
        alertMessage: `Hold wristband near device to check in ${camper.first_name} ${camper.last_name}`,
      });
      console.log('NFC technology requested successfully');

      // Create NDEF message
      console.log('Creating NDEF message...');
      const bytes = Ndef.encodeMessage([Ndef.textRecord(encryptedData)]);

      if (!bytes) {
        throw new Error('Failed to encode NDEF message');
      }

      console.log('Writing NDEF message to NFC tag...');
      await NfcManager.ndefHandler.writeNdefMessage(bytes);
      console.log('NFC tag written successfully with offline data');
      nfcWriteSuccess = true;

      // Generate wristband ID from tag
      console.log('Getting tag ID...');
      const tag = await NfcManager.getTag();
      const wristbandId = tag?.id || `WB-${Date.now()}`;
      console.log('Wristband ID:', wristbandId);

      // Update database with wristband ID
      console.log('Updating database...');
      const { error: dbError } = await supabase
        .from('campers')
        .update({
          check_in_status: 'checked-in',
          last_check_in: new Date().toISOString(),
          wristband_id: wristbandId,
          wristband_assigned: true,
        })
        .eq('id', camper.id);

      if (dbError) {
        console.error('Database update error:', dbError);
        throw new Error(`Database update failed: ${dbError.message}`);
      }

      console.log('Database updated successfully');

      const offlineDataSummary = `
✅ Offline Data Written:
• Name: ${comprehensiveData.firstName} ${comprehensiveData.lastName}
• Allergies: ${comprehensiveData.allergies.length > 0 ? comprehensiveData.allergies.join(', ') : 'None'}
• Medications: ${comprehensiveData.medications.length > 0 ? comprehensiveData.medications.join(', ') : 'None'}
• Swim Level: ${comprehensiveData.swimLevel || 'Not set'}
• Cabin: ${comprehensiveData.cabin || 'Not assigned'}
      `.trim();

      Alert.alert(
        'Check-In Successful! ✅',
        `${camper.first_name} ${camper.last_name} has been checked in.\n\nWristband ID: ${wristbandId}\n\n${offlineDataSummary}`,
        [{ text: 'OK', onPress: () => {
          setSelectedCamper(null);
          setSearchQuery('');
          setSearchResults([]);
        }}]
      );
    } catch (error: any) {
      console.error('Error in writeNFCTag:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      
      let errorMessage = 'Failed to write to wristband. ';
      
      if (error.message?.includes('Database')) {
        errorMessage += 'The wristband was programmed but the database update failed. Please try again.';
      } else if (error.message?.includes('User canceled') || error.message?.includes('cancelled')) {
        errorMessage = 'NFC scan was canceled. Please try again.';
      } else if (error.message?.includes('timeout')) {
        errorMessage += 'NFC scan timed out. Make sure the wristband is close to your device.';
      } else if (nfcWriteSuccess) {
        errorMessage = 'The wristband was programmed successfully but there was an issue updating the database. Please contact support.';
      } else {
        errorMessage += 'Please make sure the wristband is writable and try again.';
      }
      
      Alert.alert(
        'Check-In Failed',
        errorMessage,
        [{ text: 'OK' }]
      );
    } finally {
      setIsProgramming(false);
      try {
        await NfcManager.cancelTechnologyRequest();
        console.log('NFC technology request canceled');
      } catch (cleanupError) {
        console.error('Error canceling NFC request:', cleanupError);
      }
    }
  }, []);

  const eraseNFCTag = useCallback(async (camper: CamperData) => {
    console.log('User tapped Check Out - starting NFC erase immediately for camper:', camper.id);
    setIsProgramming(true);
    let nfcEraseSuccess = false;

    try {
      // Request NFC technology - THIS MUST HAPPEN IMMEDIATELY
      console.log('Requesting NFC technology for erase - hold wristband near device...');
      await NfcManager.requestTechnology(NfcTech.Ndef, {
        alertMessage: `Hold wristband near device to check out ${camper.first_name} ${camper.last_name}`,
      });
      console.log('NFC technology requested for erase');

      // Write empty NDEF message to erase
      console.log('Creating empty NDEF message...');
      const emptyBytes = Ndef.encodeMessage([Ndef.textRecord('')]);

      if (!emptyBytes) {
        throw new Error('Failed to encode empty NDEF message');
      }

      console.log('Writing empty NDEF message to erase tag...');
      await NfcManager.ndefHandler.writeNdefMessage(emptyBytes);
      console.log('NFC tag erased successfully');
      nfcEraseSuccess = true;

      // Update database
      console.log('Updating database for check-out...');
      const { error: dbError } = await supabase
        .from('campers')
        .update({
          check_in_status: 'checked-out',
          last_check_out: new Date().toISOString(),
          wristband_id: null,
          wristband_assigned: false,
        })
        .eq('id', camper.id);

      if (dbError) {
        console.error('Database update error:', dbError);
        throw new Error(`Database update failed: ${dbError.message}`);
      }

      console.log('Database updated successfully for check-out');

      Alert.alert(
        'Check-Out Successful! ✅',
        `${camper.first_name} ${camper.last_name} has been checked out and their wristband has been erased to factory settings.`,
        [{ text: 'OK', onPress: () => {
          setSelectedCamper(null);
          setSearchQuery('');
          setSearchResults([]);
        }}]
      );
    } catch (error: any) {
      console.error('Error in eraseNFCTag:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      
      let errorMessage = 'Failed to erase wristband. ';
      
      if (error.message?.includes('Database')) {
        errorMessage += 'The wristband was erased but the database update failed. Please try again.';
      } else if (error.message?.includes('User canceled') || error.message?.includes('cancelled')) {
        errorMessage = 'NFC scan was canceled. Please try again.';
      } else if (error.message?.includes('timeout')) {
        errorMessage += 'NFC scan timed out. Make sure the wristband is close to your device.';
      } else if (nfcEraseSuccess) {
        errorMessage = 'The wristband was erased successfully but there was an issue updating the database. Please contact support.';
      } else {
        errorMessage += 'Please make sure the wristband is writable and try again.';
      }
      
      Alert.alert(
        'Check-Out Failed',
        errorMessage,
        [{ text: 'OK' }]
      );
    } finally {
      setIsProgramming(false);
      try {
        await NfcManager.cancelTechnologyRequest();
        console.log('NFC technology request canceled');
      } catch (cleanupError) {
        console.error('Error canceling NFC request:', cleanupError);
      }
    }
  }, []);

  const handleCheckIn = useCallback(async (camper: CamperData) => {
    console.log('User tapped Check In button for camper:', camper.id);

    if (!nfcSupported || !nfcEnabled) {
      Alert.alert(
        'NFC Not Available',
        'NFC is not supported or enabled on this device. Please enable NFC in your device settings.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Start NFC write IMMEDIATELY - no confirmation dialog
    writeNFCTag(camper);
  }, [nfcSupported, nfcEnabled, writeNFCTag]);

  const handleCheckOut = useCallback(async (camper: CamperData) => {
    console.log('User tapped Check Out button for camper:', camper.id);

    if (!nfcSupported || !nfcEnabled) {
      Alert.alert(
        'NFC Not Available',
        'NFC is not supported or enabled on this device. Please enable NFC in your device settings.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Show confirmation for check-out since it's destructive
    Alert.alert(
      'Check Out & Erase Wristband',
      `Are you sure you want to check out ${camper.first_name} ${camper.last_name}?\n\nThis will erase their wristband data to factory settings.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Check Out',
          style: 'destructive',
          onPress: () => eraseNFCTag(camper),
        },
      ]
    );
  }, [nfcSupported, nfcEnabled, eraseNFCTag]);

  return (
    <View style={[commonStyles.container, { paddingTop: insets.top }]}>
      {/* Fixed Header */}
      <View style={styles.headerContainer}>
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
          <Text style={styles.headerTitle}>Check-In & Check-Out</Text>
          <Text style={styles.headerSubtitle}>
            Manage camper arrivals and departures
          </Text>
        </LinearGradient>
      </View>

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
        <BlurView intensity={80} style={[styles.statusBanner, { backgroundColor: 'rgba(16, 185, 129, 0.9)' }]}>
          <IconSymbol
            ios_icon_name="checkmark.shield.fill"
            android_material_icon_name="verified-user"
            size={20}
            color="#FFFFFF"
          />
          <Text style={styles.statusText}>🔒 NFC Ready - Full Offline Mode</Text>
        </BlurView>
      )}

      {isProgramming && (
        <BlurView intensity={80} style={[styles.statusBanner, { backgroundColor: 'rgba(99, 102, 241, 0.9)' }]}>
          <ActivityIndicator size="small" color="#FFFFFF" />
          <Text style={styles.statusText}>Hold wristband near device...</Text>
        </BlurView>
      )}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Find Camper</Text>
          <GlassCard>
            <Text style={styles.sectionDescription}>
              Search for a camper to check them in or out of camp.
            </Text>
            <View style={styles.searchContainer}>
              <IconSymbol
                ios_icon_name="magnifyingglass"
                android_material_icon_name="search"
                size={20}
                color="#1F2937"
              />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by first or last name..."
                placeholderTextColor="#9CA3AF"
                value={searchQuery}
                onChangeText={(text) => {
                  console.log('User searching for:', text);
                  setSearchQuery(text);
                }}
                autoCapitalize="words"
                autoCorrect={false}
              />
              {isSearching && <ActivityIndicator size="small" color={colors.primary} />}
            </View>

            {searchResults.length > 0 && (
              <View style={styles.searchResults}>
                {searchResults.map((camper) => (
                  <React.Fragment key={camper.id}>
                    <TouchableOpacity
                      style={styles.camperItem}
                      onPress={() => {
                        console.log('User selected camper:', camper.first_name, camper.last_name);
                        setSelectedCamper(camper);
                      }}
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
                        color="#6B7280"
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
                  color="#9CA3AF"
                />
                <Text style={styles.noResultsText}>No campers found</Text>
                <Text style={styles.noResultsSubtext}>Try a different search term</Text>
              </View>
            )}
          </GlassCard>
        </View>

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
                  style={styles.actionButton}
                  onPress={() => handleCheckIn(selectedCamper)}
                  activeOpacity={0.7}
                  disabled={isProgramming}
                >
                  <LinearGradient
                    colors={isProgramming ? ['#9CA3AF', '#6B7280'] : ['#10B981', '#059669']}
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
                    <Text style={styles.actionButtonText}>Check In & Program Wristband</Text>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleCheckOut(selectedCamper)}
                  activeOpacity={0.7}
                  disabled={isProgramming}
                >
                  <LinearGradient
                    colors={isProgramming ? ['#9CA3AF', '#6B7280'] : ['#F59E0B', '#D97706']}
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
                    <Text style={styles.actionButtonText}>Check Out & Erase Wristband</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </GlassCard>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About Check-In/Out</Text>
          <GlassCard>
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <IconSymbol
                  ios_icon_name="checkmark.circle.fill"
                  android_material_icon_name="check-circle"
                  size={24}
                  color="#10B981"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.infoTitle}>Full Offline Capabilities</Text>
                <Text style={styles.infoDescription}>
                  Wristbands now store comprehensive camper data including name, allergies, medications, swim level, and cabin assignment. This enables full offline access to critical information.
                </Text>
              </View>
            </View>

            <View style={commonStyles.divider} />

            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <IconSymbol
                  ios_icon_name="arrow.right.circle.fill"
                  android_material_icon_name="exit-to-app"
                  size={24}
                  color="#F59E0B"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.infoTitle}>Check-Out & Wristband Erase</Text>
                <Text style={styles.infoDescription}>
                  When checking out a camper, you&apos;ll be prompted to hold their wristband near your device. The wristband will be erased to factory settings for the next camper.
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
    fontWeight: '500',
    color: colors.text,
    marginBottom: 20,
    lineHeight: 22,
  },
  actionButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 12,
  },
  buttonGradient: {
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
    letterSpacing: 0.3,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
  },
  searchResults: {
    marginTop: 20,
  },
  camperItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 12,
    gap: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
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
    color: '#1F2937',
    marginBottom: 4,
  },
  camperDetails: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  noResults: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noResultsText: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
  },
  noResultsSubtext: {
    fontSize: 14,
    fontWeight: '400',
    color: '#9CA3AF',
    marginTop: 4,
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
    color: '#6B7280',
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
    color: '#6B7280',
    lineHeight: 20,
  },
});
