import { useState, useEffect } from "react";

export interface AppTheme {
  id: string;
  name: string;
  emoji: string;
  category: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    card: string;
    muted: string;
  };
  font?: string;
}

export const APP_THEMES: AppTheme[] = [
  // Default
  { id: "default", name: "Par défaut", emoji: "✨", category: "Basique", colors: { primary: "280 85% 60%", secondary: "190 95% 45%", accent: "330 85% 60%", background: "270 30% 98%", card: "0 0% 100%", muted: "270 25% 94%" } },
  // Profession-based
  { id: "medecin", name: "Médecine", emoji: "🩺", category: "Métiers", colors: { primary: "200 80% 50%", secondary: "170 70% 45%", accent: "340 75% 55%", background: "200 30% 98%", card: "0 0% 100%", muted: "200 20% 94%" } },
  { id: "avocat", name: "Droit & Justice", emoji: "⚖️", category: "Métiers", colors: { primary: "25 60% 45%", secondary: "35 50% 50%", accent: "15 70% 50%", background: "30 20% 97%", card: "0 0% 100%", muted: "30 15% 93%" } },
  { id: "ingenieur", name: "Ingénierie", emoji: "⚙️", category: "Métiers", colors: { primary: "210 75% 50%", secondary: "180 60% 45%", accent: "30 90% 55%", background: "210 20% 97%", card: "0 0% 100%", muted: "210 15% 93%" } },
  { id: "artiste", name: "Arts & Créativité", emoji: "🎨", category: "Métiers", colors: { primary: "330 80% 55%", secondary: "280 70% 60%", accent: "45 90% 55%", background: "330 20% 98%", card: "0 0% 100%", muted: "330 15% 94%" } },
  { id: "scientifique", name: "Sciences", emoji: "🔬", category: "Métiers", colors: { primary: "150 70% 40%", secondary: "180 65% 45%", accent: "120 60% 45%", background: "150 20% 97%", card: "0 0% 100%", muted: "150 15% 93%" } },
  { id: "informatique", name: "Informatique", emoji: "💻", category: "Métiers", colors: { primary: "240 70% 55%", secondary: "200 80% 50%", accent: "160 90% 45%", background: "240 20% 97%", card: "0 0% 100%", muted: "240 15% 94%" } },
  // Aesthetic-based
  { id: "ocean", name: "Océan", emoji: "🌊", category: "Ambiance", colors: { primary: "200 85% 50%", secondary: "180 75% 45%", accent: "220 80% 60%", background: "195 35% 97%", card: "0 0% 100%", muted: "195 25% 93%" } },
  { id: "foret", name: "Forêt", emoji: "🌲", category: "Ambiance", colors: { primary: "140 55% 40%", secondary: "100 45% 45%", accent: "80 50% 50%", background: "120 20% 97%", card: "0 0% 100%", muted: "120 15% 93%" } },
  { id: "sunset", name: "Coucher de soleil", emoji: "🌅", category: "Ambiance", colors: { primary: "15 85% 55%", secondary: "35 90% 55%", accent: "350 80% 55%", background: "25 30% 97%", card: "0 0% 100%", muted: "25 20% 93%" } },
  { id: "nuit", name: "Nuit étoilée", emoji: "🌙", category: "Ambiance", colors: { primary: "250 70% 60%", secondary: "220 65% 55%", accent: "280 60% 65%", background: "250 25% 97%", card: "0 0% 100%", muted: "250 18% 93%" } },
  { id: "cerisier", name: "Cerisier", emoji: "🌸", category: "Ambiance", colors: { primary: "340 75% 65%", secondary: "320 60% 60%", accent: "355 70% 60%", background: "340 30% 98%", card: "0 0% 100%", muted: "340 20% 94%" } },
  { id: "lavande", name: "Lavande", emoji: "💜", category: "Ambiance", colors: { primary: "270 60% 60%", secondary: "290 50% 55%", accent: "250 55% 65%", background: "270 25% 97%", card: "0 0% 100%", muted: "270 18% 93%" } },
  { id: "menthe", name: "Menthe fraîche", emoji: "🍃", category: "Ambiance", colors: { primary: "165 70% 45%", secondary: "150 60% 45%", accent: "180 65% 50%", background: "165 25% 97%", card: "0 0% 100%", muted: "165 18% 93%" } },
  { id: "cafe", name: "Café & Automne", emoji: "☕", category: "Ambiance", colors: { primary: "25 55% 45%", secondary: "15 50% 50%", accent: "35 60% 50%", background: "25 20% 96%", card: "0 0% 100%", muted: "25 15% 92%" } },
  { id: "galaxy", name: "Galaxie", emoji: "🪐", category: "Ambiance", colors: { primary: "260 80% 60%", secondary: "300 70% 55%", accent: "200 85% 55%", background: "260 25% 97%", card: "0 0% 100%", muted: "260 18% 93%" } },
  { id: "or", name: "Or & Luxe", emoji: "👑", category: "Ambiance", colors: { primary: "42 80% 50%", secondary: "35 70% 45%", accent: "48 85% 55%", background: "40 25% 97%", card: "0 0% 100%", muted: "40 18% 93%" } },
];

export function useThemeCustomization() {
  const [themeId, setThemeId] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("app-theme") || "default";
    }
    return "default";
  });

  const currentTheme = APP_THEMES.find(t => t.id === themeId) || APP_THEMES[0];

  useEffect(() => {
    localStorage.setItem("app-theme", themeId);
    const root = document.documentElement;
    const theme = APP_THEMES.find(t => t.id === themeId) || APP_THEMES[0];

    root.style.setProperty("--primary", theme.colors.primary);
    root.style.setProperty("--secondary", theme.colors.secondary);
    root.style.setProperty("--accent", theme.colors.accent);
    root.style.setProperty("--ring", theme.colors.primary);

    // Update gradients
    root.style.setProperty("--gradient-primary", `linear-gradient(135deg, hsl(${theme.colors.primary}) 0%, hsl(${theme.colors.secondary}) 50%, hsl(${theme.colors.accent}) 100%)`);
  }, [themeId]);

  return { themeId, setThemeId, currentTheme, themes: APP_THEMES };
}
