
-- Create usage_tracking table to enforce daily limits server-side
CREATE TABLE IF NOT EXISTS public.usage_tracking (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  feature text NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  count integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, feature, date)
);

-- Enable RLS
ALTER TABLE public.usage_tracking ENABLE ROW LEVEL SECURITY;

-- Users can only view their own usage
CREATE POLICY "Users can view their own usage"
ON public.usage_tracking
FOR SELECT
USING (auth.uid() = user_id);

-- No direct insert/update/delete from client - only service role (edge functions)
-- Service role bypasses RLS by default

-- Trigger for updated_at
CREATE TRIGGER update_usage_tracking_updated_at
BEFORE UPDATE ON public.usage_tracking
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to check and increment usage (atomic, safe)
CREATE OR REPLACE FUNCTION public.check_and_increment_usage(
  _user_id uuid,
  _feature text,
  _limit integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _current_count integer;
  _today date := CURRENT_DATE;
BEGIN
  -- Upsert the usage record and get the new count atomically
  INSERT INTO public.usage_tracking (user_id, feature, date, count)
  VALUES (_user_id, _feature, _today, 1)
  ON CONFLICT (user_id, feature, date)
  DO UPDATE SET
    count = usage_tracking.count + 1,
    updated_at = now()
  RETURNING count INTO _current_count;

  IF _current_count > _limit THEN
    -- Rollback the increment since limit was exceeded
    UPDATE public.usage_tracking
    SET count = count - 1, updated_at = now()
    WHERE user_id = _user_id AND feature = _feature AND date = _today;
    
    RETURN jsonb_build_object('allowed', false, 'count', _current_count - 1, 'limit', _limit);
  END IF;

  RETURN jsonb_build_object('allowed', true, 'count', _current_count, 'limit', _limit);
END;
$$;
