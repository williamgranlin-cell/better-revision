import { useState, useEffect } from "react";
import { Play, Pause, RotateCcw, Plus, Trash2, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BottomNav } from "@/components/BottomNav";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useObjectives } from "@/hooks/useObjectives";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

const Classroom = () => {
  const [timerDuration, setTimerDuration] = useState(25);
  const [time, setTime] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [newObjective, setNewObjective] = useState("");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { objectives, addObjective, toggleObjective, deleteObjective } = useObjectives();

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning && time > 0) {
      interval = setInterval(() => {
        setTime((prevTime) => prevTime - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, time]);

  const toggleTimer = () => setIsRunning(!isRunning);

  const resetTimer = () => {
    setIsRunning(false);
    setTime(timerDuration * 60);
  };

  const handleAddObjective = (e: React.FormEvent) => {
    e.preventDefault();
    if (newObjective.trim()) {
      addObjective(newObjective.trim());
      setNewObjective("");
    }
  };

  const handleTimerDurationChange = (newDuration: number) => {
    setTimerDuration(newDuration);
    setTime(newDuration * 60);
    setIsRunning(false);
    setIsSettingsOpen(false);
  };

  const minutes = Math.floor(time / 60);
  const seconds = time % 60;
  const currentDate = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="min-h-screen pb-24 bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <header className="sticky top-0 z-40 bg-card border-b border-border shadow-sm">
        <div className="max-w-screen-xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Session de Travail
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Concentre-toi et atteins tes objectifs
            </p>
          </div>
          <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon">
                <Settings className="w-4 h-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Réglages du minuteur</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="duration">Durée (en minutes)</Label>
                  <Input
                    id="duration"
                    type="number"
                    min="1"
                    max="120"
                    value={timerDuration}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      if (!isNaN(val)) setTimerDuration(val);
                    }}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleTimerDurationChange(15)}
                  >
                    15 min
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleTimerDurationChange(25)}
                  >
                    25 min
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleTimerDurationChange(45)}
                  >
                    45 min
                  </Button>
                </div>
                <Button
                  className="w-full gradient-primary"
                  onClick={() => handleTimerDurationChange(timerDuration)}
                >
                  Appliquer
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <p className="text-sm text-muted-foreground capitalize">{currentDate}</p>
        </div>

        <Card className="max-w-2xl mx-auto p-8 gradient-card shadow-colored border-0 mb-6">
          <div className="text-center mb-12">
            <div className="text-8xl font-bold text-foreground mb-6 tabular-nums">
              {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
            </div>
            
            <div className="flex gap-4 justify-center">
              <Button
                onClick={toggleTimer}
                size="lg"
                className="gradient-primary shadow-colored hover:shadow-lg transition-smooth px-8"
              >
                {isRunning ? (
                  <>
                    <Pause className="w-5 h-5 mr-2" />
                    Pause
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5 mr-2" />
                    Démarrer
                  </>
                )}
              </Button>
              <Button
                onClick={resetTimer}
                size="lg"
                variant="outline"
                className="border-2 hover:bg-muted transition-smooth"
              >
                <RotateCcw className="w-5 h-5 mr-2" />
                Réinitialiser
              </Button>
            </div>
          </div>
        </Card>

        <Card className="max-w-2xl mx-auto p-6 gradient-card border-0 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Objectifs du jour
          </h2>
          
          <form onSubmit={handleAddObjective} className="flex gap-2 mb-4">
            <Input
              value={newObjective}
              onChange={(e) => setNewObjective(e.target.value)}
              placeholder="Ajouter un objectif..."
            />
            <Button type="submit" size="icon" className="gradient-primary shrink-0">
              <Plus className="w-4 h-4" />
            </Button>
          </form>

          <div className="space-y-3">
            {objectives.map((objective) => (
              <div key={objective.id} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg group">
                <Checkbox
                  id={objective.id}
                  checked={objective.completed}
                  onCheckedChange={() => toggleObjective(objective.id)}
                />
                <label
                  htmlFor={objective.id}
                  className={`text-sm cursor-pointer flex-1 ${
                    objective.completed ? "line-through text-muted-foreground" : "text-foreground"
                  }`}
                >
                  {objective.text}
                </label>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteObjective(objective.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </Card>
      </main>

      <BottomNav />
    </div>
  );
};

export default Classroom;
