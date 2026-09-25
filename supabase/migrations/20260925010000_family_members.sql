-- Lista os membros da família e se cada um já vinculou o Telegram (sem expor o chat id)
create function public.family_members()
returns table (id uuid, name text, telegram_linked boolean)
language sql stable security definer set search_path = ''
as $$
  select p.id, p.name, p.telegram_chat_id is not null
    from public.profiles p
   where p.family_id = public.current_family_id()
   order by p.created_at
$$;

revoke execute on function public.family_members() from public, anon;
grant execute on function public.family_members() to authenticated;
