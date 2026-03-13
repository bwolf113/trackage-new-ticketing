import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SUPABASE_URL = 'https://bflmjuzmmuhytkxpdrbw.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmbG1qdXptbXVoeXRreHBkcmJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5ODUzMTQsImV4cCI6MjA4ODU2MTMxNH0.uWYY9CpC4b-OC3CDdIILJIH2RpkorIMMhmNlt25JzHU';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
