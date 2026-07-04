import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const MOTIVATIONAL = [
  "Chaque effort te rapproche de ton objectif.",
  "La régularité est la clé du succès.",
  "Tu es sur la bonne voie, continue.",
  "Un petit pas aujourd'hui, un grand bond demain.",
  "La discipline bat le talent quand le talent ne travaille pas.",
  "Crois en toi, tu peux y arriver.",
  "L'effort d'aujourd'hui est la réussite de demain.",
  "Reste concentré, avance à ton rythme.",
];

export const WelcomeHeader = () => {
  const { user } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [quote] = useState(() => MOTIVATIONAL[Math.floor(Math.random() * MOTIVATIONAL.length)]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("first_name")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data) setFirstName(data.first_name);
      });
  }, [user]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Bonjour" : hour < 18 ? "Bon après-midi" : "Bonsoir";

  if (!firstName) return null;

  return (
    <div className="mb-2">
      <h2 className="text-lg font-semibold text-foreground">
        {greeting}, {firstName}.
      </h2>
      <p className="text-sm text-muted-foreground italic">{quote}</p>
    </div>
  );
};
