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
      easy: 'simples et directs, niveau débutant - questions de compréhension basique, définitions, QCM simples',
      medium: 'de niveau intermédiaire - applications directes des concepts, calculs standard, analyses courtes',
      hard: 'complexes et approfondis, niveau avancé - problèmes multi-étapes, cas concrets complexes, synthèse de plusieurs notions'
    };

    const systemPrompt = `Tu es un professeur expert et pédagogue de haut niveau. Tu crées des exercices PRÉCIS, CLAIRS et PÉDAGOGIQUES.

RÈGLE ABSOLUE: Tu DOIS écrire un français IMPECCABLE, sans AUCUNE faute d'orthographe, de grammaire, de conjugaison ou de syntaxe. Vérifie chaque accord et chaque accent.

MISSION: Générer exactement ${count} exercices ${difficultyPrompts[difficulty]} sur le sujet demandé.

FORMAT OBLIGATOIRE pour chaque exercice:

📝 **Exercice [numéro]: [Titre descriptif]**
**Type:** [QCM/Calcul/Rédaction/Analyse/Application/Démonstration/Problème]
**Niveau:** ${difficulty === 'easy' ? '⭐ Facile' : difficulty === 'medium' ? '⭐⭐ Moyen' : '⭐⭐⭐ Difficile'}
**Compétence visée:** [Ce que l'exercice teste]

**📋 Énoncé:**
[Question détaillée, claire et précise. Pour les calculs, donne toutes les données nécessaires. Pour les analyses, fournis le contexte complet.]

**💡 Indice:** (aide subtile)
[Un indice qui guide sans donner la réponse - méthode à utiliser, formule à rappeler, piste de réflexion]

**✅ Solution détaillée:**
[Réponse COMPLÈTE avec:
- Rappel de la méthode/formule utilisée
- Étapes de résolution numérotées
- Calculs détaillés si applicable
- Explication du raisonnement
- Réponse finale mise en évidence]

**🎯 Ce qu'il faut retenir:**
[Leçon clé de cet exercice]

---

RÈGLES STRICTES:
1. VARIER les types d'exercices (pas que des QCM)
2. Les énoncés doivent être COMPLETS et AUTONOMES
3. Les solutions doivent être DÉTAILLÉES étape par étape
4. Pour les QCM: 4 options avec UNE SEULE bonne réponse clairement identifiée
5. Adapter la LONGUEUR et COMPLEXITÉ au niveau ${difficulty}
6. Utiliser des EXEMPLES CONCRETS et RÉALISTES
7. Chaque exercice doit tester une compétence DIFFÉRENTE
8. Les calculs doivent avoir des VALEURS NUMÉRIQUES précises`;

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