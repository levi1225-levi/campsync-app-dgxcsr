
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  Alert,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { colors, commonStyles, buttonStyles } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { router } from 'expo-router';

function ParentRegistrationContent() {
  const { user, updateUser } = useAuth();
  const [childFirstName, setChildFirstName] = useState('');
  const [childLastName, setChildLastName] = useState('');
  const [childAge, setChildAge] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [allergies, setAllergies] = useState('');
  const [medications, setMedications] = useState('');

  const handleCompleteRegistration = async () => {
    if (!childFirstName || !childLastName || !childAge || !emergencyContact || !emergencyPhone) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      // In production, this would save to backend
      console.log('Completing registration for:', childFirstName, childLastName);
      
      // Update user to mark registration as complete
      if (user) {
        await updateUser({
          ...user,
          registrationComplete: true,
        });
      }

      Alert.alert(
        'Registration Complete',
        'Your child has been registered successfully!',
        [
          {
            text: 'OK',
            onPress: () => router.replace('/parent-dashboard'),
          },
        ]
      );
    } catch (error) {
      console.error('Registration error:', error);
      Alert.alert('Error', 'Failed to complete registration. Please try again.');
    }
  };

  return (
    <View style={[commonStyles.container, styles.container]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <IconSymbol
            ios_icon_name="doc.text.fill"
            android_material_icon_name="description"
            size={48}
            color="#FFFFFF"
          />
          <Text style={styles.headerTitle}>Complete Registration</Text>
          <Text style={styles.headerSubtitle}>
            Please provide your child&apos;s information to complete the registration process
          </Text>
        </View>

        {/* Form */}
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Child Information</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>First Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter first name"
              placeholderTextColor={colors.textSecondary}
              value={childFirstName}
              onChangeText={setChildFirstName}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Last Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter last name"
              placeholderTextColor={colors.textSecondary}
              value={childLastName}
              onChangeText={setChildLastName}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Age *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter age"
              placeholderTextColor={colors.textSecondary}
              value={childAge}
              onChangeText={setChildAge}
              keyboardType="number-pad"
            />
          </View>
        </View>

        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Emergency Contact</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Contact Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter contact name"
              placeholderTextColor={colors.textSecondary}
              value={emergencyContact}
              onChangeText={setEmergencyContact}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Contact Phone *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter phone number"
              placeholderTextColor={colors.textSecondary}
              value={emergencyPhone}
              onChangeText={setEmergencyPhone}
              keyboardType="phone-pad"
            />
          </View>
        </View>

        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Medical Information</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Allergies</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="List any allergies (optional)"
              placeholderTextColor={colors.textSecondary}
              value={allergies}
              onChangeText={setAllergies}
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Medications</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="List any medications (optional)"
              placeholderTextColor={colors.textSecondary}
              value={medications}
              onChangeText={setMedications}
              multiline
              numberOfLines={3}
            />
          </View>
        </View>

        {/* Submit Button */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={buttonStyles.primary}
            onPress={handleCompleteRegistration}
          >
            <Text style={buttonStyles.text}>Complete Registration</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

export default function ParentRegistration() {
  return (
    <ProtectedRoute allowedRoles={['parent']}>
      <ParentRegistrationContent />
    </ProtectedRoute>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: Platform.OS === 'android' ? 48 : 0,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 32,
    paddingBottom: 32,
    backgroundColor: colors.primary,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 16,
    fontWeight: '400',
    color: '#FFFFFF',
    opacity: 0.9,
    textAlign: 'center',
  },
  formSection: {
    paddingHorizontal: 16,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  buttonContainer: {
    paddingHorizontal: 16,
    marginTop: 32,
  },
});
