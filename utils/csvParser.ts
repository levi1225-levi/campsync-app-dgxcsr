
export interface CSVParseResult<T> {
  data: T[];
  errors: string[];
}

export function parseCSV<T>(
  csvText: string,
  fieldMapping: Record<string, keyof T>
): CSVParseResult<T> {
  const errors: string[] = [];
  const data: T[] = [];

  try {
    const lines = csvText.split('\n').filter(line => line.trim());
    
    if (lines.length === 0) {
      errors.push('CSV file is empty');
      return { data, errors };
    }

    // Parse header
    const headers = lines[0].split(',').map(h => h.trim());
    
    // Validate required fields
    const requiredFields = Object.keys(fieldMapping);
    const missingFields = requiredFields.filter(field => !headers.includes(field));
    
    if (missingFields.length > 0) {
      errors.push(`Missing required columns: ${missingFields.join(', ')}`);
      return { data, errors };
    }

    // Parse data rows
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const values = parseCSVLine(line);
      
      if (values.length !== headers.length) {
        errors.push(`Row ${i + 1}: Column count mismatch`);
        continue;
      }

      const row: any = {};
      
      for (let j = 0; j < headers.length; j++) {
        const header = headers[j];
        const mappedField = fieldMapping[header];
        
        if (mappedField) {
          row[mappedField] = values[j].trim();
        }
      }

      data.push(row as T);
    }

    return { data, errors };
  } catch (error) {
    console.error('Error parsing CSV:', error);
    errors.push(`Failed to parse CSV: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return { data, errors };
  }
}

function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  values.push(current);
  return values;
}

export function generateCSVTemplate(fields: string[]): string {
  return fields.join(',') + '\n';
}

export function camperImportCSVTemplate(): string {
  const fields = [
    'firstName',
    'lastName',
    'dateOfBirth',
    'campId',
    'sessionId',
    'parent1Name',
    'parent1Email',
    'parent1Phone',
    'parent1Relationship',
    'parent2Name',
    'parent2Email',
    'parent2Phone',
    'parent2Relationship',
    'allergies',
    'medications',
    'medicalConditions',
    'dietaryRestrictions',
    'emergencyContact1Name',
    'emergencyContact1Phone',
    'emergencyContact1Relationship',
    'emergencyContact2Name',
    'emergencyContact2Phone',
    'emergencyContact2Relationship',
  ];
  
  return generateCSVTemplate(fields);
}
