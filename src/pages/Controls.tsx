import { useState } from "react";
import { Plus, Calendar, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BottomNav } from "@/components/BottomNav";
import { Card } from "@/components/ui/card";
import { AddControlDialog } from "@/components/AddControlDialog";
import { Badge } from "@/components/ui/badge";

interface Control {
  id: string;
  name: string;
  subject: string;
  date: string;
  importance: "low" | "medium" | "high";
  targetGrade: string;
}

const Controls = () => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [controls, setControls] = useState<Control[]>([
    {
      id: "1",
      name: "Contrôle de Mathématiques",
      subject: "Maths",
      date: "2025-11-15",
      importance: "high",
      targetGrade: "16/20",
    },
    {
      id: "2",
      name: "Examen de Physique",
      subject: "Physique",
      date: "2025-11-20",
      importance: "medium",
      targetGrade: "14/20",
    },
  ]);

  const importanceConfig = {
    low: { color: "bg-success", label: "Faible" },
    medium: { color: "bg-warning", label: "Moyenne" },
    high: { color: "bg-destructive", label: "Haute" },
  };

  const getDaysUntil = (dateString: string) => {
    const targetDate = new Date(dateString);
    const today = new Date();
    const diffTime = targetDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const sortedControls = [...controls].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  return (
    <div className="min-h-screen pb-24 bg-background">
      <header className="sticky top-0 z-40 bg-card border-b border-border shadow-sm">
        <div className="max-w-screen-xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Mes Contrôles
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Prépare tes examens à venir
            </p>
          </div>
          <Button
            onClick={() => setIsAddDialogOpen(true)}
            size="sm"
            className="gradient-primary shadow-colored hover:shadow-lg transition-smooth"
          >
            <Plus className="w-4 h-4 mr-2" />
            Ajouter
          </Button>
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto px-4 py-6">
        <div className="space-y-4">
          {sortedControls.map((control) => {
            const daysUntil = getDaysUntil(control.date);
            const config = importanceConfig[control.importance];

            return (
              <Card
                key={control.id}
                className="p-5 gradient-card border-0 shadow-sm hover:shadow-md transition-smooth"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-foreground">
                        {control.name}
                      </h3>
                      <Badge className={`${config.color} text-white border-0`}>
                        {config.label}
                      </Badge>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(control.date).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "long",
                        })}
                      </div>
                      <div className="flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        Dans {daysUntil} jour{daysUntil > 1 ? "s" : ""}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-xs text-muted-foreground mb-1">Objectif</p>
                    <p className="text-xl font-bold text-primary">{control.targetGrade}</p>
                  </div>
                </div>
              </Card>
            );
          })}

          {controls.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Aucun contrôle prévu pour le moment</p>
              <Button
                onClick={() => setIsAddDialogOpen(true)}
                variant="outline"
                className="mt-4"
              >
                Ajouter ton premier contrôle
              </Button>
            </div>
          )}
        </div>
      </main>

      <AddControlDialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen} />
      <BottomNav />
    </div>
  );
};

export default Controls;
