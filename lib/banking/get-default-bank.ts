import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Returns the GL account_id for the company's default bank account.
 * Falls back to the first active bank account if none is explicitly marked default.
 */
export async function getDefaultBankAccountId(supabase: SupabaseClient): Promise<string> {
  const { data, error } = await supabase
    .from('acct_bank_accounts')
    .select('account_id')
    .eq('is_active', true)
    .order('is_default', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data?.account_id) {
    throw new Error('No active bank account with a linked GL account found. Configure one in Settings → Bank Accounts.')
  }
  return data.account_id
}
