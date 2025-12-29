
export type UserRole = 'super-admin' | 'camp-admin' | 'staff' | 'parent';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  campId?: string; // For camp-admin and staff
  campIds?: string[]; // For super-admin (can access multiple camps)
  childrenIds?: string[]; // For parents
  photoUrl?: string;
  registrationComplete?: boolean; // For parents
}

export interface AuthSession {
  user: User;
  token: string;
  expiresAt: Date;
}
