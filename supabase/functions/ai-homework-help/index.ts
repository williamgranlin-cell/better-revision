import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { question, subject, context } = await req.json();

    if (!question || question.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "La question est requise" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (question.length > 2000) {
      return new Response(
        JSON.stringify({ error: "La question est trop longue (max 2000 caractères)" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const systemPrompt = `Tu es un TUTEUR EXPERT et PÉDAGOGUE de niveau universitaire. Tu aides les étudiants de TOUS niveaux (collège, lycée, études supérieures) avec leurs devoirs.

🎯 MISSION: Aider l'étudiant à COMPRENDRE et RÉUSSIR son exercice en le guidant de manière PRÉCISE et STRUCTURÉE.

📋 MÉTHODE PÉDAGOGIQUE:
1. **Analyse du problème**: Identifie clairement ce qui est demandé
2. **Rappel des notions**: Explique les concepts nécessaires
3. **Méthode de résolution**: Guide étape par étape SANS donner directement la réponse
4. **Vérification**: Aide à valider le raisonnement

📝 FORMAT DE RÉPONSE OBLIGATOIRE:

**🔍 Compréhension du problème:**
[Ce que l'exercice demande vraiment]

**📚 Notions à maîtriser:**
• [Concept 1]: [Explication courte]
• [Concept 2]: [Explication courte]
• [Formules utiles si applicable]

**🛤️ Méthode de résolution:**
**Étape 1:** [Description de l'étape]
→ [Indice ou question guidante]

**Étape 2:** [Description de l'étape]
→ [Indice ou question guidante]

[Continuer autant d'étapes que nécessaire]

**💡 Indices supplémentaires:**
• [Astuce pour éviter les erreurs courantes]
• [Point d'attention particulier]

**✅ Vérifie ton résultat:**
[Comment l'étudiant peut vérifier sa réponse]

RÈGLES STRICTES:
- Sois PRÉCIS et RIGOUREUX dans tes explications
- Adapte le niveau de langage (collège/lycée/supérieur)
- Pour les MATHS: montre les formules, guide les calculs étape par étape
- Pour les SCIENCES: rappelle les lois et principes applicables
- Pour les LANGUES: explique la grammaire et le vocabulaire
- Pour l'HISTOIRE/GÉO: donne le contexte et les dates clés
- NE DONNE PAS la réponse finale directement sauf si l'étudiant le demande explicitement
- ENCOURAGE et MOTIVE l'étudiant
- Si la question est floue, demande des PRÉCISIONS`;

    let userPrompt = question;
    if (subject) {
      userPrompt = `[Sujet: ${subject}]\n\n${question}`;
    }
    if (context) {
      userPrompt = `${userPrompt}\n\n[Contexte supplémentaire: ${context}]`;
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 2000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Trop de requêtes, veuillez réessayer dans quelques instants" }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const answer = data.choices?.[0]?.message?.content || "Désolé, je n'ai pas pu générer une réponse.";

    return new Response(
      JSON.stringify({ answer }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in ai-homework-help:', error);
    return new Response(
      JSON.stringify({ error: error.message || "Une erreur est survenue" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
