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
import { FileCheck } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AddControlDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddControl: (control: {
    name: string;
    subject: string;
    date: string;
    importance: "low" | "medium" | "high";
    targetGrade: string;
  }) => void;
}

export const AddControlDialog = ({ open, onOpenChange, onAddControl }: AddControlDialogProps) => {
  const [controlName, setControlName] = useState("");
  const [subject, setSubject] = useState("");
  const [date, setDate] = useState("");
  const [importance, setImportance] = useState<"low" | "medium" | "high">("medium");
  const [targetGrade, setTargetGrade] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddControl({
      name: controlName,
      subject,
      date,
      importance,
      targetGrade,
    });
    setControlName("");
    setSubject("");
    setDate("");
    setImportance("medium");
    setTargetGrade("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-primary" />
            Ajouter un contrôle
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="control-name">Nom du contrôle</Label>
            <Input
              id="control-name"
              value={controlName}
              onChange={(e) => setControlName(e.target.value)}
              placeholder="Ex: Contrôle de Mathématiques"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Matière</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Ex: Mathématiques"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Date de l'épreuve</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="importance">Importance</Label>
            <Select value={importance} onValueChange={(value) => setImportance(value as "low" | "medium" | "high")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Faible</SelectItem>
                <SelectItem value="medium">Moyenne</SelectItem>
                <SelectItem value="high">Haute</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="target-grade">Note cible</Label>
            <Input
              id="target-grade"
              value={targetGrade}
              onChange={(e) => setTargetGrade(e.target.value)}
              placeholder="Ex: 16/20"
              required
            />
          </div>

          <Button type="submit" className="w-full gradient-primary shadow-colored">
            Ajouter le contrôle
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
