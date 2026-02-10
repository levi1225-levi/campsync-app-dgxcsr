
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
import { encryptWristbandData, decryptWristbandData, WristbandCamperData, getWristbandLockCode } from '@/utils/wristbandEncryption';

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
      console.log('Initializing NFC for check-in on Android...');
      
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
      console.log('Fetching comprehensive camper data for NFC write using RPC:', camperId);
      
      const { data, error } = await supabase
        .rpc('get_comprehensive_camper_data', { p_camper_id: camperId });
      
      if (error) {
        console.error('Error fetching comprehensive camper data via RPC:', error);
        return null;
      }
      
      if (!data || data.length === 0) {
        console.error('No camper data returned from RPC');
        return null;
      }
      
      const camperData = data[0];
      
      // Extract medical info from JSONB
      const medicalInfo = camperData.medical_info || {};
      const allergiesArray = Array.isArray(medicalInfo.allergies) ? medicalInfo.allergies : [];
      const medicationsArray = Array.isArray(medicalInfo.medications) ? medicalInfo.medications : [];
      
      // Extract parent/guardian info from JSONB
      const parentInfo = camperData.parent_guardian_info || {};
      
      // Extract emergency contact info from JSONB
      const emergencyInfo = camperData.emergency_contact_info || {};
      
      console.log('📊 Comprehensive data fetched via RPC:');
      console.log('- Name:', camperData.first_name, camperData.last_name);
      console.log('- Allergies:', allergiesArray.length, 'items:', allergiesArray);
      console.log('- Medications:', medicationsArray.length, 'items:', medicationsArray);
      console.log('- Swim Level:', camperData.swim_level || 'Not set');
      console.log('- Cabin:', camperData.cabin_assignment || 'Not assigned');
      console.log('- Parent/Guardian:', parentInfo.full_name || 'Not set');
      console.log('- Emergency Contact:', emergencyInfo.full_name || 'Not set');
      
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
        // Parent/Guardian Contact Info
        parentGuardianName: parentInfo.full_name || null,
        parentGuardianPhone: parentInfo.phone || null,
        parentGuardianEmail: parentInfo.email || null,
        // Emergency Contact Info
        emergencyContactName: emergencyInfo.full_name || null,
        emergencyContactPhone: emergencyInfo.phone || null,
        emergencyContactRelationship: emergencyInfo.relationship || null,
      };
    } catch (error) {
      console.error('Error in fetchComprehensiveCamperData:', error);
      return null;
    }
  };

  const writeNFCTag = useCallback(async (camper: CamperData) => {
    console.log('🚀 User tapped Check In - Starting check-in process for:', camper.id);
    setIsProgramming(true);
    let nfcWriteSuccess = false;
    let wristbandId = '';

    try {
      // STEP 1: Fetch comprehensive data
      console.log('📊 Step 1: Fetching comprehensive camper data...');
      const comprehensiveData = await fetchComprehensiveCamperData(camper.id);
      
      if (!comprehensiveData) {
        throw new Error('Failed to fetch comprehensive camper data');
      }
      
      // STEP 2: Encrypt data
      console.log('🔐 Step 2: Encrypting comprehensive camper data...');
      const encryptedData = await encryptWristbandData(comprehensiveData);
      console.log('✅ Data encrypted, size:', encryptedData.length, 'bytes');

      if (encryptedData.length > 500) {
        throw new Error(`Data too large (${encryptedData.length} bytes). Maximum is 500 bytes.`);
      }

      // STEP 3: Create NDEF message
      console.log('📝 Step 3: Creating NDEF message...');
      const bytes = Ndef.encodeMessage([Ndef.textRecord(encryptedData)]);

      if (!bytes) {
        throw new Error('Failed to encode NDEF message');
      }

      console.log('✅ NDEF message created, size:', bytes.length, 'bytes');

      // STEP 4: Start NFC session (Android auto-detects)
      console.log('📱 Step 4: 🟢 Android: Starting NFC session');
      await NfcManager.requestTechnology(NfcTech.Ndef);
      console.log('✅ Android NFC session started');

      // STEP 5: Write data
      console.log('✍️ Step 5: Writing NDEF message to NFC tag...');
      await NfcManager.ndefHandler.writeNdefMessage(bytes);
      console.log('✅ NFC tag written successfully');
      nfcWriteSuccess = true;

      // STEP 6: Password protection
      console.log('🔒 Step 6: Attempting password protection...');
      try {
        const lockCode = await getWristbandLockCode();
        const tag = await NfcManager.getTag();
        
        if (tag) {
          const passwordBytes: number[] = [];
          for (let i = 0; i < 4; i++) {
            passwordBytes.push(lockCode.charCodeAt(i % lockCode.length));
          }
          
          try {
            // Set password
            await NfcManager.transceive([0xA2, 0xE5, ...passwordBytes]);
            console.log('✅ Password set');
            
            // Set PACK
            await NfcManager.transceive([0xA2, 0xE6, passwordBytes[0], passwordBytes[1], 0x00, 0x00]);
            console.log('✅ PACK set');
            
            // Set AUTH0
            await NfcManager.transceive([0xA2, 0xE3, 0x04, 0x00, 0x00, 0x00]);
            console.log('✅ Wristband password-protected');
          } catch (lockError: any) {
            console.warn('⚠️ Password protection failed:', lockError.message);
            console.log('✅ Data is still encrypted and secure');
          }
        }
      } catch (lockError: any) {
        console.warn('⚠️ Password protection error:', lockError.message);
      }

      // STEP 7: Get wristband ID
      const tag = await NfcManager.getTag();
      wristbandId = tag?.id || `WB-${Date.now()}`;
      console.log('✅ Wristband ID:', wristbandId);

      await NfcManager.cancelTechnologyRequest();

      // STEP 8: Update database using RPC to bypass RLS
      console.log('💾 Step 8: Updating database...');
      const { data: dbResult, error: dbError } = await supabase
        .rpc('check_in_camper_bypass_rls', {
          p_camper_id: camper.id,
          p_wristband_id: wristbandId,
        });

      if (dbError) {
        throw new Error(`Database update failed: ${dbError.message}`);
      }

      console.log('✅✅✅ CHECK-IN COMPLETE ✅✅✅');
      console.log('Database result:', dbResult);

      Alert.alert(
        'Check-In Successful! ✅',
        `${camper.first_name} ${camper.last_name} has been checked in.\n\nWristband ID: ${wristbandId}`,
        [{ text: 'OK', onPress: () => {
          setSelectedCamper(null);
          setSearchQuery('');
          setSearchResults([]);
        }}]
      );
    } catch (error: any) {
      console.error('❌ Error in writeNFCTag:', error);
      
      let errorMessage = 'Failed to write to wristband. ';
      
      if (error.message?.includes('too large')) {
        errorMessage = error.message;
      } else if (error.message?.includes('Database')) {
        errorMessage += 'Wristband programmed but database update failed.';
      } else if (nfcWriteSuccess) {
        errorMessage = 'Wristband programmed but database update failed.';
      } else {
        errorMessage += `Error: ${error.message || 'Unknown error'}`;
      }
      
      Alert.alert('Check-In Failed', errorMessage, [{ text: 'OK' }]);
    } finally {
      setIsProgramming(false);
      try {
        await NfcManager.cancelTechnologyRequest();
      } catch (cleanupError) {
        console.error('Cleanup error:', cleanupError);
      }
    }
  }, []);

  const eraseNFCTag = useCallback(async (camper: CamperData) => {
    console.log('User tapped Check Out:', camper.id);
    setIsProgramming(true);
    let nfcEraseSuccess = false;

    try {
      // Get lock code
      const lockCode = await getWristbandLockCode();
      const passwordBytes: number[] = [];
      for (let i = 0; i < 4; i++) {
        passwordBytes.push(lockCode.charCodeAt(i % lockCode.length));
      }

      // Start NFC
      await NfcManager.requestTechnology(NfcTech.Ndef);

      // Unlock
      try {
        await NfcManager.transceive([0x1B, ...passwordBytes]);
        console.log('✅ Wristband unlocked');
      } catch (unlockError: any) {
        console.warn('⚠️ Unlock failed:', unlockError.message);
      }

      // Erase
      const emptyBytes = Ndef.encodeMessage([Ndef.textRecord('')]);
      if (!emptyBytes) {
        throw new Error('Failed to encode empty message');
      }

      await NfcManager.ndefHandler.writeNdefMessage(emptyBytes);
      console.log('✅ Wristband erased');
      nfcEraseSuccess = true;

      // Remove password protection
      try {
        await NfcManager.transceive([0xA2, 0xE3, 0xFF, 0x00, 0x00, 0x00]);
        console.log('✅ Password protection removed');
      } catch (resetError: any) {
        console.warn('⚠️ Could not remove password:', resetError.message);
      }

      await NfcManager.cancelTechnologyRequest();

      // Update database using RPC to bypass RLS
      const { data: dbResult, error: dbError } = await supabase
        .rpc('check_out_camper_bypass_rls', {
          p_camper_id: camper.id,
        });

      if (dbError) {
        throw new Error(`Database update failed: ${dbError.message}`);
      }

      console.log('Database result:', dbResult);

      Alert.alert(
        'Check-Out Successful! ✅',
        `${camper.first_name} ${camper.last_name} has been checked out.`,
        [{ text: 'OK', onPress: () => {
          setSelectedCamper(null);
          setSearchQuery('');
          setSearchResults([]);
        }}]
      );
    } catch (error: any) {
      console.error('❌ Error in eraseNFCTag:', error);
      
      let errorMessage = 'Failed to erase wristband. ';
      if (error.message?.includes('authentication')) {
        errorMessage = 'Could not unlock wristband. Try using NFC Tools with the universal code.';
      } else if (nfcEraseSuccess) {
        errorMessage = 'Wristband erased but database update failed.';
      } else {
        errorMessage += `Error: ${error.message || 'Unknown error'}`;
      }
      
      Alert.alert('Check-Out Failed', errorMessage, [{ text: 'OK' }]);
    } finally {
      setIsProgramming(false);
      try {
        await NfcManager.cancelTechnologyRequest();
      } catch (cleanupError) {
        console.error('Cleanup error:', cleanupError);
      }
    }
  }, []);

  const handleCheckIn = useCallback(async (camper: CamperData) => {
    console.log('User tapped Check In button for camper:', camper.id);

    if (!nfcSupported || !nfcEnabled) {
      Alert.alert(
        'NFC Not Available',
        'NFC is not supported or enabled. Please enable NFC in settings.',
        [{ text: 'OK' }]
      );
      return;
    }

    writeNFCTag(camper);
  }, [nfcSupported, nfcEnabled, writeNFCTag]);

  const handleCheckOut = useCallback(async (camper: CamperData) => {
    console.log('User tapped Check Out button for camper:', camper.id);

    if (!nfcSupported || !nfcEnabled) {
      Alert.alert(
        'NFC Not Available',
        'NFC is not supported or enabled. Please enable NFC in settings.',
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Check Out & Erase Wristband',
      `Check out ${camper.first_name} ${camper.last_name}? This will erase their wristband.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Check Out', style: 'destructive', onPress: () => eraseNFCTag(camper) },
      ]
    );
  }, [nfcSupported, nfcEnabled, eraseNFCTag]);

  return (
    <View style={[commonStyles.container, { paddingTop: 48 }]}>
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
          <Text style={styles.headerSubtitle}>Manage camper arrivals and departures</Text>
        </LinearGradient>
      </View>

      {nfcInitialized && !nfcSupported && (
        <BlurView intensity={80} style={[styles.statusBanner, { backgroundColor: 'rgba(239, 68, 68, 0.9)' }]}>
          <IconSymbol ios_icon_name="exclamationmark.triangle.fill" android_material_icon_name="error" size={20} color="#FFFFFF" />
          <Text style={styles.statusText}>NFC not supported</Text>
        </BlurView>
      )}

      {nfcInitialized && nfcSupported && nfcEnabled && (
        <BlurView intensity={80} style={[styles.statusBanner, { backgroundColor: 'rgba(16, 185, 129, 0.9)' }]}>
          <IconSymbol ios_icon_name="checkmark.shield.fill" android_material_icon_name="verified-user" size={20} color="#FFFFFF" />
          <Text style={styles.statusText}>🔒 NFC Ready - Secure Mode</Text>
        </BlurView>
      )}

      {isProgramming && (
        <BlurView intensity={80} style={[styles.statusBanner, { backgroundColor: 'rgba(99, 102, 241, 0.9)' }]}>
          <ActivityIndicator size="small" color="#FFFFFF" />
          <Text style={styles.statusText}>Hold wristband near device...</Text>
        </BlurView>
      )}

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Find Camper</Text>
          <GlassCard>
            <Text style={styles.sectionDescription}>Search for a camper to check them in or out.</Text>
            <View style={styles.searchContainer}>
              <IconSymbol ios_icon_name="magnifyingglass" android_material_icon_name="search" size={20} color="#1F2937" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by name..."
                placeholderTextColor="#9CA3AF"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="words"
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
                  >
                    <View style={styles.camperAvatar}>
                      <IconSymbol ios_icon_name="person.fill" android_material_icon_name="person" size={24} color={colors.primary} />
                    </View>
                    <View style={styles.camperInfo}>
                      <Text style={styles.camperName}>{camper.first_name} {camper.last_name}</Text>
                      <Text style={styles.camperDetails}>{camper.check_in_status}</Text>
                    </View>
                    <IconSymbol ios_icon_name="chevron.right" android_material_icon_name="arrow-forward" size={20} color="#6B7280" />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {searchQuery.trim() && !isSearching && searchResults.length === 0 && (
              <View style={styles.noResults}>
                <Text style={styles.noResultsText}>No campers found</Text>
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
                  <IconSymbol ios_icon_name="person.fill" android_material_icon_name="person" size={32} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.selectedCamperName}>{selectedCamper.first_name} {selectedCamper.last_name}</Text>
                  <Text style={styles.selectedCamperStatus}>Status: {selectedCamper.check_in_status}</Text>
                </View>
              </View>

              <View style={commonStyles.divider} />

              <View style={styles.actionButtonsContainer}>
                <TouchableOpacity style={styles.actionButton} onPress={() => handleCheckIn(selectedCamper)} disabled={isProgramming}>
                  <LinearGradient colors={['#10B981', '#059669']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.buttonGradient}>
                    <IconSymbol ios_icon_name="checkmark.circle.fill" android_material_icon_name="check-circle" size={24} color="#FFFFFF" />
                    <Text style={styles.actionButtonText}>Check In</Text>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionButton} onPress={() => handleCheckOut(selectedCamper)} disabled={isProgramming}>
                  <LinearGradient colors={['#F59E0B', '#D97706']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.buttonGradient}>
                    <IconSymbol ios_icon_name="arrow.right.circle.fill" android_material_icon_name="exit-to-app" size={24} color="#FFFFFF" />
                    <Text style={styles.actionButtonText}>Check Out</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </GlassCard>
          </View>
        )}
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
  headerContainer: { overflow: 'hidden' },
  header: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 32, alignItems: 'center', borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  headerIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255, 255, 255, 0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  headerTitle: { fontSize: 28, fontWeight: '900', color: '#FFFFFF', marginBottom: 8, textAlign: 'center' },
  headerSubtitle: { fontSize: 15, fontWeight: '500', color: '#FFFFFF', opacity: 0.95, textAlign: 'center' },
  statusBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, paddingHorizontal: 20, gap: 10 },
  statusText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  scrollView: { flex: 1 },
  contentContainer: { paddingBottom: 120 },
  section: { paddingHorizontal: 20, marginTop: 28 },
  sectionTitle: { fontSize: 24, fontWeight: '800', color: colors.text, marginBottom: 16 },
  sectionDescription: { fontSize: 15, fontWeight: '500', color: colors.text, marginBottom: 20 },
  actionButton: { borderRadius: 16, overflow: 'hidden', marginTop: 12 },
  buttonGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, paddingHorizontal: 24, gap: 10 },
  actionButtonText: { fontSize: 17, fontWeight: '700', color: '#FFFFFF' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, gap: 10, borderWidth: 2, borderColor: '#E5E7EB' },
  searchInput: { flex: 1, fontSize: 16, fontWeight: '500', color: '#1F2937' },
  searchResults: { marginTop: 20 },
  camperItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, backgroundColor: '#FFFFFF', borderRadius: 16, marginBottom: 12, gap: 14, borderWidth: 1, borderColor: '#E5E7EB' },
  camperAvatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(99, 102, 241, 0.15)', alignItems: 'center', justifyContent: 'center' },
  camperInfo: { flex: 1 },
  camperName: { fontSize: 17, fontWeight: '700', color: '#1F2937', marginBottom: 4 },
  camperDetails: { fontSize: 14, fontWeight: '500', color: '#6B7280' },
  noResults: { alignItems: 'center', paddingVertical: 40 },
  noResultsText: { fontSize: 17, fontWeight: '600', color: colors.text },
  selectedCamperHeader: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 20 },
  selectedCamperAvatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(99, 102, 241, 0.15)', alignItems: 'center', justifyContent: 'center' },
  selectedCamperName: { fontSize: 20, fontWeight: '800', color: colors.text, marginBottom: 6 },
  selectedCamperStatus: { fontSize: 15, fontWeight: '600', color: '#6B7280' },
  actionButtonsContainer: { gap: 12 },
});
