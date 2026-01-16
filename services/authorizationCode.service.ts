
import { supabase } from '@/app/integrations/supabase/client';
import { AuthorizationCode, AuthorizationCodeRole } from '@/types/authorizationCode';

/**
 * List all authorization codes
 */
export async function listAuthorizationCodes(): Promise<AuthorizationCode[]> {
  console.log('Fetching all authorization codes using RPC...');
  
  try {
    // Try using RPC function first (bypasses RLS)
    const { data: rpcData, error: rpcError } = await supabase
      .rpc('get_all_authorization_codes');

    if (!rpcError && rpcData) {
      console.log('Successfully fetched authorization codes via RPC:', rpcData.length);
      return rpcData;
    }

    console.log('RPC failed, falling back to direct query:', rpcError);

    // Fallback to direct query
    const { data, error } = await supabase
      .from('authorization_codes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching authorization codes:', error);
      throw error;
    }

    console.log('Successfully fetched authorization codes via direct query:', data?.length || 0);
    return data || [];
  } catch (error) {
    console.error('Error in listAuthorizationCodes:', error);
    return [];
  }
}

/**
 * Create a new authorization code
 */
export async function createAuthorizationCode(params: {
  role: AuthorizationCodeRole;
  max_uses?: number;
  expires_at?: Date;
  linked_camper_ids?: string[];
}): Promise<AuthorizationCode | null> {
  console.log('Creating authorization code with params:', params);

  try {
    // Generate a unique code
    const code = generateAuthorizationCode(params.role);
    console.log('Generated code:', code);

    const insertData: any = {
      code,
      role: params.role,
      is_active: true,
      used_count: 0,
      linked_camper_ids: params.linked_camper_ids || [],
    };

    if (params.max_uses) {
      insertData.max_uses = params.max_uses;
    }

    if (params.expires_at) {
      insertData.expires_at = params.expires_at.toISOString();
    }

    console.log('Inserting authorization code:', insertData);

    const { data, error } = await supabase
      .from('authorization_codes')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('Error creating authorization code:', error);
      throw error;
    }

    console.log('Authorization code created successfully:', data);
    return data;
  } catch (error) {
    console.error('Error in createAuthorizationCode:', error);
    return null;
  }
}

/**
 * Validate an authorization code
 */
export async function validateAuthorizationCode(
  code: string
): Promise<{ valid: boolean; code?: AuthorizationCode; error?: string }> {
  console.log('Validating authorization code:', code);

  try {
    const { data, error } = await supabase
      .from('authorization_codes')
      .select('*')
      .eq('code', code)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      console.error('Error validating code:', error);
      return { valid: false, error: 'Failed to validate code' };
    }

    if (!data) {
      console.log('Code not found or inactive');
      return { valid: false, error: 'Invalid or inactive code' };
    }

    // Check if code has expired
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      console.log('Code has expired');
      return { valid: false, error: 'Code has expired' };
    }

    // Check if code has reached max uses
    if (data.max_uses && data.used_count >= data.max_uses) {
      console.log('Code has reached maximum uses');
      return { valid: false, error: 'Code has reached maximum uses' };
    }

    console.log('Code is valid:', data);
    return { valid: true, code: data };
  } catch (error) {
    console.error('Error in validateAuthorizationCode:', error);
    return { valid: false, error: 'An error occurred while validating the code' };
  }
}

/**
 * Increment the usage count of an authorization code
 */
export async function incrementCodeUsage(codeId: string): Promise<boolean> {
  console.log('Incrementing usage count for code:', codeId);

  try {
    const { error } = await supabase.rpc('increment_code_usage', {
      code_id: codeId,
    });

    if (error) {
      console.error('Error incrementing code usage:', error);
      return false;
    }

    console.log('Code usage incremented successfully');
    return true;
  } catch (error) {
    console.error('Error in incrementCodeUsage:', error);
    return false;
  }
}

/**
 * Deactivate an authorization code
 */
export async function deactivateAuthorizationCode(codeId: string): Promise<boolean> {
  console.log('Deactivating authorization code:', codeId);

  try {
    const { error } = await supabase
      .from('authorization_codes')
      .update({ is_active: false })
      .eq('id', codeId);

    if (error) {
      console.error('Error deactivating code:', error);
      return false;
    }

    console.log('Code deactivated successfully');
    return true;
  } catch (error) {
    console.error('Error in deactivateAuthorizationCode:', error);
    return false;
  }
}

/**
 * Find campers linked to a parent's email via authorization codes
 */
export async function findCampersByParentEmail(email: string): Promise<string[]> {
  console.log('Finding campers for parent email:', email);

  try {
    // Find all codes used by this email
    const { data: codes, error } = await supabase
      .from('authorization_codes')
      .select('linked_camper_ids')
      .eq('role', 'parent');

    if (error) {
      console.error('Error finding codes:', error);
      return [];
    }

    // Collect all unique camper IDs
    const camperIds = new Set<string>();
    codes?.forEach((code) => {
      if (code.linked_camper_ids) {
        code.linked_camper_ids.forEach((id: string) => camperIds.add(id));
      }
    });

    console.log('Found camper IDs:', Array.from(camperIds));
    return Array.from(camperIds);
  } catch (error) {
    console.error('Error in findCampersByParentEmail:', error);
    return [];
  }
}

/**
 * Generate a unique authorization code
 */
function generateAuthorizationCode(role: AuthorizationCodeRole): string {
  const prefix = role.toUpperCase().replace('-', '_');
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}_${timestamp}_${random}`;
}
