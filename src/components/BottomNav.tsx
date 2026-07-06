import { useEffect, useState } from "react";
import {
  Home,
  Calendar,
  Target,
  BookOpen,
  HelpCircle,
  User,
  Clock,
  FileText,
  NotebookPen,
  ClipboardList,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useIsMobile } from "@/hooks/use-mobile";

const navItems = [
  { icon: Home, label: "Accueil", path: "/" },
  { icon: Calendar, label: "Calendrier", path: "/calendar" },
  { icon: Clock, label: "Emploi", path: "/schedule" },
  { icon: Target, label: "Classroom", path: "/classroom" },
  { icon: NotebookPen, label: "Cours", path: "/cours" },
  { icon: FileText, label: "Fiches", path: "/revision-generator" },
  { icon: BookOpen, label: "Flashcards", path: "/flashcards" },
  { icon: CheckSquare, label: "QCM", path: "/qcm" },
  { icon: ClipboardList, label: "Contrôles", path: "/controls" },
  { icon: HelpCircle, label: "Aide", path: "/study-chat" },
  { icon: User, label: "Profil", path: "/profile" },
] as const;

const TIPS: Record<string, string> = {
  "/": "Vue d'ensemble : stats, révisions du jour, raccourcis",
  "/calendar": "Planifie tes révisions avec le calendrier J+X",
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

const STORAGE_KEY = "sidenav:collapsed";

export const BottomNav = () => {
  const location = useLocation();
  const isMobile = useIsMobile();

  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(STORAGE_KEY) === "1";
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, collapsed ? "1" : "0");
  }, [collapsed]);

  // Sync layout padding with sidebar width via a CSS var on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (isMobile) {
      root.style.setProperty("--sidenav-width", "0px");
    } else {
      root.style.setProperty("--sidenav-width", collapsed ? "4.5rem" : "15rem");
    }
    return () => {
      root.style.setProperty("--sidenav-width", "0px");
    };
  }, [collapsed, isMobile]);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const NavList = ({ compact }: { compact: boolean }) => (
    <ul className="flex flex-col gap-0.5 px-2">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = location.pathname === item.path;
        const link = (
          <Link
            to={item.path}
            className={cn(
              "group flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-all duration-200",
              "hover:bg-primary/10 active:scale-[0.98]",
              isActive
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:text-foreground",
              compact && "justify-center px-2"
            )}
          >
            <div
              className={cn(
                "relative flex h-7 w-7 items-center justify-center rounded-md shrink-0",
                isActive && "bg-primary/10"
              )}
            >
              <Icon className="h-4 w-4" />
            </div>
            {!compact && (
              <span
                className={cn(
                  "text-[13px] truncate transition-all",
                  isActive ? "font-semibold" : "font-medium"
                )}
              >
                {item.label}
              </span>
            )}
          </Link>
        );

        return (
          <li key={item.path}>
            {compact ? (
              <Tooltip delayDuration={200}>
                <TooltipTrigger asChild>{link}</TooltipTrigger>
                <TooltipContent side="right" className="text-xs max-w-[220px]">
                  <div className="font-semibold">{item.label}</div>
                  <div className="text-muted-foreground">
                    {TIPS[item.path] || item.label}
                  </div>
                </TooltipContent>
              </Tooltip>
            ) : (
              link
            )}
          </li>
        );
      })}
    </ul>
  );

  // ==== MOBILE: top bar + slide-in drawer ====
  if (isMobile) {
    return (
      <>
        <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between gap-2 bg-card/95 backdrop-blur-lg border-b border-border/50 px-3 py-2 shadow-sm">
          <button
            onClick={() => setMobileOpen(true)}
            aria-label="Ouvrir le menu"
            className="rounded-lg p-2 hover:bg-primary/10 active:scale-95 transition"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="w-9" />
        </div>

        {/* Spacer so page content isn't hidden under the top bar */}
        <div aria-hidden className="h-12" />

        {mobileOpen && (
          <div
            className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm animate-in fade-in"
            onClick={() => setMobileOpen(false)}
          >
            <aside
              onClick={(e) => e.stopPropagation()}
              className="absolute left-0 top-0 h-full w-72 bg-card border-r border-border/50 shadow-2xl flex flex-col animate-in slide-in-from-left"
            >
              <div className="flex items-center justify-between px-4 py-4 border-b border-border/50">
                <span className="font-display font-bold bg-gradient-primary bg-clip-text text-transparent">
                  Menu
                </span>
                <button
                  onClick={() => setMobileOpen(false)}
                  aria-label="Fermer le menu"
                  className="rounded-lg p-2 hover:bg-primary/10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <nav className="flex-1 overflow-y-auto py-3">
                <NavList compact={false} />
              </nav>
            </aside>
          </div>
        )}
      </>
    );
  }

  // ==== DESKTOP / TABLET: collapsible left sidebar ====
  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-50 h-screen border-r border-border/50 bg-card/95 backdrop-blur-lg",
        "shadow-[4px_0_20px_-8px_hsl(var(--primary)/0.1)] transition-[width] duration-300 ease-in-out",
        "flex flex-col",
        collapsed ? "w-[4.5rem]" : "w-60"
      )}
    >
      <div
        className={cn(
          "flex items-center px-2 pt-1.5 pb-0.5",
          collapsed ? "justify-center" : "justify-end"
        )}
      >
        <button
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? "Déplier le menu" : "Replier le menu"}
          className="rounded-md p-1 hover:bg-primary/10 active:scale-95 transition text-muted-foreground hover:text-foreground"
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </div>

      <nav className="flex-1 min-h-0 py-1">
        <NavList compact={collapsed} />
      </nav>
    </aside>
  );
};
        )}
      >
        v1
      </div>
    </aside>
  );
};
