DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

DROP POLICY IF EXISTS "Service role can insert subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Service role can update subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "No one can delete subscriptions" ON public.subscriptions;

CREATE POLICY "Block client inserts on subscriptions"
  ON public.subscriptions FOR INSERT TO authenticated, anon
  WITH CHECK (false);
CREATE POLICY "Block client updates on subscriptions"
  ON public.subscriptions FOR UPDATE TO authenticated, anon
  USING (false) WITH CHECK (false);
CREATE POLICY "Block client deletes on subscriptions"
  ON public.subscriptions FOR DELETE TO authenticated, anon
  USING (false);

CREATE POLICY "Block client inserts on usage_tracking"
  ON public.usage_tracking FOR INSERT TO authenticated, anon
  WITH CHECK (false);
CREATE POLICY "Block client updates on usage_tracking"
  ON public.usage_tracking FOR UPDATE TO authenticated, anon
  USING (false) WITH CHECK (false);
CREATE POLICY "Block client deletes on usage_tracking"
  ON public.usage_tracking FOR DELETE TO authenticated, anon
  USING (false);