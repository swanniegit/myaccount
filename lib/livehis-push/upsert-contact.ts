import type { SupabaseClient } from '@supabase/supabase-js'
import type { PushContactPayload } from './types'

/** Insert or update a contact by external_ref; returns the contact UUID. */
export async function upsertContact(
  supabase: SupabaseClient,
  contact: PushContactPayload
): Promise<string> {
  // Check for existing contact first (avoids ON CONFLICT with partial index)
  const { data: existing } = await supabase
    .from('acct_contacts')
    .select('id')
    .eq('external_ref', contact.external_ref)
    .maybeSingle()

  if (existing) return existing.id

  const { data, error } = await supabase
    .from('acct_contacts')
    .insert({
      external_ref: contact.external_ref,
      name: contact.name,
      email: contact.email ?? null,
      phone: contact.phone ?? null,
      type: 'customer',
      is_active: true,
    })
    .select('id')
    .single()

  if (error || !data) {
    throw new Error(`Failed to insert contact: ${error?.message ?? 'no row'}`)
  }
  return data.id
}
