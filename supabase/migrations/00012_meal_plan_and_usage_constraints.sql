-- Ограничения, закрывающие порчу данных из интерфейса.
-- Перед применением проверено: планов с people_count < 1 — 0; дублей (plan_id, day_number) — 0;
-- отрицательных message_count — 0.

alter table public.meal_plans
  add constraint meal_plans_people_count_min check (people_count >= 1);

alter table public.meal_days
  add constraint meal_days_plan_day_unique unique (plan_id, day_number);

alter table public.ai_usage
  add constraint ai_usage_message_count_nonneg check (message_count >= 0);
