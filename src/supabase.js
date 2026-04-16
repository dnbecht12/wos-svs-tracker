import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL  = "https://ojoovofaiknswvcncmad.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qb292b2ZhaWtuc3d2Y25jbWFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2NTQyMjAsImV4cCI6MjA5MTIzMDIyMH0.Ul7gUnnK9qAj1CgwCgFS55FZiZDEz-vDCp9MMrPdkJY";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: {
    persistSession: true,       // save session to localStorage
    autoRefreshToken: true,     // automatically refresh expired tokens
    detectSessionInUrl: true,   // handle OAuth redirects on mobile
    storageKey: "sb-wos-auth",  // explicit key so it's consistent across browsers
  },
});
