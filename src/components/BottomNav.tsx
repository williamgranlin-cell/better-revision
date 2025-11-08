import { Calendar, Target, BookOpen, FileCheck, Video, User } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

const navItems = [
  { icon: Calendar, label: "Calendrier", path: "/" },
  { icon: Target, label: "Classroom", path: "/classroom" },
  { icon: BookOpen, label: "Flashcards", path: "/flashcards" },
  { icon: FileCheck, label: "Contrôles", path: "/controls" },
  { icon: Video, label: "Vidéos", path: "/study-chat" },
  { icon: User, label: "Profil", path: "/profile" },
];

export const BottomNav = () => {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border shadow-lg">
      <div className="max-w-screen-xl mx-auto px-4">
        <div className="flex justify-around items-center py-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-smooth",
                  isActive
                    ? "text-primary scale-110"
                    : "text-muted-foreground hover:text-foreground hover:scale-105"
                )}
              >
                <Icon className={cn("w-6 h-6", isActive && "drop-shadow-[0_0_8px_hsl(var(--primary)/0.6)]")} />
                <span className="text-xs font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
