import type { SupabaseClient } from '@supabase/supabase-js'

/** Returns the UUID for an account by its code, throwing if not found. */
export async function getAccountId(
  supabase: SupabaseClient,
  code: string
): Promise<string> {
  const { data, error } = await supabase
    .from('acct_accounts')
    .select('id')
    .eq('code', code)
    .single()

  if (error || !data) {
    throw new Error(`Account code ${code} not found: ${error?.message ?? 'no row'}`)
  }
  return data.id
}
