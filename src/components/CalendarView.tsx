import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Trash2, Edit, Calendar } from "lucide-react";
import { Course, RevisionEvent } from "@/hooks/useCourses";
import { EditCourseDialog } from "./EditCourseDialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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

  // Get a contrasting text color based on background
  const getTextColorClass = (bgColor: string) => {
    const darkBgs = ["bg-gray-700", "bg-slate-700", "bg-zinc-700", "bg-neutral-700", "bg-stone-700", "bg-blue-600", "bg-indigo-600", "bg-violet-600", "bg-purple-600"];
    return darkBgs.some(c => bgColor.includes(c)) ? "text-white" : "text-white";
  };

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
        <Badge variant="outline" className="border-primary text-primary">
          <Calendar className="w-3 h-3 mr-1" />
          Vue mois
        </Badge>
      </div>

      <Card className="p-4 gradient-card border-0 shadow-sm overflow-hidden">
        <div className="grid grid-cols-7 gap-1 md:gap-2">
          {weekDays.map((day) => (
            <div key={day} className="text-center text-xs md:text-sm font-semibold text-muted-foreground py-2">
              {day}
            </div>
          ))}
          
          {days.map((day, index) => {
            const isToday = day === today.getDate() && 
                           currentDate.getMonth() === today.getMonth() &&
                           currentDate.getFullYear() === today.getFullYear();
            const dayEvents = day ? getEventsForDay(day) : [];
            const maxVisibleEvents = 2;
            const hasMoreEvents = dayEvents.length > maxVisibleEvents;
            const visibleEvents = dayEvents.slice(0, maxVisibleEvents);
            const hiddenCount = dayEvents.length - maxVisibleEvents;

            return (
              <div
                key={index}
                className={`min-h-16 md:min-h-24 p-1 md:p-2 rounded-lg border transition-smooth ${
                  day
                    ? isToday
                      ? "bg-primary/10 border-primary shadow-sm"
                      : "bg-card border-border hover:bg-muted/30"
                    : "bg-transparent border-transparent"
                }`}
              >
                {day && (
                  <div className="h-full flex flex-col">
                    <div className={`text-xs md:text-sm font-medium mb-1 ${isToday ? "text-primary" : "text-foreground"}`}>
                      {day}
                    </div>
                    <div className="flex-1 flex flex-col gap-0.5 overflow-hidden">
                      {visibleEvents.map((event) => (
                        <Tooltip key={`${event.courseId}-${event.revisionNumber}`}>
                          <TooltipTrigger asChild>
                            <div
                              className={`text-[10px] md:text-xs px-1 md:px-2 py-0.5 rounded ${event.color} ${getTextColorClass(event.color)} truncate shadow-sm cursor-pointer hover:opacity-90 transition-opacity`}
                            >
                              <span className="hidden md:inline">{event.courseName}</span>
                              <span className="md:hidden">{event.courseName.substring(0, 3)}</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="z-50">
                            <p className="font-medium">{event.courseName}</p>
                            <p className="text-xs text-muted-foreground">Révision {event.revisionNumber}</p>
                          </TooltipContent>
                        </Tooltip>
                      ))}
                      {hasMoreEvents && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="text-[10px] md:text-xs px-1 md:px-2 py-0.5 rounded bg-muted text-muted-foreground text-center cursor-pointer hover:bg-muted/80 transition-colors">
                              +{hiddenCount}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="z-50">
                            <p className="font-medium mb-1">Autres révisions:</p>
                            {dayEvents.slice(maxVisibleEvents).map((event) => (
                              <p key={`${event.courseId}-${event.revisionNumber}`} className="text-xs">
                                • {event.courseName} (Rév. {event.revisionNumber})
                              </p>
                            ))}
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {courses.length > 0 && (
        <Card className="p-4 gradient-card border-0 shadow-sm">
          <h3 className="text-lg font-display font-semibold text-foreground mb-3">Mes cours 📚</h3>
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
