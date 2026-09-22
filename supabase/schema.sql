-- ==============================================================================
-- SMARTSTOCK AI - SUPABASE COMPLETE DATABASE & STORAGE CONFIGURATION
-- ==============================================================================
-- Run this script in your Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 2. USER PROFILES TABLE (profiles)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  username TEXT,
  email TEXT,
  phone TEXT,
  profile_image_url TEXT,
  address TEXT,
  language TEXT DEFAULT 'English',
  currency TEXT DEFAULT 'NPR',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups by auth_user_id
CREATE INDEX IF NOT EXISTS idx_profiles_auth_user_id ON public.profiles(auth_user_id);

-- Enable Row Level Security (RLS) on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles RLS Policies:
-- Users can only SELECT their own profile
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = auth_user_id);

-- Users can only INSERT their own profile
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = auth_user_id);

-- Users can only UPDATE their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = auth_user_id)
  WITH CHECK (auth.uid() = auth_user_id);

-- ==============================================================================
-- 3. AUTOMATIC PROFILE CREATION TRIGGER
-- ==============================================================================
-- Automatically creates a profile record whenever a new user signs up in auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    auth_user_id,
    full_name,
    username,
    email,
    phone,
    profile_image_url,
    language,
    currency,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    LOWER(REGEXP_REPLACE(COALESCE(NEW.raw_user_meta_data->>'username', SPLIT_PART(NEW.email, '@', 1), 'user_' || SUBSTRING(NEW.id::text, 1, 6)), '[^a-zA-Z0-9_]', '', 'g')),
    COALESCE(NEW.email, ''),
    COALESCE(NEW.phone, ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', ''),
    'English',
    'NPR',
    NOW(),
    NOW()
  )
  ON CONFLICT (auth_user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Drop existing trigger if present and recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- 4. PRODUCTS & INVENTORY TABLE (products)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  barcode TEXT,
  price NUMERIC DEFAULT 0,
  purchase_price NUMERIC DEFAULT 0,
  quantity NUMERIC DEFAULT 0,
  manufacture_date TEXT,
  expiry_date TEXT,
  best_before_months NUMERIC,
  unit TEXT DEFAULT 'pcs',
  description TEXT,
  category TEXT DEFAULT 'General',
  batch_number TEXT,
  rack_location TEXT,
  supplier TEXT,
  mrp NUMERIC DEFAULT 0,
  min_stock_alert NUMERIC DEFAULT 5,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast user queries
CREATE INDEX IF NOT EXISTS idx_products_user_id ON public.products(user_id);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON public.products(user_id, barcode);

-- Enable RLS on products
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Products RLS Policies:
DROP POLICY IF EXISTS "Users can view own products" ON public.products;
CREATE POLICY "Users can view own products"
  ON public.products
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own products" ON public.products;
CREATE POLICY "Users can insert own products"
  ON public.products
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own products" ON public.products;
CREATE POLICY "Users can update own products"
  ON public.products
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own products" ON public.products;
CREATE POLICY "Users can delete own products"
  ON public.products
  FOR DELETE
  USING (auth.uid() = user_id);

-- ==============================================================================
-- 5. INVENTORY TRANSACTIONS TABLE (inventory_transactions)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.inventory_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  product_name TEXT,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('IN', 'OUT')),
  subtype TEXT,
  quantity NUMERIC NOT NULL,
  price NUMERIC DEFAULT 0,
  total_amount NUMERIC DEFAULT 0,
  notes TEXT,
  reference_invoice TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_tx_user_id ON public.inventory_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_inventory_tx_product_id ON public.inventory_transactions(product_id);

-- Enable RLS on inventory_transactions
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own transactions" ON public.inventory_transactions;
CREATE POLICY "Users can view own transactions"
  ON public.inventory_transactions
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own transactions" ON public.inventory_transactions;
CREATE POLICY "Users can insert own transactions"
  ON public.inventory_transactions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own transactions" ON public.inventory_transactions;
CREATE POLICY "Users can update own transactions"
  ON public.inventory_transactions
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own transactions" ON public.inventory_transactions;
CREATE POLICY "Users can delete own transactions"
  ON public.inventory_transactions
  FOR DELETE
  USING (auth.uid() = user_id);

-- ==============================================================================
-- 6. STORAGE BUCKET: profile-images
-- ==============================================================================
-- Create the public storage bucket for user profile photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile-images',
  'profile-images',
  true,
  5242880, -- 5 MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];

-- Storage RLS Policies:
-- 1. Anyone can view public profile pictures
DROP POLICY IF EXISTS "Public Profile Images are viewable" ON storage.objects;
CREATE POLICY "Public Profile Images are viewable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'profile-images');

-- 2. Authenticated users can only upload to their own folder: profile-images/{auth.uid()}/...
DROP POLICY IF EXISTS "Users can upload their own profile image" ON storage.objects;
CREATE POLICY "Users can upload their own profile image"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'profile-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- 3. Authenticated users can only update files in their own folder
DROP POLICY IF EXISTS "Users can update their own profile image" ON storage.objects;
CREATE POLICY "Users can update their own profile image"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'profile-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- 4. Authenticated users can only delete files in their own folder
DROP POLICY IF EXISTS "Users can delete their own profile image" ON storage.objects;
CREATE POLICY "Users can delete their own profile image"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'profile-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
