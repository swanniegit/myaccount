import type { SupabaseClient } from '@supabase/supabase-js'
import type { PushContactPayload } from './types'

/** Upsert a contact by external_ref; returns the contact UUID. */
export async function upsertContact(
  supabase: SupabaseClient,
  contact: PushContactPayload
): Promise<string> {
  const { data, error } = await supabase
    .from('acct_contacts')
    .upsert(
      {
        external_ref: contact.external_ref,
        name: contact.name,
        email: contact.email,
        phone: contact.phone,
        type: 'customer',
        is_active: true,
      },
      { onConflict: 'external_ref', ignoreDuplicates: false }
    )
    .select('id')
    .single()

  if (error || !data) {
    throw new Error(`Failed to upsert contact: ${error?.message ?? 'no row'}`)
  }
  return data.id
}
