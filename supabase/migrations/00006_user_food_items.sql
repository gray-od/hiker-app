-- User custom food items
CREATE TABLE user_food_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other',
  calories_per100g NUMERIC NOT NULL DEFAULT 0,
  protein_per100g NUMERIC NOT NULL DEFAULT 0,
  fat_per100g NUMERIC NOT NULL DEFAULT 0,
  carbs_per100g NUMERIC NOT NULL DEFAULT 0,
  default_portion_g INTEGER NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE user_food_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own food items"
  ON user_food_items FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own food items"
  ON user_food_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own food items"
  ON user_food_items FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own food items"
  ON user_food_items FOR DELETE
  USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON user_food_items TO authenticated;
