import { createClient } from '@supabase/supabase-js';

/**
 * Supabase client initialization.
 * Variables must be prefixed with VITE_ and added to Vercel/Local environment.
 */
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Fail-safe placeholders for initialization, but log warnings for debugging
if (!supabaseUrl || !supabaseAnonKey) {
    console.warn(
        'VibeOn: Supabase environment variables are missing.\n' +
        'Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your environment.'
    );
}

export const supabase = createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder'
);
