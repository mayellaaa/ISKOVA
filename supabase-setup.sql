-- ISKOVA Lab Booking System - Supabase Database Setup
-- Run this SQL in your Supabase SQL Editor

-- Create users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  user_id TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create labs table
CREATE TABLE IF NOT EXISTS public.labs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  capacity INTEGER NOT NULL,
  computers INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('small', 'medium', 'large')),
  status TEXT NOT NULL CHECK (status IN ('available', 'limited', 'full')),
  building TEXT NOT NULL,
  floor TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create bookings table
CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  lab TEXT NOT NULL,
  date DATE NOT NULL,
  time TIME NOT NULL,
  system TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'confirmed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.labs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- RLS Policies for labs table (public read)
CREATE POLICY "Anyone can view labs"
  ON public.labs FOR SELECT
  TO authenticated, anon
  USING (true);

-- RLS Policies for bookings table
CREATE POLICY "Users can view own bookings"
  ON public.bookings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own bookings"
  ON public.bookings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bookings"
  ON public.bookings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own bookings"
  ON public.bookings FOR DELETE
  USING (auth.uid() = user_id);

-- Insert sample labs data
INSERT INTO public.labs (name, capacity, computers, type, status, building, floor) VALUES
  ('Lab A', 40, 40, 'large', 'available', 'CS Building', '2nd Floor'),
  ('Lab B', 25, 25, 'medium', 'limited', 'CS Building', '3rd Floor'),
  ('Lab C', 15, 15, 'small', 'available', 'Engineering', '1st Floor'),
  ('Lab D', 50, 50, 'large', 'full', 'Library', 'Basement'),
  ('Lab E', 20, 20, 'small', 'available', 'Science Building', '4th Floor')
ON CONFLICT (name) DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON public.bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_date_time ON public.bookings(date, time);
CREATE INDEX IF NOT EXISTS idx_labs_name ON public.labs(name);

-- Create function to automatically create user profile after signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, user_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'user_id', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to call function on new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
