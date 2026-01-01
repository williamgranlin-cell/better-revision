-- Fix subscriptions table: Add restrictive policies for INSERT, UPDATE, DELETE
-- Only service role should be able to modify subscriptions (via webhooks)

-- Policy to prevent any user INSERT on subscriptions (only service role via edge functions)
CREATE POLICY "Service role can insert subscriptions" 
ON public.subscriptions 
FOR INSERT 
WITH CHECK (false);

-- Policy to prevent any user UPDATE on subscriptions (only service role via edge functions)
CREATE POLICY "Service role can update subscriptions" 
ON public.subscriptions 
FOR UPDATE 
USING (false);

-- Policy to prevent any user DELETE on subscriptions
CREATE POLICY "No one can delete subscriptions" 
ON public.subscriptions 
FOR DELETE 
USING (false);

-- Fix profiles table: Add DELETE policy for users to delete their own profile
CREATE POLICY "Users can delete their own profile" 
ON public.profiles 
FOR DELETE 
USING (auth.uid() = id);