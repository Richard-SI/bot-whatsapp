import { createRouter, createWebHistory } from 'vue-router';
import { supabase } from './lib/supabase';
import LoginView from './views/LoginView.vue';
import DashboardView from './views/DashboardView.vue';
import SettingsView from './views/SettingsView.vue';

const router = createRouter({ history: createWebHistory(), routes: [
  { path: '/login', component: LoginView },
  { path: '/', component: DashboardView, meta: { auth: true } },
  { path: '/configuracoes', component: SettingsView, meta: { auth: true } }
]});
router.beforeEach(async (to) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (to.meta.auth && !session) return '/login';
  if (to.path === '/login' && session) return '/';
});
export default router;
