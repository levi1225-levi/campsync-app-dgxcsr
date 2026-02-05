
import React, { useState, useEffect, useCallback } from 'react';
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
        return;
      }

      console.log('Total campers loaded:', allCampers?.length || 0);

      const data = allCampers?.find((c: any) => c.id === camperId);

      if (!data) {
        console.error('Camper not found with ID:', camperId);
        Alert.alert(
          'Camper Not Found',
          'The camper you are trying to edit could not be found.',
          [{ text: 'OK', onPress: () => router.back() }]
        );
        return;
      }

      console.log('=== CAMPER DATA LOADED FOR EDITING ===');
      console.log('Full camper data:', JSON.stringify(data, null, 2));
      console.log('Name:', data.first_name, data.last_name);
      console.log('Swim Level:', data.swim_level);
      console.log('Cabin:', data.cabin_assignment);
      console.log('Check-in Status:', data.check_in_status);
      console.log('Registration Status:', data.registration_status);
      console.log('Wristband ID:', data.wristband_id);
      console.log('Date of Birth:', data.date_of_birth);

      // FIXED: Parse date properly and set all state in one batch
      const parsedDate = data.date_of_birth ? new Date(data.date_of_birth) : new Date();
      
      // Set all state values
      setFirstName(data.first_name || '');
      setLastName(data.last_name || '');
      setDateOfBirth(parsedDate);
      setWristbandId(data.wristband_id || '');
      setCheckInStatus(data.check_in_status || 'not-arrived');
      setSwimLevel(data.swim_level || '');
      setCabinAssignment(data.cabin_assignment || '');
      setRegistrationStatus(data.registration_status || 'pending');

      console.log('State set with values:');
      console.log('- First Name:', data.first_name || '');
      console.log('- Last Name:', data.last_name || '');
      console.log('- Swim Level:', data.swim_level || '');
      console.log('- Cabin:', data.cabin_assignment || '');
      console.log('- Wristband ID:', data.wristband_id || '');
      console.log('- Date of Birth:', parsedDate.toISOString());

      console.log('Loading medical info for camper:', camperId);
      const { data: medicalData, error: medicalError } = await supabase
        .from('camper_medical_info')
        .select('*')
        .eq('camper_id', camperId)
        .maybeSingle();

      if (medicalError) {
        console.error('Medical info error:', medicalError);
      } else if (medicalData) {
        console.log('=== MEDICAL INFO LOADED ===');
        console.log('Allergies:', medicalData.allergies);
        console.log('Medications:', medicalData.medications);
        setHasMedicalInfo(true);
        setAllergiesText((medicalData.allergies || []).join(', '));
        setMedicationsText((medicalData.medications || []).join(', '));
        setDietaryRestrictionsText((medicalData.dietary_restrictions || []).join(', '));
        setMedicalConditionsText((medicalData.medical_conditions || []).join(', '));
        setSpecialCareInstructions(medicalData.special_care_instructions || '');
        setDoctorName(medicalData.doctor_name || '');
        setDoctorPhone(medicalData.doctor_phone || '');
        setInsuranceProvider(medicalData.insurance_provider || '');
        setInsuranceNumber(medicalData.insurance_number || '');
        setMedicalNotes(medicalData.notes || '');
      } else {
        console.log('No medical info found for camper');
        setHasMedicalInfo(false);
      }

      console.log('=== LOAD COMPLETE ===');
      setLoading(false);
    } catch (error: any) {
      console.error('=== ERROR IN LOAD CAMPER ===');
      console.error('Error:', error);
      Alert.alert(
        'Error',
        error?.message || 'Failed to load camper data',
        [{ text: 'OK', onPress: () => router.back() }]
      );
      setLoading(false);
    }
  }, [camperId, router]);

  // Load data when screen mounts or comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log('Edit camper screen focused - loading data for camper:', camperId);
      if (camperId) {
        loadCamper();
      }
    }, [camperId, loadCamper])
  );

  const handleDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    console.log('Date picker event:', event.type);
    
    // On Android, close the picker after selection or dismissal
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    
    // Update the date if user selected one (not dismissed)
    if (event.type === 'set' && selectedDate) {
      console.log('User selected date:', selectedDate.toISOString());
      setDateOfBirth(selectedDate);
      // On iOS, keep the picker open until user taps outside
      if (Platform.OS === 'ios') {
        setShowDatePicker(false);
      }
    } else if (event.type === 'dismissed') {
      // User cancelled the picker
      console.log('Date picker dismissed');
      setShowDatePicker(false);
    }
  };

  const validateForm = () => {
    if (!firstName.trim()) {
      Alert.alert('Validation Error', 'Please enter a first name');
      return false;
    }
    if (!lastName.trim()) {
      Alert.alert('Validation Error', 'Please enter a last name');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
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
      console.log('First Name:', firstName);
      console.log('Last Name:', lastName);
      console.log('Swim Level:', swimLevel);
      console.log('Cabin:', cabinAssignment);

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
        console.error('Error message:', camperError.message);
        console.error('Error details:', camperError.details);
        console.error('Error hint:', camperError.hint);
        throw new Error(`Failed to update camper: ${camperError.message}`);
      }

      console.log('✅ Camper basic info updated successfully');
      console.log('Update result:', updateResult);

      const allergiesArray = allergiesText.trim() ? allergiesText.split(',').map(s => s.trim()).filter(s => s) : [];
      const medicationsArray = medicationsText.trim() ? medicationsText.split(',').map(s => s.trim()).filter(s => s) : [];
      const dietaryArray = dietaryRestrictionsText.trim() ? dietaryRestrictionsText.split(',').map(s => s.trim()).filter(s => s) : [];
      const conditionsArray = medicalConditionsText.trim() ? medicalConditionsText.split(',').map(s => s.trim()).filter(s => s) : [];

      console.log('Calling upsert_camper_medical_info_bypass_rls RPC function...');
      console.log('Allergies array:', allergiesArray);
      console.log('Medications array:', medicationsArray);

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
        console.error('Error message:', medicalError.message);
        console.error('Error details:', medicalError.details);
        console.error('Error hint:', medicalError.hint);
        throw new Error(`Failed to save medical info: ${medicalError.message}`);
      }

      console.log('✅ Medical info saved successfully');
      console.log('Medical result:', medicalResult);

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
      console.error('Error stack:', error?.stack);
      Alert.alert('Error', error?.message || 'Failed to update camper');
    } finally {
      setSaving(false);
    }
  };

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
  console.log('- First Name:', firstName);
  console.log('- Last Name:', lastName);
  console.log('- Swim Level:', swimLevel);
  console.log('- Cabin Assignment:', cabinAssignment);
  console.log('- Wristband ID:', wristbandId);

  const dateDisplayText = dateOfBirth.toLocaleDateString();

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
                {dateDisplayText}
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
              onChangeText={setAllergiesText}
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
              onChangeText={setMedicationsText}
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
              onChangeText={setDietaryRestrictionsText}
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
              onChangeText={setMedicalConditionsText}
              multiline
              numberOfLines={2}
            />

            <Text style={[styles.label, { marginTop: 16 }]}>Special Care Instructions</Text>
            <TextInput
              style={[styles.input, styles.multilineInput]}
              placeholder="Any special care instructions..."
              placeholderTextColor={colors.textSecondary}
              value={specialCareInstructions}
              onChangeText={setSpecialCareInstructions}
              multiline
              numberOfLines={3}
            />

            <Text style={[styles.label, { marginTop: 16 }]}>Doctor Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Primary care physician"
              placeholderTextColor={colors.textSecondary}
              value={doctorName}
              onChangeText={setDoctorName}
            />

            <Text style={[styles.label, { marginTop: 16 }]}>Doctor Phone</Text>
            <TextInput
              style={styles.input}
              placeholder="Doctor's phone number"
              placeholderTextColor={colors.textSecondary}
              value={doctorPhone}
              onChangeText={setDoctorPhone}
              keyboardType="phone-pad"
            />

            <Text style={[styles.label, { marginTop: 16 }]}>Insurance Provider</Text>
            <TextInput
              style={styles.input}
              placeholder="Insurance company name"
              placeholderTextColor={colors.textSecondary}
              value={insuranceProvider}
              onChangeText={setInsuranceProvider}
            />

            <Text style={[styles.label, { marginTop: 16 }]}>Insurance Number</Text>
            <TextInput
              style={styles.input}
              placeholder="Policy or member number"
              placeholderTextColor={colors.textSecondary}
              value={insuranceNumber}
              onChangeText={setInsuranceNumber}
            />

            <Text style={[styles.label, { marginTop: 16 }]}>Additional Notes</Text>
            <TextInput
              style={[styles.input, styles.multilineInput]}
              placeholder="Any additional medical notes..."
              placeholderTextColor={colors.textSecondary}
              value={medicalNotes}
              onChangeText={setMedicalNotes}
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
                <>
                  <IconSymbol
                    ios_icon_name="checkmark.circle.fill"
                    android_material_icon_name="check-circle"
                    size={24}
                    color="#FFFFFF"
                  />
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                </>
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
