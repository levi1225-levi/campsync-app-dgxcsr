
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { User, AuthSession, UserRole } from '@/types/user';
import { supabase, sessionManager } from '@/app/integrations/supabase/client';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';
import { Platform, AppState, AppStateStatus } from 'react-native';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  hasPermission: (requiredRoles: UserRole[]) => boolean;
  updateUser: (user: User) => Promise<void>;
  refreshSession: () => Promise<void>;
  sessionExpiresAt: number | null;
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
  const [sessionExpiresAt, setSessionExpiresAt] = useState<number | null>(null);

  const saveSession = useCallback(async (session: AuthSession) => {
    try {
      await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session));
      console.log('Session saved successfully');
    } catch (error) {
      console.error('Failed to save session:', error);
    }
  }, []);

  const loadUserProfile = useCallback(async (userId: string, email: string) => {
    try {
      console.log('Fetching user profile for:', userId);
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError || !profile) {
        console.error('Profile error:', profileError);
        return null;
      }

      const authenticatedUser: User = {
        id: userId,
        email: email,
        fullName: profile.full_name || '',
        full_name: profile.full_name || '',
        phone: profile.phone || '',
        role: profile.role as UserRole,
        registrationComplete: profile.registration_complete || false,
      };

      return authenticatedUser;
    } catch (error) {
      console.error('Failed to load user profile:', error);
      return null;
    }
  }, []);

  const redirectAfterLogin = useCallback((authenticatedUser: User) => {
    console.log('Redirecting after login, role:', authenticatedUser.role);
    
    // Use a longer timeout for iOS to ensure state is fully updated
    const timeout = Platform.OS === 'ios' ? 300 : 100;
    
    setTimeout(() => {
      try {
        if (!authenticatedUser.registrationComplete) {
          console.log('Redirecting to parent-registration');
          router.replace('/parent-registration');
        } else if (authenticatedUser.role === 'parent') {
          console.log('Redirecting to parent-dashboard');
          router.replace('/parent-dashboard');
        } else {
          console.log('Redirecting to home tabs');
          router.replace('/(tabs)/(home)/');
        }
      } catch (error) {
        console.error('Navigation error:', error);
      }
    }, timeout);
  }, []);

  const handleAuthStateChange = useCallback(async (event: AuthChangeEvent, session: Session | null) => {
    console.log('Auth state changed:', event);

    if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
      if (session?.user) {
        console.log('Session active, loading user profile...');
        const userProfile = await loadUserProfile(session.user.id, session.user.email!);
        
        if (userProfile) {
          setUser(userProfile);
          setSessionExpiresAt(session.expires_at || null);

          // Save session to secure storage
          const authSession: AuthSession = {
            user: userProfile,
            accessToken: session.access_token,
            refreshToken: session.refresh_token,
          };
          await saveSession(authSession);

          if (event === 'SIGNED_IN') {
            redirectAfterLogin(userProfile);
          }
        } else {
          console.error('Failed to load user profile');
          setUser(null);
          setSessionExpiresAt(null);
        }
      }
    } else if (event === 'SIGNED_OUT') {
      console.log('User signed out');
      setUser(null);
      setSessionExpiresAt(null);
      await SecureStore.deleteItemAsync(SESSION_KEY);
    } else if (event === 'USER_UPDATED') {
      console.log('User updated');
      if (session?.user) {
        const userProfile = await loadUserProfile(session.user.id, session.user.email!);
        if (userProfile) {
          setUser(userProfile);
        }
      }
    }
  }, [loadUserProfile, saveSession, redirectAfterLogin]);

  // Initialize auth state and set up listener
  useEffect(() => {
    console.log('Initializing auth state...');

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        console.log('Initial session found');
        loadUserProfile(session.user.id, session.user.email!).then((userProfile) => {
          if (userProfile) {
            setUser(userProfile);
            setSessionExpiresAt(session.expires_at || null);
          }
          setIsLoading(false);
        });
      } else {
        console.log('No initial session found');
        setIsLoading(false);
      }
    });

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthStateChange);

    return () => {
      console.log('Cleaning up auth listener');
      subscription.unsubscribe();
    };
  }, [handleAuthStateChange, loadUserProfile]);

  const signOut = useCallback(async () => {
    try {
      console.log('Signing out...');
      await supabase.auth.signOut();
      await SecureStore.deleteItemAsync(SESSION_KEY);
      setUser(null);
      setSessionExpiresAt(null);
      
      // Use a longer timeout for iOS
      const timeout = Platform.OS === 'ios' ? 300 : 100;
      setTimeout(() => {
        try {
          router.replace('/sign-in');
        } catch (error) {
          console.error('Navigation error during sign out:', error);
        }
      }, timeout);
    } catch (error) {
      console.error('Sign out error:', error);
      // Always clear local state even if API call fails
      setUser(null);
      setSessionExpiresAt(null);
      await SecureStore.deleteItemAsync(SESSION_KEY);
      router.replace('/sign-in');
    }
  }, []);

  // Monitor app state and refresh session when app comes to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && user) {
        console.log('App became active, checking session validity...');
        const isValid = await sessionManager.isSessionValid();
        if (!isValid) {
          console.log('Session invalid, signing out...');
          await signOut();
        } else {
          console.log('Session is valid');
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, [user, signOut]);

  // Periodic session check (every 5 minutes)
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(async () => {
      console.log('Periodic session check...');
      const timeRemaining = await sessionManager.getTimeUntilExpiry();
      
      if (timeRemaining <= 0) {
        console.log('Session expired, signing out...');
        await signOut();
      } else if (timeRemaining < 300) {
        // Less than 5 minutes remaining, refresh proactively
        console.log('Session expiring soon, refreshing...');
        await sessionManager.refreshSession();
      } else {
        console.log(`Session valid, expires in ${Math.floor(timeRemaining / 60)} minutes`);
      }
    }, 5 * 60 * 1000); // Check every 5 minutes

    return () => clearInterval(interval);
  }, [user, signOut]);

  const redirectAfterLogin = useCallback((authenticatedUser: User) => {
    console.log('Redirecting after login, role:', authenticatedUser.role);
    
    // Use a longer timeout for iOS to ensure state is fully updated
    const timeout = Platform.OS === 'ios' ? 300 : 100;
    
    setTimeout(() => {
      try {
        if (!authenticatedUser.registrationComplete) {
          console.log('Redirecting to parent-registration');
          router.replace('/parent-registration');
        } else if (authenticatedUser.role === 'parent') {
          console.log('Redirecting to parent-dashboard');
          router.replace('/parent-dashboard');
        } else {
          console.log('Redirecting to home tabs');
          router.replace('/(tabs)/(home)/');
        }
      } catch (error) {
        console.error('Navigation error:', error);
      }
    }, timeout);
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      console.log('Signing in...');
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        console.error('Auth error:', authError);
        
        // Check for email confirmation error
        if (authError.message.includes('Email not confirmed') || 
            authError.message.includes('email_not_confirmed') ||
            authError.status === 400) {
          throw new Error('Email not confirmed. Please check your inbox for the verification link.');
        }
        
        throw authError;
      }
      
      if (!authData.user) {
        throw new Error('No user data returned');
      }

      console.log('Auth successful, user ID:', authData.user.id);
      console.log('Email confirmed:', authData.user.email_confirmed_at ? 'Yes' : 'No');

      // Check if email is confirmed
      if (!authData.user.email_confirmed_at) {
        console.error('Email not confirmed for user:', authData.user.email);
        throw new Error('Email not confirmed. Please check your inbox for the verification link.');
      }

      // The auth state change listener will handle the rest
      console.log('Sign in complete, waiting for auth state change...');
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      console.log('Signing out...');
      await supabase.auth.signOut();
      await SecureStore.deleteItemAsync(SESSION_KEY);
      setUser(null);
      setSessionExpiresAt(null);
      
      // Use a longer timeout for iOS
      const timeout = Platform.OS === 'ios' ? 300 : 100;
      setTimeout(() => {
        try {
          router.replace('/sign-in');
        } catch (error) {
          console.error('Navigation error during sign out:', error);
        }
      }, timeout);
    } catch (error) {
      console.error('Sign out error:', error);
      // Always clear local state even if API call fails
      setUser(null);
      setSessionExpiresAt(null);
      await SecureStore.deleteItemAsync(SESSION_KEY);
      router.replace('/sign-in');
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

  const refreshSession = useCallback(async () => {
    try {
      console.log('Manually refreshing session...');
      const session = await sessionManager.refreshSession();
      if (session) {
        setSessionExpiresAt(session.expires_at || null);
        console.log('Session refreshed successfully');
      } else {
        console.log('Failed to refresh session, signing out...');
        await signOut();
      }
    } catch (error) {
      console.error('Failed to refresh session:', error);
      await signOut();
    }
  }, [signOut]);

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
        refreshSession,
        sessionExpiresAt,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
