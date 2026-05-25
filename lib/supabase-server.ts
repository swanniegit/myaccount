import { createClient } from '@supabase/supabase-js'

const supabaseUrl        = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

/**
 * Server-side Supabase client using the service role key.
 * Use only in API route handlers and server actions — never in client components.
 * This bypasses Row Level Security, so validate inputs before use.
 *
 * Auth model: browser routes are protected by the HMAC session middleware.
 * Machine-to-machine routes (/api/push/*) use requireApiKey().
 * This app does not use Supabase JWT auth.
 */
export function createServerClient() {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  })
}
