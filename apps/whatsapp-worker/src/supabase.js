import { createClient } from '@supabase/supabase-js';
import { config } from './config.js';

// Nunca exponha este cliente (service_role) ao navegador.
export const supabaseAdmin = createClient(config.supabaseUrl, config.serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

export async function getWelcomeMessage() {
  const { data, error } = await supabaseAdmin
    .from('bot_settings')
    .select('welcome_message')
    .eq('id', 1)
    .single();
  if (error) throw error;
  return data.welcome_message;
}

export async function upsertIncomingContact({ phone, displayName, messageAt }) {
  const { data, error } = await supabaseAdmin
    .from('contacts')
    .upsert({
      phone,
      display_name: displayName || null,
      last_interaction_at: messageAt
    }, { onConflict: 'phone' })
    .select('id, welcomed_at')
    .single();
  if (error) throw error;
  return data;
}

export async function markWelcomed(contactId) {
  const { error } = await supabaseAdmin
    .from('contacts')
    .update({ welcomed_at: new Date().toISOString() })
    .eq('id', contactId);
  if (error) throw error;
}

export async function addInteraction({ contactId, direction, body, occurredAt }) {
  const { error } = await supabaseAdmin.from('interactions').insert({
    contact_id: contactId,
    direction,
    body: body || null,
    occurred_at: occurredAt
  });
  if (error) throw error;
}
