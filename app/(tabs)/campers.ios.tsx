
import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { IconSymbol } from '@/components/IconSymbol';
import { colors, commonStyles } from '@/styles/commonStyles';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/app/integrations/supabase/client';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Camper {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  check_in_status: string;
  wristband_id: string | null;
  camp_id: string;
}

function CampersScreenContent() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, hasPermission } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [campers, setCampers] = useState<Camper[]>([]);
  const [filteredCampers, setFilteredCampers] = useState<Camper[]>([]);
  const [selectedCamper, setSelectedCamper] = useState<Camper | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canEdit = hasPermission(['super-admin', 'camp-admin']);
  const canViewMedical = hasPermission(['super-admin', 'camp-admin', 'staff']);

  const loadCampers = useCallback(async () => {
    console.log('Loading campers from database...');
    setError(null);
    
    try {
      // Use the RPC function to bypass RLS
      const { data, error: rpcError } = await supabase
        .rpc('get_all_campers');

      if (rpcError) {
        console.error('Error loading campers via RPC:', rpcError);
        setError('Failed to load campers. Please try again.');
        setCampers([]);
        setFilteredCampers([]);
        return;
      }

      console.log('Loaded campers via RPC:', data?.length || 0);
      setCampers(data || []);
      setFilteredCampers(data || []);
    } catch (error: any) {
      console.error('Error in loadCampers:', error);
      setError(`Failed to load campers: ${error?.message || 'Unknown error'}`);
      setCampers([]);
      setFilteredCampers([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadCampers();
  }, [loadCampers]);

  useEffect(() => {
    // Filter campers based on search query
    if (!searchQuery.trim()) {
      setFilteredCampers(campers);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = campers.filter(camper =>
        `${camper.first_name} ${camper.last_name}`.toLowerCase().includes(query)
      );
      console.log('Filtered campers:', filtered.length, 'results for query:', searchQuery);
      setFilteredCampers(filtered);
    }
  }, [searchQuery, campers]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadCampers();
  }, [loadCampers]);

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

  const handleViewFullProfile = useCallback((camper: Camper) => {
    try {
      console.log('User tapped View Full Profile for camper:', camper.id);
      router.push(`/camper-profile?id=${camper.id}`);
    } catch (error) {
      console.error('Navigation error:', error);
      Alert.alert('Error', 'Failed to open camper profile');
    }
  }, [router]);

  const handleEditCamper = useCallback((camper: Camper) => {
    try {
      console.log('User tapped Edit Camper for:', camper.id);
      router.push(`/edit-camper?id=${camper.id}`);
    } catch (error) {
      console.error('Navigation error:', error);
      Alert.alert('Error', 'Failed to open edit camper screen');
    }
  }, [router]);

  const handleCreateCamper = useCallback(() => {
    try {
      console.log('User tapped Create Camper button');
      router.push('/create-camper');
    } catch (error) {
      console.error('Navigation error:', error);
      Alert.alert('Error', 'Failed to open create camper screen');
    }
  }, [router]);

  const handleClearSearch = useCallback(() => {
    console.log('User cleared search');
    setSearchQuery('');
  }, []);

  const handleToggleCamper = useCallback((camper: Camper) => {
    setSelectedCamper(prev => prev?.id === camper.id ? null : camper);
  }, []);

  if (loading) {
    return (
      <View style={[commonStyles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[commonStyles.text, { marginTop: 16 }]}>Loading campers...</Text>
      </View>
    );
  }

  return (
    <View style={commonStyles.container}>
      {/* Fixed Header with Gradient and proper iOS spacing */}
      <View style={styles.headerContainer}>
        <LinearGradient
          colors={[colors.primary, colors.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.header, { paddingTop: insets.top + 16 }]}
        >
          <View style={styles.headerIcon}>
            <IconSymbol
              ios_icon_name="person.3.fill"
              android_material_icon_name="group"
              size={40}
              color="#FFFFFF"
            />
          </View>
          <Text style={styles.headerTitle}>Campers</Text>
          <Text style={styles.headerSubtitle}>
            {filteredCampers.length} camper{filteredCampers.length !== 1 ? 's' : ''}
          </Text>
        </LinearGradient>
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
          placeholder="Search by name..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={(text) => {
            console.log('User searching for:', text);
            setSearchQuery(text);
          }}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity 
            onPress={handleClearSearch}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
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
            onPress={handleCreateCamper}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[colors.primary, colors.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.addButtonGradient}
            >
              <IconSymbol
                ios_icon_name="plus.circle.fill"
                android_material_icon_name="add-circle"
                size={24}
                color="#FFFFFF"
              />
              <Text style={styles.addButtonText}>Create Camper</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}

      {/* Error Message */}
      {error && (
        <View style={styles.errorContainer}>
          <IconSymbol
            ios_icon_name="exclamationmark.triangle.fill"
            android_material_icon_name="warning"
            size={24}
            color={colors.error}
          />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={loadCampers} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Campers List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {filteredCampers.length === 0 && !error ? (
          <View style={styles.emptyState}>
            <IconSymbol
              ios_icon_name="person.slash.fill"
              android_material_icon_name="person-off"
              size={64}
              color={colors.textSecondary}
            />
            <Text style={styles.emptyText}>No campers found</Text>
            <Text style={commonStyles.textSecondary}>
              {searchQuery ? 'Try a different search term' : 'Create a camper to get started'}
            </Text>
          </View>
        ) : (
          filteredCampers.map((camper) => (
            <React.Fragment key={camper.id}>
              <TouchableOpacity
                style={commonStyles.card}
                onPress={() => handleToggleCamper(camper)}
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
                      {camper.first_name} {camper.last_name}
                    </Text>
                    <Text style={commonStyles.textSecondary}>
                      Age {calculateAge(camper.date_of_birth)}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: camper.check_in_status === 'checked-in' || camper.check_in_status === 'checked_in' ? colors.success : camper.check_in_status === 'checked-out' || camper.check_in_status === 'checked_out' ? colors.warning : colors.textSecondary }]}>
                    <Text style={styles.statusText}>
                      {camper.check_in_status === 'checked-in' || camper.check_in_status === 'checked_in' ? 'In' : 
                       camper.check_in_status === 'checked-out' || camper.check_in_status === 'checked_out' ? 'Out' : 'N/A'}
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
                        {camper.wristband_id ? `NFC ID: ${camper.wristband_id}` : 'No wristband assigned'}
                      </Text>
                    </View>

                    {/* Action Buttons */}
                    <View style={styles.actionButtons}>
                      <TouchableOpacity 
                        style={styles.actionButton}
                        onPress={() => handleViewFullProfile(camper)}
                        activeOpacity={0.8}
                      >
                        <LinearGradient
                          colors={[colors.primary, colors.primaryDark]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={styles.actionButtonGradient}
                        >
                          <IconSymbol
                            ios_icon_name="doc.text.fill"
                            android_material_icon_name="description"
                            size={20}
                            color="#FFFFFF"
                          />
                          <Text style={styles.actionButtonText}>View Full Profile</Text>
                        </LinearGradient>
                      </TouchableOpacity>

                      {canEdit && (
                        <TouchableOpacity 
                          style={styles.actionButton}
                          onPress={() => handleEditCamper(camper)}
                          activeOpacity={0.8}
                        >
                          <LinearGradient
                            colors={[colors.secondary, colors.secondary + 'DD']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.actionButtonGradient}
                          >
                            <IconSymbol
                              ios_icon_name="pencil"
                              android_material_icon_name="edit"
                              size={20}
                              color="#FFFFFF"
                            />
                            <Text style={styles.actionButtonText}>Edit</Text>
                          </LinearGradient>
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
  headerContainer: {
    overflow: 'hidden',
  },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    alignItems: 'center',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 8,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#FFFFFF',
    opacity: 0.95,
    textAlign: 'center',
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
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
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  addButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    gap: 8,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  errorContainer: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.error,
    alignItems: 'center',
    gap: 8,
  },
  errorText: {
    fontSize: 14,
    color: colors.error,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
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
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  actionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
});
