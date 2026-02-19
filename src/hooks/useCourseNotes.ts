import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface CourseSubject {
  id: string;
  name: string;
  color: string;
  emoji: string;
  created_at: string;
}

export interface CourseChapter {
  id: string;
  subject_id: string;
  name: string;
  order_index: number;
  created_at: string;
}

export interface CourseNote {
  id: string;
  chapter_id: string;
  content: string;
  ai_enhanced_content: string | null;
  updated_at: string;
}

export const useCourseNotes = () => {
  const [subjects, setSubjects] = useState<CourseSubject[]>([]);
  const [chapters, setChapters] = useState<CourseChapter[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchSubjects = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("course_subjects")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });
    if (!error && data) setSubjects(data);
    setLoading(false);
  }, [user]);

  const fetchChapters = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("course_chapters")
      .select("*")
      .eq("user_id", user.id)
      .order("order_index", { ascending: true });
    if (!error && data) setChapters(data);
  }, [user]);

  useEffect(() => {
    fetchSubjects();
    fetchChapters();
  }, [fetchSubjects, fetchChapters]);

  const addSubject = async (name: string, color: string, emoji: string) => {
    if (!user) return null;
    const { data, error } = await supabase
      .from("course_subjects")
      .insert({ user_id: user.id, name, color, emoji })
      .select()
      .single();
    if (error) {
      toast({ title: "Erreur", description: "Impossible de créer la matière", variant: "destructive" });
      return null;
    }
    setSubjects((prev) => [...prev, data]);
    return data;
  };

  const deleteSubject = async (id: string) => {
    const { error } = await supabase.from("course_subjects").delete().eq("id", id);
    if (error) {
      toast({ title: "Erreur", description: "Impossible de supprimer la matière", variant: "destructive" });
      return;
    }
    setSubjects((prev) => prev.filter((s) => s.id !== id));
    setChapters((prev) => prev.filter((c) => c.subject_id !== id));
  };

  const addChapter = async (subjectId: string, name: string) => {
    if (!user) return null;
    const existingChapters = chapters.filter((c) => c.subject_id === subjectId);
    const { data, error } = await supabase
      .from("course_chapters")
      .insert({ user_id: user.id, subject_id: subjectId, name, order_index: existingChapters.length })
      .select()
      .single();
    if (error) {
      toast({ title: "Erreur", description: "Impossible de créer le chapitre", variant: "destructive" });
      return null;
    }
    setChapters((prev) => [...prev, data]);
    return data;
  };

  const deleteChapter = async (id: string) => {
    const { error } = await supabase.from("course_chapters").delete().eq("id", id);
    if (error) {
      toast({ title: "Erreur", description: "Impossible de supprimer le chapitre", variant: "destructive" });
      return;
    }
    setChapters((prev) => prev.filter((c) => c.id !== id));
  };

  const getNote = async (chapterId: string): Promise<CourseNote | null> => {
    if (!user) return null;
    const { data, error } = await supabase
      .from("course_notes")
      .select("*")
      .eq("chapter_id", chapterId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (error) {
      console.error("getNote error:", error);
      return null;
    }
    return data;
  };

  const saveNote = async (chapterId: string, content: string, aiEnhancedContent?: string) => {
    if (!user) return;

    const { error } = await supabase
      .from("course_notes")
      .upsert(
        {
          user_id: user.id,
          chapter_id: chapterId,
          content,
          ...(aiEnhancedContent !== undefined ? { ai_enhanced_content: aiEnhancedContent } : {}),
        },
        { onConflict: "chapter_id,user_id" }
      );

    if (error) {
      console.error("saveNote error:", error);
      toast({ title: "Erreur", description: "Impossible de sauvegarder le cours", variant: "destructive" });
    }
  };

  return { subjects, chapters, loading, addSubject, deleteSubject, addChapter, deleteChapter, getNote, saveNote, refetch: fetchSubjects };
};
