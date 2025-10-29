import { createClient } from '@supabase/supabase-js';

// IMPORTANT: Replace with your actual Supabase project URL and anon key.
// You can get these from your Supabase project's API settings.
const supabaseUrl = 'https://evbhlfwqpvofpcqiipgw.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2YmhsZndxcHZvZnBjcWlpcGd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3MzIxMzQsImV4cCI6MjA3NzMwODEzNH0.u9lE-EzvBXuEenT-9eXlhGj4g7ZDZWMbQ92u-YSDCzs';

let supabase: ReturnType<typeof createClient> | null = null;

// FIX: Removed checks for placeholder values as they are hardcoded and cause TS errors.
if (supabaseUrl && supabaseAnonKey) {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
} else {
    console.warn("Supabase credentials are not set. Please update services/supabaseClient.ts");
}

export { supabase };