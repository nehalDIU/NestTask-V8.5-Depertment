// Supabase fallback script
// This ensures the Supabase environment variables are always available
// even if the Vercel environment variables are not properly injected

(function() {
  // Only run this script if the environment variables are missing
  if (!window.ENV_SUPABASE_URL || !window.ENV_SUPABASE_ANON_KEY) {
    console.log('[Supabase Fallback] Initializing fallback variables');
    
    // Set fallback values
    window.ENV_SUPABASE_URL = "https://hsmuxnsfzkffzmhbmtts.supabase.co";
    window.ENV_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhzbXV4bnNmemtmZnptaGJtdHRzIiwicm9sZSI6ImFub24iLCJpYVQiOjE3NDg3MDE0ODMsImV4cCI6MjA2NDI3NzQ4M30.0y17sSd6pDwJzj4VXqJiclAQeI3V_dtFihbtF-jlcTI";
    
    console.log('[Supabase Fallback] Fallback values set');
  } else {
    console.log('[Supabase Fallback] Environment variables already set, no fallback needed');
  }
})(); 