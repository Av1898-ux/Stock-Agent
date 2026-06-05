import { createClient } from '@supabase/supabase-js';

// Browser-safe client. Uses the ANON key (read-only via RLS policies).
// The service_role key is NEVER used in the app — it stays in n8n only.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

export const supabase = createClient(url, anon, {
  auth: { persistSession: false },
});
