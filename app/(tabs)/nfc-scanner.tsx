
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { colors, commonStyles } from '@/styles/commonStyles';
import { mockCampers } from '@/data/mockCampers';

export default function NFCScannerScreen() {
  const [isScanning, setIsScanning] = useState(false);
  const [scannedCamper, setScannedCamper] = useState<typeof mockCampers[0] | null>(null);

  const handleScan = () => {
    setIsScanning(true);
    
    // Simulate NFC scan with a random camper after 1.5 seconds
    setTimeout(() => {
      const randomCamper = mockCampers[Math.floor(Math.random() * mockCampers.length)];
      setScannedCamper(randomCamper);
      setIsScanning(false);
    }, 1500);
  };

  const handleReset = () => {
    setScannedCamper(null);
    setIsScanning(false);
  };

  return (
    <View style={[commonStyles.container, styles.container]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>NFC Scanner</Text>
        <Text style={styles.headerSubtitle}>Scan wristbands for quick access</Text>
      </View>

      <View style={styles.content}>
        {/* NFC Scanner Area */}
        <View style={styles.scannerContainer}>
          {!scannedCamper ? (
            <>
              <View style={[styles.scannerCircle, isScanning && styles.scannerCircleActive]}>
                <IconSymbol
                  ios_icon_name="wave.3.right"
                  android_material_icon_name="nfc"
                  size={80}
                  color={isScanning ? colors.accent : colors.primary}
                />
              </View>
              
              <Text style={styles.scannerTitle}>
                {isScanning ? 'Scanning...' : 'Ready to Scan'}
              </Text>
              
              <Text style={styles.scannerDescription}>
                {isScanning
                  ? 'Hold the wristband near your device'
                  : 'Tap the button below to simulate NFC scan'}
              </Text>

              <TouchableOpacity
                style={[styles.scanButton, isScanning && styles.scanButtonDisabled]}
                onPress={handleScan}
                disabled={isScanning}
                activeOpacity={0.8}
              >
                <Text style={styles.scanButtonText}>
                  {isScanning ? 'Scanning...' : 'Simulate NFC Scan'}
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={styles.successIcon}>
                <IconSymbol
                  ios_icon_name="checkmark.circle.fill"
                  android_material_icon_name="check-circle"
                  size={80}
                  color={colors.success}
                />
              </View>

              <Text style={styles.successTitle}>Scan Successful!</Text>

              {/* Camper Info Card */}
              <View style={styles.camperCard}>
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
                    <Text style={styles.camperDetail}>Age {scannedCamper.age} • {scannedCamper.cabin}</Text>
                  </View>
                </View>

                <View style={styles.infoSection}>
                  <View style={styles.infoRow}>
                    <IconSymbol
                      ios_icon_name="wave.3.right"
                      android_material_icon_name="nfc"
                      size={18}
                      color={colors.textSecondary}
                    />
                    <Text style={styles.infoLabel}>Wristband ID:</Text>
                    <Text style={styles.infoValue}>{scannedCamper.nfcWristbandId}</Text>
                  </View>

                  <View style={styles.infoRow}>
                    <IconSymbol
                      ios_icon_name="checkmark.circle.fill"
                      android_material_icon_name="check-circle"
                      size={18}
                      color={scannedCamper.checkInStatus === 'checked-in' ? colors.success : colors.warning}
                    />
                    <Text style={styles.infoLabel}>Status:</Text>
                    <Text style={[
                      styles.infoValue,
                      { color: scannedCamper.checkInStatus === 'checked-in' ? colors.success : colors.warning }
                    ]}>
                      {scannedCamper.checkInStatus === 'checked-in' ? 'Checked In' : 
                       scannedCamper.checkInStatus === 'checked-out' ? 'Checked Out' : 'Not Arrived'}
                    </Text>
                  </View>

                  {scannedCamper.medicalInfo.allergies.length > 0 && (
                    <View style={styles.alertBox}>
                      <IconSymbol
                        ios_icon_name="exclamationmark.triangle.fill"
                        android_material_icon_name="warning"
                        size={18}
                        color={colors.error}
                      />
                      <View style={styles.alertContent}>
                        <Text style={styles.alertTitle}>Medical Alert</Text>
                        <Text style={styles.alertText}>
                          Allergies: {scannedCamper.medicalInfo.allergies.join(', ')}
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              </View>

              <TouchableOpacity
                style={styles.resetButton}
                onPress={handleReset}
                activeOpacity={0.8}
              >
                <IconSymbol
                  ios_icon_name="arrow.clockwise"
                  android_material_icon_name="refresh"
                  size={20}
                  color="#FFFFFF"
                />
                <Text style={styles.resetButtonText}>Scan Another</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Info Box */}
        {!scannedCamper && (
          <View style={styles.infoBox}>
            <IconSymbol
              ios_icon_name="info.circle.fill"
              android_material_icon_name="info"
              size={24}
              color={colors.accent}
            />
            <Text style={styles.infoBoxText}>
              Note: NFC functionality requires compatible hardware. This demo simulates the scanning process.
            </Text>
          </View>
        )}
      </View>
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
    backgroundColor: colors.accent,
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
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 32,
    paddingBottom: 120,
  },
  scannerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  scannerCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
    boxShadow: '0px 4px 16px rgba(0, 0, 0, 0.1)',
    elevation: 4,
  },
  scannerCircleActive: {
    backgroundColor: colors.highlight,
  },
  scannerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  scannerDescription: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 32,
  },
  scanButton: {
    backgroundColor: colors.accent,
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 12,
    boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.15)',
    elevation: 3,
  },
  scanButtonDisabled: {
    opacity: 0.6,
  },
  scanButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  successIcon: {
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.success,
    marginBottom: 24,
  },
  camperCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 20,
    width: '100%',
    marginBottom: 24,
    boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.1)',
    elevation: 3,
  },
  camperHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 16,
  },
  camperAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
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
  camperDetail: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  infoSection: {
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  alertBox: {
    flexDirection: 'row',
    backgroundColor: '#FFF3E0',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    gap: 12,
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.error,
    marginBottom: 4,
  },
  alertText: {
    fontSize: 13,
    color: colors.text,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    gap: 8,
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 12,
    gap: 12,
    marginTop: 24,
  },
  infoBoxText: {
    flex: 1,
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
});
