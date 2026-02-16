import { useState } from "react";
import { Plus, Calendar, RefreshCw, Settings, ChevronDown, X, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BottomNav } from "@/components/BottomNav";
import { useSchedule, ScheduleItem } from "@/hooks/useSchedule";
import { AddScheduleItemDialog } from "@/components/AddScheduleItemDialog";
import { EditScheduleItemDialog } from "@/components/EditScheduleItemDialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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

const Schedule = () => {
  const { items, loading, addItem, updateItem, deleteItem, getItemsByDay } = useSchedule();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ScheduleItem | null>(null);
  const [selectedDay, setSelectedDay] = useState(0);
  const [fullscreenDay, setFullscreenDay] = useState<number | null>(null);
  
  // Customizable time grid
  const [startHour, setStartHour] = useState(() => {
    const saved = localStorage.getItem("schedule-start-hour");
    return saved ? parseInt(saved) : 7;
  });
  const [endHour, setEndHour] = useState(() => {
    const saved = localStorage.getItem("schedule-end-hour");
    return saved ? parseInt(saved) : 21;
  });

  const hours = Array.from({ length: endHour - startHour + 1 }, (_, i) => i + startHour);

  const handleTimeGridChange = (start: number, end: number) => {
    if (start >= 0 && start < end && end <= 24) {
      setStartHour(start);
      setEndHour(end);
      localStorage.setItem("schedule-start-hour", start.toString());
      localStorage.setItem("schedule-end-hour", end.toString());
    }
  };

  const handleItemClick = (item: ScheduleItem) => {
    setSelectedItem(item);
    setIsEditDialogOpen(true);
  };

  const handleAddClick = (day?: number) => {
    if (day !== undefined) setSelectedDay(day);
    setIsAddDialogOpen(true);
  };

  const getItemStyle = (item: ScheduleItem, gridStartHour: number) => {
    const itemStartHour = parseInt(item.start_time.split(":")[0]);
    const itemStartMin = parseInt(item.start_time.split(":")[1]);
    const itemEndHour = parseInt(item.end_time.split(":")[0]);
    const itemEndMin = parseInt(item.end_time.split(":")[1]);

    const startOffset = (itemStartHour - gridStartHour) * 60 + itemStartMin;
    const duration = (itemEndHour - itemStartHour) * 60 + (itemEndMin - itemStartMin);

    return {
      top: `${(startOffset / 60) * 4}rem`,
      height: `${(duration / 60) * 4}rem`,
      minHeight: "2rem",
    };
  };

  const formatTime = (time: string) => {
    return time.slice(0, 5);
  };

  const isItemVisible = (item: ScheduleItem) => {
    const itemStartHour = parseInt(item.start_time.split(":")[0]);
    const itemEndHour = parseInt(item.end_time.split(":")[0]);
    return itemStartHour >= startHour && itemEndHour <= endHour;
  };

  const isItemInRange = (item: ScheduleItem, fromHour: number, toHour: number) => {
    const itemStartHour = parseInt(item.start_time.split(":")[0]);
    return itemStartHour >= fromHour && itemStartHour < toHour;
  };

  const getPositionedItems = (dayItems: ScheduleItem[]) => {
    return dayItems.map((item, index) => {
      const itemStartMin = parseInt(item.start_time.split(":")[0]) * 60 + parseInt(item.start_time.split(":")[1]);
      const itemEndMin = parseInt(item.end_time.split(":")[0]) * 60 + parseInt(item.end_time.split(":")[1]);
      
      let column = 0;
      const overlapping = dayItems.filter((other, otherIndex) => {
        if (otherIndex >= index) return false;
        const otherStartMin = parseInt(other.start_time.split(":")[0]) * 60 + parseInt(other.start_time.split(":")[1]);
        const otherEndMin = parseInt(other.end_time.split(":")[0]) * 60 + parseInt(other.end_time.split(":")[1]);
        return itemStartMin < otherEndMin && itemEndMin > otherStartMin;
      });
      
      const usedColumns = overlapping.map((_, i) => i);
      while (usedColumns.includes(column)) {
        column++;
      }
      
      const allOverlapping = dayItems.filter((other) => {
        const otherStartMin = parseInt(other.start_time.split(":")[0]) * 60 + parseInt(other.start_time.split(":")[1]);
        const otherEndMin = parseInt(other.end_time.split(":")[0]) * 60 + parseInt(other.end_time.split(":")[1]);
        return itemStartMin < otherEndMin && itemEndMin > otherStartMin;
      });
      const maxColumns = Math.max(allOverlapping.length, 1);
      
      return { item, column, maxColumns };
    });
  };

  const renderDayColumn = (dayItems: ScheduleItem[], gridStartHour: number, gridHours: number[], showAdd = true) => {
    const positionedItems = getPositionedItems(dayItems);
    
    return (
      <div
        className="relative glass-card rounded-xl overflow-hidden cursor-pointer group"
        onClick={() => showAdd && handleAddClick(fullscreenDay ?? undefined)}
        style={{ height: `${gridHours.length * 4}rem` }}
      >
        {gridHours.map((hour) => (
          <div
            key={hour}
            className="absolute w-full border-t border-border/30"
            style={{ top: `${(hour - gridStartHour) * 4}rem` }}
          />
        ))}

        {showAdd && (
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-primary/5 z-10 pointer-events-none">
            <Plus className="w-8 h-8 text-primary/50" />
          </div>
        )}

        {positionedItems.map(({ item, column, maxColumns }) => {
          const style = getItemStyle(item, gridStartHour);
          const width = `calc((100% - ${4 + (maxColumns - 1) * 2}px) / ${maxColumns})`;
          const left = `calc(2px + ((100% - ${4 + (maxColumns - 1) * 2}px) / ${maxColumns} + 2px) * ${column})`;
          
          return (
            <div
              key={item.id}
              className={cn(
                "absolute rounded-lg p-2 cursor-pointer transition-all duration-200 hover:z-30 hover:shadow-lg",
                item.color
              )}
              style={{ ...style, width, left, right: 'auto', minHeight: '2.5rem' }}
              onClick={(e) => {
                e.stopPropagation();
                handleItemClick(item);
              }}
              title={`${item.title} - ${formatTime(item.start_time)} à ${formatTime(item.end_time)}`}
            >
              <div className="flex flex-col h-full text-white overflow-hidden">
                <span className="font-medium text-xs sm:text-sm leading-tight truncate">
                  {item.title}
                </span>
                <span className="text-[10px] sm:text-xs opacity-80 leading-tight mt-0.5">
                  {formatTime(item.start_time)} - {formatTime(item.end_time)}
                </span>
                {item.is_recurring && (
                  <RefreshCw className="w-2.5 h-2.5 absolute bottom-1 right-1 opacity-60" />
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Fullscreen day view
  if (fullscreenDay !== null) {
    const dayLabel = days.find(d => d.value === fullscreenDay)?.label || "";
    const allDayItems = getItemsByDay(fullscreenDay).filter(isItemVisible);
    const morningItems = allDayItems.filter(item => isItemInRange(item, startHour, 13));
    const afternoonItems = allDayItems.filter(item => isItemInRange(item, 13, endHour + 1));
    
    const morningHours = hours.filter(h => h < 13);
    const afternoonHours = hours.filter(h => h >= 13);

    return (
      <div className="min-h-screen pb-24 bg-background">
        <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-lg border-b border-border/50 shadow-sm">
          <div className="max-w-screen-xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between">
            <div>
              <h1 className="text-xl md:text-2xl lg:text-3xl font-display font-bold bg-gradient-to-r from-violet-500 via-cyan-500 to-emerald-500 bg-clip-text text-transparent">
                {dayLabel} 📋
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {allDayItems.length} événement{allDayItems.length !== 1 ? "s" : ""}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => handleAddClick(fullscreenDay)}
                size="sm"
                className="bg-gradient-to-r from-violet-500 to-cyan-500 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Ajouter
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFullscreenDay(null)}
              >
                <X className="w-4 h-4 mr-2" />
                Fermer
              </Button>
            </div>
          </div>
        </header>

        <main className="max-w-screen-xl mx-auto px-4 md:px-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Morning */}
            <div>
              <div className="flex items-center gap-2 mb-3 px-2">
                <Sun className="w-5 h-5 text-amber-500" />
                <h2 className="font-semibold text-lg">Matin</h2>
                <span className="text-sm text-muted-foreground">({morningItems.length})</span>
              </div>
              {morningHours.length > 0 ? (
                <div className="grid grid-cols-[60px_1fr] gap-1">
                  <div className="relative">
                    {morningHours.map((hour) => (
                      <div key={hour} className="h-16 flex items-start justify-end pr-2 text-xs text-muted-foreground">
                        {hour}:00
                      </div>
                    ))}
                  </div>
                  {renderDayColumn(morningItems, morningHours[0], morningHours)}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">Aucune heure matinale dans la grille</div>
              )}
            </div>

            {/* Afternoon */}
            <div>
              <div className="flex items-center gap-2 mb-3 px-2">
                <Moon className="w-5 h-5 text-indigo-500" />
                <h2 className="font-semibold text-lg">Après-midi</h2>
                <span className="text-sm text-muted-foreground">({afternoonItems.length})</span>
              </div>
              {afternoonHours.length > 0 ? (
                <div className="grid grid-cols-[60px_1fr] gap-1">
                  <div className="relative">
                    {afternoonHours.map((hour) => (
                      <div key={hour} className="h-16 flex items-start justify-end pr-2 text-xs text-muted-foreground">
                        {hour}:00
                      </div>
                    ))}
                  </div>
                  {renderDayColumn(afternoonItems, afternoonHours[0], afternoonHours)}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">Aucune heure d'après-midi dans la grille</div>
              )}
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
  }

  return (
    <div className="min-h-screen pb-24 bg-background">
      {/* Decorative background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-violet-500/20 to-cyan-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-br from-emerald-500/20 to-orange-500/20 rounded-full blur-3xl" />
      </div>

      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-lg border-b border-border/50 shadow-sm">
        <div className="max-w-screen-xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl md:text-2xl lg:text-3xl font-display font-bold bg-gradient-to-r from-violet-500 via-cyan-500 to-emerald-500 bg-clip-text text-transparent">
              Emploi du Temps ⏰
            </h1>
            <p className="text-sm md:text-base text-muted-foreground mt-1">
              Organise ta semaine efficacement
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Time Grid Settings */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="glass-card border-white/20"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  {startHour}h - {endHour}h
                  <ChevronDown className="w-4 h-4 ml-1" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 glass-card border-white/20" align="end">
                <div className="space-y-4">
                  <h4 className="font-medium text-sm">Personnaliser la grille</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="start-hour" className="text-xs">Début</Label>
                      <Input
                        id="start-hour"
                        type="number"
                        min={0}
                        max={23}
                        value={startHour}
                        onChange={(e) => handleTimeGridChange(parseInt(e.target.value) || 0, endHour)}
                        className="glass-input h-9"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="end-hour" className="text-xs">Fin</Label>
                      <Input
                        id="end-hour"
                        type="number"
                        min={1}
                        max={24}
                        value={endHour}
                        onChange={(e) => handleTimeGridChange(startHour, parseInt(e.target.value) || 24)}
                        className="glass-input h-9"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => handleTimeGridChange(7, 18)}>Journée</Button>
                    <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => handleTimeGridChange(8, 17)}>École</Button>
                    <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => handleTimeGridChange(6, 22)}>Étendu</Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            <Button
              onClick={() => handleAddClick()}
              size="sm"
              className="bg-gradient-to-r from-violet-500 to-cyan-500 hover:from-violet-600 hover:to-cyan-600 text-white shadow-lg"
            >
              <Plus className="w-4 h-4 mr-2" />
              Ajouter
            </Button>
          </div>
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
                    className="p-2 text-center glass-card rounded-xl cursor-pointer hover:bg-primary/10 transition-colors"
                    onClick={() => setFullscreenDay(day.value)}
                    title={`Cliquez pour voir ${day.label} en plein écran`}
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
                  const dayItems = getItemsByDay(day.value).filter(isItemVisible);
                  const positionedItems = getPositionedItems(dayItems);

                  return (
                    <div
                      key={day.value}
                      className="relative glass-card rounded-xl overflow-hidden cursor-pointer group"
                      onClick={() => handleAddClick(day.value)}
                      style={{ height: `${hours.length * 4}rem` }}
                    >
                      {hours.map((hour) => (
                        <div
                          key={hour}
                          className="absolute w-full border-t border-border/30"
                          style={{ top: `${(hour - startHour) * 4}rem` }}
                        />
                      ))}

                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-primary/5 z-10 pointer-events-none">
                        <Plus className="w-8 h-8 text-primary/50" />
                      </div>

                      {positionedItems.map(({ item, column, maxColumns }) => {
                        const style = getItemStyle(item, startHour);
                        const width = `calc((100% - ${4 + (maxColumns - 1) * 2}px) / ${maxColumns})`;
                        const left = `calc(2px + ((100% - ${4 + (maxColumns - 1) * 2}px) / ${maxColumns} + 2px) * ${column})`;
                        
                        return (
                          <div
                            key={item.id}
                            className={cn(
                              "absolute rounded-lg p-1.5 cursor-pointer transition-all duration-200 hover:z-30 hover:shadow-lg",
                              item.color
                            )}
                            style={{
                              ...style,
                              width,
                              left,
                              right: 'auto',
                              minHeight: '2.5rem',
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleItemClick(item);
                            }}
                            title={`${item.title} - ${formatTime(item.start_time)} à ${formatTime(item.end_time)}`}
                          >
                            <div className="flex flex-col h-full text-white overflow-hidden">
                              <span 
                                className="font-medium text-[9px] sm:text-xs leading-tight"
                                style={{
                                  display: '-webkit-box',
                                  WebkitLineClamp: maxColumns > 2 ? 1 : 2,
                                  WebkitBoxOrient: 'vertical',
                                  overflow: 'hidden',
                                  wordBreak: 'break-word',
                                }}
                              >
                                {item.title}
                              </span>
                              <span className="text-[7px] sm:text-[9px] opacity-80 leading-tight mt-0.5">
                                {formatTime(item.start_time)}
                              </span>
                              {item.is_recurring && (
                                <RefreshCw className="w-2 h-2 absolute bottom-0.5 right-0.5 opacity-60" />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="mt-6 flex flex-wrap items-center gap-4 justify-center text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            <span>Événement récurrent</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <span>{items.length} événement{items.length !== 1 ? "s" : ""}</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            💡 <span>Cliquez sur un jour pour l'ouvrir en plein écran</span>
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
