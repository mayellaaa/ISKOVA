-- ISKOVA Lab Booking System - Supabase Database Setup
-- Run this SQL in your Supabase SQL Editor

-- 1. CREATE USERS TABLE
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  user_id TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 2. CREATE LABS TABLE
CREATE TABLE IF NOT EXISTS public.labs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  capacity INTEGER NOT NULL,
  computers INTEGER NOT NULL,
  status TEXT NOT NULL,
  building TEXT NOT NULL,
  floor TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 3. CREATE BOOKINGS TABLE
CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lab TEXT NOT NULL,
  date DATE NOT NULL,
  time TIME NOT NULL,
  system TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW()
);

-- 4. ENABLE SECURITY
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.labs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- 5. SECURITY RULES FOR USERS (drop old ones first)
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;

CREATE POLICY "user_read_own" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "user_update_own" ON public.users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "user_insert_own" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);

-- 6. SECURITY RULES FOR LABS (drop old ones first)
DROP POLICY IF EXISTS "Anyone can view labs" ON public.labs;

CREATE POLICY "lab_read_all" ON public.labs FOR SELECT USING (true);

-- 7. SECURITY RULES FOR BOOKINGS (drop old ones first)
DROP POLICY IF EXISTS "Users can view own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can create own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can update own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can delete own bookings" ON public.bookings;

CREATE POLICY "booking_read_own" ON public.bookings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "booking_create_own" ON public.bookings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "booking_update_own" ON public.bookings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "booking_delete_own" ON public.bookings FOR DELETE USING (auth.uid() = user_id);

-- 8. ADD SAMPLE LABS
DELETE FROM public.labs;
INSERT INTO public.labs (name, capacity, computers, status, building, floor) VALUES
  ('Lab A', 50, 50, 'available', 'Southwing', '5th Floor'),
  ('Lab B', 50, 50, 'available', 'Southwing', '5th Floor'),
  ('Lab C', 50, 50, 'available', 'Southwing', '5th Floor'),
  ('Lab D', 50, 50, 'available', 'Southwing', '5th Floor'),
  ('Lab E', 50, 50, 'available', 'Southwing', '5th Floor')
ON CONFLICT (name) DO NOTHING;

-- 9. CREATE INDEXES
CREATE INDEX IF NOT EXISTS idx_bookings_user ON public.bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON public.bookings(date, time);
CREATE INDEX IF NOT EXISTS idx_labs_name ON public.labs(name);

-- 10. AUTO-CREATE USER PROFILE ON SIGNUP
DROP FUNCTION IF EXISTS public.create_user_profile() CASCADE;

CREATE OR REPLACE FUNCTION public.create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, user_id)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name', NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS create_user_on_signup ON auth.users;
CREATE TRIGGER create_user_on_signup
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.create_user_profile();
