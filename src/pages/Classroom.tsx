import { useState, useEffect } from "react";
import { Play, Pause, RotateCcw, Plus, Trash2, Settings, Target, Clock, CheckCircle2, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BottomNav } from "@/components/BottomNav";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useObjectives } from "@/hooks/useObjectives";
import { useStudySessions } from "@/hooks/useStudySessions";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { PageTransition } from "@/components/PageTransition";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

const PRESET_DURATIONS = [
  { label: "🍅 Pomodoro", minutes: 25 },
  { label: "⚡ Sprint", minutes: 15 },
  { label: "📚 Session", minutes: 45 },
  { label: "🏆 Marathon", minutes: 60 },
];

const Classroom = () => {
  const [timerDuration, setTimerDuration] = useState(25);
  const [time, setTime] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [newObjective, setNewObjective] = useState("");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);
  const { objectives, addObjective, toggleObjective, deleteObjective } = useObjectives();
  const { addSession } = useStudySessions();

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isRunning && time > 0) {
      interval = setInterval(() => {
        setTime((prevTime) => prevTime - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, time]);

  useEffect(() => {
    const total = timerDuration * 60;
    setProgress(((total - time) / total) * 100);
  }, [time, timerDuration]);

  const toggleTimer = () => {
    if (!isRunning) {
      setSessionStartTime(Date.now());
    } else if (sessionStartTime) {
      const durationMinutes = Math.floor((Date.now() - sessionStartTime) / 60000);
      if (durationMinutes > 0) addSession(durationMinutes);
      setSessionStartTime(null);
    }
    setIsRunning(!isRunning);
  };

  const resetTimer = () => {
    if (isRunning && sessionStartTime) {
      const durationMinutes = Math.floor((Date.now() - sessionStartTime) / 60000);
      if (durationMinutes > 0) addSession(durationMinutes);
    }
    setIsRunning(false);
    setTime(timerDuration * 60);
    setSessionStartTime(null);
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
  const completedCount = objectives.filter((o) => o.completed).length;
  const totalCount = objectives.length;

  // Circular progress
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  const currentDate = new Date().toLocaleDateString("fr-FR", {
    weekday: "long", day: "numeric", month: "long",
  });

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  return (
    <PageTransition>
    <div className="min-h-screen pb-24 bg-background">
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-lg border-b border-border/50 shadow-sm">
        <div className="max-w-screen-xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-display font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Session de Travail 🎯
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5 capitalize">{currentDate}</p>
          </div>
          <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon" className="rounded-xl">
                <Settings className="w-4 h-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="font-display flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" /> Réglages du minuteur
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  {PRESET_DURATIONS.map((preset) => (
                    <Button
                      key={preset.minutes}
                      type="button"
                      variant={timerDuration === preset.minutes ? "default" : "outline"}
                      onClick={() => handleTimerDurationChange(preset.minutes)}
                      className={cn("h-14 flex flex-col gap-0.5", timerDuration === preset.minutes && "gradient-primary")}
                    >
                      <span className="text-base">{preset.label.split(" ")[0]}</span>
                      <span className="text-xs opacity-80">{preset.label.split(" ").slice(1).join(" ")} · {preset.minutes} min</span>
                    </Button>
                  ))}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="custom-duration">Durée personnalisée (minutes)</Label>
                  <div className="flex gap-2">
                    <Input
                      id="custom-duration"
                      type="number"
                      min="1"
                      max="120"
                      value={timerDuration}
                      onChange={(e) => { const val = parseInt(e.target.value); if (!isNaN(val)) setTimerDuration(val); }}
                    />
                    <Button onClick={() => handleTimerDurationChange(timerDuration)} className="gradient-primary shrink-0">
                      OK
                    </Button>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto px-4 md:px-6 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {/* Timer Card */}
          <Card className="p-6 md:p-8 gradient-card shadow-colored border-0 order-1">
            <div className="flex flex-col items-center">
              {/* Circular progress timer */}
              <div className="relative w-52 h-52 mb-6">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 200 200">
                  <circle
                    cx="100" cy="100" r={radius}
                    fill="none"
                    stroke="hsl(var(--muted))"
                    strokeWidth="8"
                  />
                  <circle
                    cx="100" cy="100" r={radius}
                    fill="none"
                    stroke="url(#timerGradient)"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    style={{ transition: "stroke-dashoffset 1s linear" }}
                  />
                  <defs>
                    <linearGradient id="timerGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="hsl(var(--primary))" />
                      <stop offset="100%" stopColor="hsl(var(--secondary))" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-5xl font-bold tabular-nums text-foreground">
                    {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
                  </span>
                  <span className="text-xs text-muted-foreground mt-1">
                    {isRunning ? "⏳ En cours..." : "Prêt à démarrer"}
                  </span>
                </div>
              </div>

              <div className="flex gap-3 w-full max-w-xs">
                <Button
                  onClick={toggleTimer}
                  size="lg"
                  className="gradient-primary shadow-colored hover:shadow-lg flex-1 transition-all duration-200 hover:-translate-y-0.5"
                >
                  {isRunning ? <><Pause className="w-5 h-5 mr-2" />Pause</> : <><Play className="w-5 h-5 mr-2" />Démarrer</>}
                </Button>
                <Button onClick={resetTimer} size="lg" variant="outline" className="rounded-xl border-2">
                  <RotateCcw className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </Card>

          {/* Objectives Card */}
          <Card className="p-4 md:p-6 gradient-card border-0 shadow-sm order-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" /> Objectifs du jour
              </h2>
              {totalCount > 0 && (
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Trophy className="w-4 h-4 text-warning" />
                  <span>{completedCount}/{totalCount}</span>
                </div>
              )}
            </div>

            {/* Progress bar */}
            {totalCount > 0 && (
              <div className="mb-4">
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className="h-full gradient-primary rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${(completedCount / totalCount) * 100}%` }}
                    transition={{ duration: 0.4 }}
                  />
                </div>
              </div>
            )}

            <form onSubmit={handleAddObjective} className="flex gap-2 mb-4">
              <Input
                value={newObjective}
                onChange={(e) => setNewObjective(e.target.value)}
                placeholder="Ajouter un objectif..."
                className="flex-1"
              />
              <Button type="submit" size="icon" className="gradient-primary shrink-0 rounded-xl">
                <Plus className="w-4 h-4" />
              </Button>
            </form>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              <AnimatePresence>
                {objectives.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground text-sm">
                    <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    Aucun objectif pour aujourd'hui
                  </div>
                ) : (
                  objectives.map((objective) => (
                    <motion.div
                      key={objective.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-xl group transition-all duration-200",
                        objective.completed ? "bg-primary/5 border border-primary/10" : "bg-muted/40 hover:bg-muted/60"
                      )}
                    >
                      <Checkbox
                        id={objective.id}
                        checked={objective.completed}
                        onCheckedChange={() => toggleObjective(objective.id)}
                        className="shrink-0"
                      />
                      <label
                        htmlFor={objective.id}
                        className={cn("text-sm cursor-pointer flex-1 transition-all", objective.completed ? "line-through text-muted-foreground" : "text-foreground")}
                      >
                        {objective.text}
                      </label>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteTarget(objective.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity w-7 h-7 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          </Card>
        </div>
      </main>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Supprimer cet objectif ?"
        description="Cette action est irréversible."
        onConfirm={() => { if (deleteTarget) deleteObjective(deleteTarget); setDeleteTarget(null); }}
      />

      <BottomNav />
    </div>
    </PageTransition>
  );
};

export default Classroom;
