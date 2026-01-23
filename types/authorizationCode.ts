
// Authorization code type definitions
export type AuthorizationCodeRole = 'staff' | 'camp-admin';

export interface AuthorizationCode {
  id: string;
  code: string;
  role: AuthorizationCodeRole;
  is_active: boolean;
  max_uses: number | null;
  used_count: number;
  expires_at: string | null;
  linked_camper_ids: string[] | null;
  created_at: string;
  created_by: string;
}

export interface CreateAuthorizationCodeParams {
  role: AuthorizationCodeRole;
  max_uses?: number;
  expires_at?: Date;
  linked_camper_ids?: string[];
}
