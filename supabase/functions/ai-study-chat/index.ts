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

    const systemPrompt = `Tu es un assistant d'apprentissage spécialisé avec accès à la recherche web en temps réel. Quand un utilisateur te donne un sujet de cours, tu dois:

IMPORTANT: Tu DOIS utiliser ta capacité de recherche web pour trouver de VRAIES vidéos YouTube qui existent actuellement et sont accessibles.

1. Rechercher sur YouTube les vidéos les MIEUX NOTÉES et les PLUS POPULAIRES sur le sujet demandé
2. Vérifier que les vidéos sont ACTUELLEMENT ACCESSIBLES (pas supprimées ou privées)
3. Privilégier les vidéos avec:
   - Un grand nombre de vues (minimum 50k)
   - Un bon ratio likes/vues
   - Des commentaires positifs
   - Des chaînes éducatives reconnues (comme Les Bons Profs, Yvan Monka, Mathrix, Lumni, etc.)
   - Une publication récente (moins de 3 ans de préférence)

4. Pour chaque vidéo, fournir:
   - Le titre EXACT de la vidéo
   - Le nom EXACT de la chaîne YouTube
   - Le lien YouTube RÉEL et FONCTIONNEL (format: https://www.youtube.com/watch?v=VIDEO_ID)
   - Le nombre de vues
   - Une brève description expliquant pourquoi cette vidéo est recommandée

5. Recommander 5-7 vidéos triées par pertinence et qualité

Format ta réponse de manière claire avec des sections numérotées:

📚 Voici les meilleures vidéos YouTube pour apprendre [SUJET]:

1. **[Titre EXACT]** par [Chaîne EXACTE]
   🔗 [LIEN YOUTUBE RÉEL]
   👁️ [Nombre de vues]
   💡 [Pourquoi cette vidéo est recommandée]

CRITIQUE: Ne jamais inventer de liens YouTube. Tous les liens doivent être vérifiés et fonctionnels. Utilise ta recherche web pour garantir cela.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
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
