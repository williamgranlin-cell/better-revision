import { useEffect, useState } from "react";

export type HomePreference = "home" | "dashboard";

const KEY = "home-preference";

/**
 * User preference: on `/`, show the classic Home page OR the dashboard hub.
 * Persisted in localStorage. Emits a `storage`-like event so other components
 * (the App shell, the Profile settings) stay in sync without a full reload.
 */
export function useHomePreference() {
  const [preference, setPreferenceState] = useState<HomePreference>(() => {
    if (typeof window === "undefined") return "home";
    return (localStorage.getItem(KEY) as HomePreference) || "home";
  });

  useEffect(() => {
    const onChange = (e: Event) => {
      const val = (localStorage.getItem(KEY) as HomePreference) || "home";
      setPreferenceState(val);
      void e;
    };
    window.addEventListener("home-preference-change", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("home-preference-change", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  const setPreference = (val: HomePreference) => {
    localStorage.setItem(KEY, val);
    setPreferenceState(val);
    window.dispatchEvent(new Event("home-preference-change"));
  };

  return { preference, setPreference };
}
