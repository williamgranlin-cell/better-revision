
ALTER TABLE public.course_notes
  ADD CONSTRAINT course_notes_chapter_id_user_id_unique UNIQUE (chapter_id, user_id);
