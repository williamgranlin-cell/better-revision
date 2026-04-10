import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BottomNav } from "@/components/BottomNav";
import { AddCourseDialog } from "@/components/AddCourseDialog";
import CalendarView from "@/components/CalendarView";
import { useCourses } from "@/hooks/useCourses";
import { PageTransition } from "@/components/PageTransition";
import { WelcomeHeader } from "@/components/WelcomeHeader";
import { ScrollToTop } from "@/components/ScrollToTop";

const Calendar = () => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const { courses, addCourse, updateCourse, deleteCourse, getRevisionEvents } = useCourses();

  return (
    <PageTransition>
    <div className="min-h-screen pb-24 bg-background">
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-lg border-b border-border/50 shadow-sm">
        <div className="max-w-screen-xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between">
          <div>
            <WelcomeHeader />
            <h1 className="text-xl md:text-2xl lg:text-3xl font-display font-bold bg-gradient-primary bg-clip-text text-transparent">
              Mon Calendrier 📅
            </h1>
            <p className="text-sm md:text-base text-muted-foreground mt-1">
              Planifie tes révisions intelligemment
            </p>
          </div>
          <Button
            onClick={() => setIsAddDialogOpen(true)}
            size="sm"
            className="gradient-primary shadow-colored hover:shadow-lg transition-smooth"
          >
            <Plus className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Ajouter un cours</span>
            <span className="sm:hidden">Ajouter</span>
          </Button>
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto px-4 md:px-6 py-4 md:py-6">
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
      <ScrollToTop />
      <BottomNav />
    </div>
    </PageTransition>
  );
};

export default Calendar;
