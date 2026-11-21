-- ImobMaster: execute no SQL Editor do Supabase.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text,
  created_at timestamptz not null default now()
);

create table if not exists public.properties (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  code text not null,
  title text not null,
  property_type text not null,
  purpose text not null check (purpose in ('Venda','Aluguel')),
  price numeric(14,2) not null default 0,
  city text not null,
  neighborhood text,
  address text,
  bedrooms int not null default 0,
  bathrooms int not null default 0,
  area numeric(10,2) not null default 0,
  status text not null default 'Disponível' check (status in ('Disponível','Em negociação','Vendido','Alugado')),
  description text,
  image_url text,
  created_at timestamptz not null default now(),
  unique(user_id, code)
);

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  interest text,
  budget numeric(14,2) default 0,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  phone text,
  email text,
  source text,
  stage text not null default 'Novo' check (stage in ('Novo','Em contato','Visita agendada','Proposta','Fechado','Perdido')),
  property_id uuid references public.properties(id) on delete set null,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null,
  client_id uuid references public.clients(id) on delete set null,
  lead_id uuid references public.leads(id) on delete set null,
  property_id uuid references public.properties(id) on delete set null,
  starts_at timestamptz not null,
  kind text not null default 'Visita',
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.deals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  property_id uuid references public.properties(id) on delete set null,
  client_id uuid references public.clients(id) on delete set null,
  value numeric(14,2) not null default 0,
  commission_rate numeric(5,2) not null default 5,
  status text not null default 'Em andamento',
  expected_at date,
  received_at date,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists properties_user_status_idx on public.properties(user_id,status);
create index if not exists clients_user_name_idx on public.clients(user_id,name);
create index if not exists leads_user_stage_idx on public.leads(user_id,stage);
create index if not exists appointments_user_start_idx on public.appointments(user_id,starts_at);
create index if not exists deals_user_status_idx on public.deals(user_id,status);

-- Row Level Security: cada corretor acessa somente os próprios registros.
do $$ declare t text; begin
  foreach t in array array['profiles','properties','clients','leads','appointments','deals'] loop
    execute format('alter table public.%I enable row level security',t);
  end loop;
end $$;

drop policy if exists "profile owner select" on public.profiles;
create policy "profile owner select" on public.profiles for select using (auth.uid() = id);
drop policy if exists "profile owner insert" on public.profiles;
create policy "profile owner insert" on public.profiles for insert with check (auth.uid() = id);
drop policy if exists "profile owner update" on public.profiles;
create policy "profile owner update" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

do $$ declare t text; begin
  foreach t in array array['properties','clients','leads','appointments','deals'] loop
    execute format('drop policy if exists %I on public.%I','owner manages '||t,t);
    execute format('create policy %I on public.%I for all using (auth.uid() = user_id) with check (auth.uid() = user_id)','owner manages '||t,t);
  end loop;
end $$;

-- Cria o perfil automaticamente ao registrar usuário.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id,full_name) values(new.id,coalesce(new.raw_user_meta_data->>'full_name',''));
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Storage: crie um bucket privado chamado property-photos no painel Storage.
-- Depois execute estas políticas para restringir uploads ao UID do usuário:

insert into storage.buckets (id, name, public)
values ('property-photos', 'property-photos', false)
on conflict (id) do nothing;

drop policy if exists "Users can upload their own property photos" on storage.objects;
create policy "Users can upload their own property photos"
on storage.objects for insert
with check (bucket_id = 'property-photos' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "Users can view their own property photos" on storage.objects;
create policy "Users can view their own property photos"
on storage.objects for select
using (bucket_id = 'property-photos' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "Users can delete their own property photos" on storage.objects;
create policy "Users can delete their own property photos"
on storage.objects for delete
using (bucket_id = 'property-photos' and auth.uid()::text = (storage.foldername(name))[1]);
