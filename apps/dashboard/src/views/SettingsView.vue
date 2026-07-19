<script setup>
import { onMounted, ref } from 'vue';
import { api } from '../lib/api';
const message = ref(''); const feedback = ref(''); const error = ref(''); const saving = ref(false); const qr = ref(null); const state = ref('');
onMounted(async () => { try { message.value = (await api.settings()).welcome_message; } catch (e) { error.value = e.message; } });
async function save() { saving.value = true; feedback.value = ''; error.value = ''; try { await api.saveSettings(message.value); feedback.value = 'Mensagem salva.'; } catch (e) { error.value = e.message; } finally { saving.value = false; } }
async function loadQr() { try { const data = await api.whatsappQr(); state.value = data.status; qr.value = data.qrDataUrl; } catch (e) { error.value = e.message; } }
</script>
<template><section><h1>Mensagem automática</h1><form @submit.prevent="save"><label>Texto enviado ao primeiro contato<textarea v-model="message" maxlength="4096" required rows="6" /></label><button :disabled="saving">{{ saving ? 'Salvando…' : 'Salvar mensagem' }}</button></form><p v-if="feedback" class="success">{{ feedback }}</p><p v-if="error" class="error">{{ error }}</p><hr /><h2>Conexão do WhatsApp</h2><button @click="loadQr">Ver status / QR</button><p v-if="state">Status: {{ state }}</p><img v-if="qr" :src="qr" alt="QR Code do WhatsApp" class="qr" /></section></template>
