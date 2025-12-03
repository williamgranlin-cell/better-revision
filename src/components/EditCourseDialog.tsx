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
import { Edit, Palette } from "lucide-react";
import { Course } from "@/hooks/useCourses";

interface EditCourseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  course: Course | null;
  onUpdateCourse: (id: string, updates: Partial<Omit<Course, "id">>) => void;
}

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

export const EditCourseDialog = ({ open, onOpenChange, course, onUpdateCourse }: EditCourseDialogProps) => {
  const [courseName, setCourseName] = useState("");
  const [selectedColor, setSelectedColor] = useState(colors[0].value);
  const [intervals, setIntervals] = useState("1,3,7,15");
  const [firstRevisionDate, setFirstRevisionDate] = useState("");

  useEffect(() => {
    if (course) {
      setCourseName(course.name);
      setSelectedColor(course.color);
      setIntervals(course.intervals.join(","));
      setFirstRevisionDate(course.firstRevisionDate);
    }
  }, [course]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!course) return;
    
    onUpdateCourse(course.id, {
      name: courseName,
      color: selectedColor,
      intervals: intervals.split(",").map(Number),
      firstRevisionDate,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display text-xl">
            <Edit className="w-5 h-5 text-primary" />
            Modifier le cours
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-course-name">Nom du cours</Label>
            <Input
              id="edit-course-name"
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
            <Label htmlFor="edit-first-revision">Première révision</Label>
            <Input
              id="edit-first-revision"
              type="date"
              value={firstRevisionDate}
              onChange={(e) => setFirstRevisionDate(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-intervals">Intervalles de révision (en jours)</Label>
            <Input
              id="edit-intervals"
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
            Enregistrer les modifications
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
