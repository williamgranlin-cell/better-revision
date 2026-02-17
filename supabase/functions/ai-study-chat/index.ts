import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
  
  // Sanitize input - remove potential injection characters
  const sanitizedMessage = trimmedMessage
    .replace(/[<>]/g, '') // Remove HTML tags
    .substring(0, 500); // Hard limit
  
  return { valid: true, data: { message: sanitizedMessage } };
};

// Rate limiting map (in-memory, resets on function cold start)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
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
    // Extract user ID from JWT for rate limiting
    const authHeader = req.headers.get('authorization');
    const userId = authHeader ? authHeader.split(' ')[1] : 'anonymous';
    
    // Check rate limit
    const rateLimitCheck = checkRateLimit(userId);
    if (!rateLimitCheck.allowed) {
      return new Response(
        JSON.stringify({ error: rateLimitCheck.error }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    
    // Validate input
    const validation = validateInput(body);
    if (!validation.valid) {
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const { message } = validation.data!;
    
    const YOUTUBE_API_KEY = Deno.env.get("YOUTUBE_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!YOUTUBE_API_KEY) {
      throw new Error("YOUTUBE_API_KEY is not configured");
    }

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log(`[ai-study-chat] User ${userId} searching for: ${message}`);

    // Recherche YouTube réelle avec l'API officielle
    const youtubeSearchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(message + ' cours français éducatif')}&type=video&videoDuration=medium&videoEmbeddable=true&maxResults=10&order=relevance&relevanceLanguage=fr&key=${YOUTUBE_API_KEY}`;
    
    const youtubeResponse = await fetch(youtubeSearchUrl);
    
    if (!youtubeResponse.ok) {
      const errorText = await youtubeResponse.text();
      console.error("YouTube API error:", youtubeResponse.status, errorText);
      throw new Error("Erreur lors de la recherche YouTube");
    }

    const youtubeData = await youtubeResponse.json();
    
    // Récupérer les statistiques des vidéos
    const videoIds = youtubeData.items.map((item: any) => item.id.videoId).join(',');
    const statsUrl = `https://www.googleapis.com/youtube/v3/videos?part=statistics,contentDetails&id=${videoIds}&key=${YOUTUBE_API_KEY}`;
    
    const statsResponse = await fetch(statsUrl);
    const statsData = await statsResponse.json();
    
    // Créer un map des statistiques
    const statsMap = new Map();
    statsData.items?.forEach((item: any) => {
      statsMap.set(item.id, {
        viewCount: parseInt(item.statistics.viewCount),
        likeCount: parseInt(item.statistics.likeCount || 0),
        duration: item.contentDetails.duration
      });
    });
    
    // Filtrer les vidéos avec plus de 50k vues et trier par popularité
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

    // Formatter les informations pour l'IA
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
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
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
      JSON.stringify({ error: error instanceof Error ? error.message : "Une erreur est survenue" }), 
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});