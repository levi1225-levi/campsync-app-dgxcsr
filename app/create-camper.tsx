
import React, { useState } from 'react';
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
import { router } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import { colors, commonStyles } from '@/styles/commonStyles';
import { supabase } from '@/app/integrations/supabase/client';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function CreateCamperScreen() {
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  // Basic Information
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState(new Date());
  const [wristbandId, setWristbandId] = useState('');
  
  // Medical Information
  const [allergies, setAllergies] = useState('');
  const [medications, setMedications] = useState('');
  const [medicalConditions, setMedicalConditions] = useState('');
  const [dietaryRestrictions, setDietaryRestrictions] = useState('');
  
  // Emergency Contacts
  const [emergency1Name, setEmergency1Name] = useState('');
  const [emergency1Phone, setEmergency1Phone] = useState('');
  const [emergency1Relationship, setEmergency1Relationship] = useState('');
  
  const [emergency2Name, setEmergency2Name] = useState('');
  const [emergency2Phone, setEmergency2Phone] = useState('');
  const [emergency2Relationship, setEmergency2Relationship] = useState('');

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDateOfBirth(selectedDate);
    }
  };

  const validateForm = () => {
    if (!firstName.trim()) {
      Alert.alert('Validation Error', 'First name is required');
      return false;
    }
    if (!lastName.trim()) {
      Alert.alert('Validation Error', 'Last name is required');
      return false;
    }
    if (!emergency1Name.trim() || !emergency1Phone.trim()) {
      Alert.alert('Validation Error', 'At least one emergency contact is required');
      return false;
    }
    return true;
  };

  const handleCreateCamper = async () => {
    console.log('User tapped Create Camper button');
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      console.log('Creating camper with data:', {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        dateOfBirth: dateOfBirth.toISOString().split('T')[0],
      });

      // Get the first camp (since this is a single-camp system)
      console.log('Fetching camp information...');
      const { data: camps, error: campsError } = await supabase
        .from('camps')
        .select('id')
        .limit(1)
        .maybeSingle();

      if (campsError) {
        console.error('Error fetching camp:', campsError);
        Alert.alert(
          'Database Error',
          'Failed to fetch camp information. Please try again or contact support.',
          [{ text: 'OK' }]
        );
        setLoading(false);
        return;
      }

      if (!camps) {
        console.error('No camp found in database');
        Alert.alert(
          'Setup Required',
          'No camp exists in the system yet. Please contact your administrator to create a camp first before adding campers.',
          [{ text: 'OK' }]
        );
        setLoading(false);
        return;
      }

      console.log('Found camp:', camps.id);

      // Try to create camper using RPC function first (bypasses RLS)
      console.log('Attempting to create camper via RPC function...');
      let camperId = null;
      let rpcError = null;

      try {
        const { data: rpcData, error: rpcErr } = await supabase
          .rpc('create_camper_bypass_rls', {
            p_camp_id: camps.id,
            p_first_name: firstName.trim(),
            p_last_name: lastName.trim(),
            p_date_of_birth: dateOfBirth.toISOString().split('T')[0],
            p_wristband_id: wristbandId.trim() || null,
          });

        if (rpcErr) {
          console.warn('RPC function failed, will try direct insert:', rpcErr.message);
          rpcError = rpcErr;
        } else {
          camperId = rpcData;
          console.log('Camper created via RPC with ID:', camperId);
        }
      } catch (err: any) {
        console.warn('RPC function not available, will try direct insert:', err.message);
        rpcError = err;
      }

      // If RPC failed, try direct insert
      if (!camperId && rpcError) {
        console.log('Attempting direct insert into campers table...');
        const { data: insertData, error: insertError } = await supabase
          .from('campers')
          .insert({
            camp_id: camps.id,
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            date_of_birth: dateOfBirth.toISOString().split('T')[0],
            wristband_id: wristbandId.trim() || null,
            registration_status: 'registered',
            check_in_status: 'not-arrived',
          })
          .select('id')
          .single();

        if (insertError) {
          console.error('Direct insert failed:', insertError);
          Alert.alert(
            'Creation Failed',
            `Failed to create camper: ${insertError.message}. Please check your permissions or contact support.`,
            [{ text: 'OK' }]
          );
          setLoading(false);
          return;
        }

        camperId = insertData.id;
        console.log('Camper created via direct insert with ID:', camperId);
      }

      if (!camperId) {
        console.error('No camper ID returned');
        Alert.alert(
          'Creation Failed',
          'Failed to create camper. Please try again.',
          [{ text: 'OK' }]
        );
        setLoading(false);
        return;
      }

      // Create medical info if any medical data is provided
      if (allergies || medications || medicalConditions || dietaryRestrictions) {
        console.log('Creating medical info for camper');
        const { error: medicalError } = await supabase
          .from('camper_medical_info')
          .insert({
            camper_id: camperId,
            allergies: allergies ? allergies.split(',').map(a => a.trim()).filter(a => a) : [],
            medications: medications ? medications.split(',').map(m => m.trim()).filter(m => m) : [],
            medical_conditions: medicalConditions ? medicalConditions.split(',').map(m => m.trim()).filter(m => m) : [],
            dietary_restrictions: dietaryRestrictions ? dietaryRestrictions.split(',').map(d => d.trim()).filter(d => d) : [],
          });

        if (medicalError) {
          console.error('Error creating medical info:', medicalError);
          // Don't throw, medical info is optional
        } else {
          console.log('Medical info created successfully');
        }
      }

      // Create emergency contacts
      const emergencyContacts = [];
      
      if (emergency1Name && emergency1Phone) {
        emergencyContacts.push({
          camper_id: camperId,
          full_name: emergency1Name.trim(),
          phone: emergency1Phone.trim(),
          relationship: emergency1Relationship.trim() || 'Parent/Guardian',
          priority_order: 1,
        });
      }

      if (emergency2Name && emergency2Phone) {
        emergencyContacts.push({
          camper_id: camperId,
          full_name: emergency2Name.trim(),
          phone: emergency2Phone.trim(),
          relationship: emergency2Relationship.trim() || 'Parent/Guardian',
          priority_order: 2,
        });
      }

      if (emergencyContacts.length > 0) {
        console.log('Creating emergency contacts:', emergencyContacts.length);
        const { error: contactsError } = await supabase
          .from('emergency_contacts')
          .insert(emergencyContacts);

        if (contactsError) {
          console.error('Error creating emergency contacts:', contactsError);
          // Don't throw, we already created the camper
        } else {
          console.log('Emergency contacts created successfully');
        }
      }

      Alert.alert(
        'Success! ✅',
        `${firstName} ${lastName} has been added successfully!`,
        [
          {
            text: 'OK',
            onPress: () => {
              console.log('Navigating back after successful camper creation');
              router.back();
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('Error creating camper:', error);
      Alert.alert('Error', error.message || 'Failed to create camper. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => {
          console.log('User tapped back button on Create Camper screen');
          router.back();
        }} style={styles.backButton}>
          <IconSymbol
            ios_icon_name="chevron.left"
            android_material_icon_name="arrow-back"
            size={24}
            color={colors.text}
          />
        </TouchableOpacity>
        <Text style={styles.title}>Create Camper</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Basic Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>
          
          <View style={commonStyles.card}>
            <Text style={styles.label}>First Name *</Text>
            <TextInput
              style={styles.input}
              value={firstName}
              onChangeText={setFirstName}
              placeholder="Enter first name"
              placeholderTextColor={colors.textSecondary}
            />

            <Text style={[styles.label, { marginTop: 16 }]}>Last Name *</Text>
            <TextInput
              style={styles.input}
              value={lastName}
              onChangeText={setLastName}
              placeholder="Enter last name"
              placeholderTextColor={colors.textSecondary}
            />

            <Text style={[styles.label, { marginTop: 16 }]}>Date of Birth *</Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.dateButtonText}>
                {dateOfBirth.toLocaleDateString()}
              </Text>
              <IconSymbol
                ios_icon_name="calendar"
                android_material_icon_name="calendar-today"
                size={20}
                color={colors.primary}
              />
            </TouchableOpacity>

            {showDatePicker && (
              <DateTimePicker
                value={dateOfBirth}
                mode="date"
                display="default"
                onChange={handleDateChange}
                maximumDate={new Date()}
              />
            )}

            <Text style={[styles.label, { marginTop: 16 }]}>Wristband ID (Optional)</Text>
            <TextInput
              style={styles.input}
              value={wristbandId}
              onChangeText={setWristbandId}
              placeholder="Enter wristband ID"
              placeholderTextColor={colors.textSecondary}
            />
          </View>
        </View>

        {/* Medical Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Medical Information</Text>
          
          <View style={commonStyles.card}>
            <Text style={styles.label}>Allergies (comma-separated)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={allergies}
              onChangeText={setAllergies}
              placeholder="e.g., Peanuts, Shellfish"
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={2}
            />

            <Text style={[styles.label, { marginTop: 16 }]}>Medications (comma-separated)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={medications}
              onChangeText={setMedications}
              placeholder="e.g., Inhaler, EpiPen"
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={2}
            />

            <Text style={[styles.label, { marginTop: 16 }]}>Medical Conditions (comma-separated)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={medicalConditions}
              onChangeText={setMedicalConditions}
              placeholder="e.g., Asthma, Diabetes"
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={2}
            />

            <Text style={[styles.label, { marginTop: 16 }]}>Dietary Restrictions (comma-separated)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={dietaryRestrictions}
              onChangeText={setDietaryRestrictions}
              placeholder="e.g., Vegetarian, Gluten-free"
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={2}
            />
          </View>
        </View>

        {/* Emergency Contacts */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Emergency Contact 1 *</Text>
          
          <View style={commonStyles.card}>
            <Text style={styles.label}>Full Name *</Text>
            <TextInput
              style={styles.input}
              value={emergency1Name}
              onChangeText={setEmergency1Name}
              placeholder="Enter full name"
              placeholderTextColor={colors.textSecondary}
            />

            <Text style={[styles.label, { marginTop: 16 }]}>Phone Number *</Text>
            <TextInput
              style={styles.input}
              value={emergency1Phone}
              onChangeText={setEmergency1Phone}
              placeholder="Enter phone number"
              placeholderTextColor={colors.textSecondary}
              keyboardType="phone-pad"
            />

            <Text style={[styles.label, { marginTop: 16 }]}>Relationship</Text>
            <TextInput
              style={styles.input}
              value={emergency1Relationship}
              onChangeText={setEmergency1Relationship}
              placeholder="e.g., Mother, Father"
              placeholderTextColor={colors.textSecondary}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Emergency Contact 2 (Optional)</Text>
          
          <View style={commonStyles.card}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={styles.input}
              value={emergency2Name}
              onChangeText={setEmergency2Name}
              placeholder="Enter full name"
              placeholderTextColor={colors.textSecondary}
            />

            <Text style={[styles.label, { marginTop: 16 }]}>Phone Number</Text>
            <TextInput
              style={styles.input}
              value={emergency2Phone}
              onChangeText={setEmergency2Phone}
              placeholder="Enter phone number"
              placeholderTextColor={colors.textSecondary}
              keyboardType="phone-pad"
            />

            <Text style={[styles.label, { marginTop: 16 }]}>Relationship</Text>
            <TextInput
              style={styles.input}
              value={emergency2Relationship}
              onChangeText={setEmergency2Relationship}
              placeholder="e.g., Grandmother, Uncle"
              placeholderTextColor={colors.textSecondary}
            />
          </View>
        </View>

        {/* Create Button */}
        <View style={styles.section}>
          <TouchableOpacity
            style={[styles.createButton, loading && styles.createButtonDisabled]}
            onPress={handleCreateCamper}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <React.Fragment>
                <IconSymbol
                  ios_icon_name="checkmark.circle.fill"
                  android_material_icon_name="check-circle"
                  size={24}
                  color="#FFFFFF"
                />
                <Text style={styles.createButtonText}>Create Camper</Text>
              </React.Fragment>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 48 : 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 40,
  },
  section: {
    paddingHorizontal: 16,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dateButtonText: {
    fontSize: 16,
    color: colors.text,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    boxShadow: '0px 4px 12px rgba(99, 102, 241, 0.3)',
    elevation: 4,
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
