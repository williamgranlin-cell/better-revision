import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface StudySession {
  id: string;
  user_id: string;
  duration_minutes: number;
  date: string;
  created_at: string;
}

export const useStudySessions = () => {
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!user) return;
    fetchSessions();
  }, [user]);

  const fetchSessions = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from("study_sessions")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: false });

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les sessions d'étude",
        variant: "destructive",
      });
      return;
    }

    setSessions(data || []);
    setLoading(false);
  };

  const addSession = async (durationMinutes: number) => {
    if (!user) return;

    const { error } = await supabase.from("study_sessions").insert({
      user_id: user.id,
      duration_minutes: durationMinutes,
      date: new Date().toISOString().split("T")[0],
    });

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'enregistrer la session",
        variant: "destructive",
      });
      return;
    }

    fetchSessions();
  };

  const getTotalStudyTime = () => {
    return sessions.reduce((total, session) => total + session.duration_minutes, 0);
  };

  const getStudyStreak = () => {
    if (sessions.length === 0) return 0;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let streak = 0;
    const dates = sessions.map(s => new Date(s.date));
    
    for (let i = 0; i < dates.length; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() - i);
      checkDate.setHours(0, 0, 0, 0);
      
      const hasSession = dates.some(d => {
        d.setHours(0, 0, 0, 0);
        return d.getTime() === checkDate.getTime();
      });
      
      if (hasSession) {
        streak++;
      } else {
        break;
      }
    }
    
    return streak;
  };

  return {
    sessions,
    loading,
    addSession,
    getTotalStudyTime,
    getStudyStreak,
  };
};
