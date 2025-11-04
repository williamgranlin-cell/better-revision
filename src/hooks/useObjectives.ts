import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface Objective {
  id: string;
  text: string;
  completed: boolean;
}

export const useObjectives = () => {
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!user) return;

    const fetchObjectives = async () => {
      const { data, error } = await supabase
        .from("objectives")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        toast({
          title: "Erreur",
          description: "Impossible de charger les objectifs",
          variant: "destructive",
        });
        return;
      }

      setObjectives(data);
    };

    fetchObjectives();
  }, [user, toast]);

  const addObjective = async (text: string) => {
    if (!user) return;

    const { data, error } = await supabase
      .from("objectives")
      .insert({
        user_id: user.id,
        text,
        completed: false,
      })
      .select()
      .single();

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter l'objectif",
        variant: "destructive",
      });
      return;
    }

    setObjectives([data, ...objectives]);
  };

  const toggleObjective = async (id: string) => {
    const objective = objectives.find((obj) => obj.id === id);
    if (!objective) return;

    const { error } = await supabase
      .from("objectives")
      .update({ completed: !objective.completed })
      .eq("id", id);

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour l'objectif",
        variant: "destructive",
      });
      return;
    }

    setObjectives(
      objectives.map((obj) =>
        obj.id === id ? { ...obj, completed: !obj.completed } : obj
      )
    );
  };

  const deleteObjective = async (id: string) => {
    const { error } = await supabase.from("objectives").delete().eq("id", id);

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer l'objectif",
        variant: "destructive",
      });
      return;
    }

    setObjectives(objectives.filter((obj) => obj.id !== id));
  };

  return { objectives, addObjective, toggleObjective, deleteObjective };
};
