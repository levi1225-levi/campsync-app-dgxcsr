
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { colors, commonStyles } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { mockCampers } from '@/data/mockCampers';

function ParentDashboardContent() {
  const { user, signOut } = useAuth();

  // Get children for this parent (mock data)
  const children = mockCampers.filter(c => user?.childrenIds?.includes(c.id));

  return (
    <View style={[commonStyles.container, styles.container]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Parent Portal</Text>
            <Text style={styles.headerSubtitle}>Welcome, {user?.name}</Text>
          </View>
          <TouchableOpacity onPress={signOut} style={styles.signOutButton}>
            <IconSymbol
              ios_icon_name="rectangle.portrait.and.arrow.right"
              android_material_icon_name="logout"
              size={24}
              color="#FFFFFF"
            />
          </TouchableOpacity>
        </View>

        {/* Children Cards */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>My Children</Text>
          {children.length === 0 ? (
            <View style={commonStyles.card}>
              <Text style={commonStyles.textSecondary}>
                No children registered yet.
              </Text>
            </View>
          ) : (
            children.map((child, index) => (
              <React.Fragment key={index}>
                <View style={commonStyles.card}>
                  <View style={styles.childHeader}>
                    <View style={styles.childAvatar}>
                      <IconSymbol
                        ios_icon_name="person.fill"
                        android_material_icon_name="person"
                        size={32}
                        color={colors.primary}
                      />
                    </View>
                    <View style={styles.childInfo}>
                      <Text style={commonStyles.cardTitle}>
                        {child.firstName} {child.lastName}
                      </Text>
                      <Text style={commonStyles.textSecondary}>
                        Age {child.age} • Cabin {child.cabin}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor:
                            child.checkInStatus === 'checked-in'
                              ? colors.success
                              : child.checkInStatus === 'checked-out'
                              ? colors.warning
                              : colors.textSecondary,
                        },
                      ]}
                    >
                      <Text style={styles.statusText}>
                        {child.checkInStatus === 'checked-in'
                          ? 'Checked In'
                          : child.checkInStatus === 'checked-out'
                          ? 'Checked Out'
                          : 'Not Arrived'}
                      </Text>
                    </View>
                  </View>

                  <View style={commonStyles.divider} />

                  {/* Quick Info */}
                  <View style={styles.infoRow}>
                    <IconSymbol
                      ios_icon_name="heart.text.square.fill"
                      android_material_icon_name="medical-services"
                      size={20}
                      color={colors.secondary}
                    />
                    <Text style={commonStyles.textSecondary}>
                      {child.medicalInfo.allergies.length > 0
                        ? `Allergies: ${child.medicalInfo.allergies.join(', ')}`
                        : 'No known allergies'}
                    </Text>
                  </View>

                  <View style={styles.infoRow}>
                    <IconSymbol
                      ios_icon_name="fork.knife"
                      android_material_icon_name="restaurant"
                      size={20}
                      color={colors.accent}
                    />
                    <Text style={commonStyles.textSecondary}>
                      {child.medicalInfo.dietaryRestrictions.length > 0
                        ? `Diet: ${child.medicalInfo.dietaryRestrictions.join(', ')}`
                        : 'No dietary restrictions'}
                    </Text>
                  </View>

                  {child.lastCheckIn && (
                    <View style={styles.infoRow}>
                      <IconSymbol
                        ios_icon_name="clock.fill"
                        android_material_icon_name="schedule"
                        size={20}
                        color={colors.primary}
                      />
                      <Text style={commonStyles.textSecondary}>
                        Last check-in: {new Date(child.lastCheckIn).toLocaleTimeString()}
                      </Text>
                    </View>
                  )}
                </View>
              </React.Fragment>
            ))
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          
          <TouchableOpacity style={commonStyles.card}>
            <View style={styles.actionRow}>
              <IconSymbol
                ios_icon_name="doc.text.fill"
                android_material_icon_name="description"
                size={24}
                color={colors.primary}
              />
              <View style={styles.actionContent}>
                <Text style={commonStyles.cardTitle}>Update Medical Info</Text>
                <Text style={commonStyles.textSecondary}>
                  Update allergies, medications, and conditions
                </Text>
              </View>
              <IconSymbol
                ios_icon_name="chevron.right"
                android_material_icon_name="chevron-right"
                size={24}
                color={colors.textSecondary}
              />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={commonStyles.card}>
            <View style={styles.actionRow}>
              <IconSymbol
                ios_icon_name="person.2.fill"
                android_material_icon_name="contacts"
                size={24}
                color={colors.secondary}
              />
              <View style={styles.actionContent}>
                <Text style={commonStyles.cardTitle}>Emergency Contacts</Text>
                <Text style={commonStyles.textSecondary}>
                  Manage emergency contact information
                </Text>
              </View>
              <IconSymbol
                ios_icon_name="chevron.right"
                android_material_icon_name="chevron-right"
                size={24}
                color={colors.textSecondary}
              />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={commonStyles.card}>
            <View style={styles.actionRow}>
              <IconSymbol
                ios_icon_name="bell.fill"
                android_material_icon_name="notifications"
                size={24}
                color={colors.accent}
              />
              <View style={styles.actionContent}>
                <Text style={commonStyles.cardTitle}>Notifications</Text>
                <Text style={commonStyles.textSecondary}>
                  View camp updates and announcements
                </Text>
              </View>
              <IconSymbol
                ios_icon_name="chevron.right"
                android_material_icon_name="chevron-right"
                size={24}
                color={colors.textSecondary}
              />
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

export default function ParentDashboard() {
  return (
    <ProtectedRoute allowedRoles={['parent']}>
      <ParentDashboardContent />
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 24,
    backgroundColor: colors.primary,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    fontWeight: '400',
    color: '#FFFFFF',
    opacity: 0.9,
  },
  signOutButton: {
    padding: 8,
  },
  section: {
    paddingHorizontal: 16,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  childHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  childAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  childInfo: {
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionContent: {
    flex: 1,
  },
});
