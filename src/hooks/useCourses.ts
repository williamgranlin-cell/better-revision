import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface Course {
  id: string;
  name: string;
  color: string;
  intervals: number[];
  firstRevisionDate: string;
}

export interface RevisionEvent {
  courseId: string;
  courseName: string;
  color: string;
  date: string;
  revisionNumber: number;
}

export const useCourses = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!user) return;

    const fetchCourses = async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        toast({
          title: "Erreur",
          description: "Impossible de charger les cours",
          variant: "destructive",
        });
        return;
      }

      setCourses(
        data.map((c) => ({
          id: c.id,
          name: c.name,
          color: c.color,
          intervals: c.intervals,
          firstRevisionDate: c.first_revision_date,
        }))
      );
    };

    fetchCourses();
  }, [user, toast]);

  const addCourse = async (course: Omit<Course, "id">) => {
    if (!user) return;

    const { data, error } = await supabase
      .from("courses")
      .insert({
        user_id: user.id,
        name: course.name,
        color: course.color,
        intervals: course.intervals,
        first_revision_date: course.firstRevisionDate,
      })
      .select()
      .single();

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter le cours",
        variant: "destructive",
      });
      return;
    }

    setCourses([
      ...courses,
      {
        id: data.id,
        name: data.name,
        color: data.color,
        intervals: data.intervals,
        firstRevisionDate: data.first_revision_date,
      },
    ]);
  };

  const updateCourse = async (id: string, updates: Partial<Omit<Course, "id">>) => {
    if (!user) return;

    const dbUpdates: Record<string, unknown> = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.color !== undefined) dbUpdates.color = updates.color;
    if (updates.intervals !== undefined) dbUpdates.intervals = updates.intervals;
    if (updates.firstRevisionDate !== undefined) dbUpdates.first_revision_date = updates.firstRevisionDate;

    const { error } = await supabase
      .from("courses")
      .update(dbUpdates)
      .eq("id", id);

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible de modifier le cours",
        variant: "destructive",
      });
      return;
    }

    setCourses(courses.map((c) => 
      c.id === id ? { ...c, ...updates } : c
    ));
    
    toast({
      title: "Cours modifié",
      description: "Les modifications ont été enregistrées",
    });
  };

  const deleteCourse = async (id: string) => {
    const { error } = await supabase.from("courses").delete().eq("id", id);

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le cours",
        variant: "destructive",
      });
      return;
    }

    setCourses(courses.filter((c) => c.id !== id));
  };

  const getRevisionEvents = (): RevisionEvent[] => {
    const events: RevisionEvent[] = [];
    
    courses.forEach((course) => {
      const firstDate = new Date(course.firstRevisionDate);
      
      course.intervals.forEach((interval, index) => {
        const revisionDate = new Date(firstDate);
        revisionDate.setDate(revisionDate.getDate() + interval);
        
        events.push({
          courseId: course.id,
          courseName: course.name,
          color: course.color,
          date: revisionDate.toISOString().split("T")[0],
          revisionNumber: index + 1,
        });
      });
    });
    
    return events;
  };

  return { courses, addCourse, updateCourse, deleteCourse, getRevisionEvents };
};
