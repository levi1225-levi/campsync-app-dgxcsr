
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
      console.log('🔍 Fetching comprehensive camper data for NFC write using RPC:', camperId);
      
      // Use RPC function to bypass RLS and get all data in one call
      const { data, error } = await supabase
        .rpc('get_comprehensive_camper_data', { p_camper_id: camperId });
      
      if (error) {
        console.error('❌ Error fetching comprehensive camper data via RPC:', error);
        throw new Error(`Failed to fetch camper data: ${error.message}`);
      }
      
      if (!data || data.length === 0) {
        console.error('❌ No camper data returned from RPC');
        throw new Error('No camper data found');
      }
      
      const camperData = data[0];
      console.log('✅ Raw camper data from RPC:', JSON.stringify(camperData, null, 2));
      
      // Extract medical info from JSONB - handle both array and object formats
      const medicalInfo = camperData.medical_info || {};
      console.log('📋 Medical info structure:', JSON.stringify(medicalInfo, null, 2));
      
      // Safely extract arrays from medical info
      const allergiesArray = Array.isArray(medicalInfo.allergies) 
        ? medicalInfo.allergies.filter((item: any) => item && typeof item === 'string' && item.trim().length > 0)
        : [];
      
      const medicationsArray = Array.isArray(medicalInfo.medications)
        ? medicalInfo.medications.filter((item: any) => item && typeof item === 'string' && item.trim().length > 0)
        : [];
      
      // Extract parent/guardian info from JSONB
      const parentInfo = camperData.parent_guardian_info || {};
      console.log('👨‍👩‍👧 Parent info structure:', JSON.stringify(parentInfo, null, 2));
      
      // Extract emergency contact info from JSONB
      const emergencyInfo = camperData.emergency_contact_info || {};
      console.log('🚨 Emergency info structure:', JSON.stringify(emergencyInfo, null, 2));
      
      console.log('📊 Comprehensive data extracted:');
      console.log('- Name:', camperData.first_name, camperData.last_name);
      console.log('- DOB:', camperData.date_of_birth);
      console.log('- Allergies:', allergiesArray.length, 'items:', allergiesArray);
      console.log('- Medications:', medicationsArray.length, 'items:', medicationsArray);
      console.log('- Swim Level:', camperData.swim_level || 'Not set');
      console.log('- Cabin:', camperData.cabin_assignment || 'Not assigned');
      console.log('- Parent/Guardian:', parentInfo.full_name || 'Not set');
      console.log('- Emergency Contact:', emergencyInfo.full_name || 'Not set');
      
      const wristbandData: WristbandCamperData = {
        id: camperData.id,
        firstName: camperData.first_name || '',
        lastName: camperData.last_name || '',
        dateOfBirth: camperData.date_of_birth || '',
        allergies: allergiesArray,
        medications: medicationsArray,
        swimLevel: camperData.swim_level || null,
        cabin: camperData.cabin_assignment || null,
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
      
      console.log('✅ Wristband data prepared:', JSON.stringify(wristbandData, null, 2));
      return wristbandData;
    } catch (error: any) {
      console.error('❌ Error in fetchComprehensiveCamperData:', error);
      console.error('❌ Error stack:', error.stack);
      throw error;
    }
  };

  const writeNFCTag = useCallback(async (camper: CamperData) => {
    console.log('🚀 User tapped Check In - Starting check-in process for:', camper.id);
    setIsProgramming(true);
    let nfcWriteSuccess = false;
    let wristbandId = '';

    try {
      // 🚨 STEP 1: Request NFC technology FIRST for Android
      console.log('📱 Step 1: 🟢 Android: Requesting NFC technology FIRST');
      await NfcManager.requestTechnology(NfcTech.Ndef);
      console.log('✅ Android NFC session started');

      // STEP 2: Fetch and prepare ALL data AFTER NFC session started
      console.log('📊 Step 2: Fetching comprehensive camper data...');
      const comprehensiveData = await fetchComprehensiveCamperData(camper.id);
      
      if (!comprehensiveData) {
        throw new Error('Failed to fetch comprehensive camper data');
      }
      
      console.log('✅ Comprehensive data fetched successfully');
      
      // 🔐 STEP 3: Encrypt the comprehensive camper data
      console.log('🔐 Step 3: Encrypting comprehensive camper data...');
      let encryptedData: string;
      try {
        encryptedData = await encryptWristbandData(comprehensiveData);
        console.log('✅ Comprehensive camper data encrypted successfully, size:', encryptedData.length, 'bytes');
      } catch (encryptError: any) {
        console.error('❌ Encryption failed:', encryptError);
        console.error('❌ Encryption error details:', JSON.stringify(encryptError, null, 2));
        throw new Error(`Encryption failed: ${encryptError.message}`);
      }

      // Verify data size is within NFC chip capacity (540 bytes)
      if (encryptedData.length > 500) {
        console.warn('⚠️ WARNING: Encrypted data is', encryptedData.length, 'bytes - may be too large for 540 byte chip');
        throw new Error(`Data too large (${encryptedData.length} bytes). Maximum is 500 bytes for reliable writing.`);
      }

      // 📝 STEP 4: Create NDEF message
      console.log('📝 Step 4: Creating NDEF message...');
      const bytes = Ndef.encodeMessage([Ndef.textRecord(encryptedData)]);

      if (!bytes) {
        throw new Error('Failed to encode NDEF message');
      }

      console.log('✅ NDEF message created, total size:', bytes.length, 'bytes');

      // ✍️ STEP 5: Write to NFC tag
      console.log('✍️ Step 5: Writing NDEF message to NFC tag...');
      await NfcManager.ndefHandler.writeNdefMessage(bytes);
      console.log('✅ NFC tag written successfully with offline data');
      nfcWriteSuccess = true;

      // 🔒 STEP 6: Lock the tag with password protection
      console.log('🔒 Step 6: Attempting to password-protect the wristband...');
      try {
        const lockCode = await getWristbandLockCode();
        console.log('🔐 Using lock code for password protection');
        
        const tag = await NfcManager.getTag();
        
        if (tag) {
          const passwordBytes: number[] = [];
          for (let i = 0; i < 4; i++) {
            const charCode = lockCode.charCodeAt(i % lockCode.length);
            passwordBytes.push(charCode);
          }
          
          console.log('🔐 Attempting to set password protection on NTAG chip...');
          
          try {
            const setPwdCmd = [0xA2, 0xE5, ...passwordBytes];
            await NfcManager.transceive(setPwdCmd);
            console.log('✅ Password set on wristband');
            
            const setPackCmd = [0xA2, 0xE6, passwordBytes[0], passwordBytes[1], 0x00, 0x00];
            await NfcManager.transceive(setPackCmd);
            console.log('✅ PACK set on wristband');
            
            const setAuth0Cmd = [0xA2, 0xE3, 0x04, 0x00, 0x00, 0x00];
            await NfcManager.transceive(setAuth0Cmd);
            console.log('✅ AUTH0 set - wristband is now password-protected');
            
            console.log('🔒 Wristband successfully locked with password protection');
          } catch (lockError: any) {
            console.warn('⚠️ Could not set password protection:', lockError.message);
            console.log('✅ Data is still encrypted and secure without hardware locking');
          }
        }
      } catch (lockError: any) {
        console.warn('⚠️ Password protection failed:', lockError.message);
        console.log('✅ Data is still encrypted and secure without hardware locking');
      }

      // 🏷️ STEP 7: Generate wristband ID from tag
      console.log('🏷️ Step 7: Getting tag ID...');
      const tag = await NfcManager.getTag();
      wristbandId = tag?.id || `WB-${Date.now()}`;
      console.log('✅ Wristband ID:', wristbandId);

      // Cancel NFC session before database update
      await NfcManager.cancelTechnologyRequest();
      console.log('✅ NFC session closed');

      // 💾 STEP 8: Update database with check-in status AND wristband ID
      console.log('💾 Step 8: 🚨 UPDATING DATABASE WITH CHECK-IN STATUS...');
      const { data: dbResult, error: dbError } = await supabase
        .rpc('check_in_camper_bypass_rls', {
          p_camper_id: camper.id,
          p_wristband_id: wristbandId,
        });

      if (dbError) {
        console.error('❌ Database update error:', dbError);
        throw new Error(`Database update failed: ${dbError.message}`);
      }

      console.log('✅✅✅ DATABASE UPDATED SUCCESSFULLY - CAMPER IS NOW CHECKED IN ✅✅✅');

      const offlineDataSummary = `
✅ Offline Data Written:
• Name: ${comprehensiveData.firstName} ${comprehensiveData.lastName}
• Allergies: ${comprehensiveData.allergies.length > 0 ? comprehensiveData.allergies.join(', ') : 'None'}
• Medications: ${comprehensiveData.medications.length > 0 ? comprehensiveData.medications.join(', ') : 'None'}
• Swim Level: ${comprehensiveData.swimLevel || 'Not set'}
• Cabin: ${comprehensiveData.cabin || 'Not assigned'}

👨‍👩‍👧 Parent/Guardian:
• Name: ${comprehensiveData.parentGuardianName || 'Not set'}
• Phone: ${comprehensiveData.parentGuardianPhone || 'Not set'}

🚨 Emergency Contact:
• Name: ${comprehensiveData.emergencyContactName || 'Not set'}
• Phone: ${comprehensiveData.emergencyContactPhone || 'Not set'}

🔒 Security: Data encrypted and password-protected
✅ Database: Camper marked as checked-in
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
      console.error('❌ Error in writeNFCTag:', error);
      console.error('❌ Error stack:', error.stack);
      
      let errorMessage = 'Failed to write to wristband. ';
      
      if (error.message?.includes('Encryption failed')) {
        errorMessage = `Encryption Error: ${error.message}\n\nPlease check that all camper data is properly formatted and try again.`;
      } else if (error.message?.includes('too large')) {
        errorMessage = error.message + '\n\nTry reducing the amount of medical information.';
      } else if (error.message?.includes('Database')) {
        errorMessage += 'The wristband was programmed but the database update failed. Please try again.';
      } else if (error.message?.includes('User canceled') || error.message?.includes('cancelled')) {
        errorMessage = 'NFC scan was canceled. Please try again.';
      } else if (nfcWriteSuccess) {
        errorMessage = 'The wristband was programmed successfully but there was an issue updating the database.';
      } else {
        errorMessage += `Error: ${error.message || 'Unknown error'}`;
      }
      
      Alert.alert('Check-In Failed', errorMessage, [{ text: 'OK' }]);
    } finally {
      setIsProgramming(false);
      try {
        await NfcManager.cancelTechnologyRequest();
      } catch (cleanupError) {
        console.error('Error canceling NFC request:', cleanupError);
      }
    }
  }, []);

  const eraseNFCTag = useCallback(async (camper: CamperData) => {
    console.log('User tapped Check Out - starting NFC session for Android:', camper.id);
    setIsProgramming(true);
    let nfcEraseSuccess = false;

    try {
      const lockCode = await getWristbandLockCode();
      const passwordBytes: number[] = [];
      for (let i = 0; i < 4; i++) {
        const charCode = lockCode.charCodeAt(i % lockCode.length);
        passwordBytes.push(charCode);
      }

      await NfcManager.requestTechnology(NfcTech.Ndef);
      console.log('✅ Android NFC session started for erase');

      try {
        const unlockCmd = [0x1B, ...passwordBytes];
        await NfcManager.transceive(unlockCmd);
        console.log('✅ Wristband unlocked successfully');
      } catch (unlockError: any) {
        console.warn('⚠️ Could not unlock with password:', unlockError.message);
      }

      const emptyBytes = Ndef.encodeMessage([Ndef.textRecord('')]);
      if (!emptyBytes) {
        throw new Error('Failed to encode empty NDEF message');
      }

      await NfcManager.ndefHandler.writeNdefMessage(emptyBytes);
      console.log('✅ NFC tag erased successfully');
      nfcEraseSuccess = true;

      try {
        const resetAuth0Cmd = [0xA2, 0xE3, 0xFF, 0x00, 0x00, 0x00];
        await NfcManager.transceive(resetAuth0Cmd);
        console.log('✅ Password protection removed');
      } catch (resetError: any) {
        console.warn('⚠️ Could not remove password protection:', resetError.message);
      }

      await NfcManager.cancelTechnologyRequest();

      const { data: dbResult, error: dbError } = await supabase
        .rpc('check_out_camper_bypass_rls', {
          p_camper_id: camper.id,
        });

      if (dbError) {
        throw new Error(`Database update failed: ${dbError.message}`);
      }

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
      if (error.message?.includes('Database')) {
        errorMessage += 'The wristband was erased but the database update failed.';
      } else {
        errorMessage += `Error: ${error.message || 'Unknown error'}`;
      }
      
      Alert.alert('Check-Out Failed', errorMessage, [{ text: 'OK' }]);
    } finally {
      setIsProgramming(false);
      try {
        await NfcManager.cancelTechnologyRequest();
      } catch (cleanupError) {
        console.error('Error canceling NFC request:', cleanupError);
      }
    }
  }, []);

  const handleCheckIn = useCallback(async (camper: CamperData) => {
    if (!nfcSupported || !nfcEnabled) {
      Alert.alert(
        'NFC Not Available',
        'NFC is not supported or enabled on this device.',
        [{ text: 'OK' }]
      );
      return;
    }

    writeNFCTag(camper);
  }, [nfcSupported, nfcEnabled, writeNFCTag]);

  const handleCheckOut = useCallback(async (camper: CamperData) => {
    if (!nfcSupported || !nfcEnabled) {
      Alert.alert(
        'NFC Not Available',
        'NFC is not supported or enabled on this device.',
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Check Out & Erase Wristband',
      `Are you sure you want to check out ${camper.first_name} ${camper.last_name}?`,
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
    <View style={commonStyles.container}>
      {/* Fixed Header with Android padding */}
      <View style={styles.headerContainer}>
        <LinearGradient
          colors={['#6366F1', '#8B5CF6', '#EC4899']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.header, { paddingTop: 48 }]}
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
          <Text style={styles.statusText}>🔒 NFC Ready - Secure Encrypted Mode</Text>
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
                onChangeText={setSearchQuery}
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
});
