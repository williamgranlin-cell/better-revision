-- Create flashcard_sets table
CREATE TABLE IF NOT EXISTS public.flashcard_sets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on flashcard_sets
ALTER TABLE public.flashcard_sets ENABLE ROW LEVEL SECURITY;

-- Create policies for flashcard_sets
CREATE POLICY "Users can view their own flashcard sets"
  ON public.flashcard_sets
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own flashcard sets"
  ON public.flashcard_sets
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own flashcard sets"
  ON public.flashcard_sets
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own flashcard sets"
  ON public.flashcard_sets
  FOR DELETE
  USING (auth.uid() = user_id);

-- Add set_id to flashcards table
ALTER TABLE public.flashcards 
ADD COLUMN IF NOT EXISTS set_id UUID REFERENCES public.flashcard_sets(id) ON DELETE CASCADE;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_flashcards_set_id ON public.flashcards(set_id);

-- Add trigger for updated_at
CREATE TRIGGER update_flashcard_sets_updated_at
  BEFORE UPDATE ON public.flashcard_sets
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();