
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthSession, UserRole } from '@/types/user';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';
import { supabase } from '@/app/integrations/supabase/client';

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
      console.log('Loading session from secure storage...');
      const sessionData = await SecureStore.getItemAsync(SESSION_KEY);
      if (sessionData) {
        const session: AuthSession = JSON.parse(sessionData);
        
        // Check if session is expired
        if (new Date(session.expiresAt) > new Date()) {
          setUser(session.user);
          console.log('Session loaded successfully:', session.user.email, session.user.role);
        } else {
          console.log('Session expired, clearing...');
          await SecureStore.deleteItemAsync(SESSION_KEY);
        }
      } else {
        console.log('No session found in storage');
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
      console.log('Session saved successfully for:', session.user.email);
    } catch (error) {
      console.error('Error saving session:', error);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      console.log('=== Sign In Process Started ===');
      console.log('Email:', email);
      
      // Sign in with Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      console.log('Supabase auth response:', {
        hasUser: !!data?.user,
        hasSession: !!data?.session,
        error: error?.message
      });

      if (error) {
        console.error('Supabase sign in error:', error);
        throw new Error(error.message);
      }

      if (!data.user || !data.session) {
        console.error('No user or session returned from Supabase');
        throw new Error('No user or session returned. Please try again.');
      }

      console.log('User authenticated, fetching profile...');

      // Get user profile
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      console.log('Profile fetch result:', {
        hasProfile: !!profile,
        error: profileError?.message
      });

      if (profileError) {
        console.error('Error fetching user profile:', profileError);
        throw new Error('Failed to fetch user profile. Please contact support.');
      }

      if (!profile) {
        console.error('No profile found for user');
        throw new Error('User profile not found. Please contact support.');
      }

      const user: User = {
        id: data.user.id,
        email: data.user.email!,
        name: profile.full_name,
        role: profile.role as UserRole,
        registrationComplete: profile.registration_complete,
      };

      console.log('User profile loaded:', {
        id: user.id,
        email: user.email,
        role: user.role,
        registrationComplete: user.registrationComplete
      });

      const session: AuthSession = {
        user,
        token: data.session.access_token,
        expiresAt: new Date(data.session.expires_at!),
      };

      await saveSession(session);
      setUser(user);

      console.log('Sign in successful, redirecting...');
      // Role-based redirection
      redirectAfterLogin(user);
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  };

  const signInWithGoogle = async () => {
    try {
      console.log('=== Google Sign In Process Started ===');
      
      // Sign in with Google via Supabase
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: 'https://natively.dev/auth/callback',
        },
      });

      if (error) {
        console.error('Google sign in error:', error);
        throw new Error(error.message);
      }

      // Note: The actual user session will be handled by the OAuth callback
      console.log('Google OAuth initiated successfully');
    } catch (error) {
      console.error('Google sign in error:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      console.log('=== Sign Out Process Started ===');
      
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Supabase sign out error:', error);
      }
      
      // Clear local session
      await SecureStore.deleteItemAsync(SESSION_KEY);
      setUser(null);
      
      console.log('Sign out successful, redirecting to sign-in...');
      router.replace('/sign-in');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const updateUser = async (updatedUser: User) => {
    try {
      console.log('Updating user:', updatedUser.email);
      const sessionData = await SecureStore.getItemAsync(SESSION_KEY);
      if (sessionData) {
        const session: AuthSession = JSON.parse(sessionData);
        session.user = updatedUser;
        await saveSession(session);
        setUser(updatedUser);
        console.log('User updated successfully');
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
          console.log('Parent registration incomplete, redirecting to parent-registration');
          router.replace('/parent-registration');
        } else {
          console.log('Parent registration complete, redirecting to parent-dashboard');
          router.replace('/parent-dashboard');
        }
        break;
      case 'super-admin':
      case 'camp-admin':
      case 'staff':
        console.log('Admin/Staff user, redirecting to home');
        router.replace('/(tabs)/(home)/');
        break;
      default:
        console.log('Unknown role, redirecting to home');
        router.replace('/(tabs)/(home)/');
    }
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
