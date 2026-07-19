import qrcode from 'qrcode-terminal';
import whatsapp from 'whatsapp-web.js';
const { Client, LocalAuth } = whatsapp;import { config } from './config.js';
import { addInteraction, getWelcomeMessage, markWelcomed, upsertIncomingContact } from './supabase.js';

let latestQr = null;
let status = 'starting';

const client = new Client({
  authStrategy: new LocalAuth({ dataPath: config.authPath }),
  puppeteer: { headless: true, args: config.puppeteerArgs }
});

client.on('qr', (qr) => {
  latestQr = qr;
  status = 'awaiting_qr';
  console.log('Escaneie o QR abaixo no WhatsApp:');
  qrcode.generate(qr, { small: true });
});
client.on('ready', () => { latestQr = null; status = 'ready'; console.log('WhatsApp conectado.'); });
client.on('auth_failure', (message) => { status = 'auth_failure'; console.error('Falha de autenticação:', message); });
client.on('disconnected', (reason) => { status = 'disconnected'; console.warn('WhatsApp desconectado:', reason); });

client.on('message', async (message) => {
  try {
    if (message.fromMe || message.from.endsWith('@g.us') || message.type !== 'chat') return;
    const chat = await message.getChat();
    const contact = await message.getContact();
    const phone = message.from.replace(/@c\.us$/, '');
    const occurredAt = new Date(message.timestamp * 1000).toISOString();
    const record = await upsertIncomingContact({
      phone,
      displayName: contact.pushname || contact.name || chat.name,
      messageAt: occurredAt
    });
    await addInteraction({ contactId: record.id, direction: 'inbound', body: message.body, occurredAt });

    // Uma única boas-vindas por contato; evita spam a cada nova mensagem.
    if (!record.welcomed_at) {
      const welcome = await getWelcomeMessage();
      await client.sendMessage(message.from, welcome);
      await addInteraction({ contactId: record.id, direction: 'outbound', body: welcome, occurredAt: new Date().toISOString() });
      await markWelcomed(record.id);
    }
  } catch (error) {
    console.error('Erro ao processar mensagem:', error);
  }
});

export function startWhatsApp() { client.initialize(); }
export function whatsappState() { return { status, qr: latestQr }; }
