-- Add recurrence_type column to schedule_items table
ALTER TABLE public.schedule_items 
ADD COLUMN recurrence_type text NOT NULL DEFAULT 'weekly';

-- Add comment for clarity
COMMENT ON COLUMN public.schedule_items.recurrence_type IS 'Type of recurrence: none, weekly, biweekly, monthly';