import { supabase } from './supabase';

const baseUrl = import.meta.env.VITE_API_URL.replace(/\/$/, '');
async function request(path, options = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Sua sessão expirou.');
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}`, ...options.headers }
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || 'Não foi possível concluir a operação.');
  return body;
}
export const api = {
  contacts: () => request('/api/contacts'),
  settings: () => request('/api/settings'),
  saveSettings: (welcome_message) => request('/api/settings', { method: 'PUT', body: JSON.stringify({ welcome_message }) }),
  whatsappQr: () => request('/api/whatsapp/qr')
};
