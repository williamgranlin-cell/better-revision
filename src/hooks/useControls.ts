import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface Control {
  id: string;
  name: string;
  subject: string;
  date: string;
  importance: "low" | "medium" | "high";
  targetGrade: string;
}

export const useControls = () => {
  const [controls, setControls] = useState<Control[]>([]);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!user) return;

    const fetchControls = async () => {
      const { data, error } = await supabase
        .from("controls")
        .select("*")
        .eq("user_id", user.id)
        .order("date", { ascending: true });

      if (error) {
        toast({
          title: "Erreur",
          description: "Impossible de charger les contrôles",
          variant: "destructive",
        });
        return;
      }

      setControls(
        data.map((c) => ({
          id: c.id,
          name: c.name,
          subject: c.subject,
          date: c.date,
          importance: c.importance as "low" | "medium" | "high",
          targetGrade: c.target_grade,
        }))
      );
    };

    fetchControls();
  }, [user, toast]);

  const addControl = async (control: Omit<Control, "id">) => {
    if (!user) return;

    const { data, error } = await supabase
      .from("controls")
      .insert({
        user_id: user.id,
        name: control.name,
        subject: control.subject,
        date: control.date,
        importance: control.importance,
        target_grade: control.targetGrade,
      })
      .select()
      .single();

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter le contrôle",
        variant: "destructive",
      });
      return;
    }

    setControls([
      ...controls,
      {
        id: data.id,
        name: data.name,
        subject: data.subject,
        date: data.date,
        importance: data.importance as "low" | "medium" | "high",
        targetGrade: data.target_grade,
      },
    ]);
  };

  const deleteControl = async (id: string) => {
    const { error } = await supabase.from("controls").delete().eq("id", id);

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le contrôle",
        variant: "destructive",
      });
      return;
    }

    setControls(controls.filter((c) => c.id !== id));
  };

  return { controls, addControl, deleteControl };
};
