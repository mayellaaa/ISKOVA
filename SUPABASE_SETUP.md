# Supabase Setup Guide

## Step 1: Create Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up / Log in
3. Click "New Project"
4. Fill in project details:
   - Name: `iskova-labs`
   - Database Password: (create a strong password)
   - Region: Choose closest to you
5. Click "Create new project"

## Step 2: Get Your Credentials

1. In your Supabase project dashboard, go to **Settings** → **API**
2. Copy these values:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon public** key (starts with `eyJ...`)

## Step 3: Update Configuration

Open `js/supabase-config.js` and replace:

```javascript
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
```

With your actual values:

```javascript
const SUPABASE_URL = 'https://xxxxx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbG...your-key...';
```

## Step 4: Set Up Database Tables

1. In Supabase dashboard, go to **SQL Editor**
2. Click "New Query"
3. Copy the entire contents of `supabase-setup.sql`
4. Paste into the SQL editor
5. Click "Run" or press `Ctrl+Enter`

This will create:
- `users` table
- `labs` table
- `bookings` table
- Row Level Security policies
- Sample lab data
- Automatic user profile creation

## Step 5: Configure Email Authentication

1. Go to **Authentication** → **Providers**
2. Enable **Email** provider
3. Configure email templates (optional):
   - Go to **Authentication** → **Email Templates**
   - Customize confirmation and reset password emails

## Step 6: Test Your Setup

1. Open your application
2. Try to register a new user
3. Check your email for confirmation
4. Log in with your credentials
5. Create a test booking

## Database Schema

### users
- `id` (UUID) - Primary key, references auth.users
- `email` (TEXT) - User email
- `full_name` (TEXT) - User's full name
- `user_id` (TEXT) - Faculty/Student ID
- `created_at` (TIMESTAMPTZ) - Account creation date

### labs
- `id` (UUID) - Primary key
- `name` (TEXT) - Lab name
- `capacity` (INTEGER) - Maximum students
- `computers` (INTEGER) - Number of computers
- `type` (TEXT) - small, medium, or large
- `status` (TEXT) - available, limited, or full
- `building` (TEXT) - Building location
- `floor` (TEXT) - Floor location
- `created_at` (TIMESTAMPTZ) - Record creation date

### bookings
- `id` (UUID) - Primary key
- `user_id` (UUID) - References users
- `lab` (TEXT) - Lab name
- `date` (DATE) - Booking date
- `time` (TIME) - Booking time
- `system` (TEXT) - Assigned computer
- `status` (TEXT) - active, confirmed, or cancelled
- `created_at` (TIMESTAMPTZ) - Booking creation date

## Security

Row Level Security (RLS) is enabled on all tables:
- Users can only see and modify their own data
- Labs are publicly viewable
- Bookings are private to each user

## Troubleshooting

### "Invalid API key"
- Check that you copied the correct anon key
- Make sure there are no extra spaces

### "Failed to create booking"
- Verify database tables were created correctly
- Check browser console for errors
- Ensure you're logged in

### Email confirmation not received
- Check spam folder
- Verify email provider is configured in Supabase
- For development, you can disable email confirmation in Authentication settings

## Optional: Disable Email Confirmation (Development Only)

1. Go to **Authentication** → **Providers**
2. Scroll to **Email Auth**
3. Disable "Confirm email"
4. Save changes

⚠️ Re-enable this for production!

## Next Steps

Your Supabase backend is now ready! All authentication and data storage will be handled automatically through the integrated API calls.
