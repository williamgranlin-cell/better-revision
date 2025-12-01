import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Input validation
interface FlashcardRequest {
  content: string;
  type: string;
  count: number;
}

const validateFlashcardRequest = (body: any): { valid: boolean; error?: string; data?: FlashcardRequest } => {
  if (!body.content || typeof body.content !== 'string') {
    return { valid: false, error: "Le contenu est requis et doit être une chaîne de caractères" };
  }
  
  if (!body.type || typeof body.type !== 'string') {
    return { valid: false, error: "Le type est requis" };
  }
  
  const validTypes = ['text', 'revision_sheet'];
  if (!validTypes.includes(body.type)) {
    return { valid: false, error: "Type invalide. Doit être 'text' ou 'revision_sheet'" };
  }
  
  const content = body.content.trim();
  if (content.length === 0) {
    return { valid: false, error: "Le contenu ne peut pas être vide" };
  }
  
  if (content.length > 50000) {
    return { valid: false, error: "Le contenu ne peut pas dépasser 50 000 caractères" };
  }
  
  let count = parseInt(body.count) || 10;
  if (count < 1) count = 1;
  if (count > 50) count = 50; // Hard limit
  
  return {
    valid: true,
    data: {
      content: content,
      type: body.type,
      count: count
    }
  };
};

// Rate limiting (in-memory)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 5; // Lower limit for flashcard generation

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
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Extract user ID for rate limiting
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

    const contentType = req.headers.get("content-type") || "";

    // Handle file upload (multipart/form-data)
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File;
      
      if (!file) {
        return new Response(
          JSON.stringify({ error: "Aucun fichier fourni" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Validate file size (20MB max)
      if (file.size > 20 * 1024 * 1024) {
        return new Response(
          JSON.stringify({ error: "Le fichier ne peut pas dépasser 20 MB" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Read file content
      const bytes = await file.arrayBuffer();
      const uint8Array = new Uint8Array(bytes);
      
      let content = "";
      
      // For text files, decode directly
      if (file.name.endsWith(".txt")) {
        content = new TextDecoder().decode(uint8Array);
      } else if (file.name.match(/\.(jpg|jpeg|png|webp|pdf|doc|docx)$/i)) {
        content = `[Contenu extrait du fichier ${file.name}]\n\nVeuillez coller le texte de votre document ici pour générer les flashcards.`;
      }

      return new Response(
        JSON.stringify({ extractedText: content }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle JSON content
    const body = await req.json();
    
    // Validate input
    const validation = validateFlashcardRequest(body);
    if (!validation.valid) {
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const { content, type, count } = validation.data!;
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log(`[generate-flashcards] User ${userId} generating ${count} flashcards of type ${type}`);

    let systemPrompt = "";
    let userPrompt = "";

    if (type === "text") {
      systemPrompt = "Tu es un assistant qui génère des flashcards éducatives à partir de texte de cours. Génère des questions pertinentes et leurs réponses détaillées.";
      userPrompt = `Génère ${count} flashcards à partir du texte de cours suivant. Retourne uniquement un tableau JSON avec des objets contenant 'question' et 'answer'.\n\nTexte:\n${content}`;
    } else if (type === "revision_sheet") {
      systemPrompt = "Tu es un assistant qui génère des flashcards à partir de fiches de révision. Crée des questions qui testent la compréhension des concepts clés.";
      userPrompt = `Génère ${count} flashcards à partir de cette fiche de révision. Retourne uniquement un tableau JSON avec des objets contenant 'question' et 'answer'.\n\nFiche:\n${content}`;
    }

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
          { role: "user", content: userPrompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requêtes dépassée, réessayez plus tard." }),
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
      return new Response(
        JSON.stringify({ error: "Erreur lors de la génération des flashcards" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    let flashcardsText = data.choices[0].message.content;
    
    // Extract JSON from markdown code blocks if present
    const jsonMatch = flashcardsText.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/);
    if (jsonMatch) {
      flashcardsText = jsonMatch[1];
    }
    
    const flashcards = JSON.parse(flashcardsText);

    console.log(`[generate-flashcards] Successfully generated ${flashcards.length} flashcards for user ${userId}`);

    return new Response(
      JSON.stringify({ flashcards }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in generate-flashcards function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});