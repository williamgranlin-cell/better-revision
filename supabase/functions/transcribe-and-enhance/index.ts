import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ROLE_LIMITS: Record<string, number> = {
  free: 5,
  premium: Infinity,
  admin: Infinity,
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Authenticate user
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
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
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

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
      console.error("AI gateway error:", response.status);
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
    return new Response(JSON.stringify({ error: "Une erreur est survenue" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
