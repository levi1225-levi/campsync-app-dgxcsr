
import React, { useState } from 'react';
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
import { IconSymbol } from '@/components/IconSymbol';
import { colors, commonStyles } from '@/styles/commonStyles';
import { mockIncidents } from '@/data/mockIncidents';
import { Incident, IncidentSeverity } from '@/types/incident';

function IncidentsScreenContent() {
  const { hasPermission } = useAuth();
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [filter, setFilter] = useState<'all' | 'open' | 'resolved'>('all');

  const canEdit = hasPermission(['super-admin', 'camp-admin']);
  const canCreate = hasPermission(['super-admin', 'camp-admin', 'staff']);

  const filteredIncidents = mockIncidents.filter(incident => {
    if (filter === 'all') return true;
    if (filter === 'open') return incident.status === 'open' || incident.status === 'in-progress';
    if (filter === 'resolved') return incident.status === 'resolved' || incident.status === 'closed';
    return true;
  });

  const getSeverityColor = (severity: IncidentSeverity) => {
    switch (severity) {
      case 'critical':
        return colors.error;
      case 'high':
        return colors.secondary;
      case 'medium':
        return colors.warning;
      case 'low':
        return colors.accent;
      default:
        return colors.textSecondary;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return colors.error;
      case 'in-progress':
        return colors.warning;
      case 'resolved':
        return colors.success;
      case 'closed':
        return colors.textSecondary;
      default:
        return colors.textSecondary;
    }
  };

  return (
    <View style={[commonStyles.container, styles.container]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Incidents</Text>
        <Text style={styles.headerSubtitle}>
          {filteredIncidents.length} incident{filteredIncidents.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'all' && styles.filterTabActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
            All
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'open' && styles.filterTabActive]}
          onPress={() => setFilter('open')}
        >
          <Text style={[styles.filterText, filter === 'open' && styles.filterTextActive]}>
            Open
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'resolved' && styles.filterTabActive]}
          onPress={() => setFilter('resolved')}
        >
          <Text style={[styles.filterText, filter === 'resolved' && styles.filterTextActive]}>
            Resolved
          </Text>
        </TouchableOpacity>
      </View>

      {/* Add Incident Button */}
      {canCreate && (
        <View style={styles.addButtonContainer}>
          <TouchableOpacity style={styles.addButton}>
            <IconSymbol
              ios_icon_name="plus.circle.fill"
              android_material_icon_name="add-circle"
              size={24}
              color="#FFFFFF"
            />
            <Text style={styles.addButtonText}>Report New Incident</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Incidents List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {filteredIncidents.length === 0 ? (
          <View style={styles.emptyState}>
            <IconSymbol
              ios_icon_name="checkmark.circle.fill"
              android_material_icon_name="check-circle"
              size={48}
              color={colors.success}
            />
            <Text style={styles.emptyText}>No incidents to display</Text>
          </View>
        ) : (
          filteredIncidents.map((incident, index) => (
            <React.Fragment key={index}>
              <TouchableOpacity
                style={commonStyles.card}
                onPress={() => setSelectedIncident(selectedIncident?.id === incident.id ? null : incident)}
                activeOpacity={0.7}
              >
                <View style={styles.incidentHeader}>
                  <View style={styles.incidentInfo}>
                    <Text style={commonStyles.cardTitle}>{incident.title}</Text>
                    <Text style={commonStyles.textSecondary}>
                      {incident.camperName} • {incident.location}
                    </Text>
                  </View>
                  <View style={styles.badges}>
                    <View style={[styles.badge, { backgroundColor: getSeverityColor(incident.severity) }]}>
                      <Text style={styles.badgeText}>
                        {incident.severity.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.statusRow}>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(incident.status) }]}>
                    <Text style={styles.statusText}>
                      {incident.status.replace('-', ' ').toUpperCase()}
                    </Text>
                  </View>
                  <Text style={commonStyles.textSecondary}>
                    {new Date(incident.reportedAt).toLocaleDateString()}
                  </Text>
                </View>

                {/* Expanded Details */}
                {selectedIncident?.id === incident.id && (
                  <>
                    <View style={commonStyles.divider} />
                    
                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>Description</Text>
                      <Text style={commonStyles.textSecondary}>{incident.description}</Text>
                    </View>

                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>Type</Text>
                      <Text style={commonStyles.textSecondary}>
                        {incident.type.charAt(0).toUpperCase() + incident.type.slice(1)}
                      </Text>
                    </View>

                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>Reported By</Text>
                      <Text style={commonStyles.textSecondary}>{incident.reportedBy}</Text>
                    </View>

                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>Reported At</Text>
                      <Text style={commonStyles.textSecondary}>
                        {new Date(incident.reportedAt).toLocaleString()}
                      </Text>
                    </View>

                    {incident.actionsTaken && (
                      <View style={styles.detailSection}>
                        <Text style={styles.detailLabel}>Actions Taken</Text>
                        <Text style={commonStyles.textSecondary}>{incident.actionsTaken}</Text>
                      </View>
                    )}

                    <View style={styles.detailRow}>
                      <IconSymbol
                        ios_icon_name={incident.parentNotified ? 'checkmark.circle.fill' : 'xmark.circle.fill'}
                        android_material_icon_name={incident.parentNotified ? 'check-circle' : 'cancel'}
                        size={20}
                        color={incident.parentNotified ? colors.success : colors.error}
                      />
                      <Text style={commonStyles.textSecondary}>
                        Parent {incident.parentNotified ? 'Notified' : 'Not Notified'}
                      </Text>
                    </View>

                    {incident.followUpRequired && (
                      <View style={styles.detailRow}>
                        <IconSymbol
                          ios_icon_name="bell.fill"
                          android_material_icon_name="notifications"
                          size={20}
                          color={colors.warning}
                        />
                        <Text style={commonStyles.textSecondary}>Follow-up Required</Text>
                      </View>
                    )}

                    {/* Action Buttons */}
                    {canEdit && (
                      <View style={styles.actionButtons}>
                        <TouchableOpacity style={styles.actionButton}>
                          <IconSymbol
                            ios_icon_name="pencil"
                            android_material_icon_name="edit"
                            size={20}
                            color={colors.primary}
                          />
                          <Text style={styles.actionButtonText}>Edit</Text>
                        </TouchableOpacity>

                        {incident.status !== 'resolved' && incident.status !== 'closed' && (
                          <TouchableOpacity style={[styles.actionButton, { backgroundColor: colors.success }]}>
                            <IconSymbol
                              ios_icon_name="checkmark.circle.fill"
                              android_material_icon_name="check-circle"
                              size={20}
                              color="#FFFFFF"
                            />
                            <Text style={[styles.actionButtonText, { color: '#FFFFFF' }]}>
                              Mark Resolved
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    )}
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

export default function IncidentsScreen() {
  return (
    <ProtectedRoute allowedRoles={['super-admin', 'camp-admin', 'staff']}>
      <IncidentsScreenContent />
    </ProtectedRoute>
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
    backgroundColor: colors.secondary,
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
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 16,
    gap: 8,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: colors.card,
    alignItems: 'center',
  },
  filterTabActive: {
    backgroundColor: colors.primary,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  addButtonContainer: {
    paddingHorizontal: 16,
    marginTop: 16,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.secondary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  addButtonText: {
    fontSize: 16,
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
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 16,
  },
  incidentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  incidentInfo: {
    flex: 1,
    marginRight: 12,
  },
  badges: {
    gap: 4,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  detailSection: {
    marginTop: 12,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
});
