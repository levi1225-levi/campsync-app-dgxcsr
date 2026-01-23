
import { supabase } from '@/app/integrations/supabase/client';
import { AuthorizationCode, CreateAuthorizationCodeParams } from '@/types/authorizationCode';

export async function listAuthorizationCodes(): Promise<AuthorizationCode[]> {
  console.log('Fetching authorization codes using RPC function...');
  
  const { data, error } = await supabase.rpc('get_all_authorization_codes');

  if (error) {
    console.error('Error fetching authorization codes:', error);
    throw error;
  }
  
  console.log('Authorization codes fetched:', data?.length || 0);
  return data || [];
}

export async function createAuthorizationCode(
  params: CreateAuthorizationCodeParams
): Promise<AuthorizationCode | null> {
  const code = generateCode();
  
  console.log('Creating authorization code:', code);
  
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

  console.log('Authorization code created successfully');
  return data;
}

export async function deactivateAuthorizationCode(codeId: string): Promise<boolean> {
  console.log('Deactivating authorization code:', codeId);
  
  const { error } = await supabase
    .from('authorization_codes')
    .update({ is_active: false })
    .eq('id', codeId);

  if (error) {
    console.error('Error deactivating code:', error);
    return false;
  }

  console.log('Authorization code deactivated successfully');
  return true;
}

export async function validateAuthorizationCode(code: string): Promise<any> {
  console.log('Validating authorization code:', code);
  
  const { data, error } = await supabase.rpc('validate_authorization_code', { p_code: code });

  if (error) {
    console.error('Error validating code:', error);
    return null;
  }

  console.log('Authorization code validation result:', data);
  return data;
}

export async function incrementCodeUsage(codeId: string): Promise<boolean> {
  console.log('Incrementing code usage for:', codeId);
  
  const { error } = await supabase.rpc('increment_code_usage', { p_code_id: codeId });

  if (error) {
    console.error('Error incrementing code usage:', error);
    return false;
  }

  console.log('Code usage incremented successfully');
  return true;
}

export async function findCampersByParentEmail(email: string): Promise<string[]> {
  console.log('Finding campers for parent email:', email);
  
  const { data: parentData, error: parentError } = await supabase
    .from('parent_guardians')
    .select('id')
    .eq('email', email)
    .single();

  if (parentError) {
    console.error('Error finding parent:', parentError);
    return [];
  }

  const { data, error } = await supabase
    .from('parent_camper_links')
    .select('camper_id')
    .eq('parent_id', parentData.id);

  if (error) {
    console.error('Error finding campers:', error);
    return [];
  }

  console.log('Found campers:', data?.length || 0);
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
