-- Create table for saved revision content
CREATE TABLE public.revision_content (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('revision_sheet', 'mind_map', 'schema')),
  content TEXT,
  image_url TEXT,
  subject TEXT,
  is_public BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.revision_content ENABLE ROW LEVEL SECURITY;

-- Users can view their own content
CREATE POLICY "Users can view their own revision content"
ON public.revision_content
FOR SELECT
USING (auth.uid() = user_id);

-- Users can view all public content
CREATE POLICY "Anyone can view public revision content"
ON public.revision_content
FOR SELECT
USING (is_public = true);

-- Users can insert their own content
CREATE POLICY "Users can insert their own revision content"
ON public.revision_content
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own content
CREATE POLICY "Users can update their own revision content"
ON public.revision_content
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own content
CREATE POLICY "Users can delete their own revision content"
ON public.revision_content
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_revision_content_updated_at
BEFORE UPDATE ON public.revision_content
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();