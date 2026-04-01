import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { APP_THEMES, useThemeCustomization } from "@/hooks/useThemeCustomization";
import { Check, Palette } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export function ThemeSelector() {
  const { themeId, setThemeId, themes } = useThemeCustomization();

  const categories = [...new Set(themes.map(t => t.category))];

  return (
    <Card className="p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-full bg-primary/10">
          <Palette className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold">Thème de l'application</h3>
          <p className="text-sm text-muted-foreground">Personnalise l'apparence à ton goût</p>
        </div>
      </div>

      {categories.map(cat => (
        <div key={cat} className="mb-4 last:mb-0">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{cat}</p>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
            {themes.filter(t => t.category === cat).map(theme => (
              <motion.button
                key={theme.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => setThemeId(theme.id)}
                className={cn(
                  "relative flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-center",
                  themeId === theme.id
                    ? "border-primary bg-primary/10 shadow-sm"
                    : "border-border hover:border-primary/40 bg-card"
                )}
              >
                {themeId === theme.id && (
                  <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 text-primary-foreground" />
                  </div>
                )}
                <span className="text-2xl">{theme.emoji}</span>
                <span className="text-[10px] font-medium leading-tight">{theme.name}</span>
                {/* Color preview dots */}
                <div className="flex gap-1">
                  <div className="w-3 h-3 rounded-full" style={{ background: `hsl(${theme.colors.primary})` }} />
                  <div className="w-3 h-3 rounded-full" style={{ background: `hsl(${theme.colors.secondary})` }} />
                  <div className="w-3 h-3 rounded-full" style={{ background: `hsl(${theme.colors.accent})` }} />
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      ))}
    </Card>
  );
}
