
import { supabase } from '@/app/integrations/supabase/client';

export interface GenerateParentInvitationParams {
  camperIds: string[];
  parentEmail: string;
  parentName: string;
}

export interface GenerateParentInvitationResult {
  success: boolean;
  code?: string;
  expiresAt?: string;
  message?: string;
  error?: string;
}

/**
 * Generates a parent invitation code via Edge Function
 * This creates an authorization code linked to specific campers
 */
export async function generateParentInvitation(
  params: GenerateParentInvitationParams
): Promise<GenerateParentInvitationResult> {
  try {
    console.log('Generating parent invitation:', params);

    // Get current session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return {
        success: false,
        error: 'Not authenticated'
      };
    }

    // Call Edge Function
    const { data, error } = await supabase.functions.invoke('generate-parent-invitation', {
      body: params,
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (error) {
      console.error('Error calling generate-parent-invitation:', error);
      return {
        success: false,
        error: error.message || 'Failed to generate invitation'
      };
    }

    console.log('Parent invitation generated:', data);
    return data as GenerateParentInvitationResult;
  } catch (error) {
    console.error('Exception generating parent invitation:', error);
    return {
      success: false,
      error: 'An error occurred while generating the invitation'
    };
  }
}
