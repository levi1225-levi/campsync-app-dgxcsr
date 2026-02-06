
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Database } from './types';
import { createClient } from '@supabase/supabase-js'
import { Platform } from 'react-native';

const SUPABASE_URL = "https://thdnerywgfynarduqube.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRoZG5lcnl3Z2Z5bmFyZHVxdWJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwNDMzMzIsImV4cCI6MjA4MjYxOTMzMn0.ByYqRYJuil6AgqGTeqnRAEHf66ufG0orqXkrY2Tefa8";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

// Custom storage adapter that works across all platforms
const customStorage = {
  getItem: async (key: string) => {
    try {
      console.log('[Storage] Getting item:', key);
      const value = await AsyncStorage.getItem(key);
      console.log('[Storage] Retrieved value:', value ? 'exists' : 'null');
      return value;
    } catch (error) {
      console.error('[Storage] Error getting item:', error);
      return null;
    }
  },
  setItem: async (key: string, value: string) => {
    try {
      console.log('[Storage] Setting item:', key);
      await AsyncStorage.setItem(key, value);
      console.log('[Storage] Item set successfully');
    } catch (error) {
      console.error('[Storage] Error setting item:', error);
    }
  },
  removeItem: async (key: string) => {
    try {
      console.log('[Storage] Removing item:', key);
      await AsyncStorage.removeItem(key);
      console.log('[Storage] Item removed successfully');
    } catch (error) {
      console.error('[Storage] Error removing item:', error);
    }
  },
};

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: customStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
    flowType: 'pkce',
  },
})

// Session management utilities
export const sessionManager = {
  // Get current session
  async getSession() {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.error('Error getting session:', error);
        return null;
      }
      return data.session;
    } catch (error) {
      console.error('Failed to get session:', error);
      return null;
    }
  },

  // Refresh session manually
  async refreshSession() {
    try {
      console.log('Manually refreshing session...');
      const { data, error } = await supabase.auth.refreshSession();
      if (error) {
        console.error('Error refreshing session:', error);
        return null;
      }
      console.log('Session refreshed successfully');
      return data.session;
    } catch (error) {
      console.error('Failed to refresh session:', error);
      return null;
    }
  },

  // Check if session is valid
  async isSessionValid() {
    const session = await this.getSession();
    if (!session) return false;

    // Check if token is expired
    const expiresAt = session.expires_at;
    if (!expiresAt) return false;

    const now = Math.floor(Date.now() / 1000);
    const isValid = now < expiresAt;
    
    if (!isValid) {
      console.log('Session expired, attempting refresh...');
      const refreshedSession = await this.refreshSession();
      return !!refreshedSession;
    }

    return true;
  },

  // Get time until session expires (in seconds)
  async getTimeUntilExpiry() {
    const session = await this.getSession();
    if (!session || !session.expires_at) return 0;

    const now = Math.floor(Date.now() / 1000);
    const timeRemaining = session.expires_at - now;
    return Math.max(0, timeRemaining);
  },

  // Clear session
  async clearSession() {
    try {
      await supabase.auth.signOut();
      console.log('Session cleared successfully');
    } catch (error) {
      console.error('Failed to clear session:', error);
    }
  }
};
