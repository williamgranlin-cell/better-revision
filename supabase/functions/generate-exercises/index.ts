import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  topic: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  count?: number;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { topic, difficulty = 'medium', count = 3 } = await req.json() as RequestBody;

    if (!topic || typeof topic !== 'string' || topic.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Le sujet est requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (topic.length > 200) {
      return new Response(
        JSON.stringify({ error: 'Le sujet est trop long (max 200 caractères)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Service non configuré' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const difficultyPrompts = {
      easy: 'simples et directs, niveau débutant',
      medium: 'de niveau intermédiaire, nécessitant une bonne compréhension',
      hard: 'complexes et approfondis, niveau avancé'
    };

    const systemPrompt = `Tu es un professeur expert qui crée des exercices pédagogiques de haute qualité.
Tu dois générer exactement ${count} exercices ${difficultyPrompts[difficulty]} sur le sujet demandé.

Format OBLIGATOIRE pour chaque exercice:
📝 **Exercice [numéro]: [titre court]**
**Type:** [QCM/Calcul/Rédaction/Analyse/Application]
**Énoncé:** [question détaillée et claire]
**Indice:** [aide subtile sans donner la réponse]
**Solution:** [réponse complète et expliquée]

---

Règles:
- Varier les types d'exercices
- Les énoncés doivent être clairs et précis
- Les solutions doivent être pédagogiques
- Adapter la complexité au niveau ${difficulty}
- Utiliser des exemples concrets quand c'est pertinent`;

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
          { role: 'user', content: `Génère ${count} exercices sur le sujet: "${topic.trim()}"` }
        ],
        max_tokens: 2000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(
          JSON.stringify({ error: 'Limite de requêtes atteinte, réessayez plus tard' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (status === 402) {
        return new Response(
          JSON.stringify({ error: 'Crédits insuffisants' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      console.error('AI gateway error:', status, await response.text());
      return new Response(
        JSON.stringify({ error: 'Erreur du service IA' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const exercises = data.choices?.[0]?.message?.content;

    if (!exercises) {
      return new Response(
        JSON.stringify({ error: 'Aucun exercice généré' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Generated ${count} exercises for topic: ${topic}`);

    return new Response(
      JSON.stringify({ exercises }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating exercises:', error);
    return new Response(
      JSON.stringify({ error: 'Erreur lors de la génération des exercices' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});