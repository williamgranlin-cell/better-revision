import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface ScheduleItem {
  id: string;
  title: string;
  description: string | null;
  day_of_week: number;
  start_time: string;
  end_time: string;
  color: string;
  is_recurring: boolean;
}

export const useSchedule = () => {
  const [items, setItems] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!user) return;
    fetchItems();
  }, [user]);

  const fetchItems = async () => {
    if (!user) return;
    setLoading(true);
    
    const { data, error } = await supabase
      .from("schedule_items")
      .select("*")
      .eq("user_id", user.id)
      .order("start_time", { ascending: true });

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible de charger l'emploi du temps",
        variant: "destructive",
      });
    } else {
      setItems(data || []);
    }
    setLoading(false);
  };

  const addItem = async (item: Omit<ScheduleItem, "id">) => {
    if (!user) return;

    const { data, error } = await supabase
      .from("schedule_items")
      .insert({
        user_id: user.id,
        title: item.title,
        description: item.description,
        day_of_week: item.day_of_week,
        start_time: item.start_time,
        end_time: item.end_time,
        color: item.color,
        is_recurring: item.is_recurring,
      })
      .select()
      .single();

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter l'élément",
        variant: "destructive",
      });
      return;
    }

    setItems([...items, data]);
    toast({
      title: "Ajouté",
      description: "Élément ajouté à l'emploi du temps",
    });
  };

  const updateItem = async (id: string, updates: Partial<Omit<ScheduleItem, "id">>) => {
    if (!user) return;

    const { error } = await supabase
      .from("schedule_items")
      .update(updates)
      .eq("id", id);

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible de modifier l'élément",
        variant: "destructive",
      });
      return;
    }

    setItems(items.map((item) => (item.id === id ? { ...item, ...updates } : item)));
    toast({
      title: "Modifié",
      description: "Élément modifié avec succès",
    });
  };

  const deleteItem = async (id: string) => {
    const { error } = await supabase.from("schedule_items").delete().eq("id", id);

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer l'élément",
        variant: "destructive",
      });
      return;
    }

    setItems(items.filter((item) => item.id !== id));
    toast({
      title: "Supprimé",
      description: "Élément supprimé de l'emploi du temps",
    });
  };

  const getItemsByDay = (day: number) => {
    return items.filter((item) => item.day_of_week === day);
  };

  return { items, loading, addItem, updateItem, deleteItem, getItemsByDay };
};
