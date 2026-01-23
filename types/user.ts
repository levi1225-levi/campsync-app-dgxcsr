
// User type definitions
export type UserRole = 'super-admin' | 'camp-admin' | 'staff' | 'parent';

export interface User {
  id: string;
  email: string;
  fullName: string;
  full_name: string;
  phone: string;
  role: UserRole;
  registrationComplete: boolean;
  childrenIds?: string[];
}

export interface AuthSession {
  user: User;
  accessToken: string;
  refreshToken: string;
}
