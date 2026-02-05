
import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Platform,
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
import * as Haptics from 'expo-haptics';
import { SkeletonLoader } from '@/components/SkeletonLoader';
import { Toast } from '@/components/Toast';

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
  const { user, hasPermission } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [campers, setCampers] = useState<Camper[]>([]);
  const [filteredCampers, setFilteredCampers] = useState<Camper[]>([]);
  const [selectedCamper, setSelectedCamper] = useState<Camper | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info');

  const canEdit = hasPermission(['super-admin', 'camp-admin']);
  const canViewMedical = hasPermission(['super-admin', 'camp-admin', 'staff']);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 3000);
  }, []);

  const loadCampers = useCallback(async (isRetry = false) => {
    console.log('Loading campers from database...', isRetry ? `(Retry ${retryCount + 1})` : '');
    setError(null);
    
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Request timed out after 15 seconds')), 15000)
    );
    
    try {
      // Use the RPC function to bypass RLS with timeout
      const rpcPromise = supabase.rpc('get_all_campers');
      const { data, error: rpcError } = await Promise.race([
        rpcPromise,
        timeoutPromise,
      ]) as any;

      if (rpcError) {
        console.error('Error loading campers via RPC:', rpcError);
        throw new Error(rpcError.message || 'Failed to load campers');
      }

      console.log('Loaded campers via RPC:', data?.length || 0);
      setCampers(data || []);
      setFilteredCampers(data || []);
      setRetryCount(0);
      
      if (isRetry) {
        showToast('Campers loaded successfully', 'success');
      }
    } catch (error: any) {
      console.error('Error in loadCampers:', error);
      const errorMessage = error?.message || 'Unknown error';
      setError(`Failed to load campers: ${errorMessage}`);
      setCampers([]);
      setFilteredCampers([]);
      
      // Auto-retry logic (max 3 retries)
      if (retryCount < 3 && !isRetry) {
        console.log('Auto-retrying in 2 seconds...');
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
          loadCampers(true);
        }, 2000);
      } else {
        showToast('Failed to load campers', 'error');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [retryCount, showToast]);

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
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.push(`/camper-profile?id=${camper.id}`);
    } catch (error) {
      console.error('Navigation error:', error);
      showToast('Failed to open camper profile', 'error');
    }
  }, [router, showToast]);

  const handleEditCamper = useCallback((camper: Camper) => {
    try {
      console.log('User tapped Edit Camper for:', camper.id);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.push(`/edit-camper?id=${camper.id}`);
    } catch (error) {
      console.error('Navigation error:', error);
      showToast('Failed to open edit camper screen', 'error');
    }
  }, [router, showToast]);

  const handleCreateCamper = useCallback(() => {
    try {
      console.log('User tapped Create Camper button');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      router.push('/create-camper');
    } catch (error) {
      console.error('Navigation error:', error);
      showToast('Failed to open create camper screen', 'error');
    }
  }, [router, showToast]);

  const handleClearSearch = useCallback(() => {
    console.log('User cleared search');
    setSearchQuery('');
  }, []);

  const handleToggleCamper = useCallback((camper: Camper) => {
    setSelectedCamper(prev => prev?.id === camper.id ? null : camper);
  }, []);

  const renderCamperItem = useCallback(({ item: camper }: { item: Camper }) => {
    const ageDisplay = calculateAge(camper.date_of_birth);
    const statusColor = getStatusColor(camper.check_in_status);
    const statusText = camper.check_in_status === 'checked-in' || camper.check_in_status === 'checked_in' ? 'In' : 
                       camper.check_in_status === 'checked-out' || camper.check_in_status === 'checked_out' ? 'Out' : 'N/A';
    const wristbandText = camper.wristband_id ? `NFC ID: ${camper.wristband_id}` : 'No wristband assigned';
    const isExpanded = selectedCamper?.id === camper.id;

    return (
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
              Age {ageDisplay}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>
              {statusText}
            </Text>
          </View>
        </View>

        {isExpanded && (
          <>
            <View style={commonStyles.divider} />
            
            <View style={styles.detailRow}>
              <IconSymbol
                ios_icon_name="wave.3.right"
                android_material_icon_name="nfc"
                size={20}
                color={colors.accent}
              />
              <Text style={commonStyles.textSecondary}>
                {wristbandText}
              </Text>
            </View>

            <View style={styles.actionButtons}>
              <TouchableOpacity 
                style={[styles.actionButton, { backgroundColor: colors.primary }]}
                onPress={() => handleViewFullProfile(camper)}
                activeOpacity={0.8}
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
                  activeOpacity={0.8}
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
    );
  }, [selectedCamper, canEdit, handleToggleCamper, handleViewFullProfile, handleEditCamper]);

  const renderEmptyComponent = useCallback(() => (
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
  ), [searchQuery]);

  const renderListHeader = useCallback(() => (
    <>
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

      {canEdit && (
        <View style={styles.addButtonContainer}>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={handleCreateCamper}
            activeOpacity={0.8}
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

      {error && (
        <View style={styles.errorContainer}>
          <IconSymbol
            ios_icon_name="exclamationmark.triangle.fill"
            android_material_icon_name="warning"
            size={24}
            color={colors.error}
          />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={() => loadCampers()} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}
    </>
  ), [filteredCampers.length, searchQuery, canEdit, error, handleClearSearch, handleCreateCamper, loadCampers]);

  if (loading) {
    return (
      <View style={[commonStyles.container, styles.container]}>
        <LinearGradient
          colors={[colors.primary, colors.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <Text style={styles.headerTitle}>Campers</Text>
          <Text style={styles.headerSubtitle}>Loading...</Text>
        </LinearGradient>
        <View style={styles.skeletonContainer}>
          <SkeletonLoader count={5} />
        </View>
      </View>
    );
  }

  return (
    <View style={[commonStyles.container, styles.container]}>
      <FlatList
        data={filteredCampers}
        renderItem={renderCamperItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderListHeader}
        ListEmptyComponent={!error ? renderEmptyComponent : null}
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
        windowSize={10}
        maxToRenderPerBatch={10}
        updateCellsBatchingPeriod={50}
        initialNumToRender={10}
        removeClippedSubviews={Platform.OS === 'android'}
      />
      <Toast
        visible={toastVisible}
        message={toastMessage}
        type={toastType}
        onDismiss={() => setToastVisible(false)}
      />
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
  skeletonContainer: {
    padding: 16,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});
