
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthSession, UserRole } from '@/types/user';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  hasPermission: (requiredRoles: UserRole[]) => boolean;
  updateUser: (user: User) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SESSION_KEY = 'campsync_session';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load session on mount
  useEffect(() => {
    loadSession();
  }, []);

  const loadSession = async () => {
    try {
      const sessionData = await SecureStore.getItemAsync(SESSION_KEY);
      if (sessionData) {
        const session: AuthSession = JSON.parse(sessionData);
        
        // Check if session is expired
        if (new Date(session.expiresAt) > new Date()) {
          setUser(session.user);
          console.log('Session loaded:', session.user.email, session.user.role);
        } else {
          console.log('Session expired, clearing...');
          await SecureStore.deleteItemAsync(SESSION_KEY);
        }
      }
    } catch (error) {
      console.error('Error loading session:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveSession = async (session: AuthSession) => {
    try {
      await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session));
      console.log('Session saved for:', session.user.email);
    } catch (error) {
      console.error('Error saving session:', error);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      console.log('Signing in with email:', email);
      
      // Mock authentication - In production, this would call your backend API
      // For demo purposes, we'll create mock users based on email
      const mockUser = createMockUser(email);
      
      const session: AuthSession = {
        user: mockUser,
        token: `mock_token_${Date.now()}`,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      };

      await saveSession(session);
      setUser(mockUser);

      // Role-based redirection
      redirectAfterLogin(mockUser);
    } catch (error) {
      console.error('Sign in error:', error);
      throw new Error('Failed to sign in. Please check your credentials.');
    }
  };

  const signInWithGoogle = async () => {
    try {
      console.log('Signing in with Google...');
      
      // Mock Google sign-in - In production, use @react-native-google-signin/google-signin
      // For demo, we'll create a mock user
      const mockUser = createMockUser('google.user@example.com');
      
      const session: AuthSession = {
        user: mockUser,
        token: `google_token_${Date.now()}`,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      };

      await saveSession(session);
      setUser(mockUser);

      redirectAfterLogin(mockUser);
    } catch (error) {
      console.error('Google sign in error:', error);
      throw new Error('Failed to sign in with Google.');
    }
  };

  const signOut = async () => {
    try {
      console.log('Signing out...');
      await SecureStore.deleteItemAsync(SESSION_KEY);
      setUser(null);
      router.replace('/sign-in');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const updateUser = async (updatedUser: User) => {
    try {
      const sessionData = await SecureStore.getItemAsync(SESSION_KEY);
      if (sessionData) {
        const session: AuthSession = JSON.parse(sessionData);
        session.user = updatedUser;
        await saveSession(session);
        setUser(updatedUser);
        console.log('User updated:', updatedUser.email);
      }
    } catch (error) {
      console.error('Error updating user:', error);
    }
  };

  const hasPermission = (requiredRoles: UserRole[]): boolean => {
    if (!user) return false;
    return requiredRoles.includes(user.role);
  };

  const redirectAfterLogin = (user: User) => {
    console.log('Redirecting user with role:', user.role);
    
    switch (user.role) {
      case 'parent':
        if (!user.registrationComplete) {
          router.replace('/parent-registration');
        } else {
          router.replace('/parent-dashboard');
        }
        break;
      case 'super-admin':
      case 'camp-admin':
      case 'staff':
        router.replace('/(tabs)/(home)/');
        break;
      default:
        router.replace('/(tabs)/(home)/');
    }
  };

  // Helper function to create mock users for demo
  const createMockUser = (email: string): User => {
    // Determine role based on email for demo purposes
    let role: UserRole = 'staff';
    let registrationComplete = true;
    
    if (email.includes('superadmin') || email.includes('super')) {
      role = 'super-admin';
    } else if (email.includes('admin')) {
      role = 'camp-admin';
    } else if (email.includes('parent')) {
      role = 'parent';
      registrationComplete = !email.includes('new');
    } else if (email.includes('staff')) {
      role = 'staff';
    }

    return {
      id: `user_${Date.now()}`,
      email,
      name: email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      role,
      campId: role !== 'super-admin' && role !== 'parent' ? 'camp_001' : undefined,
      campIds: role === 'super-admin' ? ['camp_001', 'camp_002'] : undefined,
      childrenIds: role === 'parent' ? ['camper_001', 'camper_002'] : undefined,
      registrationComplete,
    };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        signIn,
        signInWithGoogle,
        signOut,
        hasPermission,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
