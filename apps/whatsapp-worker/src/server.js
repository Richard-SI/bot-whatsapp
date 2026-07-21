import cors from 'cors';
import express from 'express';
import QRCode from 'qrcode';
import { config } from './config.js';
import { requireAdmin } from './auth.js';
import { getWelcomeMessage, supabaseAdmin } from './supabase.js';
import { startWhatsApp, whatsappState } from './whatsapp.js';

const app = express();
app.use(cors({
  origin: [
    'https://bot-whatsapp-dashboard.vercel.app', // Libera o seu painel em produção
    'http://localhost:5173'                      // Mantém liberado para os seus testes locais
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.json());
app.get('/health', (_, res) => res.json({ ok: true, ...whatsappState() }));

app.get('/api/contacts', requireAdmin, async (_, res, next) => {
  try {
    const { data, error } = await supabaseAdmin.from('contacts')
      .select('id, phone, display_name, first_seen_at, last_interaction_at, welcomed_at')
      .order('last_interaction_at', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (error) { next(error); }
});

app.get('/api/settings', requireAdmin, async (_, res, next) => {
  try { res.json({ welcome_message: await getWelcomeMessage() }); } catch (error) { next(error); }
});

app.put('/api/settings', requireAdmin, async (req, res, next) => {
  try {
    const message = String(req.body.welcome_message || '').trim();
    if (!message || message.length > 4096) return res.status(422).json({ error: 'A mensagem deve ter entre 1 e 4096 caracteres.' });
    const { data, error } = await supabaseAdmin.from('bot_settings')
      .update({ welcome_message: message, updated_by: req.user.id })
      .eq('id', 1).select('welcome_message, updated_at').single();
    if (error) throw error;
    res.json(data);
  } catch (error) { next(error); }
});

app.get('/api/whatsapp/qr', requireAdmin, async (_, res, next) => {
//app.get('/api/whatsapp/qr', async (_, res, next) => {

  try {
    const state = whatsappState();
    res.json({ 
      status: state.status, 
      qrDataUrl: state.qr ? await QRCode.toDataURL(state.qr) : null,
      phone: state.phone // <-- Esta é a linha mágica que faltava!
    });
  } catch (error) { 
    next(error); 
  }
});

app.post('/api/whatsapp/disconnect', requireAdmin, async (_, res, next) => {
  try {
    const { disconnectDevice } = await import('./whatsapp.js');
    await disconnectDevice();
    res.json({ message: 'Aparelho desconectado com sucesso.' });
  } catch (error) {
    next(error);
  }
});

app.use((error, _, res, __) => { console.error(error); res.status(500).json({ error: 'Erro interno.' }); });
app.listen(config.port, () => { console.log(`Worker ouvindo em :${config.port}`); startWhatsApp(); });
