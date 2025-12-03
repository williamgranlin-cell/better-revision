import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Trash2, Edit } from "lucide-react";
import { Course, RevisionEvent } from "@/hooks/useCourses";
import { EditCourseDialog } from "./EditCourseDialog";

interface CalendarViewProps {
  courses: Course[];
  revisionEvents: RevisionEvent[];
  onDeleteCourse: (id: string) => void;
  onUpdateCourse: (id: string, updates: Partial<Omit<Course, "id">>) => void;
}

const CalendarView = ({ courses, revisionEvents, onDeleteCourse, onUpdateCourse }: CalendarViewProps) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  
  const currentMonth = currentDate.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  
  const days = [];
  const adjustedFirstDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
  
  for (let i = 0; i < adjustedFirstDay; i++) {
    days.push(null);
  }
  
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  const getEventsForDay = (day: number) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return revisionEvents.filter((event) => event.date === dateStr);
  };

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const today = new Date();
  const weekDays = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={previousMonth}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h2 className="text-xl font-display font-semibold capitalize text-foreground min-w-[200px] text-center">
            {currentMonth}
          </h2>
          <Button variant="outline" size="icon" onClick={nextMonth}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        <Badge variant="outline" className="border-primary text-primary">Vue mois</Badge>
      </div>

      <Card className="p-4 gradient-card border-0 shadow-sm">
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map((day) => (
            <div key={day} className="text-center text-sm font-semibold text-muted-foreground py-2">
              {day}
            </div>
          ))}
          
          {days.map((day, index) => {
            const isToday = day === today.getDate() && 
                           currentDate.getMonth() === today.getMonth() &&
                           currentDate.getFullYear() === today.getFullYear();
            const dayEvents = day ? getEventsForDay(day) : [];

            return (
              <div
                key={index}
                className={`min-h-20 md:min-h-24 p-2 rounded-lg border transition-smooth ${
                  day
                    ? isToday
                      ? "bg-primary/10 border-primary shadow-sm"
                      : "bg-card border-border hover:bg-muted/30"
                    : "bg-transparent border-transparent"
                }`}
              >
                {day && (
                  <>
                    <div className={`text-sm font-medium mb-1 ${isToday ? "text-primary" : "text-foreground"}`}>
                      {day}
                    </div>
                    {dayEvents.length > 0 && (
                      <div className="space-y-1">
                        {dayEvents.map((event) => (
                          <div
                            key={`${event.courseId}-${event.revisionNumber}`}
                            className={`text-xs px-2 py-1 rounded ${event.color} text-white truncate shadow-sm`}
                            title={`${event.courseName} - Révision ${event.revisionNumber}`}
                          >
                            {event.courseName}
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {courses.length > 0 && (
        <Card className="p-4 gradient-card border-0 shadow-sm">
          <h3 className="text-lg font-display font-semibold text-foreground mb-3">Mes cours</h3>
          <div className="space-y-2">
            {courses.map((course) => (
              <div
                key={course.id}
                className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-smooth"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded ${course.color}`} />
                  <span className="font-medium text-foreground">{course.name}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setEditingCourse(course)}
                    className="text-primary hover:text-primary"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDeleteCourse(course.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <EditCourseDialog
        open={!!editingCourse}
        onOpenChange={(open) => !open && setEditingCourse(null)}
        course={editingCourse}
        onUpdateCourse={onUpdateCourse}
      />
    </div>
  );
};

export default CalendarView;
