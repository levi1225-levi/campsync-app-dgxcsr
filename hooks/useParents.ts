
// Custom hooks for parent-related operations
import { useState } from 'react';
import { supabase } from '@/app/integrations/supabase/client';

export interface BulkImportResult {
  summary: {
    success: number;
    errors: number;
  };
  details: {
    camperId?: string;
    error?: string;
  }[];
}

export function useBulkImportCampers() {
  const [loading, setLoading] = useState(false);

  const importCampers = async (campersData: any[]): Promise<BulkImportResult> => {
    setLoading(true);
    const result: BulkImportResult = {
      summary: { success: 0, errors: 0 },
      details: [],
    };

    try {
      for (const camperData of campersData) {
        try {
          // Insert camper
          const { data: camper, error: camperError } = await supabase
            .from('campers')
            .insert({
              first_name: camperData.firstName,
              last_name: camperData.lastName,
              date_of_birth: camperData.dateOfBirth,
              camp_id: camperData.campId,
              session_id: camperData.sessionId,
            })
            .select()
            .single();

          if (camperError) throw camperError;

          // Insert medical info if provided
          if (camperData.allergies || camperData.medications || camperData.medicalConditions) {
            await supabase.from('medical_info').insert({
              camper_id: camper.id,
              allergies: camperData.allergies?.split(',').map((a: string) => a.trim()) || [],
              medications: camperData.medications?.split(',').map((m: string) => m.trim()) || [],
              medical_conditions: camperData.medicalConditions?.split(',').map((c: string) => c.trim()) || [],
              dietary_restrictions: camperData.dietaryRestrictions?.split(',').map((d: string) => d.trim()) || [],
            });
          }

          // Insert emergency contacts if provided
          if (camperData.emergencyContact1Name) {
            await supabase.from('emergency_contacts').insert({
              camper_id: camper.id,
              full_name: camperData.emergencyContact1Name,
              phone: camperData.emergencyContact1Phone,
              relationship: camperData.emergencyContact1Relationship,
              priority_order: 1,
            });
          }

          if (camperData.emergencyContact2Name) {
            await supabase.from('emergency_contacts').insert({
              camper_id: camper.id,
              full_name: camperData.emergencyContact2Name,
              phone: camperData.emergencyContact2Phone,
              relationship: camperData.emergencyContact2Relationship,
              priority_order: 2,
            });
          }

          result.summary.success++;
          result.details.push({ camperId: camper.id });
        } catch (error: any) {
          console.error('Error importing camper:', error);
          result.summary.errors++;
          result.details.push({ error: error.message });
        }
      }
    } finally {
      setLoading(false);
    }

    return result;
  };

  return { importCampers, loading };
}
