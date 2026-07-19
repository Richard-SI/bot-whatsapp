<script setup>
import { onMounted, onUnmounted, ref } from 'vue';
import { api } from '../lib/api';
const contacts = ref([]); const error = ref(''); const loading = ref(true); let timer;
async function load() { try { contacts.value = await api.contacts(); error.value = ''; } catch (e) { error.value = e.message; } finally { loading.value = false; } }
function date(value) { return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)); }
onMounted(async () => { await load(); timer = setInterval(load, 10000); }); onUnmounted(() => clearInterval(timer));
</script>
<template><section><h1>Contatos recentes</h1><p>Atualização automática a cada 10 segundos.</p><p v-if="error" class="error">{{ error }}</p><p v-else-if="loading">Carregando…</p><table v-else><thead><tr><th>Nome</th><th>Número</th><th>Última interação</th></tr></thead><tbody><tr v-for="contact in contacts" :key="contact.id"><td>{{ contact.display_name || 'Sem nome' }}</td><td>+{{ contact.phone }}</td><td>{{ date(contact.last_interaction_at) }}</td></tr><tr v-if="!contacts.length"><td colspan="3">Nenhum contato ainda.</td></tr></tbody></table></section></template>
