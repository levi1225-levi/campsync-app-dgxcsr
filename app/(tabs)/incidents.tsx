
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import { colors, commonStyles } from '@/styles/commonStyles';
import { mockIncidents } from '@/data/mockIncidents';
import { Incident, IncidentSeverity, IncidentStatus } from '@/types/incident';

export default function IncidentsScreen() {
  const router = useRouter();
  const [filterStatus, setFilterStatus] = useState<IncidentStatus | 'all'>('all');

  const filteredIncidents = mockIncidents.filter(incident => {
    return filterStatus === 'all' || incident.status === filterStatus;
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

  const getStatusColor = (status: IncidentStatus) => {
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

  const getTypeIcon = (type: Incident['type']) => {
    switch (type) {
      case 'medical':
        return 'medical-services' as const;
      case 'behavioral':
        return 'psychology' as const;
      case 'safety':
        return 'warning' as const;
      case 'other':
        return 'info' as const;
      default:
        return 'info' as const;
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <View style={[commonStyles.container, styles.container]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Incidents</Text>
        <Text style={styles.headerSubtitle}>{filteredIncidents.length} incidents</Text>
      </View>

      {/* Add New Incident Button */}
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => router.push('/new-incident' as any)}
        activeOpacity={0.8}
      >
        <IconSymbol
          ios_icon_name="plus.circle.fill"
          android_material_icon_name="add-circle"
          size={24}
          color="#FFFFFF"
        />
        <Text style={styles.addButtonText}>Report New Incident</Text>
      </TouchableOpacity>

      {/* Filter Buttons */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
        contentContainerStyle={styles.filterContent}
      >
        {(['all', 'open', 'in-progress', 'resolved', 'closed'] as const).map((status, index) => (
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
                {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' ')}
              </Text>
            </TouchableOpacity>
          </React.Fragment>
        ))}
      </ScrollView>

      {/* Incidents List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {filteredIncidents.map((incident, index) => (
          <React.Fragment key={index}>
            <TouchableOpacity
              style={commonStyles.card}
              onPress={() => router.push(`/incident-detail?id=${incident.id}` as any)}
              activeOpacity={0.7}
            >
              <View style={styles.incidentHeader}>
                <View style={styles.incidentHeaderLeft}>
                  <View
                    style={[
                      styles.typeIcon,
                      { backgroundColor: getSeverityColor(incident.severity) },
                    ]}
                  >
                    <IconSymbol
                      ios_icon_name={getTypeIcon(incident.type)}
                      android_material_icon_name={getTypeIcon(incident.type)}
                      size={20}
                      color="#FFFFFF"
                    />
                  </View>
                  <View style={styles.incidentTitleContainer}>
                    <Text style={styles.incidentTitle}>{incident.title}</Text>
                    <Text style={styles.incidentCamper}>{incident.camperName}</Text>
                  </View>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: getStatusColor(incident.status) },
                  ]}
                >
                  <Text style={styles.statusText}>
                    {incident.status.charAt(0).toUpperCase() + incident.status.slice(1).replace('-', ' ')}
                  </Text>
                </View>
              </View>

              <Text style={styles.incidentDescription} numberOfLines={2}>
                {incident.description}
              </Text>

              <View style={styles.incidentFooter}>
                <View style={styles.incidentMeta}>
                  <View style={styles.metaItem}>
                    <IconSymbol
                      ios_icon_name="location.fill"
                      android_material_icon_name="location-on"
                      size={14}
                      color={colors.textSecondary}
                    />
                    <Text style={styles.metaText}>{incident.location}</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <IconSymbol
                      ios_icon_name="clock.fill"
                      android_material_icon_name="schedule"
                      size={14}
                      color={colors.textSecondary}
                    />
                    <Text style={styles.metaText}>{formatDate(incident.reportedAt)}</Text>
                  </View>
                </View>
                <View style={styles.severityBadge}>
                  <View
                    style={[
                      styles.severityDot,
                      { backgroundColor: getSeverityColor(incident.severity) },
                    ]}
                  />
                  <Text style={styles.severityText}>
                    {incident.severity.charAt(0).toUpperCase() + incident.severity.slice(1)}
                  </Text>
                </View>
              </View>

              {incident.parentNotified && (
                <View style={styles.notificationBadge}>
                  <IconSymbol
                    ios_icon_name="checkmark.circle.fill"
                    android_material_icon_name="check-circle"
                    size={14}
                    color={colors.success}
                  />
                  <Text style={styles.notificationText}>Parent notified</Text>
                </View>
              )}
            </TouchableOpacity>
          </React.Fragment>
        ))}

        {filteredIncidents.length === 0 && (
          <View style={styles.emptyState}>
            <IconSymbol
              ios_icon_name="checkmark.circle"
              android_material_icon_name="check-circle"
              size={64}
              color={colors.textSecondary}
            />
            <Text style={styles.emptyStateText}>No incidents found</Text>
            <Text style={commonStyles.textSecondary}>
              {filterStatus === 'all'
                ? 'No incidents have been reported yet'
                : `No ${filterStatus} incidents`}
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
    backgroundColor: colors.secondary,
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
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.secondary,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
    boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.15)',
    elevation: 3,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
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
    backgroundColor: colors.secondary,
    borderColor: colors.secondary,
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
  incidentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  incidentHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  typeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  incidentTitleContainer: {
    flex: 1,
  },
  incidentTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  incidentCamper: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
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
  incidentDescription: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
    marginBottom: 12,
  },
  incidentFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  incidentMeta: {
    flex: 1,
    gap: 6,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  severityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  severityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  severityText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  notificationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 6,
  },
  notificationText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.success,
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
