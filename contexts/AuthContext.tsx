
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
  signOut: () => Promise<void>;
  hasPermission: (requiredRoles: UserRole[]) => boolean;
  updateUser: (user: User) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SESSION_KEY = 'campsync_session';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSession();
  }, []);

  const loadSession = async () => {
    try {
      console.log('Loading session from secure storage...');
      
      // First check Supabase session
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Error getting Supabase session:', error);
      }
      
      if (session?.user) {
        console.log('Found active Supabase session');
        await loadUserProfile(session.user.id);
      } else {
        // Fallback to local storage
        const sessionData = await SecureStore.getItemAsync(SESSION_KEY);
        if (sessionData) {
          const localSession: AuthSession = JSON.parse(sessionData);
          
          // Check if session is expired
          if (new Date(localSession.expiresAt) > new Date()) {
            setUser(localSession.user);
            console.log('Session loaded from local storage:', localSession.user.email, localSession.user.role);
          } else {
            console.log('Local session expired, clearing...');
            await SecureStore.deleteItemAsync(SESSION_KEY);
          }
        } else {
          console.log('No session found');
        }
      }
    } catch (error) {
      console.error('Error loading session:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadUserProfile = async (userId: string) => {
    try {
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error loading user profile:', error);
        return;
      }

      if (profile) {
        const user: User = {
          id: profile.id,
          email: profile.email,
          name: profile.full_name,
          role: profile.role as UserRole,
          registrationComplete: profile.registration_complete,
        };
        setUser(user);
        console.log('User profile loaded:', user.email, user.role);
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
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
        email: email.toLowerCase().trim(),
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

      console.log('User authenticated with ID:', data.user.id);
      console.log('Fetching user profile...');

      // Get user profile with retry logic
      let profile = null;
      let profileError = null;
      
      for (let attempt = 1; attempt <= 3; attempt++) {
        console.log(`Profile fetch attempt ${attempt}/3...`);
        
        const { data: profileData, error: fetchError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();

        if (!fetchError && profileData) {
          profile = profileData;
          console.log('Profile found:', profile);
          break;
        }
        
        profileError = fetchError;
        console.log(`Attempt ${attempt} failed:`, fetchError?.message);
        
        // Wait before retry (except on last attempt)
        if (attempt < 3) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      if (profileError) {
        console.error('Error fetching user profile after retries:', profileError);
        
        // Check if profile doesn't exist
        if (profileError.code === 'PGRST116') {
          throw new Error('No user profile found. Your account was created but the profile setup failed. Please contact support with your email address.');
        }
        
        throw new Error('Failed to fetch user profile. Please contact support.');
      }

      if (!profile) {
        console.error('No profile found for user after retries');
        throw new Error('No user profile found. Your account was created but the profile setup failed. Please contact support with your email address.');
      }

      const authenticatedUser: User = {
        id: data.user.id,
        email: data.user.email!,
        name: profile.full_name,
        role: profile.role as UserRole,
        registrationComplete: profile.registration_complete,
      };

      console.log('User profile loaded:', {
        id: authenticatedUser.id,
        email: authenticatedUser.email,
        role: authenticatedUser.role,
        registrationComplete: authenticatedUser.registrationComplete
      });

      const session: AuthSession = {
        user: authenticatedUser,
        token: data.session.access_token,
        expiresAt: new Date(data.session.expires_at!),
      };

      await saveSession(session);
      
      // Update state first
      setUser(authenticatedUser);

      console.log('Sign in successful, state updated');
      
      // Small delay to ensure state is updated before navigation
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Navigate after state update
      redirectAfterLogin(authenticatedUser);
    } catch (error) {
      console.error('Sign in error:', error);
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
      
      // Use setTimeout to ensure state is cleared before navigation
      setTimeout(() => {
        router.replace('/sign-in');
      }, 100);
    } catch (error) {
      console.error('Sign out error:', error);
      // Still try to navigate even if there's an error
      setTimeout(() => {
        router.replace('/sign-in');
      }, 100);
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

  const redirectAfterLogin = (authenticatedUser: User) => {
    console.log('=== Redirecting After Login ===');
    console.log('User role:', authenticatedUser.role);
    console.log('Registration complete:', authenticatedUser.registrationComplete);
    
    try {
      switch (authenticatedUser.role) {
        case 'parent':
          if (!authenticatedUser.registrationComplete) {
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
      console.log('Navigation command executed successfully');
    } catch (error) {
      console.error('Error during navigation:', error);
    }
  };

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

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
