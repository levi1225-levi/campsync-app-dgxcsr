import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Database } from './types';
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = "https://thdnerywgfynarduqube.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRoZG5lcnl3Z2Z5bmFyZHVxdWJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwNDMzMzIsImV4cCI6MjA4MjYxOTMzMn0.ByYqRYJuil6AgqGTeqnRAEHf66ufG0orqXkrY2Tefa8";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})
