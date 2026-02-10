
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { IconSymbol } from '@/components/IconSymbol';
import { colors, commonStyles } from '@/styles/commonStyles';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { supabase } from '@/app/integrations/supabase/client';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface OutdatedCamper {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  check_in_status: string;
  wristband_id: string;
  last_check_in: string;
  swim_level: string | null;
  cabin_assignment: string | null;
  wristband_data_hash: string | null;
  current_data_hash: string;
}

function WristbandUpdatesContent() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { hasPermission } = useAuth();
  const [outdatedCampers, setOutdatedCampers] = useState<OutdatedCamper[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const canUpdate = hasPermission(['super-admin', 'camp-admin', 'staff']);

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

  const loadOutdatedWristbands = useCallback(async () => {
    console.log('Loading campers with outdated wristbands...');
    try {
      const { data: allCampers, error: campersError } = await supabase.rpc('get_all_campers');

      if (campersError) {
        console.error('Error loading campers:', campersError);
        throw new Error(`Failed to load campers: ${campersError.message}`);
      }

      const checkedInWithWristbands = (allCampers || []).filter(
        (c: any) => c.check_in_status === 'checked-in' && c.wristband_id
      );

      console.log('Found', checkedInWithWristbands.length, 'checked-in campers with wristbands');

      const outdated: OutdatedCamper[] = [];

      for (const camper of checkedInWithWristbands) {
        const { data: comprehensiveData, error: dataError } = await supabase
          .rpc('get_comprehensive_camper_data', { p_camper_id: camper.id });

        if (dataError || !comprehensiveData || comprehensiveData.length === 0) {
          console.warn('Could not get comprehensive data for camper:', camper.id);
          continue;
        }

        const camperData = comprehensiveData[0];

        const currentDataString = JSON.stringify({
          first_name: camperData.first_name,
          last_name: camperData.last_name,
          date_of_birth: camperData.date_of_birth,
          allergies: camperData.allergies || [],
          medications: camperData.medications || [],
          swim_level: camperData.swim_level,
          cabin_assignment: camperData.cabin_assignment,
        });

        const checkInTime = new Date(camper.last_check_in).getTime();
        const camperUpdatedAt = new Date(camper.updated_at || camper.last_check_in).getTime();
        const dataUpdatedAfterCheckIn = camperUpdatedAt > checkInTime;

        if (dataUpdatedAfterCheckIn) {
          console.log('Camper has outdated wristband:', camper.first_name, camper.last_name);
          outdated.push({
            id: camper.id,
            first_name: camper.first_name,
            last_name: camper.last_name,
            date_of_birth: camper.date_of_birth,
            check_in_status: camper.check_in_status,
            wristband_id: camper.wristband_id,
            last_check_in: camper.last_check_in,
            swim_level: camper.swim_level,
            cabin_assignment: camper.cabin_assignment,
            wristband_data_hash: null,
            current_data_hash: currentDataString,
          });
        }
      }

      console.log('Found', outdated.length, 'campers with outdated wristbands');
      setOutdatedCampers(outdated);
    } catch (error: any) {
      console.error('Error loading outdated wristbands:', error);
      Alert.alert('Error', error?.message || 'Failed to load outdated wristbands');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadOutdatedWristbands();
  }, [loadOutdatedWristbands]);

  const handleRefresh = useCallback(() => {
    console.log('User pulled to refresh');
    setIsRefreshing(true);
    loadOutdatedWristbands();
  }, [loadOutdatedWristbands]);

  const handleUpdateWristband = useCallback((camper: OutdatedCamper) => {
    console.log('User tapped Update Wristband for:', camper.first_name, camper.last_name);
    Alert.alert(
      'Update Wristband',
      `To update ${camper.first_name} ${camper.last_name}'s wristband, please:\n\n1. Go to the Check-In tab\n2. Search for the camper\n3. Tap "Check In & Program Wristband" to reprogram with updated data\n\nThe old data will be overwritten with the latest information.`,
      [{ text: 'OK' }]
    );
  }, []);

  const handleViewCamper = useCallback((camper: OutdatedCamper) => {
    console.log('User tapped View Camper:', camper.id);
    router.push(`/camper-profile?id=${camper.id}`);
  }, [router]);

  if (isLoading) {
    return (
      <View style={[commonStyles.container, styles.loadingContainer]}>
        <View style={{ paddingTop: insets.top }}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[commonStyles.textSecondary, { marginTop: 16 }]}>
            Checking wristband data...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={commonStyles.container}>
      <View style={[styles.headerContainer, { paddingTop: insets.top }]}>
        <LinearGradient
          colors={['#F59E0B', '#D97706', '#B45309']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <View style={styles.headerIcon}>
            <IconSymbol
              ios_icon_name="arrow.triangle.2.circlepath"
              android_material_icon_name="sync"
              size={40}
              color="#FFFFFF"
            />
          </View>
          <Text style={styles.headerTitle}>Wristband Updates</Text>
          <Text style={styles.headerSubtitle}>
            Campers with outdated wristband data
          </Text>
        </LinearGradient>
      </View>

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
        {outdatedCampers.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <IconSymbol
                ios_icon_name="checkmark.circle.fill"
                android_material_icon_name="check-circle"
                size={64}
                color={colors.success}
              />
            </View>
            <Text style={styles.emptyTitle}>All Wristbands Up to Date! ✅</Text>
            <Text style={styles.emptySubtitle}>
              All checked-in campers have current wristband data. No updates needed.
            </Text>
          </View>
        ) : (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {outdatedCampers.length} {outdatedCampers.length === 1 ? 'Camper Needs' : 'Campers Need'} Update
            </Text>
            <Text style={styles.sectionDescription}>
              These campers have been checked in, but their information has been updated since their wristband was programmed.
            </Text>

            {outdatedCampers.map((camper) => (
              <View key={camper.id} style={commonStyles.card}>
                <View style={styles.camperHeader}>
                  <View style={styles.camperAvatar}>
                    <IconSymbol
                      ios_icon_name="person.fill"
                      android_material_icon_name="person"
                      size={32}
                      color={colors.primary}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.camperName}>
                      {camper.first_name} {camper.last_name}
                    </Text>
                    <Text style={styles.camperAge}>
                      Age {calculateAge(camper.date_of_birth)}
                    </Text>
                  </View>
                  <View style={styles.warningBadge}>
                    <IconSymbol
                      ios_icon_name="exclamationmark.triangle.fill"
                      android_material_icon_name="warning"
                      size={20}
                      color="#FFFFFF"
                    />
                  </View>
                </View>

                <View style={commonStyles.divider} />

                <View style={styles.camperInfo}>
                  <View style={styles.infoRow}>
                    <IconSymbol
                      ios_icon_name="wave.3.right"
                      android_material_icon_name="nfc"
                      size={18}
                      color={colors.accent}
                    />
                    <Text style={styles.infoLabel}>Wristband ID:</Text>
                    <Text style={styles.infoValue}>{camper.wristband_id}</Text>
                  </View>

                  <View style={styles.infoRow}>
                    <IconSymbol
                      ios_icon_name="clock"
                      android_material_icon_name="schedule"
                      size={18}
                      color={colors.info}
                    />
                    <Text style={styles.infoLabel}>Last Programmed:</Text>
                    <Text style={styles.infoValue}>
                      {new Date(camper.last_check_in).toLocaleDateString()}
                    </Text>
                  </View>
                </View>

                <View style={commonStyles.divider} />

                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={() => handleViewCamper(camper)}
                    activeOpacity={0.7}
                  >
                    <IconSymbol
                      ios_icon_name="eye.fill"
                      android_material_icon_name="visibility"
                      size={20}
                      color={colors.primary}
                    />
                    <Text style={styles.secondaryButtonText}>View</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={() => handleUpdateWristband(camper)}
                    activeOpacity={0.7}
                  >
                    <LinearGradient
                      colors={['#F59E0B', '#D97706']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.primaryButtonGradient}
                    >
                      <IconSymbol
                        ios_icon_name="arrow.triangle.2.circlepath"
                        android_material_icon_name="sync"
                        size={20}
                        color="#FFFFFF"
                      />
                      <Text style={styles.primaryButtonText}>Update</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

export default function WristbandUpdatesScreen() {
  return (
    <ProtectedRoute allowedRoles={['super-admin', 'camp-admin', 'staff']}>
      <WristbandUpdatesContent />
    </ProtectedRoute>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  headerContainer: { overflow: 'hidden' },
  header: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 32, alignItems: 'center', borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  headerIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255, 255, 255, 0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  headerTitle: { fontSize: 28, fontWeight: '900', color: '#FFFFFF', marginBottom: 8, textAlign: 'center' },
  headerSubtitle: { fontSize: 15, fontWeight: '500', color: '#FFFFFF', opacity: 0.95, textAlign: 'center' },
  scrollView: { flex: 1 },
  contentContainer: { paddingBottom: 120 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingVertical: 80 },
  emptyIconContainer: { width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(16, 185, 129, 0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  emptyTitle: { fontSize: 24, fontWeight: '800', color: colors.text, marginBottom: 12, textAlign: 'center' },
  emptySubtitle: { fontSize: 16, fontWeight: '400', color: colors.textSecondary, textAlign: 'center', lineHeight: 24 },
  section: { paddingHorizontal: 20, marginTop: 28 },
  sectionTitle: { fontSize: 24, fontWeight: '800', color: colors.text, marginBottom: 12 },
  sectionDescription: { fontSize: 15, fontWeight: '400', color: colors.textSecondary, marginBottom: 20, lineHeight: 22 },
  camperHeader: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 16 },
  camperAvatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(99, 102, 241, 0.15)', alignItems: 'center', justifyContent: 'center' },
  camperName: { fontSize: 20, fontWeight: '800', color: colors.text, marginBottom: 4 },
  camperAge: { fontSize: 15, fontWeight: '600', color: colors.textSecondary },
  warningBadge: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.warning, alignItems: 'center', justifyContent: 'center' },
  camperInfo: { gap: 12, marginVertical: 16 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoLabel: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
  infoValue: { fontSize: 14, fontWeight: '600', color: colors.text, flex: 1 },
  actionButtons: { flexDirection: 'row', gap: 12, marginTop: 16 },
  secondaryButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, backgroundColor: colors.background, borderWidth: 2, borderColor: colors.primary, gap: 8 },
  secondaryButtonText: { fontSize: 15, fontWeight: '700', color: colors.primary },
  primaryButton: { flex: 1, borderRadius: 12, overflow: 'hidden' },
  primaryButtonGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, paddingHorizontal: 16, gap: 8 },
  primaryButtonText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
});
