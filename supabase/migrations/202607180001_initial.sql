-- Execute com uma conta de dono do projeto no SQL Editor, ou aplique com: supabase db push.
create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_user();

create table public.bot_settings (
  id smallint primary key default 1 check (id = 1),
  welcome_message text not null check (char_length(welcome_message) between 1 and 4096),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);
insert into public.bot_settings (id, welcome_message)
values (1, 'Olá! Obrigado por entrar em contato. Em breve retornaremos.')
on conflict (id) do nothing;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger bot_settings_set_updated_at before update on public.bot_settings
for each row execute procedure public.set_updated_at();

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  phone text not null unique check (phone ~ '^[0-9]{8,20}$'),
  display_name text,
  first_seen_at timestamptz not null default now(),
  last_interaction_at timestamptz not null default now(),
  welcomed_at timestamptz
);
create index contacts_last_interaction_at_idx on public.contacts (last_interaction_at desc);

create table public.interactions (
  id bigint generated always as identity primary key,
  contact_id uuid not null references public.contacts(id) on delete cascade,
  direction text not null check (direction in ('inbound', 'outbound')),
  body text,
  occurred_at timestamptz not null default now()
);
create index interactions_contact_occurred_idx on public.interactions (contact_id, occurred_at desc);

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

alter table public.profiles enable row level security;
alter table public.bot_settings enable row level security;
alter table public.contacts enable row level security;
alter table public.interactions enable row level security;

create policy "own profile can be read" on public.profiles for select to authenticated using (id = auth.uid());
create policy "admins read settings" on public.bot_settings for select to authenticated using (public.is_admin());
create policy "admins update settings" on public.bot_settings for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admins read contacts" on public.contacts for select to authenticated using (public.is_admin());
create policy "admins read interactions" on public.interactions for select to authenticated using (public.is_admin());

-- O worker usa service_role, que ignora RLS. Clientes não podem inserir nem alterar contatos.
alter publication supabase_realtime add table public.contacts;

-- Após criar o primeiro usuário em Authentication > Users, promova-o uma vez:
-- update public.profiles set is_admin = true where id = 'UUID_DO_USUARIO';
