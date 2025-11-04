import { Card, CardContent } from "@/components/ui/card";
import { Clock, Target, Trophy, TrendingUp } from "lucide-react";
import { useStudySessions } from "@/hooks/useStudySessions";
import { useObjectives } from "@/hooks/useObjectives";
import { useControls } from "@/hooks/useControls";
import { useCourses } from "@/hooks/useCourses";

export const StatisticsSection = () => {
  const { getTotalStudyTime, getStudyStreak } = useStudySessions();
  const { objectives } = useObjectives();
  const { controls } = useControls();
  const { courses } = useCourses();

  const totalMinutes = getTotalStudyTime();
  const streak = getStudyStreak();
  const completedObjectives = objectives.filter((obj) => obj.completed).length;
  const totalObjectives = objectives.length;
  const upcomingControls = controls.length;
  const activeCourses = courses.length;

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    return `${hours}h ${mins}m`;
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold flex items-center gap-2">
        <TrendingUp className="h-5 w-5 text-primary" />
        Statistiques réelles
      </h2>
      
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Clock className="h-6 w-6 mx-auto mb-2 text-primary" />
            <div className="text-2xl font-bold text-primary">
              {formatTime(totalMinutes)}
            </div>
            <p className="text-xs text-muted-foreground">Temps total de révision</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <Trophy className="h-6 w-6 mx-auto mb-2 text-warning" />
            <div className="text-2xl font-bold text-warning">{streak}</div>
            <p className="text-xs text-muted-foreground">Jours consécutifs</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <Target className="h-6 w-6 mx-auto mb-2 text-secondary" />
            <div className="text-2xl font-bold text-secondary">
              {completedObjectives}/{totalObjectives}
            </div>
            <p className="text-xs text-muted-foreground">Objectifs complétés</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl mb-2">📚</div>
            <div className="text-2xl font-bold text-accent">{activeCourses}</div>
            <p className="text-xs text-muted-foreground">Cours actifs</p>
          </CardContent>
        </Card>
      </div>

      {/* Success Badges */}
      <Card>
        <CardContent className="p-4">
          <h3 className="font-semibold mb-3 text-sm">Succès débloqués</h3>
          <div className="grid grid-cols-3 gap-3">
            {streak >= 7 && (
              <div className="text-center p-3 rounded-lg bg-primary/5">
                <div className="text-2xl mb-1">🔥</div>
                <p className="text-xs font-medium">7 jours d'affilée</p>
              </div>
            )}
            {totalMinutes >= 3000 && (
              <div className="text-center p-3 rounded-lg bg-secondary/5">
                <div className="text-2xl mb-1">⏰</div>
                <p className="text-xs font-medium">50h de révision</p>
              </div>
            )}
            {completedObjectives >= 50 && (
              <div className="text-center p-3 rounded-lg bg-accent/5">
                <div className="text-2xl mb-1">🎯</div>
                <p className="text-xs font-medium">50 objectifs</p>
              </div>
            )}
            {upcomingControls >= 5 && (
              <div className="text-center p-3 rounded-lg bg-success/5">
                <div className="text-2xl mb-1">📝</div>
                <p className="text-xs font-medium">5+ contrôles</p>
              </div>
            )}
            {activeCourses >= 10 && (
              <div className="text-center p-3 rounded-lg bg-warning/5">
                <div className="text-2xl mb-1">📚</div>
                <p className="text-xs font-medium">10+ cours</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
