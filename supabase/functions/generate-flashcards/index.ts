import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ROLE_LIMITS: Record<string, number> = {
  free: 5,
  premium: Infinity,
  admin: Infinity,
};

// Input validation
interface FlashcardRequest {
  content?: string;
  subject?: string;
  type: string;
  count: number;
}

const validateFlashcardRequest = (body: any): { valid: boolean; error?: string; data?: FlashcardRequest } => {
  if (!body.type || typeof body.type !== 'string') {
    return { valid: false, error: "Le type est requis" };
  }
  
  const validTypes = ['text', 'revision_sheet', 'ai_subject'];
  if (!validTypes.includes(body.type)) {
    return { valid: false, error: "Type invalide. Doit être 'text', 'revision_sheet' ou 'ai_subject'" };
  }
  
  // For ai_subject type, we need a subject
  if (body.type === 'ai_subject') {
    if (!body.subject || typeof body.subject !== 'string' || body.subject.trim().length === 0) {
      return { valid: false, error: "Le sujet est requis pour la génération IA" };
    }
    if (body.subject.length > 500) {
      return { valid: false, error: "Le sujet ne peut pas dépasser 500 caractères" };
    }
  } else {
    // For text and revision_sheet, we need content
    if (!body.content || typeof body.content !== 'string') {
      return { valid: false, error: "Le contenu est requis et doit être une chaîne de caractères" };
    }
    
    const content = body.content.trim();
    if (content.length === 0) {
      return { valid: false, error: "Le contenu ne peut pas être vide" };
    }
    
    if (content.length > 50000) {
      return { valid: false, error: "Le contenu ne peut pas dépasser 50 000 caractères" };
    }
  }
  
  let count = parseInt(body.count) || 10;
  if (count < 1) count = 1;
  if (count > 50) count = 50; // Hard limit
  
  return {
    valid: true,
    data: {
      content: body.content?.trim(),
      subject: body.subject?.trim(),
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

    // In-memory rate limit check
    const rateLimitCheck = checkRateLimit(userId);
    if (!rateLimitCheck.allowed) {
      return new Response(
        JSON.stringify({ error: rateLimitCheck.error }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user role server-side
    const { data: roleData } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .single();

    const userRole = roleData?.role || 'free';
    const dailyLimit = ROLE_LIMITS[userRole] ?? ROLE_LIMITS.free;

    // Enforce daily flashcard generation limit for free users
    if (dailyLimit !== Infinity) {
      const { data: usageResult, error: usageError } = await supabaseClient.rpc(
        'check_and_increment_usage',
        { _user_id: userId, _feature: 'flashcards_per_day', _limit: dailyLimit }
      );

      if (!usageError && usageResult && !usageResult.allowed) {
        return new Response(
          JSON.stringify({
            error: `Limite journalière atteinte (${dailyLimit} générations/jour). Passez à Premium pour un accès illimité.`,
            limitExceeded: true,
            limit: dailyLimit,
            feature: 'flashcards_per_day'
          }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
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
    
    // Check if this is a regenerate single flashcard request
    if (body.regenerateSingle) {
      const { question, subject } = body;
      
      if (!question || !subject) {
        return new Response(
          JSON.stringify({ error: "Question et sujet requis pour régénérer" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) {
        throw new Error("LOVABLE_API_KEY is not configured");
      }

      console.log(`[generate-flashcards] Regenerating single flashcard for subject: ${subject}`);

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { 
              role: "system", 
              content: `Tu es un expert pédagogique. Tu dois générer UNE nouvelle flashcard sur le sujet "${subject}" qui soit différente de la question originale mais toujours pertinente pour le sujet.` 
            },
            { 
              role: "user", 
              content: `La flashcard actuelle est:
Question: "${question}"

Génère UNE nouvelle flashcard différente mais toujours sur le sujet "${subject}".
La question doit être claire et la réponse précise.

Retourne UNIQUEMENT un objet JSON avec 'question' et 'answer'. Pas de texte avant ou après.
Format: {"question": "...", "answer": "..."}`
            }
          ],
          temperature: 0.9,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("AI gateway error:", response.status, errorText);
        return new Response(
          JSON.stringify({ error: "Erreur lors de la régénération" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const data = await response.json();
      let flashcardText = data.choices[0].message.content;
      
      // Extract JSON from markdown code blocks if present
      const jsonMatch = flashcardText.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
      if (jsonMatch) {
        flashcardText = jsonMatch[1];
      }
      
      const flashcard = JSON.parse(flashcardText);

      return new Response(
        JSON.stringify({ flashcard }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if this is a quiz wrong answers generation request
    if (body.generateQuizOptions) {
      const { question, correctAnswer, subject, difficulty = "medium" } = body;
      
      if (!question || !correctAnswer || !subject) {
        return new Response(
          JSON.stringify({ error: "Question, réponse et sujet requis" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) {
        throw new Error("LOVABLE_API_KEY is not configured");
      }

      console.log(`[generate-flashcards] Generating quiz options for subject: ${subject}, difficulty: ${difficulty}`);

      // Different prompts based on difficulty
      let difficultyInstructions = "";
      let wrongAnswersCount = 3;
      
      switch (difficulty) {
        case "easy":
          difficultyInstructions = `Les réponses doivent être CLAIREMENT incorrectes et faciles à distinguer de la bonne réponse.
- Utilise des réponses évidemment fausses
- Les réponses doivent être sur le même sujet mais clairement différentes
- Évite les pièges et les nuances subtiles`;
          wrongAnswersCount = 2;
          break;
        case "hard":
          difficultyInstructions = `Les réponses doivent être TRÈS PROCHES de la bonne réponse et difficiles à distinguer.
- Utilise des réponses plausibles avec des nuances subtiles
- Inclus des pièges courants et des confusions fréquentes
- Les réponses doivent sembler presque correctes
- Utilise des termes similaires ou des concepts proches`;
          wrongAnswersCount = 3;
          break;
        default: // medium
          difficultyInstructions = `Les réponses doivent être plausibles mais clairement incorrectes.
- Équilibre entre réponses évidentes et pièges subtils
- Les réponses doivent être du même domaine
- Inclus une ou deux réponses qui pourraient prêter à confusion`;
          wrongAnswersCount = 3;
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
            { 
              role: "system", 
              content: `Tu es un expert en création de QCM avec différents niveaux de difficulté. Tu dois générer ${wrongAnswersCount} mauvaises réponses pour une question de quiz.` 
            },
            { 
              role: "user", 
              content: `Sujet: "${subject}"
Question: "${question}"
Bonne réponse: "${correctAnswer}"
Niveau de difficulté: ${difficulty === "easy" ? "FACILE" : difficulty === "hard" ? "DIFFICILE" : "MOYEN"}

${difficultyInstructions}

Génère exactement ${wrongAnswersCount} mauvaises réponses qui:
1. Sont liées au même sujet "${subject}"
2. Sont de longueur similaire à la bonne réponse

Retourne UNIQUEMENT un tableau JSON avec les ${wrongAnswersCount} mauvaises réponses.
Format: ["mauvaise réponse 1", "mauvaise réponse 2"${wrongAnswersCount === 3 ? ', "mauvaise réponse 3"' : ''}]`
            }
          ],
          temperature: difficulty === "hard" ? 0.5 : difficulty === "easy" ? 0.9 : 0.7,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("AI gateway error:", response.status, errorText);
        return new Response(
          JSON.stringify({ error: "Erreur lors de la génération des options" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const data = await response.json();
      let optionsText = data.choices[0].message.content;
      
      // Extract JSON from markdown code blocks if present
      const jsonMatch = optionsText.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/);
      if (jsonMatch) {
        optionsText = jsonMatch[1];
      }
      
      const wrongAnswers = JSON.parse(optionsText);

      return new Response(
        JSON.stringify({ wrongAnswers }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Validate input
    const validation = validateFlashcardRequest(body);
    if (!validation.valid) {
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const { content, subject, type, count } = validation.data!;
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log(`[generate-flashcards] User ${userId} generating ${count} flashcards of type ${type}${subject ? ` on subject: ${subject}` : ''}`);

    let systemPrompt = "";
    let userPrompt = "";

    if (type === "ai_subject") {
      systemPrompt = `Tu es un EXPERT PÉDAGOGIQUE spécialisé dans la création de flashcards éducatives de HAUTE QUALITÉ. Tu DOIS écrire un français IMPECCABLE, sans AUCUNE faute d'orthographe, de grammaire ou de conjugaison.

🎯 MISSION: Créer des flashcards PRÉCISES, VARIÉES et PÉDAGOGIQUES sur le sujet demandé.

📋 CRITÈRES DE QUALITÉ:
1. **QUESTIONS VARIÉES**: Définitions, concepts, applications, dates, formules, exemples
2. **PROGRESSION**: Du plus simple au plus complexe
3. **PRÉCISION**: Chaque réponse doit être EXACTE et VÉRIFIABLE
4. **CLARTÉ**: Questions directes, réponses concises mais complètes
5. **COUVERTURE**: Couvrir TOUS les aspects importants du sujet

📝 TYPES DE FLASHCARDS À INCLURE:
• 📖 Définitions: "Qu'est-ce que...?"
• 🔬 Concepts: "Explique le principe de..."
• 📐 Formules/Règles: "Quelle est la formule de...?"
• 📅 Dates/Faits: "Quand/Où/Qui...?"
• 💡 Applications: "Comment utilise-t-on...?"
• ⚖️ Comparaisons: "Quelle est la différence entre...?"
• 🔗 Relations: "Quel est le lien entre...?"

RÈGLES:
- Réponses entre 1 et 3 phrases maximum
- Pas de questions trop vagues ou trop spécifiques
- Inclure les éléments ESSENTIELS du sujet
- Adapter le niveau au contexte (lycée/études supérieures)`;
      userPrompt = `Génère exactement ${count} flashcards éducatives VARIÉES et COMPLÈTES sur le sujet: "${subject}".

Assure-toi de couvrir:
- Les définitions clés
- Les concepts fondamentaux  
- Les formules/règles importantes (si applicable)
- Les applications pratiques
- Les points souvent mal compris

Retourne UNIQUEMENT un tableau JSON avec des objets contenant 'question' et 'answer'. Pas de texte avant ou après.
Format: [{"question": "...", "answer": "..."}, ...]`;
    } else if (type === "text") {
      systemPrompt = `Tu es un EXPERT en création de flashcards à partir de contenu textuel. Tu analyses le texte pour extraire les informations CLÉS et les transformer en questions d'apprentissage EFFICACES. Tu DOIS écrire un français IMPECCABLE, sans AUCUNE faute.

OBJECTIF: Créer des flashcards qui testent la COMPRÉHENSION profonde du texte, pas juste la mémorisation mot à mot.

TYPES DE QUESTIONS À CRÉER:
• Questions sur les définitions et concepts
• Questions sur les causes et conséquences
• Questions sur les exemples et applications
• Questions de synthèse et comparaison`;
      userPrompt = `Analyse ce texte de cours et génère ${count} flashcards PERTINENTES qui testent la compréhension des points clés.

Texte:
${content}

Retourne UNIQUEMENT un tableau JSON avec des objets contenant 'question' et 'answer'. Chaque réponse doit être précise et issue du texte.`;
    } else if (type === "revision_sheet") {
      systemPrompt = `Tu es un EXPERT en création de flashcards à partir de fiches de révision. Tu identifies les éléments ESSENTIELS à mémoriser et les transformes en questions d'apprentissage. Tu DOIS écrire un français IMPECCABLE, sans AUCUNE faute.

OBJECTIF: Créer des flashcards qui permettent de RÉVISER EFFICACEMENT les points clés de la fiche.`;
      userPrompt = `Analyse cette fiche de révision et génère ${count} flashcards qui couvrent les points ESSENTIELS à retenir.

Fiche:
${content}

Retourne UNIQUEMENT un tableau JSON avec des objets contenant 'question' et 'answer'.`;
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
      JSON.stringify({ error: "Une erreur est survenue" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});