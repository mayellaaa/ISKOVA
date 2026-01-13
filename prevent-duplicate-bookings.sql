-- Prevent duplicate bookings at database level
-- Run this in Supabase SQL Editor

-- Add unique constraint to prevent same lab/date/time combination
CREATE UNIQUE INDEX IF NOT EXISTS unique_lab_booking 
ON public.bookings(lab, date, time);
