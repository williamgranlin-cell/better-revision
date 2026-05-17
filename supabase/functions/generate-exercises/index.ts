import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ROLE_LIMITS: Record<string, number> = {
  free: 5,
  premium: Infinity,
  admin: Infinity,
};

interface RequestBody {
  topic: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  count?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate user
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    const userId = userData.user.id;

    // Get user role server-side
    const { data: roleData } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .single();

    const userRole = roleData?.role || 'free';
    const dailyLimit = ROLE_LIMITS[userRole] ?? ROLE_LIMITS.free;

    // Enforce daily limit for free users
    if (dailyLimit !== Infinity) {
      const { data: usageResult, error: usageError } = await supabaseClient.rpc(
        'check_and_increment_usage',
        { _user_id: userId, _feature: 'ai_chat_messages', _limit: dailyLimit }
      );

      if (!usageError && usageResult && !usageResult.allowed) {
        return new Response(
          JSON.stringify({
            error: `Limite journalière atteinte (${dailyLimit} messages/jour). Passez à Premium pour un accès illimité.`,
            limitExceeded: true,
            limit: dailyLimit,
            feature: 'ai_chat_messages'
          }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

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

    const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');
    if (!GROQ_API_KEY) {
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
[Question détaillée, claire et précise.]

**💡 Indice:** (aide subtile)
[Un indice qui guide sans donner la réponse]

**✅ Solution détaillée:**
[Réponse COMPLÈTE avec étapes numérotées]

**🎯 Ce qu'il faut retenir:**
[Leçon clé de cet exercice]

---

RÈGLES STRICTES:
1. VARIER les types d'exercices
2. Les énoncés doivent être COMPLETS et AUTONOMES
3. Les solutions doivent être DÉTAILLÉES étape par étape
4. Pour les QCM: 4 options avec UNE SEULE bonne réponse
5. Adapter la LONGUEUR et COMPLEXITÉ au niveau ${difficulty}`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
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
      console.error('AI gateway error:', status);
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
      JSON.stringify({ error: 'Une erreur est survenue' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
