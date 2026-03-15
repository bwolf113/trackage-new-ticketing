import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SUPABASE_URL = 'https://tdqylvqcoxnyzqkesibj.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkcXlsdnFjb3hueXpxa2VzaWJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1NjIwMzksImV4cCI6MjA4OTEzODAzOX0.xGH0FcZWn8Uh2JrylWNcieZI7V9ExSCPrZJt9tNqT5g';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
