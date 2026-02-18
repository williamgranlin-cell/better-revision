import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY non configuré");

    const { transcript, subject, chapterName, schoolLevel } = await req.json();

    if (!transcript || transcript.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Transcription vide" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `Tu es un expert pédagogique et un rédacteur de cours scolaires d'excellence. 
Tu reçois une transcription brute d'un cours oral donné par un professeur et tu dois la transformer en un cours écrit parfait.

RÈGLE ABSOLUE : Orthographe, grammaire, ponctuation et vocabulaire technique IMPECCABLES. Zéro faute toléré.

Contexte :
- Matière : ${subject || "non spécifiée"}
- Chapitre : ${chapterName || "non spécifié"}
- Niveau scolaire : ${schoolLevel || "non spécifié"}

Ton travail :
1. Corriger toutes les erreurs de la transcription (fautes de frappe, mots mal reconnus, répétitions orales)
2. Structurer le cours avec des titres, sous-titres, définitions, exemples clairs
3. Ajouter une introduction et une conclusion si nécessaire
4. Mettre en valeur les concepts clés (entre **gras**)
5. Organiser la progression logique des idées
6. Adapter le niveau de langage au niveau scolaire indiqué
7. Si des formules ou équations sont mentionnées, les écrire correctement
8. Ajouter des transitions fluides entre les parties

Format de sortie : Markdown structuré avec titres (##, ###), listes, gras pour les termes importants.
Le cours doit être complet, précis, pédagogique et agréable à lire.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Voici la transcription brute du cours à retravailler :\n\n${transcript}`,
          },
        ],
        stream: false,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requêtes atteinte, réessaie dans quelques instants." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Crédits insuffisants pour l'IA." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erreur du service IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const enhancedContent = data.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({ enhancedContent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("transcribe-and-enhance error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erreur inconnue" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
