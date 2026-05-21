import { createClient } from '@supabase/supabase-js';

// Provide dummy fallbacks so the app doesn't crash if .env is missing.
// It will simply fail the API calls later.
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'placeholder-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

