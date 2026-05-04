import { useState, useEffect } from "react";
import sunsetBg from "@/assets/themes/theme-sunset.jpg";
import mountainBg from "@/assets/themes/theme-mountain.jpg";
import forestBg from "@/assets/themes/theme-forest.jpg";
import oceanBg from "@/assets/themes/theme-ocean.jpg";
import sakuraBg from "@/assets/themes/theme-sakura.jpg";
import galaxyBg from "@/assets/themes/theme-galaxy.jpg";
import minimalBg from "@/assets/themes/theme-minimal.jpg";

export interface AppTheme {
  id: string;
  name: string;
  emoji: string;
  category: string;
  /** Image affichée en fond de toute l'app (légèrement floutée). */
  background: string;
  /** Couleurs HSL — restent cohérentes avec l'ambiance de l'image. */
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    /** Voile semi-transparent posé par dessus l'image pour la lisibilité. */
    overlay: string; // ex: "0 0% 100% / 0.78"
    /** Texte global. */
    foreground: string;
    /** Carte / panneaux / sidebar. */
    card: string;
    cardForeground: string;
    /** Surface OPAQUE pour popups/dialogs (lisibilité maximale). */
    popoverSolid: string;
    muted: string;
    mutedForeground: string;
    border: string;
  };
}

export const APP_THEMES: AppTheme[] = [
  {
    id: "minimal",
    name: "Minimal",
    emoji: "✨",
    category: "Calmes",
    background: minimalBg,
    colors: {
      primary: "235 70% 55%",
      secondary: "280 60% 55%",
      accent: "200 80% 55%",
      overlay: "0 0% 100% / 0.86",
      foreground: "240 15% 12%",
      card: "0 0% 100% / 0.92",
      cardForeground: "240 15% 12%",
      popoverSolid: "0 0% 100%",
      muted: "240 10% 94%",
      mutedForeground: "240 8% 40%",
      border: "240 10% 88%",
    },
  },
  {
    id: "sunset",
    name: "Coucher de soleil",
    emoji: "🌅",
    category: "Paysages",
    background: sunsetBg,
    colors: {
      primary: "20 90% 55%",
      secondary: "330 75% 60%",
      accent: "45 95% 60%",
      overlay: "20 30% 96% / 0.82",
      foreground: "20 25% 15%",
      card: "0 0% 100% / 0.9",
      cardForeground: "20 25% 15%",
      popoverSolid: "20 30% 99%",
      muted: "20 25% 92%",
      mutedForeground: "20 15% 38%",
      border: "20 25% 86%",
    },
  },
  {
    id: "mountain",
    name: "Montagne",
    emoji: "🏔️",
    category: "Paysages",
    background: mountainBg,
    colors: {
      primary: "210 80% 50%",
      secondary: "200 70% 55%",
      accent: "190 75% 50%",
      overlay: "210 30% 97% / 0.85",
      foreground: "215 30% 15%",
      card: "0 0% 100% / 0.92",
      cardForeground: "215 30% 15%",
      popoverSolid: "210 30% 99%",
      muted: "210 25% 93%",
      mutedForeground: "215 15% 38%",
      border: "210 25% 87%",
    },
  },
  {
    id: "forest",
    name: "Forêt",
    emoji: "🌲",
    category: "Paysages",
    background: forestBg,
    colors: {
      primary: "150 60% 38%",
      secondary: "100 50% 45%",
      accent: "80 65% 45%",
      overlay: "120 25% 96% / 0.85",
      foreground: "150 30% 12%",
      card: "0 0% 100% / 0.92",
      cardForeground: "150 30% 12%",
      popoverSolid: "120 25% 99%",
      muted: "120 20% 93%",
      mutedForeground: "140 15% 35%",
      border: "120 20% 86%",
    },
  },
  {
    id: "ocean",
    name: "Océan",
    emoji: "🌊",
    category: "Paysages",
    background: oceanBg,
    colors: {
      primary: "190 85% 45%",
      secondary: "200 90% 50%",
      accent: "175 75% 45%",
      overlay: "195 40% 97% / 0.82",
      foreground: "200 35% 15%",
      card: "0 0% 100% / 0.92",
      cardForeground: "200 35% 15%",
      popoverSolid: "195 40% 99%",
      muted: "195 30% 93%",
      mutedForeground: "200 20% 38%",
      border: "195 30% 86%",
    },
  },
  {
    id: "sakura",
    name: "Sakura",
    emoji: "🌸",
    category: "Paysages",
    background: sakuraBg,
    colors: {
      primary: "335 75% 55%",
      secondary: "310 65% 60%",
      accent: "350 70% 60%",
      overlay: "335 40% 98% / 0.85",
      foreground: "330 35% 15%",
      card: "0 0% 100% / 0.93",
      cardForeground: "330 35% 15%",
      popoverSolid: "335 40% 99%",
      muted: "335 30% 95%",
      mutedForeground: "330 20% 40%",
      border: "335 25% 88%",
    },
  },
  {
    id: "galaxy",
    name: "Galaxie",
    emoji: "🪐",
    category: "Sombres",
    background: galaxyBg,
    colors: {
      primary: "265 85% 70%",
      secondary: "200 90% 65%",
      accent: "320 80% 70%",
      overlay: "260 40% 8% / 0.78",
      foreground: "270 25% 95%",
      card: "260 30% 14% / 0.88",
      cardForeground: "270 25% 95%",
      popoverSolid: "260 30% 12%",
      muted: "260 25% 22%",
      mutedForeground: "270 15% 70%",
      border: "260 25% 28%",
    },
  },
];

const STORAGE_KEY = "app-theme";

function applyTheme(theme: AppTheme) {
  const root = document.documentElement;
  const c = theme.colors;

  // Bg image consumed by ThemeBackground
  root.style.setProperty("--bg-image", `url(${theme.background})`);
  root.style.setProperty("--bg-overlay", c.overlay);

  // Page background = transparent so the image shows through
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

  // Mark dark themes for tweaks
  if (theme.id === "galaxy") {
    root.dataset.themeMode = "dark";
  } else {
    root.dataset.themeMode = "light";
  }
  root.dataset.themeId = theme.id;
}

export function useThemeCustomization() {
  const [themeId, setThemeId] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && APP_THEMES.some((t) => t.id === stored)) return stored;
    }
    return "minimal";
  });

  const currentTheme = APP_THEMES.find((t) => t.id === themeId) || APP_THEMES[0];

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, themeId);
    applyTheme(currentTheme);
  }, [themeId, currentTheme]);

  return { themeId, setThemeId, currentTheme, themes: APP_THEMES };
}
