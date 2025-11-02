import { useState, useEffect } from "react";
import { Play, Pause, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BottomNav } from "@/components/BottomNav";
import { Card } from "@/components/ui/card";

const Classroom = () => {
  const [time, setTime] = useState(25 * 60); // 25 minutes in seconds
  const [isRunning, setIsRunning] = useState(false);
  const [objectives, setObjectives] = useState<string[]>([
    "Réviser le chapitre 3",
    "Faire les exercices de maths",
  ]);

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
    setTime(25 * 60);
    setIsRunning(false);
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
      <main className="max-w-screen-xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <p className="text-sm text-muted-foreground capitalize">{currentDate}</p>
        </div>

        <Card className="max-w-2xl mx-auto p-8 gradient-card shadow-colored border-0">
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

          <div className="mt-12 pt-8 border-t border-border">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-success animate-pulse"></span>
              Objectifs du jour
            </h3>
            <ul className="space-y-3">
              {objectives.map((objective, index) => (
                <li
                  key={index}
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-smooth"
                >
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-sm font-medium text-primary">
                    {index + 1}
                  </div>
                  <span className="text-foreground">{objective}</span>
                </li>
              ))}
            </ul>
          </div>
        </Card>
      </main>

      <BottomNav />
    </div>
  );
};

export default Classroom;
