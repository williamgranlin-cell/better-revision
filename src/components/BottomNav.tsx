import { Calendar, Target, BookOpen, FileCheck, Video, User, Clock } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

const navItems = [
  { icon: Calendar, label: "Calendrier", path: "/" },
  { icon: Clock, label: "Emploi", path: "/schedule" },
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
      <div className="max-w-screen-xl mx-auto px-2">
        <div className="flex justify-around items-center py-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-smooth",
                  isActive
                    ? "text-primary scale-105"
                    : "text-muted-foreground hover:text-foreground hover:scale-105"
                )}
              >
                <Icon className={cn("w-5 h-5", isActive && "drop-shadow-[0_0_8px_hsl(var(--primary)/0.6)]")} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
