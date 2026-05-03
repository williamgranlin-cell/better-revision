import { Card } from "@/components/ui/card";
import { useThemeCustomization } from "@/hooks/useThemeCustomization";
import { Check, Palette } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export function ThemeSelector() {
  const { themeId, setThemeId, themes } = useThemeCustomization();

  const categories = [...new Set(themes.map((t) => t.category))];

  return (
    <Card className="p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-full bg-primary/10">
          <Palette className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold">Thème de l'application</h3>
          <p className="text-sm text-muted-foreground">
            Change l'ambiance : un fond doux, des couleurs assorties partout
          </p>
        </div>
      </div>

      {categories.map((cat) => (
        <div key={cat} className="mb-5 last:mb-0">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            {cat}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {themes
              .filter((t) => t.category === cat)
              .map((theme) => {
                const isSelected = themeId === theme.id;
                return (
                  <motion.button
                    key={theme.id}
                    whileTap={{ scale: 0.97 }}
                    whileHover={{ scale: 1.02 }}
                    onClick={() => setThemeId(theme.id)}
                    className={cn(
                      "relative overflow-hidden rounded-2xl border-2 transition-all aspect-[4/3] text-left group",
                      isSelected
                        ? "border-primary shadow-lg ring-2 ring-primary/40"
                        : "border-border hover:border-primary/40"
                    )}
                    style={{
                      backgroundImage: `url(${theme.background})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }}
                  >
                    {/* dark gradient for legibility of label */}
                    <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/70 to-transparent" />

                    {isSelected && (
                      <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center shadow-md">
                        <Check className="w-3.5 h-3.5 text-primary-foreground" />
                      </div>
                    )}

                    <div className="absolute inset-x-2 bottom-2 flex items-center gap-1.5">
                      <span className="text-lg leading-none drop-shadow">{theme.emoji}</span>
                      <span className="text-xs font-semibold text-white drop-shadow truncate">
                        {theme.name}
                      </span>
                    </div>
                  </motion.button>
                );
              })}
          </div>
        </div>
      ))}
    </Card>
  );
}
