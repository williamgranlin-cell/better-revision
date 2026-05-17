import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Feature limits per role (mirrors client-side FEATURE_LIMITS)
const ROLE_LIMITS: Record<string, number> = {
  free: 5,
  premium: Infinity,
  admin: Infinity,
};

// Input validation schema
interface RequestBody {
  message: string;
}

const validateInput = (body: any): { valid: boolean; error?: string; data?: RequestBody } => {
  if (!body.message || typeof body.message !== 'string') {
    return { valid: false, error: "Le message est requis et doit être une chaîne de caractères" };
  }
  const trimmedMessage = body.message.trim();
  if (trimmedMessage.length === 0) {
    return { valid: false, error: "Le message ne peut pas être vide" };
  }
  if (trimmedMessage.length > 500) {
    return { valid: false, error: "Le message ne peut pas dépasser 500 caractères" };
  }
  const sanitizedMessage = trimmedMessage.replace(/[<>]/g, '').substring(0, 500);
  return { valid: true, data: { message: sanitizedMessage } };
};

// In-memory rate limiting (per cold start)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60000;
const MAX_REQUESTS_PER_WINDOW = 10;

const checkRateLimit = (userId: string): { allowed: boolean; error?: string } => {
  const now = Date.now();
  const userLimit = rateLimitMap.get(userId);
  if (!userLimit || now > userLimit.resetTime) {
    rateLimitMap.set(userId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return { allowed: true };
  }
  if (userLimit.count >= MAX_REQUESTS_PER_WINDOW) {
    return { allowed: false, error: "Trop de requêtes. Veuillez attendre une minute." };
  }
  userLimit.count++;
  return { allowed: true };
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate user
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
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
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    const userId = userData.user.id;

    // In-memory rate limit
    const rateLimitCheck = checkRateLimit(userId);
    if (!rateLimitCheck.allowed) {
      return new Response(JSON.stringify({ error: rateLimitCheck.error }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

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

      if (usageError) {
        console.error('[ai-study-chat] Usage check error:', usageError);
      } else if (usageResult && !usageResult.allowed) {
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

    const body = await req.json();
    const validation = validateInput(body);
    if (!validation.valid) {
      return new Response(JSON.stringify({ error: validation.error }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    const { message } = validation.data!;

    const YOUTUBE_API_KEY = Deno.env.get("YOUTUBE_API_KEY");
    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");

    if (!YOUTUBE_API_KEY) throw new Error("YOUTUBE_API_KEY is not configured");
    if (!GROQ_API_KEY) throw new Error("GROQ_API_KEY is not configured");

    console.log(`[ai-study-chat] User ${userId} (${userRole}) searching for: ${message}`);

    const youtubeSearchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(message + ' cours français éducatif')}&type=video&videoDuration=medium&videoEmbeddable=true&maxResults=10&order=relevance&relevanceLanguage=fr&key=${YOUTUBE_API_KEY}`;
    const youtubeResponse = await fetch(youtubeSearchUrl);

    if (!youtubeResponse.ok) {
      const errorText = await youtubeResponse.text();
      console.error("YouTube API error:", youtubeResponse.status, errorText);
      throw new Error("Erreur lors de la recherche YouTube");
    }

    const youtubeData = await youtubeResponse.json();
    const videoIds = youtubeData.items.map((item: any) => item.id.videoId).join(',');
    const statsUrl = `https://www.googleapis.com/youtube/v3/videos?part=statistics,contentDetails&id=${videoIds}&key=${YOUTUBE_API_KEY}`;
    const statsResponse = await fetch(statsUrl);
    const statsData = await statsResponse.json();

    const statsMap = new Map();
    statsData.items?.forEach((item: any) => {
      statsMap.set(item.id, {
        viewCount: parseInt(item.statistics.viewCount),
        likeCount: parseInt(item.statistics.likeCount || 0),
        duration: item.contentDetails.duration
      });
    });

    const popularVideos = youtubeData.items
      .filter((item: any) => {
        const stats = statsMap.get(item.id.videoId);
        return stats && stats.viewCount > 50000;
      })
      .sort((a: any, b: any) => {
        const statsA = statsMap.get(a.id.videoId);
        const statsB = statsMap.get(b.id.videoId);
        return statsB.viewCount - statsA.viewCount;
      })
      .slice(0, 7);

    const videosInfo = popularVideos.map((item: any, index: number) => {
      const stats = statsMap.get(item.id.videoId);
      return {
        number: index + 1,
        title: item.snippet.title,
        channel: item.snippet.channelTitle,
        url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
        views: stats.viewCount.toLocaleString('fr-FR'),
        publishedAt: new Date(item.snippet.publishedAt).toLocaleDateString('fr-FR'),
        description: item.snippet.description.substring(0, 150)
      };
    });

    const systemPrompt = `Tu es un CONSEILLER PÉDAGOGIQUE expert en ressources éducatives. Tu présentes des vidéos YouTube de manière CLAIRE et UTILE pour les étudiants. Tu DOIS écrire un français IMPECCABLE, sans AUCUNE faute d'orthographe ou de grammaire.

🎯 MISSION: Présenter les vidéos trouvées de façon ATTRAYANTE et INFORMATIVE.

📋 FORMAT DE PRÉSENTATION OBLIGATOIRE:

📚 **Vidéos YouTube pour apprendre: [SUJET]**

Pour chaque vidéo, présente:

**[Numéro]. [Titre de la vidéo]**
🎬 *par [Nom de la chaîne]*
🔗 [URL de la vidéo]
📊 [Nombre de vues] vues | 📅 Publié le [Date]

💡 **Pourquoi cette vidéo est utile:**
[2-3 phrases expliquant ce que l'étudiant va apprendre et pourquoi cette vidéo est pertinente]

---

RÈGLES:
- Sois ENTHOUSIASTE mais PROFESSIONNEL
- Explique clairement la VALEUR de chaque vidéo
- Les vidéos sont triées par popularité (les plus vues en premier)
- Toutes ont été vérifiées et ont plus de 50 000 vues`;

    const aiPrompt = `Voici les vidéos YouTube trouvées pour le sujet "${message}":\n\n${JSON.stringify(videosInfo, null, 2)}\n\nPrésente ces vidéos de manière attrayante et pédagogique selon le format demandé.`;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: aiPrompt }
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
      console.error("AI gateway error:", response.status);
      throw new Error("Erreur lors de la communication avec l'IA");
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    console.log(`[ai-study-chat] Successfully returned ${popularVideos.length} videos for user ${userId}`);

    return new Response(
      JSON.stringify({ response: aiResponse }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in ai-study-chat function:", error);
    return new Response(
      JSON.stringify({ error: "Une erreur est survenue" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
