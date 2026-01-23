
// Authorization code service
import { supabase } from '@/app/integrations/supabase/client';
import { AuthorizationCode, CreateAuthorizationCodeParams } from '@/types/authorizationCode';

export async function listAuthorizationCodes(): Promise<AuthorizationCode[]> {
  const { data, error } = await supabase
    .from('authorization_codes')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createAuthorizationCode(
  params: CreateAuthorizationCodeParams
): Promise<AuthorizationCode | null> {
  const code = generateCode();
  
  const { data, error } = await supabase
    .from('authorization_codes')
    .insert({
      code,
      role: params.role,
      max_uses: params.max_uses || null,
      expires_at: params.expires_at?.toISOString() || null,
      linked_camper_ids: params.linked_camper_ids || null,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating authorization code:', error);
    throw error;
  }

  return data;
}

export async function deactivateAuthorizationCode(codeId: string): Promise<boolean> {
  const { error } = await supabase
    .from('authorization_codes')
    .update({ is_active: false })
    .eq('id', codeId);

  if (error) {
    console.error('Error deactivating code:', error);
    return false;
  }

  return true;
}

export async function validateAuthorizationCode(code: string): Promise<AuthorizationCode | null> {
  const { data, error } = await supabase
    .from('authorization_codes')
    .select('*')
    .eq('code', code)
    .eq('is_active', true)
    .single();

  if (error) {
    console.error('Error validating code:', error);
    return null;
  }

  // Check if expired
  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return null;
  }

  // Check if max uses reached
  if (data.max_uses && data.used_count >= data.max_uses) {
    return null;
  }

  return data;
}

export async function incrementCodeUsage(code: string): Promise<boolean> {
  const { error } = await supabase.rpc('increment_code_usage', { code_value: code });

  if (error) {
    console.error('Error incrementing code usage:', error);
    return false;
  }

  return true;
}

export async function findCampersByParentEmail(email: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('parent_camper_links')
    .select('camper_id')
    .eq('parent_email', email);

  if (error) {
    console.error('Error finding campers:', error);
    return [];
  }

  return data.map((link) => link.camper_id);
}

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
