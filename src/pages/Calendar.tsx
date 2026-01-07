import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BottomNav } from "@/components/BottomNav";
import { AddCourseDialog } from "@/components/AddCourseDialog";
import CalendarView from "@/components/CalendarView";
import { useCourses } from "@/hooks/useCourses";

const Calendar = () => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const { courses, addCourse, updateCourse, deleteCourse, getRevisionEvents } = useCourses();

  return (
    <div className="min-h-screen pb-24 bg-background">
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-lg border-b border-border/50 shadow-sm">
        <div className="max-w-screen-xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
          <h1 className="text-2xl font-display font-bold bg-gradient-primary bg-clip-text text-transparent">
              Mon Calendrier 📅
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Planifie tes révisions intelligemment
            </p>
          </div>
          <Button
            onClick={() => setIsAddDialogOpen(true)}
            size="sm"
            className="gradient-primary shadow-colored hover:shadow-lg transition-smooth"
          >
            <Plus className="w-4 h-4 mr-2" />
            Ajouter un cours
          </Button>
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto px-4 py-6">
        <CalendarView 
          courses={courses} 
          revisionEvents={getRevisionEvents()} 
          onDeleteCourse={deleteCourse}
          onUpdateCourse={updateCourse}
        />
      </main>

      <AddCourseDialog 
        open={isAddDialogOpen} 
        onOpenChange={setIsAddDialogOpen}
        onAddCourse={addCourse}
      />
      <BottomNav />
    </div>
  );
};

export default Calendar;
