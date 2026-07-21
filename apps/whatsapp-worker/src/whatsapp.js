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
      '--disable-dev-shm-usage', // O PULO DO GATO: Evita o estouro de memória no Docker
      '--disable-accelerated-2d-canvas', // Desliga aceleração gráfica desnecessária
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu' // Desliga a GPU
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
    // 1. Ignora mensagens próprias, grupos e status
    if (message.fromMe || message.from.endsWith('@g.us') || message.from === 'status@broadcast' || message.type !== 'chat') return;
    
    // 2. Extrai a identidade crua inicialmente
    let phone = message.from.split('@')[0];
    const occurredAt = new Date(message.timestamp * 1000).toISOString();
    let displayName = message._data?.notifyName || phone;

    // 3. Tenta desmascarar o LID e pegar o número real
    try {
      const contact = await message.getContact();
      if (contact && contact.number) {
        phone = contact.number; // Pega o número real formatado
      }
      if (contact && contact.pushname) {
        displayName = contact.pushname; // Pega o nome real do perfil
      }
    } catch (contactError) {
      // Se a Meta bloquear a consulta (erro r:r), falha silenciosamente e segue com o LID
      console.log('Aviso: Não foi possível resolver o número real, utilizando o ID da rede.');
    }

    // 4. Salva ou atualiza o contato no banco com o número que conseguiu
    const record = await upsertIncomingContact({
      phone,
      displayName: displayName,
      messageAt: occurredAt
    });
    
    // 5. Salva a mensagem recebida no histórico
    await addInteraction({ contactId: record.id, direction: 'inbound', body: message.body, occurredAt });

    // 6. Faz a checagem de 1 vez por dia
    const todayDate = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    
    let lastWelcomedDate = null;
    if (record.welcomed_at) {
      lastWelcomedDate = new Date(record.welcomed_at).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    }

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
  } catch (error) {
    console.error('Erro ao processar mensagem:', error);
  }
});

export function startWhatsApp() { client.initialize(); }
export function whatsappState() { 
  return { 
    status, 
    qr: latestQr,
    phone: client.info ? client.info.wid.user : null
  }; 
}
export async function disconnectDevice() {
  try {
    // Tenta deslogar graciosamente
    await client.logout();
    return { success: true };
  } catch (error) {
    // Se o cliente já estiver travado, força a destruição e reinicia o navegador
    await client.destroy();
    client.initialize();
    return { success: true };
  }
}