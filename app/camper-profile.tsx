
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
  const [error, setError] = useState<string | null>(null);

  // Get the camper ID from params - handle both string and array cases
  const camperId = Array.isArray(params.id) ? params.id[0] : params.id;
  
  const canEdit = hasPermission(['super-admin', 'camp-admin']);
  const canViewMedical = hasPermission(['super-admin', 'camp-admin', 'staff']);

  const calculateAge = (dateOfBirth: string) => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'checked-in':
      case 'checked_in':
        return colors.success;
      case 'checked-out':
      case 'checked_out':
        return colors.warning;
      default:
        return colors.textSecondary;
    }
  };

  // Load camper profile function - memoized to prevent recreation
  const loadCamperProfile = useCallback(async () => {
    if (!camperId) {
      console.error('No camper ID provided in params:', params);
      setError('No camper ID provided');
      setIsLoading(false);
      return;
    }

    try {
      console.log('Loading camper profile for ID:', camperId);
      setIsLoading(true);
      setError(null);

      // First, try to get the camper using RPC function to bypass RLS
      const { data: allCampers, error: rpcError } = await supabase.rpc('get_all_campers');
      
      if (rpcError) {
        console.error('Error loading campers via RPC:', rpcError);
        throw new Error(`Failed to load campers: ${rpcError.message}`);
      }

      // Find the specific camper from the list
      const camperData = allCampers?.find((c: any) => c.id === camperId);

      if (!camperData) {
        console.error('Camper not found with ID:', camperId);
        console.log('Available campers:', allCampers?.map((c: any) => ({ id: c.id, name: `${c.first_name} ${c.last_name}` })));
        throw new Error('Camper not found');
      }

      console.log('Camper data loaded successfully:', camperData.first_name, camperData.last_name);
      console.log('Swim level:', camperData.swim_level);
      console.log('Cabin assignment:', camperData.cabin_assignment);

      // Load session name separately if session_id exists
      let sessionName = null;
      if (camperData.session_id) {
        const { data: sessionData, error: sessionError } = await supabase
          .from('sessions')
          .select('name')
          .eq('id', camperData.session_id)
          .maybeSingle();
        
        if (!sessionError && sessionData) {
          sessionName = sessionData.name;
          console.log('Session name loaded:', sessionName);
        }
      }

      // Load medical info if permitted
      let medicalInfo = null;
      if (canViewMedical) {
        const { data: medicalData, error: medicalError } = await supabase
          .from('camper_medical_info')
          .select('*')
          .eq('camper_id', camperId)
          .maybeSingle();
        
        if (medicalError) {
          console.error('Error loading medical info:', medicalError);
        } else if (medicalData) {
          medicalInfo = medicalData;
          console.log('Medical info loaded successfully');
          console.log('Allergies:', medicalData.allergies);
          console.log('Medications:', medicalData.medications);
        }
      }

      // Load emergency contacts
      const { data: contactsData, error: contactsError } = await supabase
        .from('emergency_contacts')
        .select('*')
        .eq('camper_id', camperId)
        .order('priority_order');

      if (contactsError) {
        console.error('Error loading emergency contacts:', contactsError);
      }

      const profile: CamperProfile = {
        id: camperData.id,
        first_name: camperData.first_name,
        last_name: camperData.last_name,
        date_of_birth: camperData.date_of_birth,
        registration_status: camperData.registration_status || 'pending',
        wristband_id: camperData.wristband_id,
        check_in_status: camperData.check_in_status,
        last_check_in: camperData.last_check_in || null,
        last_check_out: camperData.last_check_out || null,
        session_id: camperData.session_id,
        session_name: sessionName,
        swim_level: camperData.swim_level || null,
        cabin_assignment: camperData.cabin_assignment || null,
        medical_info: medicalInfo,
        emergency_contacts: contactsData || [],
      };

      console.log('Profile assembled successfully');
      setCamper(profile);
      setIsLoading(false);
    } catch (error: any) {
      console.error('Error loading camper profile:', error);
      setError(error?.message || 'Failed to load camper profile');
      setIsLoading(false);
    }
  }, [camperId, canViewMedical, params]);

  // FIXED: Use useFocusEffect to reload data when screen comes into focus
  // This ensures data is refreshed when navigating back from edit screen
  useFocusEffect(
    useCallback(() => {
      console.log('Camper profile screen focused - reloading data');
      loadCamperProfile();
    }, [loadCamperProfile])
  );

  const handleBack = useCallback(() => {
    try {
      console.log('Navigating back from camper profile');
      router.back();
    } catch (error) {
      console.error('Navigation error:', error);
    }
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
    return (
      <View style={[commonStyles.container, styles.loadingContainer, { paddingTop: Platform.OS === 'android' ? 48 + insets.top : insets.top }]}>
        <IconSymbol
          ios_icon_name="exclamationmark.triangle.fill"
          android_material_icon_name="warning"
          size={64}
          color={colors.error}
        />
        <Text style={[commonStyles.text, { marginTop: 16, fontSize: 18, fontWeight: '600' }]}>
          {error || 'Camper not found'}
        </Text>
        <Text style={[commonStyles.textSecondary, { marginTop: 8, textAlign: 'center', paddingHorizontal: 32 }]}>
          {error ? 'Please try again or contact support if the problem persists.' : 'The camper you\'re looking for could not be found. They may have been removed from the system.'}
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

  const dateOfBirthDisplay = new Date(camper.date_of_birth).toLocaleDateString();
  const lastCheckInDisplay = camper.last_check_in ? new Date(camper.last_check_in).toLocaleString() : null;

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
      >
        {/* Basic Information */}
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

            {camper.swim_level && (
              <>
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
                      {camper.swim_level.charAt(0).toUpperCase() + camper.swim_level.slice(1).replace('-', ' ')}
                    </Text>
                  </View>
                </View>
              </>
            )}

            {camper.cabin_assignment && (
              <>
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
              </>
            )}

            {camper.wristband_id && (
              <>
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
              </>
            )}

            {lastCheckInDisplay && (
              <>
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
              </>
            )}
          </View>
        </View>

        {/* Medical Information */}
        {canViewMedical && camper.medical_info && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Medical Information</Text>
            
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
          </View>
        )}

        {/* Emergency Contacts */}
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
