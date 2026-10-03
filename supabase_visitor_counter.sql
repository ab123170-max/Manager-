-- ============================================================================
-- ScanMe AI — Visitor Counter Table, Security Policies & Atomic RPC
-- ============================================================================

-- 1. Create app_visitors table
CREATE TABLE IF NOT EXISTS public.app_visitors (
    id TEXT PRIMARY KEY,
    count BIGINT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Insert initial total_visitors row if not present
INSERT INTO public.app_visitors (id, count, updated_at)
VALUES ('total_visitors', 1, NOW())
ON CONFLICT (id) DO NOTHING;

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.app_visitors ENABLE ROW LEVEL SECURITY;

-- 4. Create public SELECT policy (anyone can view visitor count)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'app_visitors' AND policyname = 'Allow public read app_visitors'
    ) THEN
        CREATE POLICY "Allow public read app_visitors" 
        ON public.app_visitors FOR SELECT 
        USING (true);
    END IF;
END $$;

-- 5. Create public INSERT/UPDATE policy
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'app_visitors' AND policyname = 'Allow public write app_visitors'
    ) THEN
        CREATE POLICY "Allow public write app_visitors" 
        ON public.app_visitors FOR ALL 
        USING (true)
        WITH CHECK (true);
    END IF;
END $$;

-- 6. Atomic increment RPC function for safe concurrent visitor count updates
CREATE OR REPLACE FUNCTION public.increment_visitor_count()
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_count BIGINT;
BEGIN
    INSERT INTO public.app_visitors (id, count, updated_at)
    VALUES ('total_visitors', 1, NOW())
    ON CONFLICT (id)
    DO UPDATE SET 
        count = public.app_visitors.count + 1,
        updated_at = NOW()
    RETURNING count INTO new_count;

    RETURN new_count;
END;
$$;

-- Grant EXECUTE permission to anon and authenticated roles
GRANT EXECUTE ON FUNCTION public.increment_visitor_count() TO anon, authenticated, service_role;
