
import { supabase } from '@/app/integrations/supabase/client';
import { 
  AuthorizationCode, 
  AuthorizationCodeValidationResult,
  CreateAuthorizationCodeParams,
  AuthorizationCodeRole
} from '@/types/authorizationCode';

/**
 * Validates an authorization code
 * Returns validation result with role and linked camper IDs if valid
 */
export async function validateAuthorizationCode(
  code: string
): Promise<AuthorizationCodeValidationResult> {
  try {
    console.log('Validating authorization code:', code);

    const { data, error } = await supabase.rpc('validate_authorization_code', {
      p_code: code
    });

    if (error) {
      console.error('Error validating authorization code:', error);
      return {
        valid: false,
        error: 'Failed to validate code'
      };
    }

    console.log('Validation result:', data);
    return data as AuthorizationCodeValidationResult;
  } catch (error) {
    console.error('Exception validating authorization code:', error);
    return {
      valid: false,
      error: 'An error occurred while validating the code'
    };
  }
}

/**
 * Increments the usage count of an authorization code atomically
 */
export async function incrementCodeUsage(codeId: string): Promise<void> {
  try {
    console.log('Incrementing code usage for:', codeId);

    const { error } = await supabase.rpc('increment_code_usage', {
      p_code_id: codeId
    });

    if (error) {
      console.error('Error incrementing code usage:', error);
      throw new Error('Failed to increment code usage');
    }

    console.log('Code usage incremented successfully');
  } catch (error) {
    console.error('Exception incrementing code usage:', error);
    throw error;
  }
}

/**
 * Creates a new authorization code
 * Only accessible to super-admin and camp-admin roles
 */
export async function createAuthorizationCode(
  params: CreateAuthorizationCodeParams
): Promise<AuthorizationCode | null> {
  try {
    console.log('Creating authorization code:', params);

    // Generate a unique code
    const code = generateUniqueCode(params.role);

    const { data, error } = await supabase
      .from('authorization_codes')
      .insert({
        code,
        role: params.role,
        is_active: true,
        expires_at: params.expires_at?.toISOString() || null,
        max_uses: params.max_uses || null,
        linked_camper_ids: params.linked_camper_ids || [],
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating authorization code:', error);
      return null;
    }

    console.log('Authorization code created:', data);
    return data as AuthorizationCode;
  } catch (error) {
    console.error('Exception creating authorization code:', error);
    return null;
  }
}

/**
 * Generates a unique authorization code based on role
 */
function generateUniqueCode(role: AuthorizationCodeRole): string {
  const prefix = role.toUpperCase().replace('-', '_');
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}_${timestamp}_${random}`;
}

/**
 * Lists all authorization codes (admin only)
 */
export async function listAuthorizationCodes(): Promise<AuthorizationCode[]> {
  try {
    const { data, error } = await supabase
      .from('authorization_codes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error listing authorization codes:', error);
      return [];
    }

    return data as AuthorizationCode[];
  } catch (error) {
    console.error('Exception listing authorization codes:', error);
    return [];
  }
}

/**
 * Deactivates an authorization code
 */
export async function deactivateAuthorizationCode(codeId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('authorization_codes')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', codeId);

    if (error) {
      console.error('Error deactivating authorization code:', error);
      return false;
    }

    console.log('Authorization code deactivated:', codeId);
    return true;
  } catch (error) {
    console.error('Exception deactivating authorization code:', error);
    return false;
  }
}

/**
 * Generates a parent invitation code for specific campers
 * Automatically expires in 30 days and is single-use
 */
export async function generateParentInvitationCode(
  camperIds: string[]
): Promise<AuthorizationCode | null> {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30); // 30 days from now

  return createAuthorizationCode({
    role: 'parent',
    expires_at: expiresAt,
    max_uses: 1,
    linked_camper_ids: camperIds,
  });
}

/**
 * Finds campers linked to a parent by email (emergency contacts)
 * Used for email-based auto-matching during parent registration
 */
export async function findCampersByParentEmail(email: string): Promise<string[]> {
  try {
    console.log('Finding campers by parent email:', email);

    const { data, error } = await supabase
      .from('emergency_contacts')
      .select('camper_id')
      .eq('email', email.toLowerCase());

    if (error) {
      console.error('Error finding campers by email:', error);
      return [];
    }

    const camperIds = data.map(contact => contact.camper_id);
    console.log('Found campers:', camperIds);
    return camperIds;
  } catch (error) {
    console.error('Exception finding campers by email:', error);
    return [];
  }
}
