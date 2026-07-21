import { supabase } from './supabase';

// Blindagem: Tenta usar a variável do Vercel. Se falhar, usa a URL do Render como backup de segurança.
const API_URL = import.meta.env.VITE_API_URL || 'https://bot-whatsapp-ggfk.onrender.com';
const baseUrl = API_URL.replace(/\/$/, '');

async function request(path, options = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Sua sessão expirou.');

  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { 
      'Content-Type': 'application/json', 
      Authorization: `Bearer ${session.access_token}`, 
      ...options.headers 
    }
  });

  // Previne que a tela quebre lendo HTML de erro como se fosse JSON
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.indexOf("application/json") !== -1) {
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || 'Não foi possível concluir a operação.');
    return body;
  } else {
    // Se não for JSON (ex: página 404 do Vercel), captura o texto para o log e exibe um erro amigável
    const text = await response.text();
    console.error("Resposta não-JSON da API:", text);
    throw new Error(`Erro de comunicação com o servidor principal (Código: ${response.status}).`);
  }
}

export const api = {
  contacts: () => request('/api/contacts'),
  settings: () => request('/api/settings'),
  saveSettings: (welcome_message) => request('/api/settings', { method: 'PUT', body: JSON.stringify({ welcome_message }) }),
  whatsappQr: () => request('/api/whatsapp/qr'),
  whatsappDisconnect: () => request('/api/whatsapp/disconnect', { method: 'POST' })
};