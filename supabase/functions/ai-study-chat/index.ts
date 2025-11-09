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
    const YOUTUBE_API_KEY = Deno.env.get("YOUTUBE_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!YOUTUBE_API_KEY) {
      throw new Error("YOUTUBE_API_KEY is not configured");
    }

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

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

    const systemPrompt = `Tu es un assistant d'apprentissage. On te fournit une liste de vraies vidéos YouTube vérifiées et accessibles.
    
Ta tâche est de présenter ces vidéos de manière pédagogique et attrayante en expliquant pourquoi chaque vidéo est pertinente pour le sujet.

Format ta réponse ainsi:

📚 Vidéos YouTube disponibles pour [SUJET]:

Pour chaque vidéo:
**[Numéro]. [Titre]** par [Chaîne]
🔗 [URL]
👁️ [Vues] | 📅 [Date]
💡 [Explique en 1-2 phrases pourquoi cette vidéo est utile pour apprendre ce sujet]

Les vidéos sont déjà triées par popularité et toutes ont plus de 50 000 vues.`;

    const aiPrompt = `Voici les vidéos YouTube pour le sujet "${message}":\n\n${JSON.stringify(videosInfo, null, 2)}\n\nPrésente ces vidéos de manière attrayante et pédagogique.`;

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
