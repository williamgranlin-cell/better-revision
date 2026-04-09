CREATE TABLE IF NOT EXISTS public.course_subcategories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  subject_id UUID NOT NULL,
  name TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.course_subcategories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own course_subcategories"
ON public.course_subcategories
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own course_subcategories"
ON public.course_subcategories
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own course_subcategories"
ON public.course_subcategories
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own course_subcategories"
ON public.course_subcategories
FOR DELETE
USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_course_subcategories_user_subject_order
ON public.course_subcategories (user_id, subject_id, order_index);

ALTER TABLE public.course_chapters
ADD COLUMN IF NOT EXISTS subcategory_id UUID;

CREATE INDEX IF NOT EXISTS idx_course_chapters_subcategory_id
ON public.course_chapters (subcategory_id);

CREATE OR REPLACE FUNCTION public.validate_course_subcategory_ownership()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.subcategory_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.course_subcategories cs
      WHERE cs.id = NEW.subcategory_id
        AND cs.user_id = NEW.user_id
        AND cs.subject_id = NEW.subject_id
    ) THEN
      RAISE EXCEPTION 'Invalid subcategory for this chapter';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS validate_course_chapter_subcategory ON public.course_chapters;
CREATE TRIGGER validate_course_chapter_subcategory
BEFORE INSERT OR UPDATE ON public.course_chapters
FOR EACH ROW
EXECUTE FUNCTION public.validate_course_subcategory_ownership();