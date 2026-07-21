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
      '--disable-dev-shm-usage', 
      '--disable-accelerated-2d-canvas', 
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu',
      '--single-process', // A MÁGICA AQUI: Força o Chrome a não abrir processos paralelos (Economiza muita RAM)
      '--js-flags="--max-old-space-size=256"', // Limita o motor de processamento a 256MB
      '--disable-extensions',
      '--disable-default-apps',
      '--disable-background-networking',
      '--disable-sync'
    ],
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
  },
  webVersionCache: {
    type: 'remote',
    remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html',
  }
});

client.on('qr', (qr) => {
  latestQr = qr;
  status = 'awaiting_qr';
  console.log('Escaneie o QR abaixo no WhatsApp:');
  qrcode.generate(qr, { small: true });
});

// ADICIONE ESTE BLOCO AQUI:
client.on('authenticated', () => {
  latestQr = null; // Apaga o QR Code
  status = 'starting'; // Avisa o frontend para parar de fazer requisições rápidas e mostrar "Carregando"
  console.log('✅ Autenticado com sucesso! Sincronizando mensagens (isso pode demorar um pouco na nuvem)...');
});

client.on('ready', () => { 
  latestQr = null; 
  status = 'ready'; 
  console.log('✅ WhatsApp conectado e 100% online.'); 
});
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