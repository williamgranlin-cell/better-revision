import { useState, useEffect } from "react";
import libraryBg from "@/assets/themes/theme-library.jpg";
import inkpaperBg from "@/assets/themes/theme-inkpaper.jpg";
import prepBg from "@/assets/themes/theme-prep.jpg";
import slateBg from "@/assets/themes/theme-slate.jpg";
import emeraldBg from "@/assets/themes/theme-emerald.jpg";
import dawnBg from "@/assets/themes/theme-dawn.jpg";

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

/**
 * Thèmes orientés "réussite scolaire" : bibliothèque, encre & papier,
 * bleu prépa, ardoise, émeraude prestige, aube studieuse.
 * Discipline, sérieux, travail.
 */
export const APP_THEMES: AppTheme[] = [
  {
    id: "inkpaper",
    name: "Encre & Papier",
    emoji: "",
    category: "Studieux",
    background: inkpaperBg,
    colors: {
      primary: "24 20% 25%",
      secondary: "30 15% 40%",
      accent: "35 60% 45%",
      overlay: "35 20% 96% / 0.85",
      foreground: "24 20% 12%",
      card: "0 0% 100% / 0.92",
      cardForeground: "24 20% 12%",
      popoverSolid: "35 20% 99%",
      muted: "30 15% 92%",
      mutedForeground: "24 12% 35%",
      border: "30 15% 86%",
    },
  },
  {
    id: "library",
    name: "Bibliothèque",
    emoji: "",
    category: "Studieux",
    background: libraryBg,
    colors: {
      primary: "28 55% 35%",
      secondary: "20 40% 30%",
      accent: "40 70% 50%",
      overlay: "35 25% 95% / 0.82",
      foreground: "25 30% 12%",
      card: "0 0% 100% / 0.9",
      cardForeground: "25 30% 12%",
      popoverSolid: "35 25% 99%",
      muted: "30 20% 92%",
      mutedForeground: "25 15% 35%",
      border: "30 20% 86%",
    },
  },
  {
    id: "dawn",
    name: "Aube studieuse",
    emoji: "",
    category: "Studieux",
    background: dawnBg,
    colors: {
      primary: "25 75% 45%",
      secondary: "35 65% 50%",
      accent: "45 80% 55%",
      overlay: "30 30% 96% / 0.84",
      foreground: "25 30% 14%",
      card: "0 0% 100% / 0.92",
      cardForeground: "25 30% 14%",
      popoverSolid: "30 30% 99%",
      muted: "30 25% 92%",
      mutedForeground: "25 15% 38%",
      border: "30 25% 86%",
    },
  },
  {
    id: "prep",
    name: "Bleu prépa",
    emoji: "",
    category: "Discipline",
    background: prepBg,
    colors: {
      primary: "215 80% 40%",
      secondary: "220 60% 35%",
      accent: "40 75% 55%",
      overlay: "215 30% 96% / 0.86",
      foreground: "220 40% 12%",
      card: "0 0% 100% / 0.93",
      cardForeground: "220 40% 12%",
      popoverSolid: "215 30% 99%",
      muted: "215 25% 93%",
      mutedForeground: "220 20% 35%",
      border: "215 25% 87%",
    },
  },
  {
    id: "emerald",
    name: "Émeraude prestige",
    emoji: "",
    category: "Discipline",
    background: emeraldBg,
    colors: {
      primary: "158 65% 30%",
      secondary: "155 55% 35%",
      accent: "42 75% 50%",
      overlay: "150 25% 96% / 0.85",
      foreground: "158 40% 12%",
      card: "0 0% 100% / 0.92",
      cardForeground: "158 40% 12%",
      popoverSolid: "150 25% 99%",
      muted: "150 20% 93%",
      mutedForeground: "158 18% 35%",
      border: "150 20% 86%",
    },
  },
  {
    id: "slate",
    name: "Ardoise",
    emoji: "",
    category: "Concentration",
    background: slateBg,
    colors: {
      primary: "40 70% 60%",
      secondary: "200 40% 55%",
      accent: "35 80% 60%",
      overlay: "210 25% 10% / 0.78",
      foreground: "40 20% 94%",
      card: "215 25% 15% / 0.88",
      cardForeground: "40 20% 94%",
      popoverSolid: "215 25% 12%",
      muted: "215 20% 22%",
      mutedForeground: "40 15% 72%",
      border: "215 20% 28%",
    },
  },
];

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

  root.dataset.themeMode = theme.id === "slate" ? "dark" : "light";
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
