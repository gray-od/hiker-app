-- Этап 3 из 3: у пользователя отбирается право писать в свою строку ai_usage.
-- Применять ТОЛЬКО после выкладки кода, который считает лимит через consume_ai_message:
-- чат читает счётчик функцией get_ai_usage_today, поэтому права на таблицу больше не нужны.

revoke insert, update, truncate on public.ai_usage from authenticated;
revoke insert, update, truncate on public.ai_usage from anon;
revoke select on public.ai_usage from anon;

drop policy if exists "Users can insert own usage" on public.ai_usage;
drop policy if exists "Users can update own usage" on public.ai_usage;
