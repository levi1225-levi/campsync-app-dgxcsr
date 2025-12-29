
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { colors } from '@/styles/commonStyles';
import { useBulkImportCampers } from '@/hooks/useParents';
import { parseCSV, camperImportCSVTemplate } from '@/utils/csvParser';
import { IconSymbol } from '@/components/IconSymbol';

export default function BulkImportCampersScreen() {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const { importCampers, loading } = useBulkImportCampers();

  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'text/csv',
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return;
      }

      const file = result.assets[0];
      setSelectedFile(file.name);

      // Read file content
      const response = await fetch(file.uri);
      const csvText = await response.text();

      // Parse CSV
      const fieldMapping = {
        firstName: 'firstName',
        lastName: 'lastName',
        dateOfBirth: 'dateOfBirth',
        campId: 'campId',
        sessionId: 'sessionId',
        parent1Name: 'parent1Name',
        parent1Email: 'parent1Email',
        parent1Phone: 'parent1Phone',
        parent1Relationship: 'parent1Relationship',
        parent2Name: 'parent2Name',
        parent2Email: 'parent2Email',
        parent2Phone: 'parent2Phone',
        parent2Relationship: 'parent2Relationship',
        allergies: 'allergies',
        medications: 'medications',
        medicalConditions: 'medicalConditions',
        dietaryRestrictions: 'dietaryRestrictions',
        emergencyContact1Name: 'emergencyContact1Name',
        emergencyContact1Phone: 'emergencyContact1Phone',
        emergencyContact1Relationship: 'emergencyContact1Relationship',
        emergencyContact2Name: 'emergencyContact2Name',
        emergencyContact2Phone: 'emergencyContact2Phone',
        emergencyContact2Relationship: 'emergencyContact2Relationship',
      };

      const { data, errors } = parseCSV(csvText, fieldMapping);

      if (errors.length > 0) {
        setParseErrors(errors);
        Alert.alert('Parse Errors', errors.join('\n'));
      } else {
        setParsedData(data);
        setParseErrors([]);
        Alert.alert('Success', `Parsed ${data.length} campers from CSV`);
      }
    } catch (error) {
      console.error('Error picking file:', error);
      Alert.alert('Error', 'Failed to read CSV file');
    }
  };

  const handleDownloadTemplate = () => {
    const template = camperImportCSVTemplate();
    Alert.alert(
      'CSV Template',
      'Copy this template and fill it with your camper data:\n\n' + template,
      [{ text: 'OK' }]
    );
  };

  const handleImport = async () => {
    if (parsedData.length === 0) {
      Alert.alert('Error', 'No data to import');
      return;
    }

    try {
      const result = await importCampers(parsedData);
      
      Alert.alert(
        'Import Complete',
        `Successfully imported ${result.summary.success} campers.\n` +
        `Errors: ${result.summary.errors}`,
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error) {
      console.error('Import error:', error);
      Alert.alert('Error', 'Failed to import campers');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <IconSymbol
            ios_icon_name="chevron.left"
            android_material_icon_name="arrow_back"
            size={24}
            color={colors.text}
          />
        </TouchableOpacity>
        <Text style={styles.title}>Bulk Import Campers</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Instructions</Text>
          <Text style={styles.instructions}>
            - Download the CSV template below{'\n'}
            - Fill in camper information{'\n'}
            - Upload the completed CSV file{'\n'}
            - Review and confirm the import
          </Text>
        </View>

        <TouchableOpacity
          style={styles.templateButton}
          onPress={handleDownloadTemplate}
        >
          <IconSymbol
            ios_icon_name="arrow.down.doc"
            android_material_icon_name="download"
            size={24}
            color={colors.primary}
          />
          <Text style={styles.templateButtonText}>Download CSV Template</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.uploadButton}
          onPress={handlePickFile}
        >
          <IconSymbol
            ios_icon_name="doc.badge.plus"
            android_material_icon_name="upload_file"
            size={24}
            color="#fff"
          />
          <Text style={styles.uploadButtonText}>Select CSV File</Text>
        </TouchableOpacity>

        {selectedFile && (
          <View style={styles.fileInfo}>
            <IconSymbol
              ios_icon_name="doc.text"
              android_material_icon_name="description"
              size={20}
              color={colors.text}
            />
            <Text style={styles.fileName}>{selectedFile}</Text>
          </View>
        )}

        {parseErrors.length > 0 && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorTitle}>Parse Errors:</Text>
            {parseErrors.map((error, index) => (
              <Text key={index} style={styles.errorText}>
                • {error}
              </Text>
            ))}
          </View>
        )}

        {parsedData.length > 0 && (
          <View style={styles.previewContainer}>
            <Text style={styles.previewTitle}>
              Preview: {parsedData.length} campers ready to import
            </Text>
            <ScrollView style={styles.previewList} nestedScrollEnabled>
              {parsedData.slice(0, 5).map((camper, index) => (
                <View key={index} style={styles.previewItem}>
                  <Text style={styles.previewText}>
                    {camper.firstName} {camper.lastName}
                  </Text>
                  <Text style={styles.previewSubtext}>
                    DOB: {camper.dateOfBirth}
                  </Text>
                </View>
              ))}
              {parsedData.length > 5 && (
                <Text style={styles.previewMore}>
                  ... and {parsedData.length - 5} more
                </Text>
              )}
            </ScrollView>
          </View>
        )}

        {parsedData.length > 0 && (
          <TouchableOpacity
            style={[styles.importButton, loading && styles.importButtonDisabled]}
            onPress={handleImport}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <React.Fragment>
                <IconSymbol
                  ios_icon_name="checkmark.circle"
                  android_material_icon_name="check_circle"
                  size={24}
                  color="#fff"
                />
                <Text style={styles.importButtonText}>Import Campers</Text>
              </React.Fragment>
            )}
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 48 : 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
  },
  content: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  instructions: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  templateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.primary,
    marginBottom: 16,
  },
  templateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
    marginLeft: 8,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: colors.primary,
    borderRadius: 12,
    marginBottom: 16,
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 8,
  },
  fileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: colors.surface,
    borderRadius: 8,
    marginBottom: 16,
  },
  fileName: {
    fontSize: 14,
    color: colors.text,
    marginLeft: 8,
    flex: 1,
  },
  errorContainer: {
    padding: 16,
    backgroundColor: '#fee',
    borderRadius: 8,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#c00',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#c00',
    marginBottom: 4,
  },
  previewContainer: {
    marginBottom: 16,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  previewList: {
    maxHeight: 200,
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 12,
  },
  previewItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  previewText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  previewSubtext: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  previewMore: {
    fontSize: 14,
    color: colors.textSecondary,
    fontStyle: 'italic',
    paddingVertical: 8,
    textAlign: 'center',
  },
  importButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#4CAF50',
    borderRadius: 12,
  },
  importButtonDisabled: {
    opacity: 0.6,
  },
  importButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 8,
  },
});
