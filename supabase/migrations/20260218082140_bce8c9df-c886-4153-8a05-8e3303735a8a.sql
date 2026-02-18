
-- Create course_subjects table (dossiers principaux)
CREATE TABLE public.course_subjects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT 'bg-blue-500',
  emoji TEXT NOT NULL DEFAULT '📚',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.course_subjects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own course_subjects" ON public.course_subjects
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own course_subjects" ON public.course_subjects
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own course_subjects" ON public.course_subjects
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own course_subjects" ON public.course_subjects
  FOR DELETE USING (auth.uid() = user_id);

-- Create course_chapters table (sous-dossiers / chapitres)
CREATE TABLE public.course_chapters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  subject_id UUID NOT NULL REFERENCES public.course_subjects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.course_chapters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own course_chapters" ON public.course_chapters
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own course_chapters" ON public.course_chapters
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own course_chapters" ON public.course_chapters
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own course_chapters" ON public.course_chapters
  FOR DELETE USING (auth.uid() = user_id);

-- Create course_notes table (contenu du cours par chapitre)
CREATE TABLE public.course_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  chapter_id UUID NOT NULL REFERENCES public.course_chapters(id) ON DELETE CASCADE,
  content TEXT NOT NULL DEFAULT '',
  ai_enhanced_content TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.course_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own course_notes" ON public.course_notes
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own course_notes" ON public.course_notes
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own course_notes" ON public.course_notes
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own course_notes" ON public.course_notes
  FOR DELETE USING (auth.uid() = user_id);

-- Triggers for updated_at
CREATE TRIGGER update_course_subjects_updated_at
  BEFORE UPDATE ON public.course_subjects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_course_chapters_updated_at
  BEFORE UPDATE ON public.course_chapters
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_course_notes_updated_at
  BEFORE UPDATE ON public.course_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
