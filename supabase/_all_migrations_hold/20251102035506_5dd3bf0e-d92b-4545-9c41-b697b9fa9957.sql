-- Add INSERT policy for profiles to allow signup trigger to work
-- Even though the trigger function is SECURITY DEFINER, we need this for safety
CREATE POLICY "Allow signup to create profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

-- Also ensure profiles can be updated during signup
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());