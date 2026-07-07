import { useEffect, useState } from "react";
import {
  Home as HomeIcon,
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

type NavItem = {
  icon: typeof HomeIcon;
  label: string;
  path: string;
};

const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: "Étude",
    items: [
      { icon: HomeIcon, label: "Accueil", path: "/" },
      { icon: NotebookPen, label: "Mes Cours", path: "/cours" },
      { icon: FileText, label: "Fiches", path: "/revision-generator" },
      { icon: BookOpen, label: "Flashcards", path: "/flashcards" },
      { icon: CheckSquare, label: "QCM", path: "/qcm" },
    ],
  },
  {
    title: "Organisation",
    items: [
      { icon: Calendar, label: "Calendrier", path: "/calendar" },
      { icon: Clock, label: "Emploi", path: "/schedule" },
      { icon: Target, label: "Classroom", path: "/classroom" },
      { icon: ClipboardList, label: "Contrôles", path: "/controls" },
    ],
  },
  {
    title: "Compte",
    items: [
      { icon: HelpCircle, label: "Aide", path: "/study-chat" },
      { icon: User, label: "Profil", path: "/profile" },
    ],
  },
];

const ALL_ITEMS = NAV_GROUPS.flatMap((g) => g.items);

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

  useEffect(() => {
    const root = document.documentElement;
    if (isMobile) {
      root.style.setProperty("--sidenav-width", "0px");
    } else {
      root.style.setProperty("--sidenav-width", collapsed ? "4.5rem" : "17rem");
    }
    return () => {
      root.style.setProperty("--sidenav-width", "0px");
    };
  }, [collapsed, isMobile]);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const isActive = (path: string) => location.pathname === path;

  // Editorial expanded list — grouped, uppercase micro-labels, hairline underline on active
  const ExpandedList = () => (
    <div className="flex flex-col gap-8 px-6">
      {NAV_GROUPS.map((group) => (
        <div key={group.title}>
          <p className="text-[10px] uppercase tracking-[0.22em] text-neutral-500 font-semibold mb-3">
            {group.title}
          </p>
          <ul className="flex flex-col gap-2 text-[13px]">
            {group.items.map((item) => {
              const active = isActive(item.path);
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={cn(
                      "group inline-flex items-baseline gap-0 pb-0.5 transition-colors w-fit relative",
                      active
                        ? "text-neutral-900 font-medium"
                        : "text-neutral-500 hover:text-neutral-900"
                    )}
                  >
                    <span>{item.label}</span>
                    <span
                      className={cn(
                        "absolute left-0 -bottom-0.5 h-px bg-neutral-900 transition-transform duration-300 origin-left",
                        active
                          ? "w-full scale-x-100"
                          : "w-full scale-x-0 group-hover:scale-x-100"
                      )}
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );

  // Compact icon-only rail
  const CompactList = () => (
    <ul className="flex flex-col gap-1 px-2">
      {ALL_ITEMS.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.path);
        return (
          <li key={item.path}>
            <Tooltip delayDuration={200}>
              <TooltipTrigger asChild>
                <Link
                  to={item.path}
                  style={active ? { color: "#f5f3ee" } : undefined}
                  className={cn(
                    "flex h-10 w-10 mx-auto items-center justify-center rounded-sm transition-colors",
                    active
                      ? "bg-neutral-900"
                      : "text-neutral-500 hover:text-neutral-900 hover:bg-neutral-200/60"
                  )}
                >
                  <Icon className="h-4 w-4" strokeWidth={1.5} />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-xs">
                {item.label}
              </TooltipContent>
            </Tooltip>
          </li>
        );
      })}
    </ul>
  );

  // ==== MOBILE ====
  if (isMobile) {
    return (
      <>
        <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between gap-2 bg-[hsl(var(--background))]/95 backdrop-blur border-b border-neutral-200 px-4 py-3">
          <span
            className="text-lg italic tracking-tight text-neutral-900"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Révisions
          </span>
          <button
            onClick={() => setMobileOpen(true)}
            aria-label="Ouvrir le menu"
            className="rounded-sm p-2 hover:bg-neutral-200/60 transition"
          >
            <Menu className="w-5 h-5" strokeWidth={1.5} />
          </button>
        </div>

        <div aria-hidden className="h-14" />

        {mobileOpen && (
          <div
            className="fixed inset-0 z-[60] bg-neutral-900/40 backdrop-blur-sm animate-in fade-in"
            onClick={() => setMobileOpen(false)}
          >
            <aside
              onClick={(e) => e.stopPropagation()}
              className="absolute left-0 top-0 h-full w-80 bg-[hsl(var(--background))] border-r border-neutral-200 flex flex-col animate-in slide-in-from-left"
            >
              <div className="flex items-center justify-between px-6 py-6 border-b border-neutral-200">
                <span
                  className="text-xl italic tracking-tight text-neutral-900"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Révisions
                </span>
                <button
                  onClick={() => setMobileOpen(false)}
                  aria-label="Fermer le menu"
                  className="rounded-sm p-2 hover:bg-neutral-200/60"
                >
                  <X className="w-5 h-5" strokeWidth={1.5} />
                </button>
              </div>
              <nav className="flex-1 overflow-y-auto py-8">
                <ExpandedList />
              </nav>
            </aside>
          </div>
        )}
      </>
    );
  }

  // ==== DESKTOP ====
  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-50 h-screen border-r border-neutral-200 bg-[hsl(var(--background))]",
        "transition-[width] duration-300 ease-in-out flex flex-col",
        collapsed ? "w-[4.5rem]" : "w-68"
      )}
      style={{ width: collapsed ? "4.5rem" : "17rem" }}
    >
      <div
        className={cn(
          "flex items-center px-4 pt-8 pb-6 border-b border-neutral-200",
          collapsed ? "justify-center" : "justify-between"
        )}
      >
        {!collapsed && (
          <span
            className="text-xl italic tracking-tight text-neutral-900"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Révisions
          </span>
        )}
        <button
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? "Déplier le menu" : "Replier le menu"}
          className="rounded-sm p-1.5 hover:bg-neutral-200/60 text-neutral-500 hover:text-neutral-900 transition"
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" strokeWidth={1.5} />
          ) : (
            <ChevronLeft className="w-4 h-4" strokeWidth={1.5} />
          )}
        </button>
      </div>

      <nav className="flex-1 min-h-0 overflow-y-auto py-8">
        {collapsed ? <CompactList /> : <ExpandedList />}
      </nav>

      {!collapsed && (
        <div className="px-6 py-5 border-t border-neutral-200">
          <p className="text-[10px] uppercase tracking-[0.22em] text-neutral-500">
            Édition
          </p>
          <p
            className="mt-1 text-sm italic text-neutral-700"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {new Date().getFullYear()} — Papier & Encre
          </p>
        </div>
      )}
    </aside>
  );
};
