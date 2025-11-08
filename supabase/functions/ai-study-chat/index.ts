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

    const systemPrompt = `Tu es un assistant d'apprentissage spécialisé. Quand un utilisateur te donne un sujet de cours, tu dois:
1. Rechercher et recommander 5-7 vidéos YouTube éducatives pertinentes sur ce sujet
2. Pour chaque vidéo, fournir:
   - Le titre de la vidéo
   - Le nom de la chaîne YouTube
   - Un lien YouTube réel et fonctionnel (format: https://www.youtube.com/watch?v=VIDEO_ID)
   - Une brève description (1-2 phrases) expliquant pourquoi cette vidéo est utile

Format ta réponse de manière claire avec des sections numérotées. Assure-toi que les liens YouTube sont réels et pertinents au sujet demandé.

Exemple de format:
📚 Voici des vidéos YouTube pour apprendre [SUJET]:

1. **[Titre de la vidéo]** par [Chaîne]
   🔗 https://www.youtube.com/watch?v=...
   💡 [Description courte]

2. **[Titre de la vidéo]** par [Chaîne]
   🔗 https://www.youtube.com/watch?v=...
   💡 [Description courte]`;

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
