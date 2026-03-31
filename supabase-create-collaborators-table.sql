-- Tabela de colaboradores para uso no app (cadastro + pagamentos).
-- Compatível com os campos usados em src/contexts/FinanceContext.js

create extension if not exists "pgcrypto";

create table if not exists public.collaborators (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists collaborators_user_id_idx
  on public.collaborators (user_id);

create index if not exists collaborators_created_at_idx
  on public.collaborators (created_at desc);

alter table public.collaborators enable row level security;

drop policy if exists "collaborators_select_own" on public.collaborators;
create policy "collaborators_select_own"
  on public.collaborators
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "collaborators_insert_own" on public.collaborators;
create policy "collaborators_insert_own"
  on public.collaborators
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "collaborators_update_own" on public.collaborators;
create policy "collaborators_update_own"
  on public.collaborators
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "collaborators_delete_own" on public.collaborators;
create policy "collaborators_delete_own"
  on public.collaborators
  for delete
  to authenticated
  using (auth.uid() = user_id);

create or replace function public.set_collaborators_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_collaborators_updated_at on public.collaborators;
create trigger trg_collaborators_updated_at
before update on public.collaborators
for each row execute function public.set_collaborators_updated_at();

