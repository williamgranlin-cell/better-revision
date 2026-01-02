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

    const systemPrompt = `Tu es un assistant pédagogique expert et bienveillant. Ton rôle est d'aider les étudiants avec leurs devoirs de manière claire et compréhensible.

RÈGLES IMPORTANTES:
1. Explique les concepts étape par étape
2. Utilise des exemples concrets pour illustrer
3. Si c'est un exercice de maths, montre les calculs détaillés
4. Ne donne pas directement la réponse finale - guide l'étudiant vers la solution
5. Encourage et motive l'étudiant
6. Si la question n'est pas claire, demande des précisions
7. Adapte ton niveau de langage au sujet (lycée/collège)

FORMAT DE RÉPONSE:
- Utilise des titres avec ** pour structurer
- Numérote les étapes
- Mets en évidence les formules et concepts clés
- Termine par un récapitulatif ou un conseil`;

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
