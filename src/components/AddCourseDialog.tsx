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
}

const colors = [
  { name: "Bleu", value: "bg-primary" },
  { name: "Violet", value: "bg-secondary" },
  { name: "Vert", value: "bg-success" },
  { name: "Rose", value: "bg-warning" },
];

export const AddCourseDialog = ({ open, onOpenChange }: AddCourseDialogProps) => {
  const [courseName, setCourseName] = useState("");
  const [selectedColor, setSelectedColor] = useState(colors[0].value);
  const [intervals, setIntervals] = useState("1,3,7,15");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement course creation logic
    console.log({ courseName, selectedColor, intervals });
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
            <div className="flex gap-2">
              {colors.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => setSelectedColor(color.value)}
                  className={`w-12 h-12 rounded-lg ${color.value} transition-smooth hover:scale-110 ${
                    selectedColor === color.value
                      ? "ring-4 ring-offset-2 ring-primary"
                      : ""
                  }`}
                  title={color.name}
                />
              ))}
            </div>
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
