-- QR Code dinâmico: o código impresso continua o mesmo; só o destino muda.
-- Execute no SQL Editor do Supabase.

create table if not exists public.dynamic_qrcodes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  code text not null,
  target_url text not null,
  label text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dynamic_qrcodes_code_format check (code ~ '^[0-9]{4}$'),
  constraint dynamic_qrcodes_code_unique unique (code)
);

create index if not exists dynamic_qrcodes_user_id_idx on public.dynamic_qrcodes (user_id);

alter table public.dynamic_qrcodes enable row level security;

drop policy if exists "dynamic_qrcodes_select_own" on public.dynamic_qrcodes;
create policy "dynamic_qrcodes_select_own"
  on public.dynamic_qrcodes for select
  using (auth.uid() = user_id);

drop policy if exists "dynamic_qrcodes_select_public_code" on public.dynamic_qrcodes;
create policy "dynamic_qrcodes_select_public_code"
  on public.dynamic_qrcodes for select
  using (true);

drop policy if exists "dynamic_qrcodes_insert_own" on public.dynamic_qrcodes;
create policy "dynamic_qrcodes_insert_own"
  on public.dynamic_qrcodes for insert
  with check (auth.uid() = user_id);

drop policy if exists "dynamic_qrcodes_update_own" on public.dynamic_qrcodes;
create policy "dynamic_qrcodes_update_own"
  on public.dynamic_qrcodes for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "dynamic_qrcodes_delete_own" on public.dynamic_qrcodes;
create policy "dynamic_qrcodes_delete_own"
  on public.dynamic_qrcodes for delete
  using (auth.uid() = user_id);
