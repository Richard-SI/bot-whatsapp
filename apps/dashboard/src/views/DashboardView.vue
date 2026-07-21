<script setup>
import { onMounted, onUnmounted, ref, computed } from 'vue';
import { api } from '../lib/api';

const contacts = ref([]); 
const error = ref(''); 
const loading = ref(true); 
const systemState = ref('Conectando...');
let timer;

async function load() { 
  try { 
    contacts.value = await api.contacts(); 
    
    // Aproveitamos para checar o status do bot para exibir no painel principal
    const statusData = await api.whatsappQr();
    systemState.value = statusData.status === 'ready' ? 'Online' : 'Offline / Aguardando';
    
    error.value = ''; 
  } catch (e) { 
    error.value = e.message; 
    systemState.value = 'Erro de Conexão';
  } finally { 
    loading.value = false; 
  } 
}

function formatDate(value) { 
  if (!value) return '-';
  return new Intl.DateTimeFormat('pt-BR', { 
    day: '2-digit', month: '2-digit', year: 'numeric', 
    hour: '2-digit', minute: '2-digit' 
  }).format(new Date(value)); 
}

function formatPhone(phone) { 
  if (!phone) return '-';
  if (phone.length >= 15) return 'Oculto (Próprio/LID)';
  
  // Adiciona uma formatação bonita se for um número padrão do Brasil
  if (phone.startsWith('55') && phone.length >= 12) {
    const ddd = phone.substring(2, 4);
    const prefix = phone.substring(4, phone.length - 4);
    const suffix = phone.substring(phone.length - 4);
    return `+55 (${ddd}) ${prefix}-${suffix}`;
  }
  
  return `+${phone}`; 
}

// Estatísticas computadas para os cartões
const totalContacts = computed(() => contacts.value.length);
const contactsToday = computed(() => {
  const today = new Date().toLocaleDateString('pt-BR');
  return contacts.value.filter(c => {
    if (!c.last_interaction_at) return false;
    return new Date(c.last_interaction_at).toLocaleDateString('pt-BR') === today;
  }).length;
});

onMounted(async () => { 
  await load(); 
  timer = setInterval(load, 10000); 
}); 

onUnmounted(() => clearInterval(timer));
</script>

<template>
  <section class="dashboard-wrapper">
    <!-- Cabeçalho do Dashboard -->
    <header class="dashboard-header">
      <div>
        <h1 class="title">Visão Geral</h1>
        <p class="subtitle">Acompanhe as interações do seu assistente virtual em tempo real.</p>
      </div>
      <div class="status-badge" :class="systemState === 'Online' ? 'bg-green' : 'bg-orange'">
        <span class="status-dot"></span>
        Robô {{ systemState }}
      </div>
    </header>

    <!-- Cartões de Estatísticas -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon icon-blue">👥</div>
        <div class="stat-info">
          <h3>Total de Contatos</h3>
          <p class="stat-value">{{ totalContacts }}</p>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon icon-emerald">⚡</div>
        <div class="stat-info">
          <h3>Interações Hoje</h3>
          <p class="stat-value">{{ contactsToday }}</p>
        </div>
      </div>
    </div>

    <!-- Tabela Principal -->
    <main class="main-content">
      <div class="table-header">
        <h2>Histórico de Conversas</h2>
        <span class="auto-update">↻ Atualiza a cada 10s</span>
      </div>

      <div v-if="error" class="alert-error">{{ error }}</div>
      
      <div v-else-if="loading" class="loading-state">
        <div class="spinner"></div>
        Carregando dados do servidor...
      </div>
      
      <div v-else class="table-container">
        <table>
          <thead>
            <tr>
              <th>Contato</th>
              <th>Número / ID</th>
              <th>Última Mensagem</th>
              <th>Status do Robô</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="contact in contacts" :key="contact.id">
              <td>
                <div class="contact-name">
                  <div class="avatar">{{ (contact.display_name || '?').charAt(0).toUpperCase() }}</div>
                  <span class="font-bold">{{ contact.display_name || 'Sem Nome' }}</span>
                </div>
              </td>
              <td class="text-gray">{{ formatPhone(contact.phone) }}</td>
              <td class="text-gray">{{ formatDate(contact.last_interaction_at) }}</td>
              <td>
                <span v-if="contact.welcomed_at" class="badge badge-success">Respondido</span>
                <span v-else class="badge badge-pending">Aguardando</span>
              </td>
            </tr>
            <tr v-if="!contacts.length">
              <td colspan="4" class="empty-state">
                <div class="empty-icon">📭</div>
                <p>Nenhuma conversa registrada ainda.</p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </main>
  </section>
</template>

<style scoped>
/* Reset local e fontes */
.dashboard-wrapper { max-width: 1100px; margin: 0 auto; padding: 20px; font-family: 'Inter', system-ui, sans-serif; color: #1e293b; }

/* Cabeçalho */
.dashboard-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; }
.title { font-size: 1.8rem; font-weight: 700; margin: 0 0 5px 0; color: #0f172a; }
.subtitle { color: #64748b; margin: 0; font-size: 0.95rem; }

/* Status Badge Superior */
.status-badge { display: flex; align-items: center; gap: 8px; padding: 8px 16px; border-radius: 999px; font-weight: 600; font-size: 0.9rem; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
.status-dot { width: 8px; height: 8px; border-radius: 50%; background: currentColor; }
.bg-green { background: #dcfce7; color: #16a34a; }
.bg-orange { background: #ffedd5; color: #ea580c; }

/* Grid de Estatísticas */
.stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 30px; }
.stat-card { background: white; padding: 24px; border-radius: 12px; display: flex; align-items: center; gap: 20px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03); border: 1px solid #f1f5f9; transition: transform 0.2s ease; }
.stat-card:hover { transform: translateY(-2px); }
.stat-icon { width: 50px; height: 50px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; }
.icon-blue { background: #e0f2fe; color: #0284c7; }
.icon-emerald { background: #d1fae5; color: #059669; }
.stat-info h3 { margin: 0; font-size: 0.85rem; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; }
.stat-value { margin: 5px 0 0 0; font-size: 1.8rem; font-weight: 700; color: #0f172a; }

/* Tabela Principal */
.main-content { background: white; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); border: 1px solid #f1f5f9; overflow: hidden; }
.table-header { padding: 20px 24px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #f1f5f9; }
.table-header h2 { margin: 0; font-size: 1.2rem; font-weight: 600; color: #0f172a; }
.auto-update { font-size: 0.8rem; color: #94a3b8; font-weight: 500; }

.table-container { width: 100%; overflow-x: auto; }
table { width: 100%; border-collapse: collapse; text-align: left; }
th { background: #f8fafc; padding: 16px 24px; font-weight: 600; color: #475569; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #e2e8f0; }
td { padding: 16px 24px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
tr:last-child td { border-bottom: none; }
tr:hover td { background: #f8fafc; }

/* Elementos da Tabela */
.contact-name { display: flex; align-items: center; gap: 12px; }
.avatar { width: 36px; height: 36px; border-radius: 50%; background: #3b82f6; color: white; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 1rem; }
.font-bold { font-weight: 600; color: #1e293b; }
.text-gray { color: #64748b; font-size: 0.95rem; }

/* Badges */
.badge { padding: 6px 12px; border-radius: 999px; font-size: 0.75rem; font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase; }
.badge-success { background: #dcfce7; color: #166534; }
.badge-pending { background: #f1f5f9; color: #64748b; border: 1px solid #e2e8f0; }

/* Estados (Loading / Vazio / Erro) */
.loading-state { padding: 60px; text-align: center; color: #64748b; display: flex; flex-direction: column; align-items: center; gap: 15px; }
.spinner { width: 30px; height: 30px; border: 3px solid #e2e8f0; border-top-color: #3b82f6; border-radius: 50%; animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.empty-state { text-align: center; padding: 60px; color: #94a3b8; }
.empty-icon { font-size: 3rem; margin-bottom: 10px; opacity: 0.5; }
.alert-error { background: #fef2f2; border: 1px solid #f87171; color: #991b1b; padding: 16px; margin: 20px; border-radius: 8px; font-weight: 500; }
</style>