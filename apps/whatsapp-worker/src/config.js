import 'dotenv/config';

const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
for (const key of required) {
  if (!process.env[key]) throw new Error(`Variável de ambiente obrigatória ausente: ${key}`);
}

export const config = {
  port: Number(process.env.PORT || 3000),
  supabaseUrl: process.env.SUPABASE_URL,
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  authPath: process.env.WHATSAPP_AUTH_PATH || '.wwebjs_auth',
  puppeteerArgs: (process.env.PUPPETEER_ARGS || '').split(',').filter(Boolean)
};
