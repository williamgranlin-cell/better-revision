import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization header");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const { content, numQuestions = 10, difficulty = "medium" } = await req.json();
    if (!content || content.trim().length < 20) {
      return new Response(JSON.stringify({ error: "Contenu trop court (min 20 caractères)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const difficultyMap: Record<string, string> = {
      easy: "facile (questions directes, une seule bonne réponse évidente)",
      medium: "intermédiaire (questions qui nécessitent réflexion, certaines avec plusieurs bonnes réponses)",
      hard: "difficile (questions pièges, nuances subtiles, souvent plusieurs bonnes réponses)",
    };

    const systemPrompt = `Tu es un professeur expert en création de QCM (Questionnaires à Choix Multiples) pédagogiques.

RÈGLE ABSOLUE : Zéro erreur factuelle. Chaque réponse doit être vérifiée et exacte.
Tu dois créer des QCM de type "cases à cocher" où PLUSIEURS réponses peuvent être correctes.

INSTRUCTIONS :
1. Génère exactement ${numQuestions} questions basées UNIQUEMENT sur le contenu fourni
2. Chaque question a 4 propositions (A, B, C, D)
3. Chaque question peut avoir 1 à 4 bonnes réponses (pas toujours une seule !)
4. Niveau de difficulté : ${difficultyMap[difficulty] || difficultyMap.medium}
5. Les mauvaises réponses doivent être plausibles et éducatives
6. Ajoute une explication courte pour chaque question

FORMAT DE SORTIE (JSON strict) :`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        temperature: 0.3,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Contenu source :\n\n${content.slice(0, 15000)}` },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_qcm",
              description: "Génère un QCM structuré à partir du contenu",
              parameters: {
                type: "object",
                properties: {
                  questions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        question: { type: "string", description: "La question" },
                        options: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              label: { type: "string", description: "A, B, C ou D" },
                              text: { type: "string", description: "Le texte de la proposition" },
                              correct: { type: "boolean", description: "Si cette réponse est correcte" },
                            },
                            required: ["label", "text", "correct"],
                          },
                        },
                        explanation: { type: "string", description: "Explication de la réponse" },
                      },
                      required: ["question", "options", "explanation"],
                    },
                  },
                },
                required: ["questions"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_qcm" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Trop de requêtes, réessayez dans quelques instants" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Crédits IA épuisés" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in response");

    const qcmData = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(qcmData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-qcm error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erreur inconnue" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
