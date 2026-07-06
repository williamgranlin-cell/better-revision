import { useState, useEffect } from "react";
import paperBg from "@/assets/themes/theme-paper.jpg";
import morningBg from "@/assets/themes/theme-morning.jpg";
import chalkBg from "@/assets/themes/theme-chalk.jpg";
import inkpaperBg from "@/assets/themes/theme-inkpaper.jpg";
import libraryLightBg from "@/assets/themes/theme-library-light.jpg";
import libraryBg from "@/assets/themes/theme-library.jpg";
import papyrusBg from "@/assets/themes/theme-papyrus.jpg";
import sepiaBg from "@/assets/themes/theme-sepia.jpg";
import leatherBg from "@/assets/themes/theme-leather.jpg";
import cafeBg from "@/assets/themes/theme-cafe.jpg";
import slateBg from "@/assets/themes/theme-slate.jpg";
import blackboardBg from "@/assets/themes/theme-blackboard.jpg";
import libraryNightBg from "@/assets/themes/theme-library-night.jpg";
import examnightBg from "@/assets/themes/theme-examnight.jpg";
import nightdeskBg from "@/assets/themes/theme-nightdesk.jpg";

export interface AppTheme {
  id: string;
  name: string;
  emoji: string;
  category: string;
  background: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    overlay: string;
    foreground: string;
    card: string;
    cardForeground: string;
    popoverSolid: string;
    muted: string;
    mutedForeground: string;
    border: string;
  };
}

/** Palette utilitaire pour les thèmes clairs. */
const lightPalette = (primary: string, accent: string, hue = 30) => ({
  primary,
  secondary: primary,
  accent,
  overlay: `${hue} 25% 96% / 0.86`,
  foreground: `${hue} 25% 12%`,
  card: "0 0% 100% / 0.92",
  cardForeground: `${hue} 25% 12%`,
  popoverSolid: `${hue} 25% 99%`,
  muted: `${hue} 20% 93%`,
  mutedForeground: `${hue} 15% 35%`,
  border: `${hue} 20% 86%`,
});

/** Palette utilitaire pour les thèmes moyens. */
const midPalette = (primary: string, accent: string, hue = 28) => ({
  primary,
  secondary: primary,
  accent,
  overlay: `${hue} 25% 94% / 0.8`,
  foreground: `${hue} 30% 12%`,
  card: "0 0% 100% / 0.9",
  cardForeground: `${hue} 30% 12%`,
  popoverSolid: `${hue} 25% 99%`,
  muted: `${hue} 20% 92%`,
  mutedForeground: `${hue} 18% 35%`,
  border: `${hue} 20% 84%`,
});

/** Palette utilitaire pour les thèmes sombres. */
const darkPalette = (primary: string, accent: string, hue = 215) => ({
  primary,
  secondary: primary,
  accent,
  overlay: `${hue} 25% 10% / 0.78`,
  foreground: "40 20% 94%",
  card: `${hue} 25% 15% / 0.88`,
  cardForeground: "40 20% 94%",
  popoverSolid: `${hue} 25% 12%`,
  muted: `${hue} 20% 22%`,
  mutedForeground: "40 15% 72%",
  border: `${hue} 20% 28%`,
});

export const APP_THEMES: AppTheme[] = [
  // ————— Lumineux (5) —————
  { id: "paper", name: "Papier crème", emoji: "", category: "Lumineux", background: paperBg,
    colors: lightPalette("30 25% 25%", "35 60% 45%", 35) },
  { id: "morning", name: "Matin studieux", emoji: "", category: "Lumineux", background: morningBg,
    colors: lightPalette("210 40% 35%", "35 70% 55%", 210) },
  { id: "chalk", name: "Craie blanche", emoji: "", category: "Lumineux", background: chalkBg,
    colors: lightPalette("220 15% 25%", "215 60% 45%", 220) },
  { id: "inkpaper", name: "Encre & Papier", emoji: "", category: "Lumineux", background: inkpaperBg,
    colors: lightPalette("24 20% 22%", "35 55% 45%", 30) },
  { id: "library-light", name: "Bibliothèque claire", emoji: "", category: "Lumineux", background: libraryLightBg,
    colors: lightPalette("210 40% 40%", "40 65% 50%", 210) },

  // ————— Intermédiaires (5) —————
  { id: "library", name: "Bibliothèque", emoji: "", category: "Intermédiaires", background: libraryBg,
    colors: midPalette("28 55% 32%", "40 70% 48%", 28) },
  { id: "papyrus", name: "Papyrus", emoji: "", category: "Intermédiaires", background: papyrusBg,
    colors: midPalette("30 45% 30%", "38 70% 45%", 38) },
  { id: "sepia", name: "Manuscrit sépia", emoji: "", category: "Intermédiaires", background: sepiaBg,
    colors: midPalette("25 55% 28%", "35 65% 45%", 28) },
  { id: "leather", name: "Cuir & or", emoji: "", category: "Intermédiaires", background: leatherBg,
    colors: midPalette("0 55% 30%", "42 75% 50%", 15) },
  { id: "cafe", name: "Café d'étude", emoji: "", category: "Intermédiaires", background: cafeBg,
    colors: midPalette("22 45% 28%", "35 70% 50%", 25) },

  // ————— Sombres (5) —————
  { id: "slate", name: "Ardoise", emoji: "", category: "Sombres", background: slateBg,
    colors: darkPalette("40 70% 60%", "35 80% 60%", 210) },
  { id: "blackboard", name: "Tableau noir", emoji: "", category: "Sombres", background: blackboardBg,
    colors: darkPalette("0 0% 88%", "42 75% 60%", 0) },
  { id: "library-night", name: "Bibliothèque nocturne", emoji: "", category: "Sombres", background: libraryNightBg,
    colors: darkPalette("35 75% 55%", "40 80% 60%", 25) },
  { id: "examnight", name: "Nuit d'examen", emoji: "", category: "Sombres", background: examnightBg,
    colors: darkPalette("40 80% 60%", "215 60% 65%", 220) },
  { id: "nightdesk", name: "Bureau de nuit", emoji: "", category: "Sombres", background: nightdeskBg,
    colors: darkPalette("155 50% 55%", "40 75% 60%", 165) },
];

const DARK_IDS = new Set(["slate", "blackboard", "library-night", "examnight", "nightdesk"]);
const STORAGE_KEY = "app-theme";

function applyTheme(theme: AppTheme) {
  const root = document.documentElement;
  const c = theme.colors;

  root.style.setProperty("--bg-image", `url(${theme.background})`);
  root.style.setProperty("--bg-overlay", c.overlay);
  root.style.setProperty("--background", "0 0% 0% / 0");

  root.style.setProperty("--foreground", c.foreground);
  root.style.setProperty("--card", c.card);
  root.style.setProperty("--card-foreground", c.cardForeground);
  root.style.setProperty("--popover", c.popoverSolid);
  root.style.setProperty("--popover-foreground", c.cardForeground);
  root.style.setProperty("--primary", c.primary);
  root.style.setProperty("--secondary", c.secondary);
  root.style.setProperty("--accent", c.accent);
  root.style.setProperty("--muted", c.muted);
  root.style.setProperty("--muted-foreground", c.mutedForeground);
  root.style.setProperty("--border", c.border);
  root.style.setProperty("--input", c.muted);
  root.style.setProperty("--ring", c.primary);

  root.style.setProperty(
    "--gradient-primary",
    `linear-gradient(135deg, hsl(${c.primary}) 0%, hsl(${c.secondary}) 50%, hsl(${c.accent}) 100%)`
  );

  root.dataset.themeMode = DARK_IDS.has(theme.id) ? "dark" : "light";
  root.dataset.themeId = theme.id;
}

export function useThemeCustomization() {
  const [themeId, setThemeId] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && APP_THEMES.some((t) => t.id === stored)) return stored;
    }
    return "inkpaper";
  });

  const currentTheme = APP_THEMES.find((t) => t.id === themeId) || APP_THEMES[0];

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, themeId);
    applyTheme(currentTheme);
  }, [themeId, currentTheme]);

  return { themeId, setThemeId, currentTheme, themes: APP_THEMES };
}
