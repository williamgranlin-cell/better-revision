import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import {
  Home,
  Calendar,
  Clock,
  Target,
  NotebookPen,
  FileText,
  BookOpen,
  CheckSquare,
  ClipboardList,
  HelpCircle,
} from "lucide-react";

/**
 * Central hub inside /profile that regroups every section of the app.
 * Complements — does not replace — the left sidebar.
 */
const HUB = [
  { icon: Home, label: "Accueil", to: "/", hint: "Vue d'ensemble" },
  { icon: Calendar, label: "Calendrier", to: "/calendar", hint: "Planning J+X" },
  { icon: Clock, label: "Emploi du temps", to: "/schedule", hint: "Semaine" },
  { icon: Target, label: "Classroom", to: "/classroom", hint: "Pomodoro & objectifs" },
  { icon: NotebookPen, label: "Cours", to: "/cours", hint: "Prises de notes" },
  { icon: FileText, label: "Fiches", to: "/revision-generator", hint: "Générateur IA" },
  { icon: BookOpen, label: "Flashcards", to: "/flashcards", hint: "Mémorisation" },
  { icon: CheckSquare, label: "QCM", to: "/qcm", hint: "Évaluation" },
  { icon: ClipboardList, label: "Contrôles", to: "/controls", hint: "Examens à venir" },
  { icon: HelpCircle, label: "Aide IA", to: "/study-chat", hint: "Assistant d'étude" },
] as const;

export const ProfileDashboard = () => {
  return (
    <section aria-labelledby="hub-title" className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 id="hub-title" className="font-display text-2xl font-semibold tracking-tight">
          Tableau de bord
        </h2>
        <span className="text-xs uppercase tracking-widest text-muted-foreground">
          Accès rapide
        </span>
      </div>
      <p className="text-sm text-muted-foreground italic">
        Toutes tes sections de travail, réunies en un seul endroit.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {HUB.map(({ icon: Icon, label, to, hint }) => (
          <Link key={to} to={to} className="group">
            <Card className="h-full p-4 border border-border/60 bg-card hover:border-foreground/40 hover:shadow-md transition-all">
              <div className="flex flex-col items-start gap-2">
                <div className="p-2 rounded-md bg-muted group-hover:bg-foreground group-hover:text-background transition-colors">
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <div className="font-semibold text-sm leading-tight">{label}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">{hint}</div>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
};
