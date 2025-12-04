import { useState } from "react";
import { Plus, Calendar, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BottomNav } from "@/components/BottomNav";
import { useSchedule, ScheduleItem } from "@/hooks/useSchedule";
import { AddScheduleItemDialog } from "@/components/AddScheduleItemDialog";
import { EditScheduleItemDialog } from "@/components/EditScheduleItemDialog";
import { cn } from "@/lib/utils";

const days = [
  { value: 0, label: "Lundi", short: "Lun" },
  { value: 1, label: "Mardi", short: "Mar" },
  { value: 2, label: "Mercredi", short: "Mer" },
  { value: 3, label: "Jeudi", short: "Jeu" },
  { value: 4, label: "Vendredi", short: "Ven" },
  { value: 5, label: "Samedi", short: "Sam" },
  { value: 6, label: "Dimanche", short: "Dim" },
];

const hours = Array.from({ length: 15 }, (_, i) => i + 7); // 7h to 21h

const Schedule = () => {
  const { items, loading, addItem, updateItem, deleteItem, getItemsByDay } = useSchedule();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ScheduleItem | null>(null);
  const [selectedDay, setSelectedDay] = useState(0);

  const handleItemClick = (item: ScheduleItem) => {
    setSelectedItem(item);
    setIsEditDialogOpen(true);
  };

  const handleAddClick = (day?: number) => {
    if (day !== undefined) setSelectedDay(day);
    setIsAddDialogOpen(true);
  };

  const getItemStyle = (item: ScheduleItem) => {
    const startHour = parseInt(item.start_time.split(":")[0]);
    const startMin = parseInt(item.start_time.split(":")[1]);
    const endHour = parseInt(item.end_time.split(":")[0]);
    const endMin = parseInt(item.end_time.split(":")[1]);

    const startOffset = (startHour - 7) * 60 + startMin;
    const duration = (endHour - startHour) * 60 + (endMin - startMin);

    return {
      top: `${(startOffset / 60) * 4}rem`,
      height: `${(duration / 60) * 4}rem`,
      minHeight: "2rem",
    };
  };

  const formatTime = (time: string) => {
    return time.slice(0, 5);
  };

  return (
    <div className="min-h-screen pb-24 bg-background">
      {/* Decorative background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-violet-500/20 to-cyan-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-br from-emerald-500/20 to-orange-500/20 rounded-full blur-3xl" />
      </div>

      <header className="sticky top-0 z-40 glass-card border-b border-white/10">
        <div className="max-w-screen-xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold bg-gradient-to-r from-violet-500 via-cyan-500 to-emerald-500 bg-clip-text text-transparent">
              Emploi du Temps
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Organise ta semaine efficacement
            </p>
          </div>
          <Button
            onClick={() => handleAddClick()}
            size="sm"
            className="bg-gradient-to-r from-violet-500 to-cyan-500 hover:from-violet-600 hover:to-cyan-600 text-white shadow-lg"
          >
            <Plus className="w-4 h-4 mr-2" />
            Ajouter
          </Button>
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto px-2 py-4 relative">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[800px]">
              {/* Days header */}
              <div className="grid grid-cols-8 gap-1 mb-2">
                <div className="p-2 text-center text-xs font-medium text-muted-foreground">
                  Heure
                </div>
                {days.map((day) => (
                  <div
                    key={day.value}
                    className="p-2 text-center glass-card rounded-xl"
                  >
                    <span className="hidden sm:inline font-medium text-sm">{day.label}</span>
                    <span className="sm:hidden font-medium text-xs">{day.short}</span>
                  </div>
                ))}
              </div>

              {/* Time grid */}
              <div className="grid grid-cols-8 gap-1">
                {/* Hours column */}
                <div className="relative">
                  {hours.map((hour) => (
                    <div
                      key={hour}
                      className="h-16 flex items-start justify-end pr-2 text-xs text-muted-foreground"
                    >
                      {hour}:00
                    </div>
                  ))}
                </div>

                {/* Days columns */}
                {days.map((day) => {
                  const dayItems = getItemsByDay(day.value);
                  return (
                    <div
                      key={day.value}
                      className="relative glass-card rounded-xl overflow-hidden cursor-pointer group"
                      onClick={() => handleAddClick(day.value)}
                      style={{ height: `${hours.length * 4}rem` }}
                    >
                      {/* Hour lines */}
                      {hours.map((hour) => (
                        <div
                          key={hour}
                          className="absolute w-full border-t border-border/30"
                          style={{ top: `${(hour - 7) * 4}rem` }}
                        />
                      ))}

                      {/* Add button on hover */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-primary/5 z-10 pointer-events-none">
                        <Plus className="w-8 h-8 text-primary/50" />
                      </div>

                      {/* Items */}
                      {dayItems.map((item) => (
                        <div
                          key={item.id}
                          className={cn(
                            "absolute left-1 right-1 rounded-lg p-1.5 cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-lg z-20 overflow-hidden",
                            item.color
                          )}
                          style={getItemStyle(item)}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleItemClick(item);
                          }}
                        >
                          <div className="flex flex-col h-full text-white">
                            <span className="font-medium text-xs truncate">
                              {item.title}
                            </span>
                            <span className="text-[10px] opacity-80">
                              {formatTime(item.start_time)} - {formatTime(item.end_time)}
                            </span>
                            {item.is_recurring && (
                              <RefreshCw className="w-3 h-3 absolute bottom-1 right-1 opacity-60" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="mt-6 flex items-center gap-4 justify-center text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            <span>Événement récurrent</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <span>{items.length} événement{items.length !== 1 ? "s" : ""}</span>
          </div>
        </div>
      </main>

      <AddScheduleItemDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onAddItem={addItem}
        defaultDay={selectedDay}
      />

      <EditScheduleItemDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        item={selectedItem}
        onUpdateItem={updateItem}
        onDeleteItem={deleteItem}
      />

      <BottomNav />
    </div>
  );
};

export default Schedule;
