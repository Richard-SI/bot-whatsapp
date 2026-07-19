<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { supabase } from '../lib/supabase';
const email = ref(''); const password = ref(''); const error = ref(''); const loading = ref(false); const router = useRouter();
async function login() { loading.value = true; error.value = ''; const { error: authError } = await supabase.auth.signInWithPassword({ email: email.value, password: password.value }); loading.value = false; if (authError) error.value = authError.message; else router.push('/'); }
</script>
<template><section class="auth"><h1>Atendimento WhatsApp</h1><form @submit.prevent="login"><label>E-mail<input v-model="email" type="email" required autocomplete="email" /></label><label>Senha<input v-model="password" type="password" required autocomplete="current-password" /></label><p v-if="error" class="error">{{ error }}</p><button :disabled="loading">{{ loading ? 'Entrando…' : 'Entrar' }}</button></form></section></template>
