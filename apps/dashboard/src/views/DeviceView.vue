<script setup>
import { onMounted, onUnmounted, ref } from 'vue';
import { api } from '../lib/api';

const qr = ref(null); 
const state = ref('Carregando...');
const connectedPhone = ref(null); 
const disconnecting = ref(false);
let statusTimer;

onMounted(async () => { 
  await checkWhatsappStatus();
  statusTimer = setInterval(checkWhatsappStatus, 3000);
});

onUnmounted(() => clearInterval(statusTimer));

async function checkWhatsappStatus() { 
  try { 
    const data = await api.whatsappQr(); 
    state.value = data.status; 
    qr.value = data.qrDataUrl; 
    connectedPhone.value = data.phone;
    
    // Ajusta a velocidade de checagem dependendo do status
    if (data.status === 'ready') {
      clearInterval(statusTimer);
      statusTimer = setInterval(checkWhatsappStatus, 15000);
    } else if (data.status === 'awaiting_qr' || data.status === 'starting') {
      clearInterval(statusTimer);
      statusTimer = setInterval(checkWhatsappStatus, 3000);
    }
  } catch (e) { 
    console.error("Erro ao buscar status:", e);
  } 
}

async function disconnect() {
  if (!confirm('Tem certeza que deseja desconectar o aparelho atual? Você precisará ler um novo QR Code.')) return;
  
  disconnecting.value = true;
  try {
    await api.whatsappDisconnect();
    state.value = 'starting';
    qr.value = null;
    connectedPhone.value = null;
    
    // Volta a atualizar rápido para pegar o novo QR Code
    clearInterval(statusTimer);
    statusTimer = setInterval(checkWhatsappStatus, 3000);
  } catch (error) {
    alert('Erro ao desconectar: ' + error.message);
  } finally {
    disconnecting.value = false;
  }
}

function formatStatus(status) {
  const statusMap = {
    'starting': { text: 'Iniciando sistema...', color: '#f59e0b', icon: '⏳' },
    'awaiting_qr': { text: 'Aguardando QR Code', color: '#3b82f6', icon: '📱' },
    'ready': { text: 'Conectado e Operacional', color: '#10b981', icon: '✅' },
    'auth_failure': { text: 'Falha na Autenticação', color: '#ef4444', icon: '❌' },
    'disconnected': { text: 'Desconectado', color: '#ef4444', icon: '🔌' }
  };
  return statusMap[status] || { text: status, color: '#64748b', icon: '❓' };
}
</script>

<template>
  <section class="device-wrapper">
    <header class="header-section">
      <h1 class="title">Aparelho Conectado</h1>
      <p class="subtitle">Gerencie o dispositivo WhatsApp vinculado ao robô.</p>
    </header>

    <div class="card">
      <div class="status-header">
        <div class="status-info">
          <span class="icon">{{ formatStatus(state).icon }}</span>
          <div>
            <h3>Status da Conexão</h3>
            <p :style="{ color: formatStatus(state).color }" class="font-bold">
              {{ formatStatus(state).text }}
            </p>
          </div>
        </div>
        
        <button 
          v-if="state === 'ready'" 
          @click="disconnect" 
          :disabled="disconnecting"
          class="btn-danger"
        >
          {{ disconnecting ? 'Desconectando...' : 'Desconectar Aparelho' }}
        </button>
      </div>

      <div class="card-body">
        <div v-if="connectedPhone && state === 'ready'" class="connected-phone">
          <p>O robô está respondendo pelas mensagens recebidas no número:</p>
          <h2>+{{ connectedPhone }}</h2>
        </div>
        
        <div v-if="state === 'starting'" class="loader-container">
          <div class="spinner"></div>
          <p>Preparando ambiente seguro. O QR Code aparecerá em instantes...</p>
        </div>
        
        <div v-if="state === 'awaiting_qr' && qr" class="qr-container">
          <h3>Vincule seu WhatsApp</h3>
          <ol class="instructions">
            <li>Abra o WhatsApp no seu celular</li>
            <li>Toque em Mais opções (⋮) ou Configurações</li>
            <li>Toque em Aparelhos conectados e "Conectar um aparelho"</li>
            <li>Aponte a câmera para o código abaixo:</li>
          </ol>
          <img :src="qr" alt="QR Code do WhatsApp" class="qr-image" />
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.device-wrapper { max-width: 800px; margin: 0 auto; padding: 20px; font-family: 'Inter', system-ui, sans-serif; color: #1e293b; text-align: left; }
.header-section { margin-bottom: 30px; }
.title { font-size: 1.8rem; font-weight: 700; margin: 0 0 5px 0; color: #0f172a; }
.subtitle { color: #64748b; margin: 0; font-size: 0.95rem; }

.card { background: white; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); border: 1px solid #f1f5f9; overflow: hidden; }
.status-header { padding: 20px 24px; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; background: #f8fafc; }
.status-info { display: flex; align-items: center; gap: 15px; }
.icon { font-size: 2rem; }
.status-info h3 { margin: 0 0 4px 0; font-size: 0.9rem; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
.font-bold { font-weight: 600; font-size: 1.1rem; margin: 0; }

.btn-danger { background: #ef4444; color: white; border: none; padding: 10px 20px; border-radius: 6px; font-weight: 600; cursor: pointer; transition: background 0.2s; }
.btn-danger:hover { background: #dc2626; }
.btn-danger:disabled { opacity: 0.5; cursor: not-allowed; }

.card-body { padding: 30px 24px; text-align: center; }
.connected-phone { background: #dcfce7; color: #166534; padding: 20px; border-radius: 8px; display: inline-block; }
.connected-phone p { margin: 0 0 10px 0; font-size: 0.95rem; }
.connected-phone h2 { margin: 0; font-size: 2rem; letter-spacing: 1px; }

.loader-container { padding: 40px; color: #64748b; display: flex; flex-direction: column; align-items: center; gap: 15px; }
.spinner { width: 40px; height: 40px; border: 4px solid #e2e8f0; border-top-color: #3b82f6; border-radius: 50%; animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.qr-container { display: flex; flex-direction: column; align-items: center; }
.qr-container h3 { margin-top: 0; color: #0f172a; }
.instructions { text-align: left; background: #f8fafc; padding: 20px 20px 20px 40px; border-radius: 8px; color: #475569; margin-bottom: 20px; line-height: 1.6; }
.qr-image { max-width: 280px; border: 15px solid white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
</style>