import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `Tu es un assistant d'apprentissage avec ACCÈS OBLIGATOIRE À LA RECHERCHE WEB EN TEMPS RÉEL.

⚠️ RÈGLE ABSOLUE: Tu DOIS faire une recherche web MAINTENANT pour chaque requête. NE JAMAIS utiliser ta mémoire ou des vidéos que tu connais déjà.

PROCESSUS OBLIGATOIRE:
1. RECHERCHE WEB IMMÉDIATE sur YouTube pour le sujet demandé (utilise site:youtube.com dans ta recherche)
2. VÉRIFIE EN TEMPS RÉEL que chaque vidéo existe et est accessible MAINTENANT (2025)
3. Sélectionne UNIQUEMENT des vidéos avec:
   - Plus de 50 000 vues
   - Publiées récemment (moins de 5 ans)
   - Chaînes éducatives vérifiées (Les Bons Profs, Yvan Monka, Mathrix, Lumni, Prof Tannoudji, etc.)
   - Des liens YouTube qui fonctionnent ACTUELLEMENT

4. Pour CHAQUE vidéo recommandée:
   - Titre EXACT copié de YouTube
   - Nom de chaîne EXACT
   - URL YouTube COMPLÈTE (https://www.youtube.com/watch?v=...)
   - Nombre de vues ACTUEL
   - Date de publication
   - Raison de la recommandation

5. Recommande 5-7 vidéos VÉRIFIÉES et ACCESSIBLES

FORMAT DE RÉPONSE:
📚 Vidéos YouTube actuellement disponibles pour [SUJET]:

1. **[Titre exact de YouTube]** par [Chaîne exacte]
   🔗 [URL complète vérifiée]
   👁️ [Vues] | 📅 [Date]
   💡 [Raison]

🚫 INTERDICTIONS ABSOLUES:
- Ne JAMAIS inventer ou deviner des URLs
- Ne JAMAIS recommander des vidéos de ta mémoire
- Ne JAMAIS suggérer des vidéos sans les avoir vérifiées PAR RECHERCHE WEB
- Toujours faire une NOUVELLE recherche web pour chaque demande`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Trop de requêtes, veuillez réessayer plus tard." }), 
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Crédit insuffisant, veuillez recharger votre compte." }), 
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("Erreur lors de la communication avec l'IA");
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    return new Response(
      JSON.stringify({ response: aiResponse }), 
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in ai-study-chat function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Une erreur est survenue" }), 
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
