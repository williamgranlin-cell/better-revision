import { Link } from "react-router-dom";
import { BottomNav } from "@/components/BottomNav";
import { PageTransition } from "@/components/PageTransition";
import { WelcomeHeader } from "@/components/WelcomeHeader";
import { ScrollToTop } from "@/components/ScrollToTop";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Calendar as CalendarIcon,
  Clock,
  Target,
  Trophy,
  TrendingUp,
  NotebookPen,
  FileText,
  BookOpen,
  CheckSquare,
  ClipboardList,
  HelpCircle,
  ArrowRight,
  Flame,
} from "lucide-react";
import { useStudySessions } from "@/hooks/useStudySessions";
import { useObjectives } from "@/hooks/useObjectives";
import { useControls } from "@/hooks/useControls";
import { useCourses } from "@/hooks/useCourses";

const formatTime = (minutes: number) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
};

const SHORTCUTS = [
  { to: "/cours", label: "Mes Cours", icon: NotebookPen, color: "from-blue-500 to-cyan-500" },
  { to: "/revision-generator", label: "Fiches", icon: FileText, color: "from-purple-500 to-pink-500" },
  { to: "/flashcards", label: "Flashcards", icon: BookOpen, color: "from-amber-500 to-orange-500" },
  { to: "/qcm", label: "QCM", icon: CheckSquare, color: "from-emerald-500 to-teal-500" },
  { to: "/classroom", label: "Classroom", icon: Target, color: "from-red-500 to-rose-500" },
  { to: "/controls", label: "Contrôles", icon: ClipboardList, color: "from-indigo-500 to-violet-500" },
  { to: "/study-chat", label: "Aide IA", icon: HelpCircle, color: "from-fuchsia-500 to-purple-500" },
  { to: "/calendar", label: "Calendrier", icon: CalendarIcon, color: "from-sky-500 to-blue-500" },
];

const Home = () => {
  const { getTotalStudyTime, getStudyStreak } = useStudySessions();
  const { objectives } = useObjectives();
  const { controls } = useControls();
  const { courses, getRevisionEvents } = useCourses();

  const totalMinutes = getTotalStudyTime();
  const streak = getStudyStreak();
  const completedObjectives = objectives.filter((o) => o.completed).length;
  const totalObjectives = objectives.length;
  const activeCourses = courses.length;

  const today = new Date().toISOString().split("T")[0];
  const todayRevisions = getRevisionEvents().filter((e) => e.date === today);

  const upcomingControls = [...controls]
    .filter((c) => new Date(c.date) >= new Date(today))
    .slice(0, 3);

  const pendingObjectives = objectives.filter((o) => !o.completed).slice(0, 3);

  return (
    <PageTransition>
      <div className="min-h-screen pb-24 bg-background">
        <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-lg border-b border-border/50 shadow-sm">
          <div className="max-w-screen-xl mx-auto px-4 md:px-6 py-4">
            <WelcomeHeader />
            <h1 className="text-2xl md:text-3xl font-display font-bold bg-gradient-primary bg-clip-text text-transparent">
              Accueil
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Voici un récapitulatif de ta progression
            </p>
          </div>
        </header>

        <main className="max-w-screen-xl mx-auto px-4 md:px-6 py-6 space-y-6">
          {/* Stats */}
          <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="border-0 shadow-sm bg-gradient-to-br from-primary/10 to-primary/5">
              <CardContent className="p-4">
                <Clock className="h-6 w-6 text-primary mb-2" />
                <div className="text-2xl font-bold">{formatTime(totalMinutes)}</div>
                <p className="text-xs text-muted-foreground">Temps total</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm bg-gradient-to-br from-orange-500/10 to-amber-500/5">
              <CardContent className="p-4">
                <Flame className="h-6 w-6 text-orange-500 mb-2" />
                <div className="text-2xl font-bold">{streak}</div>
                <p className="text-xs text-muted-foreground">Jours d'affilée</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-500/10 to-teal-500/5">
              <CardContent className="p-4">
                <Target className="h-6 w-6 text-emerald-500 mb-2" />
                <div className="text-2xl font-bold">
                  {completedObjectives}/{totalObjectives}
                </div>
                <p className="text-xs text-muted-foreground">Objectifs</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-500/10 to-pink-500/5">
              <CardContent className="p-4">
                <BookOpen className="h-6 w-6 text-purple-500 mb-2" />
                <div className="text-2xl font-bold">{activeCourses}</div>
                <p className="text-xs text-muted-foreground">Cours actifs</p>
              </CardContent>
            </Card>
          </section>

          {/* Today's revisions */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="border-0 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold flex items-center gap-2">
                    <CalendarIcon className="h-5 w-5 text-primary" />
                    Révisions du jour
                  </h2>
                  <Link to="/calendar">
                    <Button variant="ghost" size="sm" className="text-xs">
                      Voir tout <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  </Link>
                </div>
                {todayRevisions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Aucune révision prévue aujourd'hui.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {todayRevisions.slice(0, 5).map((r, i) => (
                      <li
                        key={i}
                        className="flex items-center gap-3 p-2 rounded-lg bg-muted/50"
                      >
                        <div className={`w-3 h-3 rounded-full ${r.color}`} />
                        <span className="flex-1 text-sm font-medium">{r.courseName}</span>
                        <span className="text-xs text-muted-foreground">
                          Révision n°{r.revisionNumber}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold flex items-center gap-2">
                    <ClipboardList className="h-5 w-5 text-indigo-500" />
                    Prochains contrôles
                  </h2>
                  <Link to="/controls">
                    <Button variant="ghost" size="sm" className="text-xs">
                      Voir tout <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  </Link>
                </div>
                {upcomingControls.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Aucun contrôle à venir.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {upcomingControls.map((c) => (
                      <li
                        key={c.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                      >
                        <div>
                          <div className="text-sm font-medium">{c.name}</div>
                          <div className="text-xs text-muted-foreground">{c.subject}</div>
                        </div>
                        <span className="text-xs font-medium text-primary">
                          {new Date(c.date).toLocaleDateString("fr-FR", {
                            day: "numeric",
                            month: "short",
                          })}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </section>

          {/* Objectives */}
          <Card className="border-0 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold flex items-center gap-2">
                  <Target className="h-5 w-5 text-emerald-500" />
                  Objectifs en cours
                </h2>
                <Link to="/classroom">
                  <Button variant="ghost" size="sm" className="text-xs">
                    Gérer <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </Link>
              </div>
              {pendingObjectives.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Tous tes objectifs sont complétés ! 🎯
                </p>
              ) : (
                <ul className="space-y-2">
                  {pendingObjectives.map((o) => (
                    <li
                      key={o.id}
                      className="flex items-center gap-3 p-2 rounded-lg bg-muted/50"
                    >
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span className="text-sm">{o.text}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Shortcuts */}
          <section>
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Accès rapide
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {SHORTCUTS.map((s) => {
                const Icon = s.icon;
                return (
                  <Link key={s.to} to={s.to}>
                    <Card className="border-0 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer group">
                      <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                        <div
                          className={`w-12 h-12 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center group-hover:scale-110 transition-transform`}
                        >
                          <Icon className="w-6 h-6 text-white" />
                        </div>
                        <span className="text-sm font-medium">{s.label}</span>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </section>

          {/* Achievements */}
          {(streak >= 7 || totalMinutes >= 3000 || completedObjectives >= 50) && (
            <Card className="border-0 shadow-sm bg-gradient-to-br from-warning/10 to-warning/5">
              <CardContent className="p-5">
                <h2 className="font-semibold mb-4 flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-warning" />
                  Tes succès
                </h2>
                <div className="flex flex-wrap gap-3">
                  {streak >= 7 && (
                    <div className="px-3 py-2 rounded-lg bg-card text-sm">
                      🔥 7 jours d'affilée
                    </div>
                  )}
                  {totalMinutes >= 3000 && (
                    <div className="px-3 py-2 rounded-lg bg-card text-sm">
                      ⏰ 50h de révision
                    </div>
                  )}
                  {completedObjectives >= 50 && (
                    <div className="px-3 py-2 rounded-lg bg-card text-sm">
                      🎯 50 objectifs
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </main>

        <ScrollToTop />
        <BottomNav />
      </div>
    </PageTransition>
  );
};

export default Home;
