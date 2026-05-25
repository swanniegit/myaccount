import { createClient } from '@supabase/supabase-js'
import type { NextRequest } from 'next/server'

const supabaseUrl      = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

/**
 * Server-side Supabase client using the service role key.
 * Use only in API route handlers and server actions — never in client components.
 * This bypasses Row Level Security, so validate inputs before use.
 */
export function createServerClient() {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  })
}

/**
 * Verify the Supabase JWT in the Authorization header.
 * Returns the authenticated user, or null if the token is missing/invalid.
 * Use this for API routes that should be called from the browser (not machine-to-machine).
 */
export async function getRequestUser(req: NextRequest) {
  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) return null
  const client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  })
  const { data: { user } } = await client.auth.getUser()
  return user ?? null
}
