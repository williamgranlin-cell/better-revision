import { BottomNav } from "@/components/BottomNav";
import { Card } from "@/components/ui/card";
import { Clock, TrendingUp, Target, CheckCircle2 } from "lucide-react";

const Statistics = () => {
  const stats = {
    weekTotal: "12h 30m",
    dailyAverage: "1h 47m",
    completionRate: 85,
    sessionsCompleted: 24,
  };

  const weekData = [
    { day: "Lun", hours: 2.5, color: "bg-primary" },
    { day: "Mar", hours: 1.8, color: "bg-secondary" },
    { day: "Mer", hours: 3.2, color: "bg-success" },
    { day: "Jeu", hours: 1.5, color: "bg-warning" },
    { day: "Ven", hours: 2.0, color: "bg-primary" },
    { day: "Sam", hours: 1.0, color: "bg-secondary" },
    { day: "Dim", hours: 0.5, color: "bg-success" },
  ];

  const maxHours = Math.max(...weekData.map((d) => d.hours));

  return (
    <div className="min-h-screen pb-24 bg-background">
      <header className="sticky top-0 z-40 bg-card border-b border-border shadow-sm">
        <div className="max-w-screen-xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Mes Statistiques
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Suis ta progression et tes performances
          </p>
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto px-4 py-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4 gradient-card border-0 shadow-sm hover:shadow-md transition-smooth">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Cette semaine</p>
                <p className="text-lg font-bold text-foreground">{stats.weekTotal}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 gradient-card border-0 shadow-sm hover:shadow-md transition-smooth">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-secondary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Moyenne/jour</p>
                <p className="text-lg font-bold text-foreground">{stats.dailyAverage}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 gradient-card border-0 shadow-sm hover:shadow-md transition-smooth">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
                <Target className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Taux complétion</p>
                <p className="text-lg font-bold text-foreground">{stats.completionRate}%</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 gradient-card border-0 shadow-sm hover:shadow-md transition-smooth">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Sessions</p>
                <p className="text-lg font-bold text-foreground">{stats.sessionsCompleted}</p>
              </div>
            </div>
          </Card>
        </div>

        <Card className="p-6 gradient-card border-0 shadow-sm">
          <h2 className="text-lg font-semibold mb-6 text-foreground">
            Temps de révision hebdomadaire
          </h2>
          <div className="flex items-end justify-around gap-2 h-64">
            {weekData.map((day) => (
              <div key={day.day} className="flex flex-col items-center gap-2 flex-1">
                <div className="relative w-full flex items-end justify-center flex-1">
                  <div
                    className={`w-full max-w-[60px] rounded-t-lg ${day.color} transition-smooth hover:opacity-80`}
                    style={{
                      height: `${(day.hours / maxHours) * 100}%`,
                      minHeight: "8px",
                    }}
                  >
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-medium text-foreground">
                      {day.hours}h
                    </div>
                  </div>
                </div>
                <span className="text-xs font-medium text-muted-foreground">{day.day}</span>
              </div>
            ))}
          </div>
        </Card>
      </main>

      <BottomNav />
    </div>
  );
};

export default Statistics;
