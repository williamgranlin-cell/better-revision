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
  { icon: Home, label: "Accueil", path: "/", emoji: "🏠" },
  { icon: Calendar, label: "Calendrier", path: "/calendar", emoji: "📅" },
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
    <ul className="flex flex-col gap-1 px-2">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = location.pathname === item.path;
        const link = (
          <Link
            to={item.path}
            className={cn(
              "group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200",
              "hover:bg-primary/10 active:scale-[0.98]",
              isActive
                ? "bg-primary/15 text-primary shadow-[0_0_12px_hsl(var(--primary)/0.25)]"
                : "text-muted-foreground hover:text-foreground",
              compact && "justify-center px-2"
            )}
          >
            <div
              className={cn(
                "relative flex h-9 w-9 items-center justify-center rounded-lg shrink-0",
                isActive && "bg-primary/10"
              )}
            >
              <Icon
                className={cn(
                  "h-5 w-5 transition-transform duration-300",
                  isActive && "animate-bounce-soft"
                )}
              />
            </div>
            {!compact && (
              <span
                className={cn(
                  "text-sm truncate transition-all",
                  isActive ? "font-semibold" : "font-medium"
                )}
              >
                {item.emoji} {item.label}
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
          <span className="text-sm font-display font-semibold bg-gradient-primary bg-clip-text text-transparent">
            Better Revision
          </span>
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
          "flex items-center gap-2 px-3 py-4 border-b border-border/50",
          collapsed ? "justify-center" : "justify-between"
        )}
      >
        {!collapsed && (
          <span className="font-display font-bold text-sm bg-gradient-primary bg-clip-text text-transparent truncate">
            Better Revision
          </span>
        )}
        <button
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? "Déplier le menu" : "Replier le menu"}
          className="rounded-lg p-1.5 hover:bg-primary/10 active:scale-95 transition text-muted-foreground hover:text-foreground"
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-3">
        <NavList compact={collapsed} />
      </nav>

      <div
        className={cn(
          "px-3 py-3 border-t border-border/50 text-[10px] text-muted-foreground",
          collapsed ? "text-center" : "text-left"
        )}
      >
        {collapsed ? "v1" : "Better Revision · v1"}
      </div>
    </aside>
  );
};
