
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { IconSymbol } from '@/components/IconSymbol';
import { colors, commonStyles } from '@/styles/commonStyles';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/app/integrations/supabase/client';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface CamperData {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  registration_status: string;
  wristband_id: string | null;
  check_in_status: string;
  session_id: string | null;
  swim_level: string | null;
  cabin_assignment: string | null;
  photo_url: string | null;
}

interface MedicalInfo {
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
}

// Helper function to format date as MM/dd/yyyy
function formatDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${month}/${day}/${year}`;
}

function EditCamperContent() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { hasPermission } = useAuth();
  
  const camperId = Array.isArray(params.id) ? params.id[0] : params.id;
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState(new Date());
  const [dobText, setDobText] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [wristbandId, setWristbandId] = useState('');
  const [checkInStatus, setCheckInStatus] = useState('not-arrived');
  const [swimLevel, setSwimLevel] = useState<string>('');
  const [cabinAssignment, setCabinAssignment] = useState('');
  const [registrationStatus, setRegistrationStatus] = useState('pending');

  const [allergiesText, setAllergiesText] = useState('');
  const [medicationsText, setMedicationsText] = useState('');
  const [dietaryRestrictionsText, setDietaryRestrictionsText] = useState('');
  const [medicalConditionsText, setMedicalConditionsText] = useState('');
  const [specialCareInstructions, setSpecialCareInstructions] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [doctorPhone, setDoctorPhone] = useState('');
  const [insuranceProvider, setInsuranceProvider] = useState('');
  const [insuranceNumber, setInsuranceNumber] = useState('');
  const [medicalNotes, setMedicalNotes] = useState('');
  const [hasMedicalInfo, setHasMedicalInfo] = useState(false);

  const canEdit = hasPermission(['super-admin', 'camp-admin']);

  const loadCamper = useCallback(async () => {
    if (!camperId) {
      console.error('No camper ID provided');
      Alert.alert('Error', 'No camper ID provided');
      setLoading(false);
      router.back();
      return;
    }

    try {
      console.log('=== LOADING CAMPER FOR EDITING ===');
      console.log('Camper ID:', camperId);
      setLoading(true);

      const { data: allCampers, error: rpcError } = await supabase.rpc('get_all_campers');

      if (rpcError) {
        console.error('RPC Error:', rpcError);
        Alert.alert(
          'Database Error',
          `Failed to load camper: ${rpcError.message}. Please try again.`,
          [{ text: 'OK', onPress: () => router.back() }]
        );
        setLoading(false);
        return;
      }

      if (!allCampers || allCampers.length === 0) {
        console.error('No campers returned from get_all_campers');
        Alert.alert(
          'No Data',
          'No campers found in the system.',
          [{ text: 'OK', onPress: () => router.back() }]
        );
        setLoading(false);
        return;
      }

      console.log('Total campers loaded:', allCampers.length);

      const data = allCampers.find((c: any) => c.id === camperId);

      if (!data) {
        console.error('Camper not found with ID:', camperId);
        Alert.alert(
          'Camper Not Found',
          'The camper you are trying to edit could not be found.',
          [{ text: 'OK', onPress: () => router.back() }]
        );
        setLoading(false);
        return;
      }

      console.log('=== CAMPER DATA LOADED FOR EDITING ===');
      console.log('Raw camper data:', JSON.stringify(data, null, 2));

      let parsedDate = new Date();
      try {
        if (data.date_of_birth) {
          parsedDate = new Date(data.date_of_birth);
          if (isNaN(parsedDate.getTime())) {
            console.error('Invalid date:', data.date_of_birth);
            parsedDate = new Date();
          } else {
            console.log('Date parsed successfully:', parsedDate.toISOString());
          }
        }
      } catch (error) {
        console.error('Error parsing date:', error);
        parsedDate = new Date();
      }
      
      console.log('Setting basic info state values...');
      setFirstName(data.first_name || '');
      setLastName(data.last_name || '');
      setDateOfBirth(parsedDate);
      setDobText(formatDate(parsedDate));
      setWristbandId(data.wristband_id || '');
      setCheckInStatus(data.check_in_status || 'not-arrived');
      setSwimLevel(data.swim_level || '');
      setCabinAssignment(data.cabin_assignment || '');
      setRegistrationStatus(data.registration_status || 'pending');

      console.log('✅ Basic info state set:');
      console.log('  - First Name:', data.first_name || '(empty)');
      console.log('  - Last Name:', data.last_name || '(empty)');
      console.log('  - Swim Level:', data.swim_level || '(empty)');
      console.log('  - Cabin:', data.cabin_assignment || '(empty)');
      console.log('  - Wristband ID:', data.wristband_id || '(empty)');
      console.log('  - Date of Birth:', parsedDate.toISOString());
      console.log('  - DOB Text:', formatDate(parsedDate));

      console.log('🔍 LOADING MEDICAL INFO for camper:', camperId);
      const { data: medicalData, error: medicalError } = await supabase
        .from('camper_medical_info')
        .select('*')
        .eq('camper_id', camperId)
        .maybeSingle();

      console.log('📋 Medical query completed');
      console.log('  - Error:', medicalError ? medicalError.message : 'none');
      console.log('  - Data exists:', !!medicalData);

      if (medicalError) {
        console.error('❌ Medical info error:', medicalError);
        setHasMedicalInfo(false);
        
        console.log('Setting empty medical info state due to error');
        setAllergiesText('');
        setMedicationsText('');
        setDietaryRestrictionsText('');
        setMedicalConditionsText('');
        setSpecialCareInstructions('');
        setDoctorName('');
        setDoctorPhone('');
        setInsuranceProvider('');
        setInsuranceNumber('');
        setMedicalNotes('');
      } else if (medicalData) {
        console.log('=== ✅ MEDICAL INFO FOUND ===');
        console.log('Raw medical data:', JSON.stringify(medicalData, null, 2));
        setHasMedicalInfo(true);
        
        const allergiesArray = medicalData.allergies || [];
        const medicationsArray = medicalData.medications || [];
        const dietaryArray = medicalData.dietary_restrictions || [];
        const conditionsArray = medicalData.medical_conditions || [];
        
        const allergiesStr = allergiesArray.join(', ');
        const medicationsStr = medicationsArray.join(', ');
        const dietaryStr = dietaryArray.join(', ');
        const conditionsStr = conditionsArray.join(', ');
        
        console.log('📝 Setting medical info state:');
        console.log('  - Allergies array:', allergiesArray, '→ string:', allergiesStr);
        console.log('  - Medications array:', medicationsArray, '→ string:', medicationsStr);
        console.log('  - Dietary array:', dietaryArray, '→ string:', dietaryStr);
        console.log('  - Conditions array:', conditionsArray, '→ string:', conditionsStr);
        console.log('  - Special care:', medicalData.special_care_instructions || '(empty)');
        console.log('  - Doctor name:', medicalData.doctor_name || '(empty)');
        console.log('  - Doctor phone:', medicalData.doctor_phone || '(empty)');
        console.log('  - Insurance provider:', medicalData.insurance_provider || '(empty)');
        console.log('  - Insurance number:', medicalData.insurance_number || '(empty)');
        console.log('  - Notes:', medicalData.notes || '(empty)');
        
        setAllergiesText(allergiesStr);
        setMedicationsText(medicationsStr);
        setDietaryRestrictionsText(dietaryStr);
        setMedicalConditionsText(conditionsStr);
        setSpecialCareInstructions(medicalData.special_care_instructions || '');
        setDoctorName(medicalData.doctor_name || '');
        setDoctorPhone(medicalData.doctor_phone || '');
        setInsuranceProvider(medicalData.insurance_provider || '');
        setInsuranceNumber(medicalData.insurance_number || '');
        setMedicalNotes(medicalData.notes || '');
        
        console.log('✅ Medical info state set successfully');
      } else {
        console.log('ℹ️ No medical info found for camper (null/undefined result)');
        setHasMedicalInfo(false);
        
        console.log('Setting empty medical info state (no data)');
        setAllergiesText('');
        setMedicationsText('');
        setDietaryRestrictionsText('');
        setMedicalConditionsText('');
        setSpecialCareInstructions('');
        setDoctorName('');
        setDoctorPhone('');
        setInsuranceProvider('');
        setInsuranceNumber('');
        setMedicalNotes('');
      }

      console.log('=== LOAD COMPLETE - Setting loading to false ===');
      setLoading(false);
    } catch (error: any) {
      console.error('=== ERROR IN LOAD CAMPER ===');
      console.error('Error:', error);
      console.error('Stack:', error?.stack);
      Alert.alert(
        'Error',
        error?.message || 'Failed to load camper data',
        [{ text: 'OK', onPress: () => router.back() }]
      );
      setLoading(false);
    }
  }, [camperId, router]);

  useFocusEffect(
    useCallback(() => {
      console.log('Edit camper screen focused - loading data for camper:', camperId);
      if (camperId) {
        loadCamper();
      }
    }, [camperId, loadCamper])
  );

  const handleDateChange = useCallback((event: DateTimePickerEvent, selectedDate?: Date) => {
    console.log('Date picker event:', event.type);
    
    const currentDate = selectedDate || dateOfBirth;
    
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    
    if (event.type === 'set') {
      console.log('User selected date:', currentDate.toISOString());
      setDateOfBirth(currentDate);
      setDobText(formatDate(currentDate));
      
      if (Platform.OS === 'ios') {
        setShowDatePicker(false);
      }
    } else if (event.type === 'dismissed') {
      console.log('Date picker dismissed');
      setShowDatePicker(false);
    }
  }, [dateOfBirth]);

  const validateForm = useCallback(() => {
    if (!firstName.trim()) {
      Alert.alert('Validation Error', 'Please enter a first name');
      return false;
    }
    if (!lastName.trim()) {
      Alert.alert('Validation Error', 'Please enter a last name');
      return false;
    }
    return true;
  }, [firstName, lastName]);

  const handleSave = useCallback(async () => {
    console.log('=== SAVE BUTTON PRESSED ===');
    
    if (!validateForm()) {
      return;
    }

    if (!canEdit) {
      Alert.alert('Access Denied', 'You do not have permission to edit campers');
      return;
    }

    try {
      setSaving(true);
      console.log('=== STARTING SAVE PROCESS ===');
      console.log('Camper ID:', camperId);
      console.log('Data to save:');
      console.log('  - First Name:', firstName);
      console.log('  - Last Name:', lastName);
      console.log('  - Swim Level:', swimLevel);
      console.log('  - Cabin:', cabinAssignment);
      console.log('  - Date of Birth:', dateOfBirth.toISOString());

      console.log('Calling update_camper_bypass_rls RPC function...');
      const { data: updateResult, error: camperError } = await supabase.rpc('update_camper_bypass_rls', {
        p_camper_id: camperId,
        p_first_name: firstName.trim(),
        p_last_name: lastName.trim(),
        p_date_of_birth: dateOfBirth.toISOString().split('T')[0],
        p_check_in_status: checkInStatus,
        p_registration_status: registrationStatus,
        p_swim_level: swimLevel || null,
        p_cabin_assignment: cabinAssignment.trim() || null,
        p_wristband_id: wristbandId.trim() || null,
      });

      if (camperError) {
        console.error('=== CAMPER UPDATE ERROR ===');
        console.error('Error:', camperError);
        throw new Error(`Failed to update camper: ${camperError.message}`);
      }

      console.log('✅ Camper basic info updated successfully');

      const allergiesArray = allergiesText.trim() ? allergiesText.split(',').map(s => s.trim()).filter(s => s) : [];
      const medicationsArray = medicationsText.trim() ? medicationsText.split(',').map(s => s.trim()).filter(s => s) : [];
      const dietaryArray = dietaryRestrictionsText.trim() ? dietaryRestrictionsText.split(',').map(s => s.trim()).filter(s => s) : [];
      const conditionsArray = medicalConditionsText.trim() ? medicalConditionsText.split(',').map(s => s.trim()).filter(s => s) : [];

      console.log('Calling upsert_camper_medical_info_bypass_rls RPC function...');
      console.log('Medical data to save:');
      console.log('  - Allergies:', allergiesArray);
      console.log('  - Medications:', medicationsArray);

      const { data: medicalResult, error: medicalError } = await supabase.rpc('upsert_camper_medical_info_bypass_rls', {
        p_camper_id: camperId,
        p_allergies: allergiesArray,
        p_medications: medicationsArray,
        p_dietary_restrictions: dietaryArray,
        p_medical_conditions: conditionsArray,
        p_special_care_instructions: specialCareInstructions.trim() || null,
        p_doctor_name: doctorName.trim() || null,
        p_doctor_phone: doctorPhone.trim() || null,
        p_insurance_provider: insuranceProvider.trim() || null,
        p_insurance_number: insuranceNumber.trim() || null,
        p_notes: medicalNotes.trim() || null,
      });

      if (medicalError) {
        console.error('=== MEDICAL INFO UPDATE ERROR ===');
        console.error('Error:', medicalError);
        throw new Error(`Failed to save medical info: ${medicalError.message}`);
      }

      console.log('✅ Medical info saved successfully');
      console.log('=== SAVE COMPLETE - ALL DATA UPDATED ===');

      Alert.alert(
        'Success! ✅',
        'Camper information has been updated successfully',
        [
          {
            text: 'OK',
            onPress: () => {
              console.log('Navigating back after successful update');
              router.back();
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('=== SAVE ERROR ===');
      console.error('Error:', error);
      console.error('Error message:', error?.message);
      Alert.alert('Error', error?.message || 'Failed to update camper');
    } finally {
      setSaving(false);
    }
  }, [
    validateForm,
    canEdit,
    camperId,
    firstName,
    lastName,
    dateOfBirth,
    checkInStatus,
    registrationStatus,
    swimLevel,
    cabinAssignment,
    wristbandId,
    allergiesText,
    medicationsText,
    dietaryRestrictionsText,
    medicalConditionsText,
    specialCareInstructions,
    doctorName,
    doctorPhone,
    insuranceProvider,
    insuranceNumber,
    medicalNotes,
    router,
  ]);

  const handleBack = useCallback(() => {
    console.log('User tapped Back button');
    router.back();
  }, [router]);

  if (loading) {
    return (
      <View style={[commonStyles.container, styles.loadingContainer, { paddingTop: Platform.OS === 'android' ? 48 + insets.top : insets.top }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[commonStyles.textSecondary, { marginTop: 16 }]}>
          Loading camper data...
        </Text>
      </View>
    );
  }

  console.log('=== RENDERING FORM ===');
  console.log('Current state values:');
  console.log('  - First Name:', firstName);
  console.log('  - Last Name:', lastName);
  console.log('  - Swim Level:', swimLevel);
  console.log('  - Cabin Assignment:', cabinAssignment);
  console.log('  - Wristband ID:', wristbandId);
  console.log('  - DOB Text:', dobText);
  console.log('  - Allergies Text:', allergiesText);
  console.log('  - Medications Text:', medicationsText);
  console.log('  - Dietary Restrictions Text:', dietaryRestrictionsText);
  console.log('  - Medical Conditions Text:', medicalConditionsText);
  console.log('  - Special Care:', specialCareInstructions);
  console.log('  - Doctor Name:', doctorName);
  console.log('  - Doctor Phone:', doctorPhone);
  console.log('  - Insurance Provider:', insuranceProvider);
  console.log('  - Insurance Number:', insuranceNumber);
  console.log('  - Medical Notes:', medicalNotes);

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
          <Text style={styles.headerTitle}>Edit Camper</Text>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>
          
          <View style={commonStyles.card}>
            <Text style={styles.label}>First Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter first name"
              placeholderTextColor={colors.textSecondary}
              value={firstName}
              onChangeText={(text) => {
                console.log('User typing first name:', text);
                setFirstName(text);
              }}
              autoCapitalize="words"
            />

            <Text style={[styles.label, { marginTop: 16 }]}>Last Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter last name"
              placeholderTextColor={colors.textSecondary}
              value={lastName}
              onChangeText={(text) => {
                console.log('User typing last name:', text);
                setLastName(text);
              }}
              autoCapitalize="words"
            />

            <Text style={[styles.label, { marginTop: 16 }]}>Date of Birth *</Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => {
                console.log('User tapped date picker');
                setShowDatePicker(true);
              }}
              activeOpacity={0.7}
            >
              <IconSymbol
                ios_icon_name="calendar"
                android_material_icon_name="calendar-today"
                size={20}
                color={colors.primary}
              />
              <Text style={styles.dateButtonText}>
                {dobText}
              </Text>
            </TouchableOpacity>

            {showDatePicker && (
              <DateTimePicker
                value={dateOfBirth}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleDateChange}
                maximumDate={new Date()}
              />
            )}

            <Text style={[styles.label, { marginTop: 16 }]}>Wristband ID</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter wristband ID (optional)"
              placeholderTextColor={colors.textSecondary}
              value={wristbandId}
              onChangeText={(text) => {
                console.log('User typing wristband ID:', text);
                setWristbandId(text);
              }}
            />

            <Text style={[styles.label, { marginTop: 16 }]}>Swim Level</Text>
            <View style={styles.swimLevelButtons}>
              {['non-swimmer', 'beginner', 'intermediate', 'advanced', 'lifeguard'].map((level) => {
                const isActive = swimLevel === level;
                const levelDisplay = level.charAt(0).toUpperCase() + level.slice(1).replace('-', ' ');
                
                return (
                  <TouchableOpacity
                    key={level}
                    style={[
                      styles.swimLevelButton,
                      isActive && styles.swimLevelButtonActive,
                    ]}
                    onPress={() => {
                      console.log('User selected swim level:', level);
                      setSwimLevel(level);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.swimLevelButtonText,
                        isActive && styles.swimLevelButtonTextActive,
                      ]}
                    >
                      {levelDisplay}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[styles.label, { marginTop: 16 }]}>Cabin Assignment</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter cabin assignment (optional)"
              placeholderTextColor={colors.textSecondary}
              value={cabinAssignment}
              onChangeText={(text) => {
                console.log('User typing cabin assignment:', text);
                setCabinAssignment(text);
              }}
            />

            <Text style={[styles.label, { marginTop: 16 }]}>Registration Status</Text>
            <View style={styles.statusButtons}>
              <TouchableOpacity
                style={[
                  styles.statusButton,
                  registrationStatus === 'pending' && styles.statusButtonActive,
                ]}
                onPress={() => {
                  console.log('User selected registration status: pending');
                  setRegistrationStatus('pending');
                }}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.statusButtonText,
                    registrationStatus === 'pending' && styles.statusButtonTextActive,
                  ]}
                >
                  Pending
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.statusButton,
                  registrationStatus === 'incomplete' && styles.statusButtonActive,
                ]}
                onPress={() => {
                  console.log('User selected registration status: incomplete');
                  setRegistrationStatus('incomplete');
                }}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.statusButtonText,
                    registrationStatus === 'incomplete' && styles.statusButtonTextActive,
                  ]}
                >
                  Incomplete
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.statusButton,
                  registrationStatus === 'complete' && styles.statusButtonActive,
                ]}
                onPress={() => {
                  console.log('User selected registration status: complete');
                  setRegistrationStatus('complete');
                }}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.statusButtonText,
                    registrationStatus === 'complete' && styles.statusButtonTextActive,
                  ]}
                >
                  Complete
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.statusButton,
                  registrationStatus === 'cancelled' && styles.statusButtonActive,
                ]}
                onPress={() => {
                  console.log('User selected registration status: cancelled');
                  setRegistrationStatus('cancelled');
                }}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.statusButtonText,
                    registrationStatus === 'cancelled' && styles.statusButtonTextActive,
                  ]}
                >
                  Cancelled
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.label, { marginTop: 16 }]}>Check-In Status</Text>
            <View style={styles.statusButtons}>
              <TouchableOpacity
                style={[
                  styles.statusButton,
                  checkInStatus === 'not-arrived' && styles.statusButtonActive,
                ]}
                onPress={() => {
                  console.log('User selected status: not-arrived');
                  setCheckInStatus('not-arrived');
                }}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.statusButtonText,
                    checkInStatus === 'not-arrived' && styles.statusButtonTextActive,
                  ]}
                >
                  Not Arrived
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.statusButton,
                  checkInStatus === 'checked-in' && styles.statusButtonActive,
                ]}
                onPress={() => {
                  console.log('User selected status: checked-in');
                  setCheckInStatus('checked-in');
                }}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.statusButtonText,
                    checkInStatus === 'checked-in' && styles.statusButtonTextActive,
                  ]}
                >
                  Checked In
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.statusButton,
                  checkInStatus === 'checked-out' && styles.statusButtonActive,
                ]}
                onPress={() => {
                  console.log('User selected status: checked-out');
                  setCheckInStatus('checked-out');
                }}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.statusButtonText,
                    checkInStatus === 'checked-out' && styles.statusButtonTextActive,
                  ]}
                >
                  Checked Out
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Medical Information</Text>
          
          <View style={commonStyles.card}>
            <Text style={styles.label}>Allergies</Text>
            <Text style={styles.helperText}>Separate multiple items with commas</Text>
            <TextInput
              style={[styles.input, styles.multilineInput]}
              placeholder="e.g., Peanuts, Tree nuts, Shellfish"
              placeholderTextColor={colors.textSecondary}
              value={allergiesText}
              onChangeText={(text) => {
                console.log('User typing allergies:', text);
                setAllergiesText(text);
              }}
              multiline
              numberOfLines={2}
            />

            <Text style={[styles.label, { marginTop: 16 }]}>Medications</Text>
            <Text style={styles.helperText}>Separate multiple items with commas</Text>
            <TextInput
              style={[styles.input, styles.multilineInput]}
              placeholder="e.g., Albuterol inhaler, EpiPen"
              placeholderTextColor={colors.textSecondary}
              value={medicationsText}
              onChangeText={(text) => {
                console.log('User typing medications:', text);
                setMedicationsText(text);
              }}
              multiline
              numberOfLines={2}
            />

            <Text style={[styles.label, { marginTop: 16 }]}>Dietary Restrictions</Text>
            <Text style={styles.helperText}>Separate multiple items with commas</Text>
            <TextInput
              style={[styles.input, styles.multilineInput]}
              placeholder="e.g., Vegetarian, Gluten-free"
              placeholderTextColor={colors.textSecondary}
              value={dietaryRestrictionsText}
              onChangeText={(text) => {
                console.log('User typing dietary restrictions:', text);
                setDietaryRestrictionsText(text);
              }}
              multiline
              numberOfLines={2}
            />

            <Text style={[styles.label, { marginTop: 16 }]}>Medical Conditions</Text>
            <Text style={styles.helperText}>Separate multiple items with commas</Text>
            <TextInput
              style={[styles.input, styles.multilineInput]}
              placeholder="e.g., Asthma, Diabetes"
              placeholderTextColor={colors.textSecondary}
              value={medicalConditionsText}
              onChangeText={(text) => {
                console.log('User typing medical conditions:', text);
                setMedicalConditionsText(text);
              }}
              multiline
              numberOfLines={2}
            />

            <Text style={[styles.label, { marginTop: 16 }]}>Special Care Instructions</Text>
            <TextInput
              style={[styles.input, styles.multilineInput]}
              placeholder="Any special care instructions..."
              placeholderTextColor={colors.textSecondary}
              value={specialCareInstructions}
              onChangeText={(text) => {
                console.log('User typing special care instructions:', text);
                setSpecialCareInstructions(text);
              }}
              multiline
              numberOfLines={3}
            />

            <Text style={[styles.label, { marginTop: 16 }]}>Doctor Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Primary care physician"
              placeholderTextColor={colors.textSecondary}
              value={doctorName}
              onChangeText={(text) => {
                console.log('User typing doctor name:', text);
                setDoctorName(text);
              }}
            />

            <Text style={[styles.label, { marginTop: 16 }]}>Doctor Phone</Text>
            <TextInput
              style={styles.input}
              placeholder="Doctor's phone number"
              placeholderTextColor={colors.textSecondary}
              value={doctorPhone}
              onChangeText={(text) => {
                console.log('User typing doctor phone:', text);
                setDoctorPhone(text);
              }}
              keyboardType="phone-pad"
            />

            <Text style={[styles.label, { marginTop: 16 }]}>Insurance Provider</Text>
            <TextInput
              style={styles.input}
              placeholder="Insurance company name"
              placeholderTextColor={colors.textSecondary}
              value={insuranceProvider}
              onChangeText={(text) => {
                console.log('User typing insurance provider:', text);
                setInsuranceProvider(text);
              }}
            />

            <Text style={[styles.label, { marginTop: 16 }]}>Insurance Number</Text>
            <TextInput
              style={styles.input}
              placeholder="Policy or member number"
              placeholderTextColor={colors.textSecondary}
              value={insuranceNumber}
              onChangeText={(text) => {
                console.log('User typing insurance number:', text);
                setInsuranceNumber(text);
              }}
            />

            <Text style={[styles.label, { marginTop: 16 }]}>Additional Notes</Text>
            <TextInput
              style={[styles.input, styles.multilineInput]}
              placeholder="Any additional medical notes..."
              placeholderTextColor={colors.textSecondary}
              value={medicalNotes}
              onChangeText={(text) => {
                console.log('User typing medical notes:', text);
                setMedicalNotes(text);
              }}
              multiline
              numberOfLines={3}
            />
          </View>
        </View>

        <View style={styles.section}>
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[colors.primary, colors.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.saveButtonGradient}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <React.Fragment>
                  <IconSymbol
                    ios_icon_name="checkmark.circle.fill"
                    android_material_icon_name="check-circle"
                    size={24}
                    color="#FFFFFF"
                  />
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                </React.Fragment>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

export default function EditCamperScreen() {
  return (
    <ProtectedRoute allowedRoles={['super-admin', 'camp-admin']}>
      <EditCamperContent />
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
    paddingBottom: 24,
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
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
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
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  helperText: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.textSecondary,
    marginBottom: 8,
    fontStyle: 'italic',
  },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.text,
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  dateButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
  },
  statusButtons: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  statusButton: {
    flex: 1,
    minWidth: 100,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
  },
  statusButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  statusButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  statusButtonTextActive: {
    color: '#FFFFFF',
  },
  swimLevelButtons: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  swimLevelButton: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
  },
  swimLevelButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  swimLevelButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  swimLevelButtonTextActive: {
    color: '#FFFFFF',
  },
  saveButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
    gap: 12,
  },
  saveButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
});
