
import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import { encryptWristbandData, decryptWristbandData, WristbandCamperData, getWristbandLockCode } from '@/utils/wristbandEncryption';
import { ConfirmModal } from '@/components/ConfirmModal';

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
  const [showCheckOutModal, setShowCheckOutModal] = useState(false);

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
      
      const allergiesArray = Array.isArray(camperData.allergies) ? camperData.allergies : [];
      const medicationsArray = Array.isArray(camperData.medications) ? camperData.medications : [];
      
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
    console.log('🚀 Starting check-in process for:', camper.id);
    setIsProgramming(true);
    let nfcWriteSuccess = false;
    let wristbandId = '';

    try {
      const comprehensiveData = await fetchComprehensiveCamperData(camper.id);
      if (!comprehensiveData) {
        throw new Error('Failed to fetch comprehensive camper data');
      }
      
      const encryptedData = await encryptWristbandData(comprehensiveData);
      if (encryptedData.length > 500) {
        throw new Error(`Data too large (${encryptedData.length} bytes). Maximum is 500 bytes.`);
      }

      const bytes = Ndef.encodeMessage([Ndef.textRecord(encryptedData)]);
      if (!bytes) {
        throw new Error('Failed to encode NDEF message');
      }

      await NfcManager.requestTechnology(NfcTech.Ndef, {
        alertMessage: `Hold wristband near device to check in ${camper.first_name} ${camper.last_name}`,
      });

      await NfcManager.ndefHandler.writeNdefMessage(bytes);
      nfcWriteSuccess = true;

      // Password protection
      try {
        const lockCode = await getWristbandLockCode();
        const tag = await NfcManager.getTag();
        
        if (tag) {
          const passwordBytes: number[] = [];
          for (let i = 0; i < 4; i++) {
            passwordBytes.push(lockCode.charCodeAt(i % lockCode.length));
          }
          
          try {
            await NfcManager.transceive([0xA2, 0xE5, ...passwordBytes]);
            await NfcManager.transceive([0xA2, 0xE6, passwordBytes[0], passwordBytes[1], 0x00, 0x00]);
            await NfcManager.transceive([0xA2, 0xE3, 0x04, 0x00, 0x00, 0x00]);
            console.log('✅ Wristband password-protected');
          } catch (lockError: any) {
            console.warn('⚠️ Password protection failed:', lockError.message);
          }
        }
      } catch (lockError: any) {
        console.warn('⚠️ Password protection error:', lockError.message);
      }

      const tag = await NfcManager.getTag();
      wristbandId = tag?.id || `WB-${Date.now()}`;

      await NfcManager.cancelTechnologyRequest();

      const { data: dbResult, error: dbError } = await supabase
        .rpc('check_in_camper_bypass_rls', {
          p_camper_id: camper.id,
          p_wristband_id: wristbandId,
        });

      if (dbError) {
        throw new Error(`Database update failed: ${dbError.message}`);
      }

      console.log('✅ Database updated successfully:', dbResult);

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
    setIsProgramming(true);
    let nfcEraseSuccess = false;

    try {
      const lockCode = await getWristbandLockCode();
      const passwordBytes: number[] = [];
      for (let i = 0; i < 4; i++) {
        passwordBytes.push(lockCode.charCodeAt(i % lockCode.length));
      }

      await NfcManager.requestTechnology(NfcTech.Ndef, {
        alertMessage: `Hold wristband near device to check out ${camper.first_name} ${camper.last_name}`,
      });

      try {
        await NfcManager.transceive([0x1B, ...passwordBytes]);
      } catch (unlockError: any) {
        console.warn('⚠️ Unlock failed:', unlockError.message);
      }

      const emptyBytes = Ndef.encodeMessage([Ndef.textRecord('')]);
      if (!emptyBytes) {
        throw new Error('Failed to encode empty message');
      }

      await NfcManager.ndefHandler.writeNdefMessage(emptyBytes);
      nfcEraseSuccess = true;

      try {
        await NfcManager.transceive([0xA2, 0xE3, 0xFF, 0x00, 0x00, 0x00]);
      } catch (resetError: any) {
        console.warn('⚠️ Could not remove password:', resetError.message);
      }

      await NfcManager.cancelTechnologyRequest();

      const { data: dbResult, error: dbError } = await supabase
        .rpc('check_out_camper_bypass_rls', {
          p_camper_id: camper.id,
        });

      if (dbError) {
        throw new Error(`Database update failed: ${dbError.message}`);
      }

      console.log('✅ Database updated successfully:', dbResult);

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
        errorMessage = 'Could not unlock wristband. Try using NFC Tools.';
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
    if (!nfcSupported || !nfcEnabled) {
      Alert.alert('NFC Not Available', 'NFC is not supported or enabled.', [{ text: 'OK' }]);
      return;
    }
    writeNFCTag(camper);
  }, [nfcSupported, nfcEnabled, writeNFCTag]);

  const handleCheckOutPress = useCallback((camper: CamperData) => {
    if (!nfcSupported || !nfcEnabled) {
      Alert.alert('NFC Not Available', 'NFC is not supported or enabled.', [{ text: 'OK' }]);
      return;
    }
    setShowCheckOutModal(true);
  }, [nfcSupported, nfcEnabled]);

  const handleConfirmCheckOut = useCallback(() => {
    setShowCheckOutModal(false);
    if (selectedCamper) {
      eraseNFCTag(selectedCamper);
    }
  }, [selectedCamper, eraseNFCTag]);

  const handleCancelCheckOut = useCallback(() => {
    setShowCheckOutModal(false);
  }, []);

  const camperFullName = selectedCamper ? `${selectedCamper.first_name} ${selectedCamper.last_name}` : '';

  return (
    <View style={commonStyles.container}>
      <View style={styles.headerContainer}>
        <LinearGradient colors={['#6366F1', '#8B5CF6', '#EC4899']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
          <View style={styles.headerIcon}>
            <IconSymbol ios_icon_name="checkmark.circle.fill" android_material_icon_name="check-circle" size={40} color="#FFFFFF" />
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
          <Text style={styles.statusText}>🔒 NFC Ready</Text>
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
                  <TouchableOpacity key={camper.id} style={styles.camperItem} onPress={() => setSelectedCamper(camper)}>
                    <View style={styles.camperAvatar}>
                      <IconSymbol ios_icon_name="person.fill" android_material_icon_name="person" size={24} color={colors.primary} />
                    </View>
                    <View style={styles.camperInfo}>
                      <Text style={styles.camperName}>{camper.first_name} {camper.last_name}</Text>
                      <Text style={styles.camperDetails}>{camper.check_in_status}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </GlassCard>
        </View>

        {selectedCamper && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Actions</Text>
            <GlassCard>
              <View style={styles.selectedCamperHeader}>
                <Text style={styles.selectedCamperName}>{selectedCamper.first_name} {selectedCamper.last_name}</Text>
                <Text style={styles.selectedCamperStatus}>{selectedCamper.check_in_status}</Text>
              </View>

              <TouchableOpacity style={styles.actionButton} onPress={() => handleCheckIn(selectedCamper)} disabled={isProgramming}>
                <LinearGradient colors={['#10B981', '#059669']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.buttonGradient}>
                  <Text style={styles.actionButtonText}>Check In</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionButton} onPress={() => handleCheckOutPress(selectedCamper)} disabled={isProgramming}>
                <LinearGradient colors={['#F59E0B', '#D97706']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.buttonGradient}>
                  <Text style={styles.actionButtonText}>Check Out</Text>
                </LinearGradient>
              </TouchableOpacity>
            </GlassCard>
          </View>
        )}
      </ScrollView>

      <ConfirmModal
        visible={showCheckOutModal}
        title="Check Out & Erase Wristband"
        message={`Check out ${camperFullName}?`}
        confirmText="Check Out"
        cancelText="Cancel"
        confirmStyle="destructive"
        onConfirm={handleConfirmCheckOut}
        onCancel={handleCancelCheckOut}
      />
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
  selectedCamperHeader: { marginBottom: 20 },
  selectedCamperName: { fontSize: 20, fontWeight: '800', color: colors.text, marginBottom: 6 },
  selectedCamperStatus: { fontSize: 15, fontWeight: '600', color: '#6B7280' },
});
