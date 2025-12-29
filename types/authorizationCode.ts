
export type AuthorizationCodeRole = 'super-admin' | 'camp-admin' | 'staff' | 'parent';

export interface AuthorizationCode {
  id: string;
  code: string;
  role: AuthorizationCodeRole;
  is_active: boolean;
  expires_at: Date | null;
  max_uses: number | null;
  used_count: number;
  linked_camper_ids: string[];
  created_by: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface AuthorizationCodeValidationResult {
  valid: boolean;
  error?: string;
  role?: AuthorizationCodeRole;
  linked_camper_ids?: string[];
  code_id?: string;
}

export interface CreateAuthorizationCodeParams {
  role: AuthorizationCodeRole;
  expires_at?: Date;
  max_uses?: number;
  linked_camper_ids?: string[];
}
