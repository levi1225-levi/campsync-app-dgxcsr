
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import { colors, commonStyles } from '@/styles/commonStyles';
import { mockCampers } from '@/data/mockCampers';
import { Camper } from '@/types/camper';

export default function CampersScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'checked-in' | 'checked-out' | 'not-arrived'>('all');

  const filteredCampers = mockCampers.filter(camper => {
    const matchesSearch = 
      camper.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      camper.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      camper.cabin.toLowerCase().includes(searchQuery.toLowerCase()) ||
      camper.nfcWristbandId.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = filterStatus === 'all' || camper.checkInStatus === filterStatus;
    
    return matchesSearch && matchesFilter;
  });

  const getStatusColor = (status: Camper['checkInStatus']) => {
    switch (status) {
      case 'checked-in':
        return colors.success;
      case 'checked-out':
        return colors.warning;
      case 'not-arrived':
        return colors.textSecondary;
      default:
        return colors.textSecondary;
    }
  };

  const getStatusLabel = (status: Camper['checkInStatus']) => {
    switch (status) {
      case 'checked-in':
        return 'Checked In';
      case 'checked-out':
        return 'Checked Out';
      case 'not-arrived':
        return 'Not Arrived';
      default:
        return status;
    }
  };

  return (
    <View style={[commonStyles.container, styles.container]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Campers</Text>
        <Text style={styles.headerSubtitle}>{filteredCampers.length} campers</Text>
      </View>

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
          placeholder="Search by name, cabin, or wristband ID..."
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

      {/* Filter Buttons */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
        contentContainerStyle={styles.filterContent}
      >
        {(['all', 'checked-in', 'checked-out', 'not-arrived'] as const).map((status, index) => (
          <React.Fragment key={index}>
            <TouchableOpacity
              style={[
                styles.filterButton,
                filterStatus === status && styles.filterButtonActive,
              ]}
              onPress={() => setFilterStatus(status)}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  filterStatus === status && styles.filterButtonTextActive,
                ]}
              >
                {status === 'all' ? 'All' : getStatusLabel(status)}
              </Text>
            </TouchableOpacity>
          </React.Fragment>
        ))}
      </ScrollView>

      {/* Campers List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {filteredCampers.map((camper, index) => (
          <React.Fragment key={index}>
            <TouchableOpacity
              style={commonStyles.card}
              onPress={() => router.push(`/camper-detail?id=${camper.id}` as any)}
              activeOpacity={0.7}
            >
              <View style={styles.camperCard}>
                <View style={styles.camperAvatar}>
                  <IconSymbol
                    ios_icon_name="person.fill"
                    android_material_icon_name="person"
                    size={32}
                    color={colors.primary}
                  />
                </View>
                <View style={styles.camperInfo}>
                  <Text style={styles.camperName}>
                    {camper.firstName} {camper.lastName}
                  </Text>
                  <View style={styles.camperDetails}>
                    <View style={styles.detailRow}>
                      <IconSymbol
                        ios_icon_name="house.fill"
                        android_material_icon_name="home"
                        size={14}
                        color={colors.textSecondary}
                      />
                      <Text style={styles.detailText}>{camper.cabin}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <IconSymbol
                        ios_icon_name="person.fill"
                        android_material_icon_name="person"
                        size={14}
                        color={colors.textSecondary}
                      />
                      <Text style={styles.detailText}>Age {camper.age}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <IconSymbol
                        ios_icon_name="wave.3.right"
                        android_material_icon_name="nfc"
                        size={14}
                        color={colors.textSecondary}
                      />
                      <Text style={styles.detailText}>{camper.nfcWristbandId}</Text>
                    </View>
                  </View>
                </View>
                <View style={styles.camperStatus}>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: getStatusColor(camper.checkInStatus) },
                    ]}
                  >
                    <Text style={styles.statusText}>
                      {getStatusLabel(camper.checkInStatus)}
                    </Text>
                  </View>
                  <IconSymbol
                    ios_icon_name="chevron.right"
                    android_material_icon_name="chevron-right"
                    size={20}
                    color={colors.textSecondary}
                  />
                </View>
              </View>

              {/* Medical Alert Indicator */}
              {(camper.medicalInfo.allergies.length > 0 ||
                camper.medicalInfo.medications.length > 0 ||
                camper.medicalInfo.conditions.length > 0) && (
                <View style={styles.medicalAlert}>
                  <IconSymbol
                    ios_icon_name="cross.case.fill"
                    android_material_icon_name="medical-services"
                    size={16}
                    color={colors.error}
                  />
                  <Text style={styles.medicalAlertText}>Medical info on file</Text>
                </View>
              )}
            </TouchableOpacity>
          </React.Fragment>
        ))}

        {filteredCampers.length === 0 && (
          <View style={styles.emptyState}>
            <IconSymbol
              ios_icon_name="person.slash"
              android_material_icon_name="person-off"
              size={64}
              color={colors.textSecondary}
            />
            <Text style={styles.emptyStateText}>No campers found</Text>
            <Text style={commonStyles.textSecondary}>
              Try adjusting your search or filters
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: Platform.OS === 'android' ? 48 : 0,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: colors.primary,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    fontWeight: '400',
    color: '#FFFFFF',
    opacity: 0.9,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 8,
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
  },
  filterContainer: {
    maxHeight: 50,
    marginBottom: 12,
  },
  filterContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 120,
  },
  camperCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  camperAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  camperInfo: {
    flex: 1,
  },
  camperName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },
  camperDetails: {
    gap: 4,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  camperStatus: {
    alignItems: 'flex-end',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  medicalAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 6,
  },
  medicalAlertText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.error,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
});
