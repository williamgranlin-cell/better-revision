import { useState, useEffect } from "react";

export type StylePreference = "classic" | "vibrant";

export function useStylePreference() {
  const [style, setStyle] = useState<StylePreference>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("style-preference") as StylePreference) || "vibrant";
    }
    return "vibrant";
  });

  useEffect(() => {
    const root = document.documentElement;
    
    if (style === "vibrant") {
      root.classList.add("vibrant-style");
      root.classList.remove("classic-style");
    } else {
      root.classList.add("classic-style");
      root.classList.remove("vibrant-style");
    }
    
    localStorage.setItem("style-preference", style);
  }, [style]);

  const toggleStyle = () => {
    setStyle(prev => prev === "classic" ? "vibrant" : "classic");
  };

  return { style, setStyle, toggleStyle };
}
