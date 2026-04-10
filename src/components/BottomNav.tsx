import { Calendar, Target, BookOpen, HelpCircle, User, Clock, FileText, NotebookPen, ClipboardList, CheckSquare } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const navItems = [
  { icon: Calendar, label: "Calendrier", path: "/", emoji: "📅" },
  { icon: Clock, label: "Emploi", path: "/schedule", emoji: "⏰" },
  { icon: Target, label: "Classroom", path: "/classroom", emoji: "🎯" },
  { icon: NotebookPen, label: "Cours", path: "/cours", emoji: "📓" },
  { icon: FileText, label: "Fiches", path: "/revision-generator", emoji: "📝" },
  { icon: BookOpen, label: "Flashcards", path: "/flashcards", emoji: "🃏" },
  { icon: CheckSquare, label: "QCM", path: "/qcm", emoji: "✅" },
  { icon: ClipboardList, label: "Contrôles", path: "/controls", emoji: "📋" },
  { icon: HelpCircle, label: "Aide", path: "/study-chat", emoji: "🤗" },
  { icon: User, label: "Profil", path: "/profile", emoji: "👤" },
];

const TIPS: Record<string, string> = {
  "/": "Planifie tes révisions avec le calendrier J+X",
  "/schedule": "Gère ton emploi du temps hebdomadaire",
  "/classroom": "Minuteur Pomodoro & objectifs du jour",
  "/cours": "Rédige, enregistre et améliore tes cours",
  "/revision-generator": "Génère des fiches de révision avec l'IA",
  "/flashcards": "Crée et révise tes flashcards",
  "/qcm": "Teste tes connaissances avec des QCM",
  "/controls": "Suivi de tes contrôles et examens",
  "/study-chat": "Pose des questions à ton assistant IA",
  "/profile": "Paramètres, thèmes et statistiques",
};

export const BottomNav = () => {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-lg border-t border-border/50 shadow-[0_-4px_20px_-4px_hsl(var(--primary)/0.1)]">
      <div className="max-w-screen-xl mx-auto px-1">
        <div className="flex justify-around items-center py-2">
          {navItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <Tooltip key={item.path} delayDuration={400}>
                <TooltipTrigger asChild>
                  <Link
                    to={item.path}
                    className={cn(
                      "flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-all duration-300",
                      "hover:bg-primary/5 active:scale-95",
                      isActive
                        ? "text-primary"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <div className={cn(
                      "relative p-1.5 rounded-lg transition-all duration-300",
                      isActive && "bg-primary/10 shadow-[0_0_12px_hsl(var(--primary)/0.3)]"
                    )}>
                      <Icon className={cn(
                        "w-5 h-5 transition-transform duration-300",
                        isActive && "animate-bounce-soft"
                      )} />
                    </div>
                    <span className={cn(
                      "text-[10px] font-medium transition-all duration-300",
                      isActive && "font-semibold"
                    )}>
                      {item.label}
                    </span>
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs max-w-[200px]">
                  {TIPS[item.path] || item.label}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
