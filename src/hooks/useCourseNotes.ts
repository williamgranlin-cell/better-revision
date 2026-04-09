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
  subcategory_id: string | null;
  name: string;
  order_index: number;
  created_at: string;
}

export interface CourseSubcategory {
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
  const [subcategories, setSubcategories] = useState<CourseSubcategory[]>([]);
  const [chapters, setChapters] = useState<CourseChapter[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();
  const db = supabase as any;

  const fetchSubjects = useCallback(async () => {
    if (!user) {
      setSubjects([]);
      return;
    }
    const { data, error } = await supabase
      .from("course_subjects")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });
    if (!error && data) setSubjects(data);
  }, [user]);

  const fetchSubcategories = useCallback(async () => {
    if (!user) {
      setSubcategories([]);
      return;
    }

    const { data, error } = await db
      .from("course_subcategories")
      .select("*")
      .eq("user_id", user.id)
      .order("order_index", { ascending: true });

    if (!error && data) setSubcategories(data as CourseSubcategory[]);
  }, [db, user]);

  const fetchChapters = useCallback(async () => {
    if (!user) {
      setChapters([]);
      return;
    }
    const { data, error } = await supabase
      .from("course_chapters")
      .select("*")
      .eq("user_id", user.id)
      .order("order_index", { ascending: true });
    if (!error && data) setChapters(data as CourseChapter[]);
  }, [user]);

  const refetch = useCallback(async () => {
    if (!user) {
      setSubjects([]);
      setSubcategories([]);
      setChapters([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    await Promise.all([fetchSubjects(), fetchSubcategories(), fetchChapters()]);
    setLoading(false);
  }, [fetchChapters, fetchSubjects, fetchSubcategories, user]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

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
    setSubcategories((prev) => prev.filter((s) => s.subject_id !== id));
    setChapters((prev) => prev.filter((c) => c.subject_id !== id));
  };

  const addSubcategory = async (subjectId: string, name: string) => {
    if (!user) return null;

    const existingSubcategories = subcategories.filter((s) => s.subject_id === subjectId);
    const { data, error } = await db
      .from("course_subcategories")
      .insert({ user_id: user.id, subject_id: subjectId, name, order_index: existingSubcategories.length })
      .select()
      .single();

    if (error) {
      toast({ title: "Erreur", description: "Impossible de créer la sous-catégorie", variant: "destructive" });
      return null;
    }

    setSubcategories((prev) => [...prev, data as CourseSubcategory]);
    return data as CourseSubcategory;
  };

  const deleteSubcategory = async (id: string) => {
    const { error: detachError } = await db
      .from("course_chapters")
      .update({ subcategory_id: null })
      .eq("subcategory_id", id);

    if (detachError) {
      toast({ title: "Erreur", description: "Impossible de détacher les cours de la sous-catégorie", variant: "destructive" });
      return;
    }

    const { error } = await db.from("course_subcategories").delete().eq("id", id);
    if (error) {
      toast({ title: "Erreur", description: "Impossible de supprimer la sous-catégorie", variant: "destructive" });
      return;
    }

    setSubcategories((prev) => prev.filter((s) => s.id !== id));
    setChapters((prev) => prev.map((chapter) => chapter.subcategory_id === id ? { ...chapter, subcategory_id: null } : chapter));
  };

  const addChapter = async (subjectId: string, name: string, subcategoryId?: string | null) => {
    if (!user) return null;

    const normalizedSubcategoryId = subcategoryId ?? null;
    const existingChapters = chapters.filter(
      (c) => c.subject_id === subjectId && (c.subcategory_id ?? null) === normalizedSubcategoryId
    );

    const { data, error } = await supabase
      .from("course_chapters")
      .insert({ user_id: user.id, subject_id: subjectId, subcategory_id: normalizedSubcategoryId, name, order_index: existingChapters.length } as any)
      .select()
      .single();
    if (error) {
      toast({ title: "Erreur", description: "Impossible de créer le chapitre", variant: "destructive" });
      return null;
    }
    setChapters((prev) => [...prev, data as CourseChapter]);
    return data as CourseChapter;
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

  return {
    subjects,
    subcategories,
    chapters,
    loading,
    addSubject,
    deleteSubject,
    addSubcategory,
    deleteSubcategory,
    addChapter,
    deleteChapter,
    getNote,
    saveNote,
    refetch,
  };
};
