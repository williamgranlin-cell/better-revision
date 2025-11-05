import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface FlashcardSet {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export const useFlashcardSets = () => {
  const [sets, setSets] = useState<FlashcardSet[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!user) return;
    fetchSets();
  }, [user]);

  const fetchSets = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("flashcard_sets")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les lots",
        variant: "destructive",
      });
      return;
    }

    setSets(data as FlashcardSet[] || []);
    setLoading(false);
  };

  const addSet = async (name: string, description?: string) => {
    if (!user) return null;

    const { data, error } = await supabase
      .from("flashcard_sets")
      .insert({
        user_id: user.id,
        name,
        description,
      })
      .select()
      .single();

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible de créer le lot",
        variant: "destructive",
      });
      return null;
    }

    toast({
      title: "Succès",
      description: "Lot créé !",
    });

    fetchSets();
    return data;
  };

  const updateSet = async (id: string, updates: Partial<FlashcardSet>) => {
    const { error } = await supabase
      .from("flashcard_sets")
      .update(updates)
      .eq("id", id);

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le lot",
        variant: "destructive",
      });
      return;
    }

    fetchSets();
  };

  const deleteSet = async (id: string) => {
    const { error } = await supabase
      .from("flashcard_sets")
      .delete()
      .eq("id", id);

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le lot",
        variant: "destructive",
      });
      return;
    }

    fetchSets();
  };

  return {
    sets,
    loading,
    addSet,
    updateSet,
    deleteSet,
    refreshSets: fetchSets,
  };
};
