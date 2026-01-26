
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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { IconSymbol } from '@/components/IconSymbol';
import { colors, commonStyles } from '@/styles/commonStyles';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/app/integrations/supabase/client';
import DateTimePicker from '@react-native-community/datetimepicker';
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

  const canEdit = hasPermission(['super-admin', 'camp-admin']);

  const loadCamper = useCallback(async () => {
    if (!camperId) {
      console.error('No camper ID provided');
      Alert.alert('Error', 'No camper ID provided');
      router.back();
      return;
    }

    try {
      console.log('Loading camper data for editing:', camperId);
      setLoading(true);

      // FIXED: Use RPC function to bypass RLS, same as campers screen
      const { data: allCampers, error: rpcError } = await supabase.rpc('get_all_campers');

      if (rpcError) {
        console.error('Error loading campers via RPC:', rpcError);
        Alert.alert(
          'Database Error',
          `Failed to load camper: ${rpcError.message}. Please try again.`,
          [{ text: 'OK', onPress: () => router.back() }]
        );
        return;
      }

      // Find the specific camper from the list
      const data = allCampers?.find((c: any) => c.id === camperId);

      if (!data) {
        console.error('Camper not found with ID:', camperId);
        console.log('Available campers:', allCampers?.map((c: any) => ({ id: c.id, name: `${c.first_name} ${c.last_name}` })));
        Alert.alert(
          'Camper Not Found',
          'The camper you are trying to edit could not be found. They may have been deleted.',
          [{ text: 'OK', onPress: () => router.back() }]
        );
        return;
      }

      console.log('Camper data loaded:', data.first_name, data.last_name);
      setFirstName(data.first_name);
      setLastName(data.last_name);
      setDateOfBirth(new Date(data.date_of_birth));
      setWristbandId(data.wristband_id || '');
      setCheckInStatus(data.check_in_status || 'not-arrived');
      setSwimLevel(data.swim_level || '');
      setCabinAssignment(data.cabin_assignment || '');
      setRegistrationStatus(data.registration_status || 'pending');
    } catch (error: any) {
      console.error('Error in loadCamper:', error);
      Alert.alert(
        'Error',
        error?.message || 'Failed to load camper data',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } finally {
      setLoading(false);
    }
  }, [camperId, router]);

  useEffect(() => {
    loadCamper();
  }, [loadCamper]);

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      console.log('User selected date:', selectedDate.toISOString());
      setDateOfBirth(selectedDate);
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
    console.log('User tapped Save button');
    
    if (!validateForm()) {
      return;
    }

    if (!canEdit) {
      Alert.alert('Access Denied', 'You do not have permission to edit campers');
      return;
    }

    try {
      setSaving(true);
      console.log('Updating camper:', camperId);

      const updateData: any = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        date_of_birth: dateOfBirth.toISOString().split('T')[0],
        check_in_status: checkInStatus,
        registration_status: registrationStatus,
        swim_level: swimLevel || null,
        cabin_assignment: cabinAssignment.trim() || null,
      };

      if (wristbandId.trim()) {
        updateData.wristband_id = wristbandId.trim();
      }

      const { error } = await supabase
        .from('campers')
        .update(updateData)
        .eq('id', camperId);

      if (error) {
        console.error('Error updating camper:', error);
        throw new Error(`Failed to update camper: ${error.message}`);
      }

      console.log('Camper updated successfully');
      Alert.alert(
        'Success! ✅',
        'Camper information has been updated',
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
      console.error('Error in handleSave:', error);
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

  return (
    <View style={[commonStyles.container, { paddingTop: Platform.OS === 'android' ? 48 + insets.top : insets.top }]}>
      {/* Header with Gradient */}
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
      >
        {/* Form */}
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
                {dateOfBirth.toLocaleDateString()}
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
              {['non-swimmer', 'beginner', 'intermediate', 'advanced', 'lifeguard'].map((level) => (
                <TouchableOpacity
                  key={level}
                  style={[
                    styles.swimLevelButton,
                    swimLevel === level && styles.swimLevelButtonActive,
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
                      swimLevel === level && styles.swimLevelButtonTextActive,
                    ]}
                  >
                    {level.charAt(0).toUpperCase() + level.slice(1).replace('-', ' ')}
                  </Text>
                </TouchableOpacity>
              ))}
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

        {/* Save Button */}
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
