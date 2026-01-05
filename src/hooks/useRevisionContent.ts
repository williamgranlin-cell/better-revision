import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface RevisionContent {
  id: string;
  user_id: string;
  title: string;
  type: "revision_sheet" | "mind_map" | "schema";
  content: string | null;
  image_url: string | null;
  subject: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export const useRevisionContent = () => {
  const [items, setItems] = useState<RevisionContent[]>([]);
  const [publicItems, setPublicItems] = useState<RevisionContent[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchItems();
    fetchPublicItems();
  }, [user]);

  const fetchItems = async () => {
    if (!user) {
      setItems([]);
      setLoading(false);
      return;
    }
    
    setLoading(true);
    const { data, error } = await supabase
      .from("revision_content")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching revision content:", error);
    } else {
      setItems((data || []) as RevisionContent[]);
    }
    setLoading(false);
  };

  const fetchPublicItems = async () => {
    const { data, error } = await supabase
      .from("revision_content")
      .select("*")
      .eq("is_public", true)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Error fetching public content:", error);
    } else {
      setPublicItems((data || []) as RevisionContent[]);
    }
  };

  const saveContent = async (content: {
    title: string;
    type: "revision_sheet" | "mind_map" | "schema";
    content?: string;
    image_url?: string;
    subject?: string;
    is_public?: boolean;
  }) => {
    if (!user) {
      toast({
        title: "Connexion requise",
        description: "Connectez-vous pour sauvegarder vos fiches",
        variant: "destructive",
      });
      return null;
    }

    const { data, error } = await supabase
      .from("revision_content")
      .insert({
        user_id: user.id,
        title: content.title,
        type: content.type,
        content: content.content || null,
        image_url: content.image_url || null,
        subject: content.subject || null,
        is_public: content.is_public || false,
      })
      .select()
      .single();

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder le contenu",
        variant: "destructive",
      });
      return null;
    }

    setItems([data as RevisionContent, ...items]);
    toast({
      title: "Sauvegardé ! 📚",
      description: "Votre fiche a été enregistrée",
    });
    return data as RevisionContent;
  };

  const updateContent = async (id: string, updates: Partial<RevisionContent>) => {
    const { error } = await supabase
      .from("revision_content")
      .update(updates)
      .eq("id", id);

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible de modifier le contenu",
        variant: "destructive",
      });
      return false;
    }

    setItems(items.map((item) => (item.id === id ? { ...item, ...updates } : item)));
    toast({
      title: "Modifié !",
      description: "Le contenu a été mis à jour",
    });
    return true;
  };

  const togglePublic = async (id: string, isPublic: boolean) => {
    const success = await updateContent(id, { is_public: isPublic });
    if (success) {
      toast({
        title: isPublic ? "Publié ! 🌍" : "Rendu privé 🔒",
        description: isPublic 
          ? "Votre fiche est maintenant visible par tous"
          : "Votre fiche est maintenant privée",
      });
      fetchPublicItems();
    }
    return success;
  };

  const deleteContent = async (id: string) => {
    const { error } = await supabase
      .from("revision_content")
      .delete()
      .eq("id", id);

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le contenu",
        variant: "destructive",
      });
      return false;
    }

    setItems(items.filter((item) => item.id !== id));
    toast({
      title: "Supprimé",
      description: "Le contenu a été supprimé",
    });
    return true;
  };

  return {
    items,
    publicItems,
    loading,
    saveContent,
    updateContent,
    togglePublic,
    deleteContent,
    refetch: fetchItems,
  };
};
