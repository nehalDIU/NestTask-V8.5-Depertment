// Vercel environment variables backup script
// This ensures Supabase environment variables are always available

(function() {
  // Define Supabase environment variables if not already set
  window.ENV_SUPABASE_URL = window.ENV_SUPABASE_URL || "https://hsmuxnsfzkffzmhbmtts.supabase.co";
  window.ENV_SUPABASE_ANON_KEY = window.ENV_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhzbXV4bnNmemtmZnptaGJtdHRzIiwicm9sZSI6ImFub24iLCJpYVQiOjE3NDg3MDE0ODMsImV4cCI6MjA2NDI3NzQ4M30.0y17sSd6pDwJzj4VXqJiclAQeI3V_dtFihbtF-jlcTI";
  
  console.log('Vercel environment variables loaded');
}()); 