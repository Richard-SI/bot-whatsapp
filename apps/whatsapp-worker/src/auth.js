import { supabaseAdmin } from './supabase.js';

export async function requireAdmin(req, res, next) {
  const authorization = req.get('authorization') || '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Token de acesso ausente.' });

  const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !authData.user) return res.status(401).json({ error: 'Sessão inválida.' });

  const { data: profile, error } = await supabaseAdmin
    .from('profiles').select('is_admin').eq('id', authData.user.id).single();
  if (error || !profile?.is_admin) return res.status(403).json({ error: 'Acesso de administrador exigido.' });
  req.user = authData.user;
  next();
}
