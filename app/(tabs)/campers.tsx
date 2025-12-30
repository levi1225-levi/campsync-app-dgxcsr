
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
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { IconSymbol } from '@/components/IconSymbol';
import { colors, commonStyles } from '@/styles/commonStyles';
import { mockCampers } from '@/data/mockCampers';
import { Camper } from '@/types/camper';
import { LinearGradient } from 'expo-linear-gradient';

function CampersScreenContent() {
  const router = useRouter();
  const { user, hasPermission } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCamper, setSelectedCamper] = useState<Camper | null>(null);

  const canEdit = hasPermission(['super-admin', 'camp-admin']);
  const canViewMedical = hasPermission(['super-admin', 'camp-admin', 'staff']);

  const filteredCampers = mockCampers.filter(camper =>
    `${camper.firstName} ${camper.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    camper.cabin.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'checked-in':
        return colors.success;
      case 'checked-out':
        return colors.warning;
      default:
        return colors.textSecondary;
    }
  };

  const handleViewFullProfile = (camper: Camper) => {
    // Show detailed profile in an alert for now
    // In a real app, this would navigate to a dedicated profile screen
    Alert.alert(
      `${camper.firstName} ${camper.lastName}`,
      `Age: ${camper.age}\nCabin: ${camper.cabin}\nNFC ID: ${camper.nfcWristbandId}\n\nMedical Info:\n${
        camper.medicalInfo.allergies.length > 0 
          ? `Allergies: ${camper.medicalInfo.allergies.join(', ')}\n` 
          : ''
      }${
        camper.medicalInfo.medications.length > 0 
          ? `Medications: ${camper.medicalInfo.medications.join(', ')}\n` 
          : ''
      }${
        camper.medicalInfo.dietaryRestrictions.length > 0 
          ? `Dietary: ${camper.medicalInfo.dietaryRestrictions.join(', ')}` 
          : ''
      }`,
      [{ text: 'Close', style: 'cancel' }]
    );
  };

  const handleEditCamper = (camper: Camper) => {
    Alert.alert(
      'Edit Camper',
      `Editing functionality for ${camper.firstName} ${camper.lastName} will be implemented in the admin dashboard.`,
      [{ text: 'OK' }]
    );
  };

  return (
    <View style={[commonStyles.container, styles.container]}>
      {/* Header with Gradient */}
      <LinearGradient
        colors={[colors.primary, colors.primaryDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Campers</Text>
        <Text style={styles.headerSubtitle}>
          {filteredCampers.length} camper{filteredCampers.length !== 1 ? 's' : ''}
        </Text>
      </LinearGradient>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <IconSymbol
          ios_icon_name="magnifyingglass"
          android_material_icon_name="search"
          size={20}
          color={colors.textSecondary}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or cabin..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <IconSymbol
              ios_icon_name="xmark.circle.fill"
              android_material_icon_name="cancel"
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Add Camper Button (Admin only) */}
      {canEdit && (
        <View style={styles.addButtonContainer}>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => router.push('/create-camper' as any)}
          >
            <IconSymbol
              ios_icon_name="plus.circle.fill"
              android_material_icon_name="add-circle"
              size={24}
              color="#FFFFFF"
            />
            <Text style={styles.addButtonText}>Create Camper</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Campers List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {filteredCampers.length === 0 ? (
          <View style={styles.emptyState}>
            <IconSymbol
              ios_icon_name="person.slash.fill"
              android_material_icon_name="person-off"
              size={64}
              color={colors.textSecondary}
            />
            <Text style={styles.emptyText}>No campers found</Text>
            <Text style={commonStyles.textSecondary}>
              {searchQuery ? 'Try a different search term' : 'Import campers to get started'}
            </Text>
          </View>
        ) : (
          filteredCampers.map((camper, index) => (
            <React.Fragment key={index}>
              <TouchableOpacity
                style={commonStyles.card}
                onPress={() => setSelectedCamper(selectedCamper?.id === camper.id ? null : camper)}
                activeOpacity={0.7}
              >
                <View style={styles.camperHeader}>
                  <View style={styles.camperAvatar}>
                    <IconSymbol
                      ios_icon_name="person.fill"
                      android_material_icon_name="person"
                      size={28}
                      color={colors.primary}
                    />
                  </View>
                  <View style={styles.camperInfo}>
                    <Text style={commonStyles.cardTitle}>
                      {camper.firstName} {camper.lastName}
                    </Text>
                    <Text style={commonStyles.textSecondary}>
                      Age {camper.age} • Cabin {camper.cabin}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(camper.checkInStatus) }]}>
                    <Text style={styles.statusText}>
                      {camper.checkInStatus === 'checked-in' ? 'In' : 
                       camper.checkInStatus === 'checked-out' ? 'Out' : 'N/A'}
                    </Text>
                  </View>
                </View>

                {/* Expanded Details */}
                {selectedCamper?.id === camper.id && (
                  <>
                    <View style={commonStyles.divider} />
                    
                    {/* NFC Wristband */}
                    <View style={styles.detailRow}>
                      <IconSymbol
                        ios_icon_name="wave.3.right"
                        android_material_icon_name="nfc"
                        size={20}
                        color={colors.accent}
                      />
                      <Text style={commonStyles.textSecondary}>
                        NFC ID: {camper.nfcWristbandId}
                      </Text>
                    </View>

                    {/* Medical Info (if permitted) */}
                    {canViewMedical && (
                      <>
                        {camper.medicalInfo.allergies.length > 0 && (
                          <View style={styles.detailRow}>
                            <IconSymbol
                              ios_icon_name="exclamationmark.triangle.fill"
                              android_material_icon_name="warning"
                              size={20}
                              color={colors.error}
                            />
                            <Text style={[commonStyles.textSecondary, { flex: 1 }]}>
                              Allergies: {camper.medicalInfo.allergies.join(', ')}
                            </Text>
                          </View>
                        )}

                        {camper.medicalInfo.medications.length > 0 && (
                          <View style={styles.detailRow}>
                            <IconSymbol
                              ios_icon_name="pills.fill"
                              android_material_icon_name="medication"
                              size={20}
                              color={colors.secondary}
                            />
                            <Text style={[commonStyles.textSecondary, { flex: 1 }]}>
                              Medications: {camper.medicalInfo.medications.join(', ')}
                            </Text>
                          </View>
                        )}

                        {camper.medicalInfo.dietaryRestrictions.length > 0 && (
                          <View style={styles.detailRow}>
                            <IconSymbol
                              ios_icon_name="fork.knife"
                              android_material_icon_name="restaurant"
                              size={20}
                              color={colors.accent}
                            />
                            <Text style={[commonStyles.textSecondary, { flex: 1 }]}>
                              Diet: {camper.medicalInfo.dietaryRestrictions.join(', ')}
                            </Text>
                          </View>
                        )}
                      </>
                    )}

                    {/* Check-in/out times */}
                    {camper.lastCheckIn && (
                      <View style={styles.detailRow}>
                        <IconSymbol
                          ios_icon_name="clock.fill"
                          android_material_icon_name="schedule"
                          size={20}
                          color={colors.info}
                        />
                        <Text style={commonStyles.textSecondary}>
                          Last check-in: {new Date(camper.lastCheckIn).toLocaleString()}
                        </Text>
                      </View>
                    )}

                    {/* Action Buttons */}
                    <View style={styles.actionButtons}>
                      <TouchableOpacity 
                        style={[styles.actionButton, { backgroundColor: colors.primary }]}
                        onPress={() => handleViewFullProfile(camper)}
                      >
                        <IconSymbol
                          ios_icon_name="doc.text.fill"
                          android_material_icon_name="description"
                          size={20}
                          color="#FFFFFF"
                        />
                        <Text style={[styles.actionButtonText, { color: '#FFFFFF' }]}>View Full Profile</Text>
                      </TouchableOpacity>

                      {canEdit && (
                        <TouchableOpacity 
                          style={[styles.actionButton, { backgroundColor: colors.secondary }]}
                          onPress={() => handleEditCamper(camper)}
                        >
                          <IconSymbol
                            ios_icon_name="pencil"
                            android_material_icon_name="edit"
                            size={20}
                            color="#FFFFFF"
                          />
                          <Text style={[styles.actionButtonText, { color: '#FFFFFF' }]}>Edit</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </>
                )}
              </TouchableOpacity>
            </React.Fragment>
          ))
        )}
      </ScrollView>
    </View>
  );
}

export default function CampersScreen() {
  return (
    <ProtectedRoute allowedRoles={['super-admin', 'camp-admin', 'staff']}>
      <CampersScreenContent />
    </ProtectedRoute>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: Platform.OS === 'android' ? 48 : 0,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
    opacity: 0.9,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    marginHorizontal: 16,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 12,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.08)',
    elevation: 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
  },
  addButtonContainer: {
    paddingHorizontal: 16,
    marginTop: 16,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
    boxShadow: '0px 4px 12px rgba(99, 102, 241, 0.3)',
    elevation: 4,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 120,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  camperHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  camperAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  camperInfo: {
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 12,
    gap: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
    elevation: 2,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});
