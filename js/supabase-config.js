// Supabase Configuration
// Replace these with your actual Supabase project credentials
const SUPABASE_URL = 'https://qsbacrjvarbkbkgialdj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFzYmFjcmp2YXJia2JrZ2lhbGRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyODA0NDIsImV4cCI6MjA4Mzg1NjQ0Mn0.fbJOmaMFketxDoHXypFiaC7IZcJgrWGN_V8mrC1YgxA';

// Wait for Supabase to load, then initialize client
if (typeof window.supabase !== 'undefined') {
  const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  window.supabaseClient = supabase;
} else {
  console.error('Supabase library not loaded');
}

