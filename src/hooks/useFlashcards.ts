import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface Flashcard {
  id: string;
  user_id: string;
  question: string;
  answer: string;
  subject?: string;
  creation_method: "manual" | "import" | "ai" | "revision_sheet";
  times_reviewed: number;
  times_correct: number;
  created_at: string;
}

export const useFlashcards = () => {
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!user) return;
    fetchFlashcards();
  }, [user]);

  const fetchFlashcards = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("flashcards")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les flashcards",
        variant: "destructive",
      });
      return;
    }

    setFlashcards(data as Flashcard[] || []);
    setLoading(false);
  };

  const addFlashcard = async (
    question: string,
    answer: string,
    subject: string | undefined,
    creationMethod: "manual" | "import" | "ai" | "revision_sheet",
    setId?: string
  ) => {
    if (!user) return;

    const { error } = await supabase.from("flashcards").insert({
      user_id: user.id,
      question,
      answer,
      subject,
      creation_method: creationMethod,
      set_id: setId,
    });

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible de créer la flashcard",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Succès",
      description: "Flashcard créée !",
    });
    
    fetchFlashcards();
  };

  const addFlashcardBatch = async (
    flashcards: Array<{ question: string; answer: string }>,
    subject: string | undefined,
    creationMethod: "manual" | "import" | "ai" | "revision_sheet",
    setId?: string
  ) => {
    if (!user) return;

    const flashcardsToInsert = flashcards.map(fc => ({
      user_id: user.id,
      question: fc.question,
      answer: fc.answer,
      subject,
      creation_method: creationMethod,
      set_id: setId,
    }));

    const { error } = await supabase.from("flashcards").insert(flashcardsToInsert);

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible de créer les flashcards",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Succès",
      description: `${flashcards.length} flashcards créées !`,
    });
    
    fetchFlashcards();
  };

  const getFlashcardsBySet = async (setId: string) => {
    if (!user) return [];

    const { data, error } = await supabase
      .from("flashcards")
      .select("*")
      .eq("user_id", user.id)
      .eq("set_id", setId)
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les flashcards",
        variant: "destructive",
      });
      return [];
    }

    return data as Flashcard[] || [];
  };

  const updateFlashcard = async (id: string, updates: Partial<Flashcard>) => {
    const { error } = await supabase
      .from("flashcards")
      .update(updates)
      .eq("id", id);

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour la flashcard",
        variant: "destructive",
      });
      return;
    }

    fetchFlashcards();
  };

  const deleteFlashcard = async (id: string) => {
    const { error } = await supabase.from("flashcards").delete().eq("id", id);

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer la flashcard",
        variant: "destructive",
      });
      return;
    }

    fetchFlashcards();
  };

  const recordReview = async (id: string, wasCorrect: boolean) => {
    const card = flashcards.find((c) => c.id === id);
    if (!card) return;

    await updateFlashcard(id, {
      times_reviewed: card.times_reviewed + 1,
      times_correct: wasCorrect ? card.times_correct + 1 : card.times_correct,
    });
  };

  return {
    flashcards,
    loading,
    addFlashcard,
    addFlashcardBatch,
    updateFlashcard,
    deleteFlashcard,
    recordReview,
    getFlashcardsBySet,
  };
};
