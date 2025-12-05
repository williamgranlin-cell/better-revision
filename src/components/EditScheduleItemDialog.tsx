import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Edit, Palette, Clock, RefreshCw, Trash2 } from "lucide-react";
import { ScheduleItem } from "@/hooks/useSchedule";

interface EditScheduleItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: ScheduleItem | null;
  onUpdateItem: (id: string, updates: Partial<Omit<ScheduleItem, "id">>) => void;
  onDeleteItem: (id: string) => void;
}

const days = [
  { value: 0, label: "Lundi" },
  { value: 1, label: "Mardi" },
  { value: 2, label: "Mercredi" },
  { value: 3, label: "Jeudi" },
  { value: 4, label: "Vendredi" },
  { value: 5, label: "Samedi" },
  { value: 6, label: "Dimanche" },
];

const colors = [
  { name: "Violet", value: "bg-violet-500" },
  { name: "Cyan", value: "bg-cyan-500" },
  { name: "Emeraude", value: "bg-emerald-500" },
  { name: "Orange", value: "bg-orange-500" },
  { name: "Rose", value: "bg-pink-500" },
  { name: "Bleu", value: "bg-blue-500" },
  { name: "Jaune", value: "bg-yellow-500" },
  { name: "Rouge", value: "bg-red-500" },
  { name: "Indigo", value: "bg-indigo-500" },
  { name: "Teal", value: "bg-teal-500" },
];

const recurrenceOptions = [
  { value: "none", label: "Une seule fois" },
  { value: "weekly", label: "Chaque semaine" },
  { value: "biweekly", label: "Toutes les 2 semaines" },
  { value: "monthly", label: "Chaque mois" },
];

export const EditScheduleItemDialog = ({
  open,
  onOpenChange,
  item,
  onUpdateItem,
  onDeleteItem,
}: EditScheduleItemDialogProps) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dayOfWeek, setDayOfWeek] = useState(0);
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("09:00");
  const [color, setColor] = useState(colors[0].value);
  const [recurrence, setRecurrence] = useState("weekly");

  useEffect(() => {
    if (item) {
      setTitle(item.title);
      setDescription(item.description || "");
      setDayOfWeek(item.day_of_week);
      setStartTime(item.start_time.slice(0, 5));
      setEndTime(item.end_time.slice(0, 5));
      setColor(item.color);
      setRecurrence(item.recurrence_type || (item.is_recurring ? "weekly" : "none"));
    }
  }, [item]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!item) return;
    
    onUpdateItem(item.id, {
      title,
      description: description || null,
      day_of_week: dayOfWeek,
      start_time: startTime,
      end_time: endTime,
      color,
      is_recurring: recurrence !== "none",
      recurrence_type: recurrence,
    });
    onOpenChange(false);
  };

  const handleDelete = () => {
    if (!item) return;
    onDeleteItem(item.id);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md glass-card border-white/20 max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center gap-2 font-display text-xl">
            <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500">
              <Edit className="w-5 h-5 text-white" />
            </div>
            Modifier l'événement
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-100px)] px-6 pb-6">
          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Titre</Label>
              <Input
                id="edit-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Cours de Maths"
                className="glass-input"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Description (optionnel)</Label>
              <Textarea
                id="edit-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Notes supplémentaires..."
                className="glass-input resize-none"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Jour</Label>
              <Select
                value={dayOfWeek.toString()}
                onValueChange={(v) => setDayOfWeek(parseInt(v))}
              >
                <SelectTrigger className="glass-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {days.map((day) => (
                    <SelectItem key={day.value} value={day.value.toString()}>
                      {day.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-startTime" className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Début
                </Label>
                <Input
                  id="edit-startTime"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="glass-input"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-endTime" className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Fin
                </Label>
                <Input
                  id="edit-endTime"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="glass-input"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Palette className="w-4 h-4" />
                Couleur
              </Label>
              <div className="grid grid-cols-5 gap-2">
                {colors.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setColor(c.value)}
                    className={`w-full h-10 rounded-xl ${c.value} transition-all duration-300 hover:scale-110 ${
                      color === c.value
                        ? "ring-2 ring-foreground ring-offset-2 ring-offset-background scale-110"
                        : ""
                    }`}
                    title={c.name}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4" />
                Récurrence
              </Label>
              <Select value={recurrence} onValueChange={setRecurrence}>
                <SelectTrigger className="glass-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {recurrenceOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                className="flex-1"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Supprimer
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white"
              >
                <Edit className="w-4 h-4 mr-2" />
                Enregistrer
              </Button>
            </div>
          </form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
