<script setup>
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { supabase } from './lib/supabase';
const route = useRoute(); const router = useRouter();
const authenticated = computed(() => route.path !== '/login');
async function logout() { await supabase.auth.signOut(); router.push('/login'); }
</script>
<template>
  <main>
    <nav v-if="authenticated">
  <RouterLink to="/">Dashboard</RouterLink>
  <RouterLink to="/dispositivo">Aparelho WhatsApp</RouterLink>
  <RouterLink to="/configuracoes">Mensagem</RouterLink>
  <button @click="logout">Sair</button>
</nav><RouterView /></main>
</template>
