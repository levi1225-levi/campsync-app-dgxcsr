
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '@/styles/commonStyles';
import { GlassCard } from '@/components/GlassCard';
import { IconSymbol } from '@/components/IconSymbol';

interface StatCardProps {
  icon: string;
  label: string;
  value: string | number;
  color: string;
}

function StatCard({ icon, label, value, color }: StatCardProps) {
  return (
    <GlassCard style={styles.statCard}>
      <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
        <IconSymbol
          ios_icon_name="chart.bar.fill"
          android_material_icon_name={icon}
          size={24}
          color={color}
        />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </GlassCard>
  );
}

interface CampStatisticsProps {
  totalCampers: number;
  checkedIn: number;
  checkedOut: number;
  notArrived: number;
  outdatedWristbands: number;
}

export function CampStatistics({
  totalCampers,
  checkedIn,
  checkedOut,
  notArrived,
  outdatedWristbands,
}: CampStatisticsProps) {
  const checkedInPercentage = totalCampers > 0 ? Math.round((checkedIn / totalCampers) * 100) : 0;

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Camp Statistics</Text>
      
      <View style={styles.statsGrid}>
        <StatCard
          icon="group"
          label="Total Campers"
          value={totalCampers}
          color={colors.primary}
        />
        <StatCard
          icon="check-circle"
          label="Checked In"
          value={checkedIn}
          color={colors.success}
        />
        <StatCard
          icon="logout"
          label="Checked Out"
          value={checkedOut}
          color={colors.warning}
        />
        <StatCard
          icon="schedule"
          label="Not Arrived"
          value={notArrived}
          color={colors.textSecondary}
        />
      </View>

      {outdatedWristbands > 0 && (
        <GlassCard style={styles.alertCard}>
          <View style={styles.alertHeader}>
            <IconSymbol
              ios_icon_name="exclamationmark.triangle.fill"
              android_material_icon_name="warning"
              size={24}
              color={colors.warning}
            />
            <Text style={styles.alertTitle}>Wristband Updates Needed</Text>
          </View>
          <Text style={styles.alertText}>
            {outdatedWristbands} camper{outdatedWristbands !== 1 ? 's' : ''} need wristband reprogramming
          </Text>
        </GlassCard>
      )}

      <GlassCard style={styles.progressCard}>
        <Text style={styles.progressLabel}>Check-In Progress</Text>
        <View style={styles.progressBarContainer}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${checkedInPercentage}%`, backgroundColor: colors.success },
            ]}
          />
        </View>
        <Text style={styles.progressText}>{checkedInPercentage}% of campers checked in</Text>
      </GlassCard>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    minWidth: '47%',
    alignItems: 'center',
    padding: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  alertCard: {
    backgroundColor: colors.warning + '15',
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.warning + '30',
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  alertText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  progressCard: {
    padding: 16,
  },
  progressLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
