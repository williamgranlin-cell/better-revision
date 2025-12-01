import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BookOpen, Palette } from "lucide-react";

interface AddCourseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddCourse: (course: { name: string; color: string; intervals: number[]; firstRevisionDate: string }) => void;
}

// Expanded color palette for more visual variety
const colors = [
  { name: "Rouge", value: "bg-red-500" },
  { name: "Rose", value: "bg-pink-500" },
  { name: "Violet", value: "bg-purple-500" },
  { name: "Indigo", value: "bg-indigo-500" },
  { name: "Bleu", value: "bg-blue-500" },
  { name: "Cyan", value: "bg-cyan-500" },
  { name: "Turquoise", value: "bg-teal-500" },
  { name: "Vert", value: "bg-green-500" },
  { name: "Lime", value: "bg-lime-500" },
  { name: "Jaune", value: "bg-yellow-500" },
  { name: "Ambre", value: "bg-amber-500" },
  { name: "Orange", value: "bg-orange-500" },
  { name: "Corail", value: "bg-red-400" },
  { name: "Fuchsia", value: "bg-fuchsia-500" },
  { name: "Emeraude", value: "bg-emerald-500" },
];

export const AddCourseDialog = ({ open, onOpenChange, onAddCourse }: AddCourseDialogProps) => {
  const [courseName, setCourseName] = useState("");
  const [selectedColor, setSelectedColor] = useState(colors[0].value);
  const [intervals, setIntervals] = useState("1,3,7,15");
  const [firstRevisionDate, setFirstRevisionDate] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddCourse({
      name: courseName,
      color: selectedColor,
      intervals: intervals.split(",").map(Number),
      firstRevisionDate,
    });
    setCourseName("");
    setIntervals("1,3,7,15");
    setFirstRevisionDate("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            Ajouter un nouveau cours
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="course-name">Nom du cours</Label>
            <Input
              id="course-name"
              value={courseName}
              onChange={(e) => setCourseName(e.target.value)}
              placeholder="Ex: Mathématiques"
              required
            />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Palette className="w-4 h-4" />
              Couleur
            </Label>
            <div className="grid grid-cols-5 gap-2">
              {colors.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => setSelectedColor(color.value)}
                  className={`w-full h-10 rounded-lg ${color.value} transition-smooth hover:scale-110 ${
                    selectedColor === color.value
                      ? "ring-2 ring-foreground ring-offset-2"
                      : ""
                  }`}
                  title={color.name}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="first-revision">Première révision</Label>
            <Input
              id="first-revision"
              type="date"
              value={firstRevisionDate}
              onChange={(e) => setFirstRevisionDate(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="intervals">Intervalles de révision (en jours)</Label>
            <Input
              id="intervals"
              value={intervals}
              onChange={(e) => setIntervals(e.target.value)}
              placeholder="Ex: 1,3,7,15,30"
              required
            />
            <p className="text-xs text-muted-foreground">
              Sépare les jours par des virgules (J+1, J+3, etc.)
            </p>
          </div>

          <Button type="submit" className="w-full gradient-primary shadow-colored">
            Créer le cours
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
