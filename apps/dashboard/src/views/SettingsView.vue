<script setup>
import { onMounted, ref } from 'vue';
import { api } from '../lib/api';

const message = ref(''); 
const feedback = ref(''); 
const error = ref(''); 
const saving = ref(false); 

onMounted(async () => { 
  try { 
    message.value = (await api.settings()).welcome_message; 
  } catch (e) { 
    error.value = e.message; 
  } 
});

async function save() { 
  saving.value = true; 
  feedback.value = ''; 
  error.value = ''; 
  try { 
    await api.saveSettings(message.value); 
    feedback.value = 'Mensagem salva com sucesso!'; 
    setTimeout(() => feedback.value = '', 3000); 
  } catch (e) { 
    error.value = e.message; 
  } finally { 
    saving.value = false; 
  } 
}
</script>

<template>
  <section class="settings-wrapper">
    <header class="header-section">
      <h1 class="title">Configurações do Robô</h1>
      <p class="subtitle">Defina o texto da mensagem automática de boas-vindas.</p>
    </header>

    <div class="card">
      <form @submit.prevent="save">
        <label class="font-bold">
          Texto da Mensagem
          <span class="note">O bot envia esta mensagem apenas 1 vez por dia para cada cliente.</span>
          <textarea v-model="message" maxlength="4096" required rows="6" placeholder="Olá! Obrigado por entrar em contato..." />
        </label>
        
        <div class="action-footer">
          <p v-if="feedback" class="success-alert">{{ feedback }}</p>
          <p v-if="error" class="error-alert">{{ error }}</p>
          <button :disabled="saving" class="btn-primary">
            {{ saving ? 'Salvando...' : 'Salvar Alterações' }}
          </button>
        </div>
      </form>
    </div>
  </section>
</template>

<style scoped>
.settings-wrapper { max-width: 800px; margin: 0 auto; padding: 20px; font-family: 'Inter', system-ui, sans-serif; color: #1e293b; text-align: left; }
.header-section { margin-bottom: 30px; }
.title { font-size: 1.8rem; font-weight: 700; margin: 0 0 5px 0; color: #0f172a; }
.subtitle { color: #64748b; margin: 0; font-size: 0.95rem; }

.card { background: white; border-radius: 12px; padding: 24px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); border: 1px solid #f1f5f9; }
.font-bold { font-weight: 600; color: #0f172a; display: block; margin-bottom: 10px; }
.note { display: block; font-weight: normal; color: #64748b; font-size: 0.85rem; margin-top: 4px; margin-bottom: 12px; }
textarea { width: 100%; box-sizing: border-box; padding: 16px; border: 1px solid #cbd5e1; border-radius: 8px; font-family: inherit; resize: vertical; line-height: 1.5; font-size: 0.95rem; }
textarea:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1); }

.action-footer { display: flex; align-items: center; justify-content: flex-end; gap: 15px; margin-top: 20px; }
.btn-primary { background: #3b82f6; color: white; padding: 12px 24px; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; transition: background 0.2s; }
.btn-primary:hover:not(:disabled) { background: #2563eb; }
.btn-primary:disabled { opacity: 0.7; cursor: not-allowed; }
.success-alert { color: #16a34a; font-weight: 500; margin: 0; }
.error-alert { color: #dc2626; font-weight: 500; margin: 0; }
</style>