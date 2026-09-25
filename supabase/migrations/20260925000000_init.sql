-- Família: agenda, financeiro e tarefas compartilhados, com vínculo ao Telegram.

create type public.entry_source as enum ('web', 'telegram');
create type public.transaction_type as enum ('receita', 'despesa');

create table public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  timezone text not null default 'America/Sao_Paulo',
  invite_code text not null unique,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  family_id uuid not null references public.families (id) on delete cascade,
  name text not null,
  telegram_chat_id text unique,
  telegram_link_code text unique,
  telegram_link_expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  description text,
  starts_at timestamptz not null,
  location text,
  source public.entry_source not null default 'web',
  created_at timestamptz not null default now()
);
create index events_family_starts_idx on public.events (family_id, starts_at);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  type public.transaction_type not null,
  amount numeric(10, 2) not null check (amount > 0),
  category text not null,
  description text,
  occurred_at timestamptz not null default now(),
  source public.entry_source not null default 'web',
  created_at timestamptz not null default now()
);
create index transactions_family_occurred_idx on public.transactions (family_id, occurred_at);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  description text,
  due_date timestamptz,
  done boolean not null default false,
  source public.entry_source not null default 'web',
  created_at timestamptz not null default now()
);
create index tasks_family_done_idx on public.tasks (family_id, done);

-- Família do usuário logado (security definer evita recursão nas políticas)
create function public.current_family_id() returns uuid
language sql stable security definer set search_path = ''
as $$ select family_id from public.profiles where id = auth.uid() $$;

-- Ao criar um usuário, cria o perfil usando o código de convite informado no cadastro
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_family_id uuid;
begin
  select id into v_family_id from public.families
   where invite_code = new.raw_user_meta_data ->> 'invite_code';

  if v_family_id is null then
    raise exception 'Código da família inválido';
  end if;

  insert into public.profiles (id, family_id, name)
  values (
    new.id,
    v_family_id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'name'), ''), split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Código de 8 dígitos, válido por 15 minutos, para vincular o Telegram
create function public.generate_telegram_code() returns text
language plpgsql security definer set search_path = ''
as $$
declare
  v_code text;
begin
  if auth.uid() is null then
    raise exception 'Não autenticado';
  end if;

  loop
    v_code := (
      (('x' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 7))::bit(28)::int % 90000000) + 10000000
    )::text;
    begin
      update public.profiles
         set telegram_link_code = v_code,
             telegram_link_expires_at = now() + interval '15 minutes'
       where id = auth.uid();
      exit;
    exception when unique_violation then
      null;
    end;
  end loop;

  return v_code;
end;
$$;

create function public.unlink_telegram() returns void
language sql security definer set search_path = ''
as $$
  update public.profiles
     set telegram_chat_id = null, telegram_link_code = null, telegram_link_expires_at = null
   where id = auth.uid();
$$;

create function public.my_telegram_linked() returns boolean
language sql stable security definer set search_path = ''
as $$ select coalesce((select telegram_chat_id is not null from public.profiles where id = auth.uid()), false) $$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.generate_telegram_code() from public, anon;
revoke execute on function public.unlink_telegram() from public, anon;
revoke execute on function public.my_telegram_linked() from public, anon;
revoke execute on function public.current_family_id() from public, anon;
grant execute on function public.generate_telegram_code() to authenticated;
grant execute on function public.unlink_telegram() to authenticated;
grant execute on function public.my_telegram_linked() to authenticated;
grant execute on function public.current_family_id() to authenticated;

-- Segurança por linha (RLS): cada pessoa só enxerga a própria família
alter table public.families enable row level security;
alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.transactions enable row level security;
alter table public.tasks enable row level security;

revoke all on public.families, public.profiles, public.events, public.transactions, public.tasks from anon;
revoke all on public.profiles from authenticated;
revoke all on public.families from authenticated;
grant select (id, name, timezone, invite_code) on public.families to authenticated;
grant select (id, family_id, name, created_at) on public.profiles to authenticated;

create policy "ver própria família" on public.families
  for select to authenticated using (id = public.current_family_id());

create policy "ver perfis da família" on public.profiles
  for select to authenticated using (family_id = public.current_family_id());

create policy "ver eventos da família" on public.events
  for select to authenticated using (family_id = public.current_family_id());
create policy "criar evento" on public.events
  for insert to authenticated
  with check (family_id = public.current_family_id() and user_id = auth.uid());
create policy "editar evento da família" on public.events
  for update to authenticated
  using (family_id = public.current_family_id())
  with check (family_id = public.current_family_id());
create policy "remover evento da família" on public.events
  for delete to authenticated using (family_id = public.current_family_id());

create policy "ver lançamentos da família" on public.transactions
  for select to authenticated using (family_id = public.current_family_id());
create policy "criar lançamento" on public.transactions
  for insert to authenticated
  with check (family_id = public.current_family_id() and user_id = auth.uid());
create policy "editar lançamento da família" on public.transactions
  for update to authenticated
  using (family_id = public.current_family_id())
  with check (family_id = public.current_family_id());
create policy "remover lançamento da família" on public.transactions
  for delete to authenticated using (family_id = public.current_family_id());

create policy "ver tarefas da família" on public.tasks
  for select to authenticated using (family_id = public.current_family_id());
create policy "criar tarefa" on public.tasks
  for insert to authenticated
  with check (family_id = public.current_family_id() and user_id = auth.uid());
create policy "editar tarefa da família" on public.tasks
  for update to authenticated
  using (family_id = public.current_family_id())
  with check (family_id = public.current_family_id());
create policy "remover tarefa da família" on public.tasks
  for delete to authenticated using (family_id = public.current_family_id());
