
import { useState, useEffect } from 'react';
import { parentService } from '@/services/database.service';
import { ParentGuardian } from '@/types/parent';
import { supabase } from '@/app/integrations/supabase/client';

export function useParent(id: string) {
  const [parent, setParent] = useState<ParentGuardian | null>(null);
  const [children, setChildren] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchParentDetails = async () => {
    try {
      setLoading(true);
      const [parentData, childrenData] = await Promise.all([
        parentService.getById(id),
        parentService.getChildren(id),
      ]);
      setParent(parentData);
      setChildren(childrenData);
      setError(null);
    } catch (err) {
      console.error('Error fetching parent details:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchParentDetails();
    }
  }, [id]);

  const updateParent = async (updates: Partial<ParentGuardian>) => {
    try {
      const updated = await parentService.update(id, updates);
      setParent(updated);
      return updated;
    } catch (err) {
      console.error('Error updating parent:', err);
      throw err;
    }
  };

  return {
    parent,
    children,
    loading,
    error,
    refetch: fetchParentDetails,
    updateParent,
  };
}

export function useSendParentInvitation() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const sendInvitation = async (
    camperId: string,
    email: string,
    fullName: string,
    relationship: string
  ) => {
    try {
      setLoading(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        `${supabase.supabaseUrl}/functions/v1/send-parent-invitation`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            camperId,
            email,
            fullName,
            relationship,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send invitation');
      }

      const result = await response.json();
      return result;
    } catch (err) {
      console.error('Error sending invitation:', err);
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { sendInvitation, loading, error };
}

export function useBulkImportCampers() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const importCampers = async (campers: any[]) => {
    try {
      setLoading(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        `${supabase.supabaseUrl}/functions/v1/bulk-import-campers`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ campers }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to import campers');
      }

      const result = await response.json();
      return result;
    } catch (err) {
      console.error('Error importing campers:', err);
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { importCampers, loading, error };
}
