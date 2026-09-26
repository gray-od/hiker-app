-- Этап 1 из 3: функции для атомарного лимита бесплатных сообщений ИИ.
-- Пока права на ai_usage у authenticated не отозваны — старый код продолжает работать.
-- Отзыв прав и снятие политик — отдельной миграцией ПОСЛЕ выкладки кода.

create or replace function public.consume_ai_message(p_user_id uuid, p_limit integer)
returns table (allowed boolean, used integer)
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_today date := (now() at time zone 'utc')::date;
  v_used integer;
begin
  if p_user_id is null or p_limit is null or p_limit < 1 then
    raise exception 'consume_ai_message: invalid arguments' using errcode = '22023';
  end if;

  -- Одно атомарное списание: конфликт по (user_id, date) обновляет строку под блокировкой,
  -- условие message_count < p_limit не даёт выйти за предел. Если условие не выполнено,
  -- RETURNING не возвращает строку и v_used остаётся null.
  insert into public.ai_usage (user_id, date, message_count)
  values (p_user_id, v_today, 1)
  on conflict (user_id, date) do update
    set message_count = public.ai_usage.message_count + 1
    where public.ai_usage.message_count < p_limit
  returning message_count into v_used;

  if v_used is not null then
    return query select true, v_used;
    return;
  end if;

  select message_count into v_used
    from public.ai_usage
   where user_id = p_user_id and date = v_today;

  return query select false, coalesce(v_used, p_limit);
end;
$$;

revoke all on function public.consume_ai_message(uuid, integer) from public;
revoke all on function public.consume_ai_message(uuid, integer) from anon;
revoke all on function public.consume_ai_message(uuid, integer) from authenticated;
grant execute on function public.consume_ai_message(uuid, integer) to service_role;

create or replace function public.get_ai_usage_today(p_limit integer)
returns table (used integer, remaining integer, limit_reached boolean)
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_today date := (now() at time zone 'utc')::date;
  v_used integer;
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'get_ai_usage_today: not authenticated' using errcode = '28000';
  end if;

  select message_count into v_used
    from public.ai_usage
   where user_id = v_uid and date = v_today;

  v_used := coalesce(v_used, 0);

  return query select v_used,
                      greatest(coalesce(p_limit, 0) - v_used, 0),
                      v_used >= coalesce(p_limit, 0);
end;
$$;

revoke all on function public.get_ai_usage_today(integer) from public;
revoke all on function public.get_ai_usage_today(integer) from anon;
grant execute on function public.get_ai_usage_today(integer) to authenticated;
