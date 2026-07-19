import qrcode from 'qrcode-terminal';
import whatsapp from 'whatsapp-web.js';
const { Client, LocalAuth } = whatsapp;import { config } from './config.js';
import { addInteraction, getWelcomeMessage, markWelcomed, upsertIncomingContact } from './supabase.js';

let latestQr = null;
let status = 'starting';

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    args: [
      '--no-sandbox', 
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage' // Adicione esta linha vital
    ],
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
  }
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
    // Configura a data de hoje no fuso horário de Brasília (formato DD/MM/YYYY)
    const todayDate = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    
    let lastWelcomedDate = null;
    if (record.welcomed_at) {
      // Converte a data salva no banco para o mesmo formato
      lastWelcomedDate = new Date(record.welcomed_at).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    }

    // Dispara a saudação se for o primeiro contato da vida OU o primeiro contato do dia
    if (lastWelcomedDate !== todayDate) {
      const welcome = await getWelcomeMessage();
      await client.sendMessage(message.from, welcome);
      
      await addInteraction({ 
        contactId: record.id, 
        direction: 'outbound', 
        body: welcome, 
        occurredAt: new Date().toISOString() 
      });
      
      await markWelcomed(record.id);
    }
    
    const phone = message.from.split('@')[0];
    const occurredAt = new Date(message.timestamp * 1000).toISOString();
    
    // Pega o nome do perfil do WhatsApp sem usar getChat() ou getContact()
    const displayName = message._data?.notifyName || phone;

    const record = await upsertIncomingContact({
      phone,
      displayName: displayName,
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
