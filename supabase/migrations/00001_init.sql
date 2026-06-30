-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table (extends Supabase auth.users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  name TEXT,
  lang TEXT DEFAULT 'uk',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Gear items (user's gear library)
CREATE TABLE public.gear_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  weight_g INTEGER DEFAULT 0,
  season TEXT DEFAULT 'all',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Gear lists (packing lists for trips)
CREATE TABLE public.gear_lists (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  season TEXT DEFAULT 'summer',
  trip_date DATE,
  shared_link TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- List items (gear items in a list with packing state)
CREATE TABLE public.list_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  list_id UUID REFERENCES public.gear_lists(id) ON DELETE CASCADE NOT NULL,
  gear_item_id UUID REFERENCES public.gear_items(id) ON DELETE SET NULL,
  quantity INTEGER DEFAULT 1,
  is_packed BOOLEAN DEFAULT FALSE,
  worn BOOLEAN DEFAULT FALSE,
  consumable BOOLEAN DEFAULT FALSE
);

-- Meal plans
CREATE TABLE public.meal_plans (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  days_count INTEGER DEFAULT 1,
  total_weight_g INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Meal days
CREATE TABLE public.meal_days (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  plan_id UUID REFERENCES public.meal_plans(id) ON DELETE CASCADE NOT NULL,
  day_number INTEGER NOT NULL,
  total_calories INTEGER DEFAULT 0,
  total_weight_g INTEGER DEFAULT 0
);

-- Meal entries (individual food items per meal)
CREATE TABLE public.meal_entries (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  day_id UUID REFERENCES public.meal_days(id) ON DELETE CASCADE NOT NULL,
  meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'snack', 'dinner')),
  name TEXT NOT NULL,
  weight_g INTEGER DEFAULT 0,
  calories INTEGER DEFAULT 0,
  protein_g REAL DEFAULT 0,
  fat_g REAL DEFAULT 0,
  carbs_g REAL DEFAULT 0
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gear_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gear_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_entries ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read/update their own
CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Gear items: users own their items
CREATE POLICY "Users can CRUD own gear" ON public.gear_items FOR ALL USING (auth.uid() = user_id);

-- Gear lists: users own their lists
CREATE POLICY "Users can CRUD own lists" ON public.gear_lists FOR ALL USING (auth.uid() = user_id);

-- List items: accessible if user owns the parent list
CREATE POLICY "Users can CRUD own list items" ON public.list_items FOR ALL USING (
  EXISTS (SELECT 1 FROM public.gear_lists WHERE id = list_items.list_id AND user_id = auth.uid())
);

-- Meal plans: users own their plans
CREATE POLICY "Users can CRUD own meal plans" ON public.meal_plans FOR ALL USING (auth.uid() = user_id);

-- Meal days: accessible if user owns parent plan
CREATE POLICY "Users can CRUD own meal days" ON public.meal_days FOR ALL USING (
  EXISTS (SELECT 1 FROM public.meal_plans WHERE id = meal_days.plan_id AND user_id = auth.uid())
);

-- Meal entries: accessible if user owns parent plan via day
CREATE POLICY "Users can CRUD own meal entries" ON public.meal_entries FOR ALL USING (
  EXISTS (SELECT 1 FROM public.meal_days d JOIN public.meal_plans p ON d.plan_id = p.id WHERE d.id = meal_entries.day_id AND p.user_id = auth.uid())
);
