
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { User, AuthSession, UserRole } from '@/types/user';
import { supabase } from '@/app/integrations/supabase/client';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  hasPermission: (requiredRoles: UserRole[]) => boolean;
  updateUser: (user: User) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SESSION_KEY = 'campsync_session';

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const saveSession = useCallback(async (session: AuthSession) => {
    try {
      await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session));
    } catch (error) {
      console.error('Failed to save session:', error);
    }
  }, []);

  const loadSession = useCallback(async () => {
    try {
      console.log('Loading session...');
      const sessionData = await SecureStore.getItemAsync(SESSION_KEY);
      if (sessionData) {
        const session: AuthSession = JSON.parse(sessionData);
        console.log('Session loaded:', session.user.email);
        setUser(session.user);
      } else {
        console.log('No session found');
      }
    } catch (error) {
      console.error('Failed to load session:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  const redirectAfterLogin = useCallback((authenticatedUser: User) => {
    console.log('Redirecting after login, role:', authenticatedUser.role);
    
    // Use setTimeout to ensure navigation happens after state updates
    setTimeout(() => {
      if (!authenticatedUser.registrationComplete) {
        console.log('Redirecting to complete-registration');
        router.replace('/complete-registration');
      } else if (authenticatedUser.role === 'parent') {
        console.log('Redirecting to parent-dashboard');
        router.replace('/parent-dashboard');
      } else {
        console.log('Redirecting to home tabs');
        router.replace('/(tabs)/(home)/');
      }
    }, 100);
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      console.log('Signing in...');
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('No user data returned');

      console.log('Auth successful, fetching profile...');

      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      if (profileError) throw profileError;

      console.log('Profile fetched:', profile);

      const authenticatedUser: User = {
        id: authData.user.id,
        email: authData.user.email!,
        fullName: profile.full_name || '',
        full_name: profile.full_name || '', // Add alias for compatibility
        phone: profile.phone || '',
        role: profile.role as UserRole,
        registrationComplete: profile.registration_complete || false,
      };

      const session: AuthSession = {
        user: authenticatedUser,
        accessToken: authData.session.access_token,
        refreshToken: authData.session.refresh_token,
      };

      console.log('Saving session...');
      await saveSession(session);
      
      console.log('Setting user state...');
      setUser(authenticatedUser);

      console.log('Sign in complete, redirecting...');
      redirectAfterLogin(authenticatedUser);
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  }, [saveSession, redirectAfterLogin]);

  const signOut = useCallback(async () => {
    try {
      console.log('Signing out...');
      await supabase.auth.signOut();
      await SecureStore.deleteItemAsync(SESSION_KEY);
      setUser(null);
      
      // Use setTimeout to ensure state updates before navigation
      setTimeout(() => {
        router.replace('/sign-in');
      }, 100);
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  }, []);

  const updateUser = useCallback(async (updatedUser: User) => {
    try {
      const sessionData = await SecureStore.getItemAsync(SESSION_KEY);
      if (sessionData) {
        const session: AuthSession = JSON.parse(sessionData);
        session.user = updatedUser;
        await saveSession(session);
        setUser(updatedUser);
      }
    } catch (error) {
      console.error('Failed to update user:', error);
      throw error;
    }
  }, [saveSession]);

  const hasPermission = useCallback((requiredRoles: UserRole[]): boolean => {
    if (!user) return false;
    return requiredRoles.includes(user.role);
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        signIn,
        signOut,
        hasPermission,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
