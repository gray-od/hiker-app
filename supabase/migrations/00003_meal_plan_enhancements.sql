-- Round 7: Smart meal planning — add plan type, people count, daily targets
ALTER TABLE meal_plans ADD COLUMN IF NOT EXISTS plan_type text NOT NULL DEFAULT 'standard';
ALTER TABLE meal_plans ADD COLUMN IF NOT EXISTS people_count integer NOT NULL DEFAULT 1;
ALTER TABLE meal_plans ADD COLUMN IF NOT EXISTS target_calories integer NOT NULL DEFAULT 3000;
ALTER TABLE meal_plans ADD COLUMN IF NOT EXISTS target_weight_g integer NOT NULL DEFAULT 650;
