import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const CalendarView = () => {
  const today = new Date();
  const currentMonth = today.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  
  // Generate calendar days (simplified)
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).getDay();
  
  const days = [];
  const adjustedFirstDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
  
  for (let i = 0; i < adjustedFirstDay; i++) {
    days.push(null);
  }
  
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  // Mock data for courses
  const courses = {
    3: [{ name: "Maths", color: "bg-primary" }],
    5: [{ name: "Physique", color: "bg-secondary" }],
    8: [{ name: "Maths", color: "bg-primary" }, { name: "Histoire", color: "bg-success" }],
    12: [{ name: "Anglais", color: "bg-warning" }],
    15: [{ name: "Maths", color: "bg-primary" }],
    18: [{ name: "Physique", color: "bg-secondary" }],
  };

  const weekDays = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold capitalize text-foreground">{currentMonth}</h2>
        <div className="flex gap-2">
          <Badge variant="outline" className="border-primary text-primary">Vue mois</Badge>
        </div>
      </div>

      <Card className="p-4 gradient-card border-0 shadow-sm">
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map((day) => (
            <div key={day} className="text-center text-sm font-semibold text-muted-foreground py-2">
              {day}
            </div>
          ))}
          
          {days.map((day, index) => {
            const isToday = day === today.getDate();
            const dayCourses = day ? courses[day as keyof typeof courses] : null;

            return (
              <div
                key={index}
                className={`min-h-20 p-2 rounded-lg border transition-smooth ${
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
                    {dayCourses && (
                      <div className="space-y-1">
                        {dayCourses.map((course, i) => (
                          <div
                            key={i}
                            className={`text-xs px-2 py-1 rounded ${course.color} text-white truncate`}
                          >
                            {course.name}
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
    </div>
  );
};

export default CalendarView;
