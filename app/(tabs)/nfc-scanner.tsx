
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Alert,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { IconSymbol } from '@/components/IconSymbol';
import { colors, commonStyles } from '@/styles/commonStyles';
import { mockCampers } from '@/data/mockCampers';
import { Camper } from '@/types/camper';

function NFCScannerScreenContent() {
  const { hasPermission } = useAuth();
  const [isScanning, setIsScanning] = useState(false);
  const [scannedCamper, setScannedCamper] = useState<Camper | null>(null);

  const canScan = hasPermission(['super-admin', 'camp-admin', 'staff']);

  const handleScan = () => {
    if (!canScan) {
      Alert.alert('Access Denied', 'You do not have permission to scan NFC wristbands.');
      return;
    }

    setIsScanning(true);
    
    // Simulate NFC scan - In production, use actual NFC library
    setTimeout(() => {
      // Mock: randomly select a camper
      const randomCamper = mockCampers[Math.floor(Math.random() * mockCampers.length)];
      setScannedCamper(randomCamper);
      setIsScanning(false);
    }, 1500);
  };

  const handleCheckIn = () => {
    if (scannedCamper) {
      Alert.alert(
        'Check In Successful',
        `${scannedCamper.firstName} ${scannedCamper.lastName} has been checked in.`,
        [{ text: 'OK', onPress: () => setScannedCamper(null) }]
      );
    }
  };

  const handleCheckOut = () => {
    if (scannedCamper) {
      Alert.alert(
        'Check Out Successful',
        `${scannedCamper.firstName} ${scannedCamper.lastName} has been checked out.`,
        [{ text: 'OK', onPress: () => setScannedCamper(null) }]
      );
    }
  };

  const handleLogIncident = () => {
    if (scannedCamper) {
      Alert.alert(
        'Log Incident',
        `Opening incident form for ${scannedCamper.firstName} ${scannedCamper.lastName}`,
        [{ text: 'OK' }]
      );
    }
  };

  return (
    <View style={[commonStyles.container, styles.container]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>NFC Scanner</Text>
        <Text style={styles.headerSubtitle}>
          Scan camper wristbands for quick access
        </Text>
      </View>

      {/* Scanner Area */}
      <View style={styles.scannerContainer}>
        <View style={[styles.scannerCircle, isScanning && styles.scannerCircleActive]}>
          <IconSymbol
            ios_icon_name="wave.3.right"
            android_material_icon_name="nfc"
            size={80}
            color={isScanning ? colors.primary : colors.textSecondary}
          />
        </View>

        <Text style={styles.scannerText}>
          {isScanning ? 'Scanning...' : 'Tap to scan NFC wristband'}
        </Text>

        <TouchableOpacity
          style={[styles.scanButton, isScanning && styles.scanButtonDisabled]}
          onPress={handleScan}
          disabled={isScanning || !canScan}
        >
          <Text style={styles.scanButtonText}>
            {isScanning ? 'Scanning...' : 'Start Scan'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Scanned Camper Info */}
      {scannedCamper && (
        <View style={styles.camperInfoContainer}>
          <View style={commonStyles.card}>
            <View style={styles.camperHeader}>
              <View style={styles.camperAvatar}>
                <IconSymbol
                  ios_icon_name="person.fill"
                  android_material_icon_name="person"
                  size={40}
                  color={colors.primary}
                />
              </View>
              <View style={styles.camperInfo}>
                <Text style={styles.camperName}>
                  {scannedCamper.firstName} {scannedCamper.lastName}
                </Text>
                <Text style={commonStyles.textSecondary}>
                  Age {scannedCamper.age} • Cabin {scannedCamper.cabin}
                </Text>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor:
                      scannedCamper.checkInStatus === 'checked-in'
                        ? colors.success
                        : scannedCamper.checkInStatus === 'checked-out'
                        ? colors.warning
                        : colors.textSecondary,
                  },
                ]}
              >
                <Text style={styles.statusText}>
                  {scannedCamper.checkInStatus === 'checked-in'
                    ? 'Checked In'
                    : scannedCamper.checkInStatus === 'checked-out'
                    ? 'Checked Out'
                    : 'Not Arrived'}
                </Text>
              </View>
            </View>

            <View style={commonStyles.divider} />

            {/* Medical Alerts */}
            {scannedCamper.medicalInfo.allergies.length > 0 && (
              <View style={styles.alertRow}>
                <IconSymbol
                  ios_icon_name="exclamationmark.triangle.fill"
                  android_material_icon_name="warning"
                  size={20}
                  color={colors.error}
                />
                <Text style={[commonStyles.textSecondary, { color: colors.error }]}>
                  Allergies: {scannedCamper.medicalInfo.allergies.join(', ')}
                </Text>
              </View>
            )}

            {scannedCamper.medicalInfo.medications.length > 0 && (
              <View style={styles.alertRow}>
                <IconSymbol
                  ios_icon_name="pills.fill"
                  android_material_icon_name="medication"
                  size={20}
                  color={colors.secondary}
                />
                <Text style={commonStyles.textSecondary}>
                  Medications: {scannedCamper.medicalInfo.medications.join(', ')}
                </Text>
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.success }]}
                onPress={handleCheckIn}
              >
                <IconSymbol
                  ios_icon_name="checkmark.circle.fill"
                  android_material_icon_name="check-circle"
                  size={24}
                  color="#FFFFFF"
                />
                <Text style={styles.actionButtonText}>Check In</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.warning }]}
                onPress={handleCheckOut}
              >
                <IconSymbol
                  ios_icon_name="arrow.right.circle.fill"
                  android_material_icon_name="exit-to-app"
                  size={24}
                  color="#FFFFFF"
                />
                <Text style={styles.actionButtonText}>Check Out</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.actionButton, styles.incidentButton]}
              onPress={handleLogIncident}
            >
              <IconSymbol
                ios_icon_name="exclamationmark.triangle.fill"
                android_material_icon_name="report"
                size={24}
                color="#FFFFFF"
              />
              <Text style={styles.actionButtonText}>Log Incident</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Instructions */}
      <View style={styles.instructions}>
        <Text style={styles.instructionsTitle}>How to use:</Text>
        <Text style={commonStyles.textSecondary}>
          1. Hold the device near the camper&apos;s NFC wristband
        </Text>
        <Text style={commonStyles.textSecondary}>
          2. Wait for the scan to complete
        </Text>
        <Text style={commonStyles.textSecondary}>
          3. Review camper information and take action
        </Text>
      </View>
    </View>
  );
}

export default function NFCScannerScreen() {
  return (
    <ProtectedRoute allowedRoles={['super-admin', 'camp-admin', 'staff']}>
      <NFCScannerScreenContent />
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
    paddingBottom: 24,
    backgroundColor: colors.accent,
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
  scannerContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  scannerCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 4,
    borderColor: colors.border,
  },
  scannerCircleActive: {
    borderColor: colors.primary,
    backgroundColor: '#E3F2FD',
  },
  scannerText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 24,
  },
  scanButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 12,
  },
  scanButtonDisabled: {
    opacity: 0.5,
  },
  scanButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  camperInfoContainer: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  camperHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  camperAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  camperInfo: {
    flex: 1,
  },
  camperName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
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
  alertRow: {
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
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
  },
  incidentButton: {
    backgroundColor: colors.secondary,
    marginTop: 12,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  instructions: {
    paddingHorizontal: 16,
    marginTop: 'auto',
    paddingBottom: 120,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
});
