
-- Allow public read access to accreditations for dashboard viewing
CREATE POLICY "Public can view all accreditations"
ON public.accreditations
FOR SELECT
USING (true);

-- Drop the restrictive user-only select policy
DROP POLICY IF EXISTS "Users can view their own accreditations" ON public.accreditations;
DROP POLICY IF EXISTS "Admins can view all accreditations" ON public.accreditations;

-- Allow authenticated users to insert accreditations (with their own user_id or a system user_id)
DROP POLICY IF EXISTS "Users can insert their own accreditations" ON public.accreditations;
CREATE POLICY "Authenticated users can insert accreditations"
ON public.accreditations
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Make user_id nullable for system-seeded data
ALTER TABLE public.accreditations ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.accreditations ALTER COLUMN user_id SET DEFAULT NULL;
