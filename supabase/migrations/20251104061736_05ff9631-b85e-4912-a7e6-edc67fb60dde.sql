-- Create controls table
CREATE TABLE public.controls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  date DATE NOT NULL,
  importance TEXT NOT NULL CHECK (importance IN ('low', 'medium', 'high')),
  target_grade TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on controls
ALTER TABLE public.controls ENABLE ROW LEVEL SECURITY;

-- RLS policies for controls
CREATE POLICY "Users can view their own controls"
ON public.controls FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own controls"
ON public.controls FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own controls"
ON public.controls FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own controls"
ON public.controls FOR DELETE
USING (auth.uid() = user_id);

-- Create objectives table
CREATE TABLE public.objectives (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on objectives
ALTER TABLE public.objectives ENABLE ROW LEVEL SECURITY;

-- RLS policies for objectives
CREATE POLICY "Users can view their own objectives"
ON public.objectives FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own objectives"
ON public.objectives FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own objectives"
ON public.objectives FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own objectives"
ON public.objectives FOR DELETE
USING (auth.uid() = user_id);

-- Create courses table
CREATE TABLE public.courses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  intervals INTEGER[] NOT NULL,
  first_revision_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on courses
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

-- RLS policies for courses
CREATE POLICY "Users can view their own courses"
ON public.courses FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own courses"
ON public.courses FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own courses"
ON public.courses FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own courses"
ON public.courses FOR DELETE
USING (auth.uid() = user_id);

-- Create triggers for updated_at
CREATE TRIGGER update_controls_updated_at
BEFORE UPDATE ON public.controls
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_objectives_updated_at
BEFORE UPDATE ON public.objectives
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_courses_updated_at
BEFORE UPDATE ON public.courses
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();