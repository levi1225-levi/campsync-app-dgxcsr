
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthSession, UserRole } from '@/types/user';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';
import { supabase } from '@/app/integrations/supabase/client';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signUpWithGoogle: (authCode: string) => Promise<void>;
  signOut: () => Promise<void>;
  hasPermission: (requiredRoles: UserRole[]) => boolean;
  updateUser: (user: User) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SESSION_KEY = 'campsync_session';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Configure Google Sign-In on mount
  useEffect(() => {
    configureGoogleSignIn();
    loadSession();
  }, []);

  const configureGoogleSignIn = () => {
    try {
      GoogleSignin.configure({
        webClientId: 'YOUR_WEB_CLIENT_ID_HERE', // User needs to provide this
        offlineAccess: true,
      });
      console.log('Google Sign-In configured successfully');
    } catch (error) {
      console.error('Error configuring Google Sign-In:', error);
    }
  };

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
      
      // Check if Google Play Services are available
      await GoogleSignin.hasPlayServices();
      
      // Sign in with Google
      const userInfo = await GoogleSignin.signIn();
      console.log('Google sign-in successful, user info:', userInfo.data?.user?.email);
      
      if (!userInfo.data?.idToken) {
        throw new Error('No ID token received from Google');
      }

      // Sign in with Supabase using the ID token
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: userInfo.data.idToken,
      });

      if (error) {
        console.error('Supabase Google sign in error:', error);
        throw new Error(error.message);
      }

      if (!data.user) {
        throw new Error('No user returned from Supabase');
      }

      console.log('Google sign in successful, loading profile...');
      await loadUserProfile(data.user.id);
      
      if (user) {
        redirectAfterLogin(user);
      }
    } catch (error: any) {
      console.error('Google sign in error:', error);
      
      // Handle specific Google Sign-In errors
      if (error.code === 'SIGN_IN_CANCELLED') {
        throw new Error('Sign in was cancelled');
      } else if (error.code === 'IN_PROGRESS') {
        throw new Error('Sign in is already in progress');
      } else if (error.code === 'PLAY_SERVICES_NOT_AVAILABLE') {
        throw new Error('Google Play Services not available');
      }
      
      throw error;
    }
  };

  const signUpWithGoogle = async (authCode: string) => {
    try {
      console.log('=== Google Sign Up Process Started ===');
      console.log('Authorization code:', authCode);
      
      // Check if Google Play Services are available
      await GoogleSignin.hasPlayServices();
      
      // Sign in with Google
      const userInfo = await GoogleSignin.signIn();
      console.log('Google sign-in successful, user info:', userInfo.data?.user?.email);
      
      if (!userInfo.data?.idToken) {
        throw new Error('No ID token received from Google');
      }

      // Sign in with Supabase using the ID token
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: userInfo.data.idToken,
      });

      if (error) {
        console.error('Supabase Google sign up error:', error);
        throw new Error(error.message);
      }

      if (!data.user) {
        throw new Error('No user returned from Supabase');
      }

      console.log('Google authentication successful, creating profile with authorization code...');

      // Check if profile already exists
      const { data: existingProfile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (existingProfile) {
        console.log('Profile already exists, signing in...');
        await loadUserProfile(data.user.id);
        if (user) {
          redirectAfterLogin(user);
        }
        return;
      }

      // Validate authorization code
      const { data: codeValidation, error: codeError } = await supabase.rpc('validate_authorization_code', {
        p_code: authCode.trim().toUpperCase()
      });

      if (codeError || !codeValidation?.valid) {
        throw new Error(codeValidation?.error || 'Invalid authorization code');
      }

      console.log('Authorization code validated, role:', codeValidation.role);

      // Create user profile
      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert({
          id: data.user.id,
          email: data.user.email!,
          full_name: data.user.user_metadata?.full_name || data.user.user_metadata?.name || data.user.email!.split('@')[0],
          role: codeValidation.role,
          registration_complete: codeValidation.role !== 'parent',
        });

      if (profileError) {
        console.error('Error creating user profile:', profileError);
        throw new Error('Failed to create user profile: ' + profileError.message);
      }

      console.log('User profile created successfully');

      // Increment code usage
      if (codeValidation.code_id) {
        await supabase.rpc('increment_code_usage', {
          p_code_id: codeValidation.code_id
        });
      }

      // Load the new profile and redirect
      await loadUserProfile(data.user.id);
      if (user) {
        redirectAfterLogin(user);
      }
    } catch (error: any) {
      console.error('Google sign up error:', error);
      
      // Handle specific Google Sign-In errors
      if (error.code === 'SIGN_IN_CANCELLED') {
        throw new Error('Sign in was cancelled');
      } else if (error.code === 'IN_PROGRESS') {
        throw new Error('Sign in is already in progress');
      } else if (error.code === 'PLAY_SERVICES_NOT_AVAILABLE') {
        throw new Error('Google Play Services not available');
      }
      
      throw error;
    }
  };

  const signOut = async () => {
    try {
      console.log('=== Sign Out Process Started ===');
      
      // Sign out from Google if signed in
      try {
        const isSignedIn = await GoogleSignin.isSignedIn();
        if (isSignedIn) {
          await GoogleSignin.signOut();
          console.log('Signed out from Google');
        }
      } catch (error) {
        console.error('Error signing out from Google:', error);
      }
      
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
        signUpWithGoogle,
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
