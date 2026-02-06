
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { IconSymbol } from '@/components/IconSymbol';
import { colors, commonStyles } from '@/styles/commonStyles';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/app/integrations/supabase/client';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface CamperProfile {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  registration_status: string;
  wristband_id: string | null;
  check_in_status: string;
  last_check_in: string | null;
  last_check_out: string | null;
  session_id: string | null;
  session_name: string | null;
  swim_level: string | null;
  cabin_assignment: string | null;
  medical_info: {
    allergies: string[];
    medications: string[];
    dietary_restrictions: string[];
    medical_conditions: string[];
    special_care_instructions: string | null;
    doctor_name: string | null;
    doctor_phone: string | null;
    insurance_provider: string | null;
    insurance_number: string | null;
    notes: string | null;
    has_epi_pen: boolean;
  } | null;
  emergency_contacts: {
    full_name: string;
    phone: string;
    relationship: string;
    priority_order: number;
  }[];
}

function CamperProfileContent() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { hasPermission } = useAuth();
  const [camper, setCamper] = useState<CamperProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const camperId = Array.isArray(params.id) ? params.id[0] : params.id;
  
  const canEdit = hasPermission(['super-admin', 'camp-admin']);
  const canViewMedical = hasPermission(['super-admin', 'camp-admin', 'staff']);

  const calculateAge = useCallback((dateOfBirth: string | null | undefined): number => {
    if (!dateOfBirth) {
      console.warn('calculateAge: No date of birth provided');
      return 0;
    }
    
    try {
      const today = new Date();
      const birthDate = new Date(dateOfBirth);
      
      if (isNaN(birthDate.getTime())) {
        console.error('calculateAge: Invalid date format:', dateOfBirth);
        return 0;
      }
      
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return age;
    } catch (error) {
      console.error('calculateAge: Error calculating age:', error);
      return 0;
    }
  }, []);

  const getStatusColor = useCallback((status: string | null | undefined): string => {
    if (!status) return colors.textSecondary;
    
    const normalizedStatus = status.toLowerCase().replace('_', '-');
    switch (normalizedStatus) {
      case 'checked-in':
        return colors.success;
      case 'checked-out':
        return colors.warning;
      default:
        return colors.textSecondary;
    }
  }, []);

  const loadCamperProfile = useCallback(async (isRefresh = false) => {
    if (!camperId) {
      console.error('loadCamperProfile: No camper ID provided in params:', params);
      setError('No camper ID provided');
      setIsLoading(false);
      setIsRefreshing(false);
      return;
    }

    try {
      console.log('=== LOADING CAMPER PROFILE ===');
      console.log('Camper ID:', camperId);
      console.log('Is Refresh:', isRefresh);
      
      if (!isRefresh) {
        setIsLoading(true);
      }
      setError(null);

      const { data: allCampers, error: rpcError } = await supabase.rpc('get_all_campers');
      
      if (rpcError) {
        console.error('RPC Error:', rpcError);
        throw new Error(`Failed to load campers: ${rpcError.message}`);
      }

      if (!allCampers || !Array.isArray(allCampers)) {
        console.error('Invalid response from get_all_campers:', allCampers);
        throw new Error('Invalid response from database');
      }

      console.log('Total campers loaded:', allCampers.length);

      const camperData = allCampers.find((c: any) => c.id === camperId);

      if (!camperData) {
        console.error('Camper not found with ID:', camperId);
        throw new Error('Camper not found');
      }

      console.log('=== CAMPER DATA LOADED ===');
      console.log('Name:', camperData.first_name, camperData.last_name);
      console.log('Swim Level (raw):', camperData.swim_level);
      console.log('Cabin (raw):', camperData.cabin_assignment);
      console.log('Check-in Status:', camperData.check_in_status);

      let sessionName = null;
      if (camperData.session_id) {
        try {
          const { data: sessionData, error: sessionError } = await supabase
            .from('sessions')
            .select('name')
            .eq('id', camperData.session_id)
            .maybeSingle();
          
          if (!sessionError && sessionData) {
            sessionName = sessionData.name;
            console.log('Session name loaded:', sessionName);
          }
        } catch (sessionErr) {
          console.error('Error loading session:', sessionErr);
        }
      }

      let medicalInfo = null;
      if (canViewMedical) {
        try {
          console.log('🔍 Loading medical info for camper:', camperId);
          const { data: medicalData, error: medicalError } = await supabase
            .from('camper_medical_info')
            .select('*')
            .eq('camper_id', camperId)
            .maybeSingle();
          
          if (medicalError) {
            console.error('❌ Medical info error:', medicalError);
          } else if (medicalData) {
            console.log('✅ Raw medical data from DB:', JSON.stringify(medicalData, null, 2));
            
            const allergiesArray = Array.isArray(medicalData.allergies) ? medicalData.allergies : [];
            const medicationsArray = Array.isArray(medicalData.medications) ? medicalData.medications : [];
            const dietaryArray = Array.isArray(medicalData.dietary_restrictions) ? medicalData.dietary_restrictions : [];
            const conditionsArray = Array.isArray(medicalData.medical_conditions) ? medicalData.medical_conditions : [];
            
            medicalInfo = {
              allergies: allergiesArray,
              medications: medicationsArray,
              dietary_restrictions: dietaryArray,
              medical_conditions: conditionsArray,
              special_care_instructions: medicalData.special_care_instructions || null,
              doctor_name: medicalData.doctor_name || null,
              doctor_phone: medicalData.doctor_phone || null,
              insurance_provider: medicalData.insurance_provider || null,
              insurance_number: medicalData.insurance_number || null,
              notes: medicalData.notes || null,
              has_epi_pen: medicalData.has_epi_pen || false,
            };
            
            console.log('📋 Parsed medical info:');
            console.log('  - Allergies:', allergiesArray);
            console.log('  - Medications:', medicationsArray);
            console.log('  - Dietary restrictions:', dietaryArray);
            console.log('  - Medical conditions:', conditionsArray);
            console.log('  - Has EpiPen:', medicalData.has_epi_pen);
            console.log('  - Doctor:', medicalData.doctor_name);
            console.log('  - Insurance:', medicalData.insurance_provider);
          } else {
            console.log('ℹ️ No medical info found for camper');
          }
        } catch (medicalErr) {
          console.error('Error loading medical info:', medicalErr);
        }
      }

      let emergencyContacts = [];
      try {
        console.log('Loading emergency contacts...');
        const { data: contactsData, error: contactsError } = await supabase
          .from('emergency_contacts')
          .select('*')
          .eq('camper_id', camperId)
          .order('priority_order');

        if (contactsError) {
          console.error('Emergency contacts error:', contactsError);
        } else if (contactsData) {
          emergencyContacts = contactsData;
          console.log('Emergency contacts loaded:', contactsData.length);
        }
      } catch (contactsErr) {
        console.error('Error loading emergency contacts:', contactsErr);
      }

      const profile: CamperProfile = {
        id: camperData.id || '',
        first_name: camperData.first_name || '',
        last_name: camperData.last_name || '',
        date_of_birth: camperData.date_of_birth || '',
        registration_status: camperData.registration_status || 'pending',
        wristband_id: camperData.wristband_id || null,
        check_in_status: camperData.check_in_status || 'not-arrived',
        last_check_in: camperData.last_check_in || null,
        last_check_out: camperData.last_check_out || null,
        session_id: camperData.session_id || null,
        session_name: sessionName,
        swim_level: camperData.swim_level || null,
        cabin_assignment: camperData.cabin_assignment || null,
        medical_info: medicalInfo,
        emergency_contacts: emergencyContacts,
      };

      console.log('=== PROFILE ASSEMBLED SUCCESSFULLY ===');
      console.log('Final swim level:', profile.swim_level);
      console.log('Final cabin:', profile.cabin_assignment);
      console.log('Medical info included:', profile.medical_info ? 'YES' : 'NO');
      if (profile.medical_info) {
        console.log('Medical info details:', JSON.stringify(profile.medical_info, null, 2));
      }
      
      setCamper(profile);
      setIsLoading(false);
      setIsRefreshing(false);
    } catch (error: any) {
      console.error('=== ERROR LOADING PROFILE ===');
      console.error('Error:', error);
      console.error('Error message:', error?.message);
      console.error('Error stack:', error?.stack);
      setError(error?.message || 'Failed to load camper profile');
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [camperId, canViewMedical]);

  useFocusEffect(
    useCallback(() => {
      console.log('Screen focused - loading camper profile');
      loadCamperProfile(false);
    }, [loadCamperProfile])
  );

  const handleRefresh = useCallback(() => {
    console.log('User pulled to refresh camper profile');
    setIsRefreshing(true);
    loadCamperProfile(true);
  }, [loadCamperProfile]);

  const handleBack = useCallback(() => {
    console.log('User tapped Back button');
    router.back();
  }, [router]);

  const handleEdit = useCallback(() => {
    if (camper) {
      console.log('User tapped Edit button for camper:', camper.id);
      router.push(`/edit-camper?id=${camper.id}`);
    }
  }, [camper, router]);

  if (isLoading) {
    return (
      <View style={[commonStyles.container, styles.loadingContainer, { paddingTop: Platform.OS === 'android' ? 48 + insets.top : insets.top }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[commonStyles.textSecondary, { marginTop: 16 }]}>
          Loading camper profile...
        </Text>
      </View>
    );
  }

  if (error || !camper) {
    const errorMessage = error || 'Camper not found';
    const errorDescription = error 
      ? 'Please try again or contact support if the problem persists.' 
      : 'The camper you are looking for could not be found. They may have been removed from the system.';

    return (
      <View style={[commonStyles.container, styles.loadingContainer, { paddingTop: Platform.OS === 'android' ? 48 + insets.top : insets.top }]}>
        <IconSymbol
          ios_icon_name="exclamationmark.triangle.fill"
          android_material_icon_name="warning"
          size={64}
          color={colors.error}
        />
        <Text style={[commonStyles.text, { marginTop: 16, fontSize: 18, fontWeight: '600' }]}>
          {errorMessage}
        </Text>
        <Text style={[commonStyles.textSecondary, { marginTop: 8, textAlign: 'center', paddingHorizontal: 32 }]}>
          {errorDescription}
        </Text>
        <TouchableOpacity
          style={[commonStyles.button, { marginTop: 24, backgroundColor: colors.primary, paddingHorizontal: 32, paddingVertical: 12, borderRadius: 12 }]}
          onPress={handleBack}
          activeOpacity={0.7}
        >
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const ageDisplay = calculateAge(camper.date_of_birth);
  const sessionDisplay = camper.session_name ? ` • ${camper.session_name}` : '';
  const headerSubtitleText = `Age ${ageDisplay}${sessionDisplay}`;

  const checkInStatusDisplay = 
    camper.check_in_status === 'checked-in' || camper.check_in_status === 'checked_in' ? 'Checked In' : 
    camper.check_in_status === 'checked-out' || camper.check_in_status === 'checked_out' ? 'Checked Out' : 'Not Arrived';

  let dateOfBirthDisplay = 'N/A';
  if (camper.date_of_birth) {
    try {
      const date = new Date(camper.date_of_birth);
      if (!isNaN(date.getTime())) {
        dateOfBirthDisplay = date.toLocaleDateString();
      }
    } catch (error) {
      console.error('Error formatting date of birth:', error);
    }
  }

  let lastCheckInDisplay = null;
  if (camper.last_check_in) {
    try {
      const date = new Date(camper.last_check_in);
      if (!isNaN(date.getTime())) {
        lastCheckInDisplay = date.toLocaleString();
      }
    } catch (error) {
      console.error('Error formatting last check-in:', error);
    }
  }

  let swimLevelDisplay = null;
  if (camper.swim_level) {
    try {
      const swimLevelStr = String(camper.swim_level).trim();
      if (swimLevelStr.length > 0) {
        swimLevelDisplay = swimLevelStr.charAt(0).toUpperCase() + swimLevelStr.slice(1).replace(/-/g, ' ');
      }
    } catch (error) {
      console.error('Error formatting swim level:', error);
      swimLevelDisplay = String(camper.swim_level);
    }
  }

  const hasMedicalInfo = canViewMedical && camper.medical_info;
  const hasAnyMedicalData = hasMedicalInfo && (
    camper.medical_info.has_epi_pen ||
    (camper.medical_info.allergies && camper.medical_info.allergies.length > 0) ||
    (camper.medical_info.medications && camper.medical_info.medications.length > 0) ||
    (camper.medical_info.dietary_restrictions && camper.medical_info.dietary_restrictions.length > 0) ||
    (camper.medical_info.medical_conditions && camper.medical_info.medical_conditions.length > 0) ||
    camper.medical_info.special_care_instructions ||
    camper.medical_info.doctor_name ||
    camper.medical_info.insurance_provider ||
    camper.medical_info.notes
  );

  console.log('🎨 RENDERING PROFILE');
  console.log('  - Can view medical:', canViewMedical);
  console.log('  - Has medical info object:', !!camper.medical_info);
  console.log('  - Has any medical data:', hasAnyMedicalData);

  return (
    <View style={[commonStyles.container, { paddingTop: Platform.OS === 'android' ? 48 + insets.top : insets.top }]}>
      <LinearGradient
        colors={[colors.primary, colors.primaryDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
            activeOpacity={0.7}
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          >
            <IconSymbol
              ios_icon_name="chevron.left"
              android_material_icon_name="arrow-back"
              size={24}
              color="#FFFFFF"
            />
          </TouchableOpacity>
          {canEdit && (
            <TouchableOpacity
              style={styles.editButton}
              onPress={handleEdit}
              activeOpacity={0.7}
              hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
            >
              <IconSymbol
                ios_icon_name="pencil"
                android_material_icon_name="edit"
                size={24}
                color="#FFFFFF"
              />
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.headerAvatar}>
          <IconSymbol
            ios_icon_name="person.fill"
            android_material_icon_name="person"
            size={48}
            color="#FFFFFF"
          />
        </View>
        <Text style={styles.headerTitle}>
          {camper.first_name}
        </Text>
        <Text style={styles.headerTitle}>
          {camper.last_name}
        </Text>
        <Text style={styles.headerSubtitle}>
          {headerSubtitleText}
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(camper.check_in_status) }]}>
          <Text style={styles.statusText}>
            {checkInStatusDisplay}
          </Text>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>
          <View style={commonStyles.card}>
            <View style={styles.infoRow}>
              <IconSymbol
                ios_icon_name="calendar"
                android_material_icon_name="calendar-today"
                size={20}
                color={colors.info}
              />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Date of Birth</Text>
                <Text style={styles.infoValue}>
                  {dateOfBirthDisplay}
                </Text>
              </View>
            </View>

            {swimLevelDisplay && (
              <React.Fragment>
                <View style={commonStyles.divider} />
                <View style={styles.infoRow}>
                  <IconSymbol
                    ios_icon_name="figure.pool.swim"
                    android_material_icon_name="pool"
                    size={20}
                    color={colors.info}
                  />
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Swim Level</Text>
                    <Text style={styles.infoValue}>
                      {swimLevelDisplay}
                    </Text>
                  </View>
                </View>
              </React.Fragment>
            )}

            {camper.cabin_assignment && (
              <React.Fragment>
                <View style={commonStyles.divider} />
                <View style={styles.infoRow}>
                  <IconSymbol
                    ios_icon_name="house.fill"
                    android_material_icon_name="home"
                    size={20}
                    color={colors.accent}
                  />
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Cabin Assignment</Text>
                    <Text style={styles.infoValue}>{camper.cabin_assignment}</Text>
                  </View>
                </View>
              </React.Fragment>
            )}

            {camper.wristband_id && (
              <React.Fragment>
                <View style={commonStyles.divider} />
                <View style={styles.infoRow}>
                  <IconSymbol
                    ios_icon_name="wave.3.right"
                    android_material_icon_name="nfc"
                    size={20}
                    color={colors.accent}
                  />
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>NFC Wristband ID</Text>
                    <Text style={styles.infoValue}>{camper.wristband_id}</Text>
                  </View>
                </View>
              </React.Fragment>
            )}

            {lastCheckInDisplay && (
              <React.Fragment>
                <View style={commonStyles.divider} />
                <View style={styles.infoRow}>
                  <IconSymbol
                    ios_icon_name="clock"
                    android_material_icon_name="schedule"
                    size={20}
                    color={colors.success}
                  />
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Last Check-In</Text>
                    <Text style={styles.infoValue}>
                      {lastCheckInDisplay}
                    </Text>
                  </View>
                </View>
              </React.Fragment>
            )}
          </View>
        </View>

        {canViewMedical && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Medical Information</Text>
            
            {!hasAnyMedicalData && (
              <View style={commonStyles.card}>
                <Text style={[styles.infoLabel, { textAlign: 'center', color: colors.textSecondary }]}>
                  No medical information on file
                </Text>
              </View>
            )}

            {hasAnyMedicalData && camper.medical_info && (
              <React.Fragment>
                {camper.medical_info.has_epi_pen && (
                  <View style={[commonStyles.card, styles.medicalCard, { borderLeftColor: colors.error, backgroundColor: colors.errorLight + '10' }]}>
                    <View style={styles.medicalHeader}>
                      <IconSymbol
                        ios_icon_name="exclamationmark.triangle.fill"
                        android_material_icon_name="warning"
                        size={24}
                        color={colors.error}
                      />
                      <Text style={[styles.medicalTitle, { color: colors.error }]}>⚠️ EpiPen Required</Text>
                    </View>
                    <Text style={[styles.medicalText, { color: colors.error, fontWeight: '600' }]}>
                      This camper requires an EpiPen for severe allergic reactions.
                    </Text>
                  </View>
                )}

                {camper.medical_info.allergies && camper.medical_info.allergies.length > 0 && (
                  <View style={[commonStyles.card, styles.medicalCard, { borderLeftColor: colors.error }]}>
                    <View style={styles.medicalHeader}>
                      <IconSymbol
                        ios_icon_name="exclamationmark.triangle.fill"
                        android_material_icon_name="warning"
                        size={24}
                        color={colors.error}
                      />
                      <Text style={[styles.medicalTitle, { color: colors.error }]}>Allergies</Text>
                    </View>
                    <Text style={styles.medicalText}>
                      {camper.medical_info.allergies.join(', ')}
                    </Text>
                  </View>
                )}

                {camper.medical_info.medications && camper.medical_info.medications.length > 0 && (
                  <View style={[commonStyles.card, styles.medicalCard, { borderLeftColor: colors.secondary }]}>
                    <View style={styles.medicalHeader}>
                      <IconSymbol
                        ios_icon_name="pills.fill"
                        android_material_icon_name="medication"
                        size={24}
                        color={colors.secondary}
                      />
                      <Text style={[styles.medicalTitle, { color: colors.secondary }]}>Medications</Text>
                    </View>
                    <Text style={styles.medicalText}>
                      {camper.medical_info.medications.join(', ')}
                    </Text>
                  </View>
                )}

                {camper.medical_info.dietary_restrictions && camper.medical_info.dietary_restrictions.length > 0 && (
                  <View style={[commonStyles.card, styles.medicalCard, { borderLeftColor: colors.accent }]}>
                    <View style={styles.medicalHeader}>
                      <IconSymbol
                        ios_icon_name="fork.knife"
                        android_material_icon_name="restaurant"
                        size={24}
                        color={colors.accent}
                      />
                      <Text style={[styles.medicalTitle, { color: colors.accent }]}>Dietary Restrictions</Text>
                    </View>
                    <Text style={styles.medicalText}>
                      {camper.medical_info.dietary_restrictions.join(', ')}
                    </Text>
                  </View>
                )}

                {camper.medical_info.medical_conditions && camper.medical_info.medical_conditions.length > 0 && (
                  <View style={[commonStyles.card, styles.medicalCard, { borderLeftColor: colors.warning }]}>
                    <View style={styles.medicalHeader}>
                      <IconSymbol
                        ios_icon_name="heart.text.square.fill"
                        android_material_icon_name="favorite"
                        size={24}
                        color={colors.warning}
                      />
                      <Text style={[styles.medicalTitle, { color: colors.warning }]}>Medical Conditions</Text>
                    </View>
                    <Text style={styles.medicalText}>
                      {camper.medical_info.medical_conditions.join(', ')}
                    </Text>
                  </View>
                )}

                {camper.medical_info.special_care_instructions && (
                  <View style={[commonStyles.card, styles.medicalCard, { borderLeftColor: colors.info }]}>
                    <View style={styles.medicalHeader}>
                      <IconSymbol
                        ios_icon_name="heart.text.square.fill"
                        android_material_icon_name="favorite"
                        size={24}
                        color={colors.info}
                      />
                      <Text style={[styles.medicalTitle, { color: colors.info }]}>Special Care Instructions</Text>
                    </View>
                    <Text style={styles.medicalText}>
                      {camper.medical_info.special_care_instructions}
                    </Text>
                  </View>
                )}

                {camper.medical_info.doctor_name && (
                  <View style={[commonStyles.card, styles.medicalCard, { borderLeftColor: colors.primary }]}>
                    <View style={styles.medicalHeader}>
                      <IconSymbol
                        ios_icon_name="stethoscope"
                        android_material_icon_name="local-hospital"
                        size={24}
                        color={colors.primary}
                      />
                      <Text style={[styles.medicalTitle, { color: colors.primary }]}>Doctor Information</Text>
                    </View>
                    <Text style={styles.medicalText}>
                      {camper.medical_info.doctor_name}
                    </Text>
                    {camper.medical_info.doctor_phone && (
                      <Text style={[styles.medicalText, { marginTop: 4 }]}>
                        {camper.medical_info.doctor_phone}
                      </Text>
                    )}
                  </View>
                )}

                {camper.medical_info.insurance_provider && (
                  <View style={[commonStyles.card, styles.medicalCard, { borderLeftColor: colors.secondary }]}>
                    <View style={styles.medicalHeader}>
                      <IconSymbol
                        ios_icon_name="creditcard.fill"
                        android_material_icon_name="credit-card"
                        size={24}
                        color={colors.secondary}
                      />
                      <Text style={[styles.medicalTitle, { color: colors.secondary }]}>Insurance</Text>
                    </View>
                    <Text style={styles.medicalText}>
                      {camper.medical_info.insurance_provider}
                    </Text>
                    {camper.medical_info.insurance_number && (
                      <Text style={[styles.medicalText, { marginTop: 4 }]}>
                        Policy: {camper.medical_info.insurance_number}
                      </Text>
                    )}
                  </View>
                )}

                {camper.medical_info.notes && (
                  <View style={[commonStyles.card, styles.medicalCard, { borderLeftColor: colors.textSecondary }]}>
                    <View style={styles.medicalHeader}>
                      <IconSymbol
                        ios_icon_name="note.text"
                        android_material_icon_name="description"
                        size={24}
                        color={colors.textSecondary}
                      />
                      <Text style={[styles.medicalTitle, { color: colors.textSecondary }]}>Additional Notes</Text>
                    </View>
                    <Text style={styles.medicalText}>
                      {camper.medical_info.notes}
                    </Text>
                  </View>
                )}
              </React.Fragment>
            )}
          </View>
        )}

        {camper.emergency_contacts.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Emergency Contacts</Text>
            {camper.emergency_contacts.map((contact, index) => {
              const priorityBgColor = contact.priority_order === 1 ? colors.error : colors.secondary;
              const priorityText = `#${contact.priority_order}`;
              
              return (
                <View key={index} style={commonStyles.card}>
                  <View style={styles.contactHeader}>
                    <View style={styles.contactAvatarContainer}>
                      <IconSymbol
                        ios_icon_name="person.circle.fill"
                        android_material_icon_name="account-circle"
                        size={40}
                        color={colors.primary}
                      />
                      <View style={[styles.priorityBadge, { backgroundColor: priorityBgColor }]}>
                        <Text style={styles.priorityText}>{priorityText}</Text>
                      </View>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.contactName}>{contact.full_name}</Text>
                      <Text style={styles.contactRelationship}>{contact.relationship}</Text>
                    </View>
                  </View>
                  <View style={commonStyles.divider} />
                  <View style={styles.contactInfo}>
                    <IconSymbol
                      ios_icon_name="phone.fill"
                      android_material_icon_name="phone"
                      size={18}
                      color={colors.accent}
                    />
                    <Text style={styles.contactPhone}>{contact.phone}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

export default function CamperProfileScreen() {
  return (
    <ProtectedRoute allowedRoles={['super-admin', 'camp-admin', 'staff', 'parent']}>
      <CamperProfileContent />
    </ProtectedRoute>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
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
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 20,
  },
  backButton: {
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 12,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButton: {
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 12,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
    opacity: 0.95,
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
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
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  medicalCard: {
    borderLeftWidth: 4,
    marginBottom: 12,
  },
  medicalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  medicalTitle: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  medicalText: {
    fontSize: 15,
    fontWeight: '400',
    color: colors.text,
    lineHeight: 22,
  },
  contactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  contactAvatarContainer: {
    position: 'relative',
  },
  priorityBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.card,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  contactName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  contactRelationship: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  contactInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  contactPhone: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
});
