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

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

function buildContextBlock(subject?: string, schoolLevel?: string, content?: string): string {
  const parts: string[] = [];
  if (subject) parts.push(`📖 MATIÈRE: ${subject}`);
  if (schoolLevel) parts.push(`🎓 NIVEAU SCOLAIRE: ${schoolLevel}`);
  if (content) parts.push(`📄 COURS FOURNI PAR L'ÉLÈVE (à exploiter en priorité):\n${content.substring(0, 6000)}`);
  return parts.length > 0 ? parts.join('\n') : '';
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

    const { type, topic, content, subject, schoolLevel, photoBase64, redrawPhoto } = await req.json();

    if (!type || !topic) {
      return new Response(
        JSON.stringify({ error: "Le type et le sujet sont requis" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const validTypes = ['revision_sheet', 'mind_map', 'schema'];
    if (!validTypes.includes(type)) {
      return new Response(
        JSON.stringify({ error: "Type invalide" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const contextBlock = buildContextBlock(subject, schoolLevel, content);

    // For schema type, generate an actual image
    if (type === 'schema') {
      console.log('Generating schema image for topic:', topic, 'subject:', subject, 'level:', schoolLevel);

      let messages: any[];

      if (redrawPhoto && photoBase64) {
        const imagePrompt = `Redessine ce schéma de manière propre, claire et professionnelle.
Sujet: "${topic}"
${subject ? `Matière: ${subject}` : ''}
${schoolLevel ? `Niveau: ${schoolLevel}` : ''}

Style: Schéma éducatif propre et précis comme dans un manuel scolaire de référence.
Consignes STRICTES:
- Garde les mêmes éléments et structure que l'image originale
- Améliore considérablement la lisibilité et la clarté
- Ajoute des numéros (1, 2, 3...) pour chaque partie importante
- Utilise des couleurs distinctes et professionnelles pour différencier les éléments
- Fond blanc ou très clair
- Ajoute des légendes claires, précises et complètes en français
- Rends le schéma professionnel, scientifiquement exact et facile à comprendre
- Adapte le niveau de détail au niveau scolaire indiqué`;

        messages = [
          { role: 'user', content: [
            { type: 'text', text: imagePrompt },
            { type: 'image_url', image_url: { url: photoBase64 } }
          ]}
        ];
      } else {
        const imagePrompt = `Create a clear, detailed, scientifically accurate educational diagram about: "${topic}".
${subject ? `Subject: ${subject}` : ''}
${schoolLevel ? `Academic level: ${schoolLevel}` : ''}

Requirements:
- Clean educational diagram like in a reference textbook
- Include numbered labels (1, 2, 3...) pointing to each important part
- Use distinct professional colors to differentiate parts
- White or light background
- Include brief labels in French for each numbered element
- Be scientifically precise and accurate
- Adapt complexity to the academic level
- Make it comprehensive, covering all key elements of the topic
- Simple, clear, and easy to understand for students`;

        messages = [{ role: 'user', content: imagePrompt }];
      }

      const imageResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-3.1-flash-image-preview',
          messages,
          modalities: ['image', 'text']
        }),
      });

      if (!imageResponse.ok) {
        console.error('Image generation error:', imageResponse.status);
        if (imageResponse.status === 429) {
          return new Response(
            JSON.stringify({ error: "Trop de requêtes, veuillez réessayer dans quelques instants" }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        throw new Error(`Image generation failed`);
      }

      const imageData = await imageResponse.json();
      const imageUrl = imageData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      if (!imageUrl) throw new Error('No image generated');

      const legendPrompt = `Tu es un expert pédagogique. Pour un schéma éducatif sur "${topic}", génère des légendes numérotées ultra-précises. Tu DOIS écrire un français IMPECCABLE, sans AUCUNE faute d'orthographe, de grammaire ou de conjugaison.
${contextBlock}

FORMAT OBLIGATOIRE:
🎨 **SCHÉMA: ${topic}**
${subject ? `📖 Matière: ${subject}` : ''}
${schoolLevel ? `🎓 Niveau: ${schoolLevel}` : ''}

**🏷️ LÉGENDES DÉTAILLÉES:**
① [Élément] → [Description précise avec fonction/rôle]
② [Élément] → [Description précise avec fonction/rôle]
③ [Élément] → [Description précise avec fonction/rôle]
④ [Élément] → [Description précise avec fonction/rôle]
⑤ [Élément] → [Description précise avec fonction/rôle]
⑥ [Élément] → [Description précise avec fonction/rôle]

**📝 EXPLICATIONS CLÉS:**
[Pour chaque élément important, une explication de 1-2 phrases]

**💡 À RETENIR:**
[Résumé en 2-3 phrases des concepts essentiels]

${content ? `\nIMPORTANT: Base-toi sur le cours fourni par l'élève pour les légendes et explications.` : ''}

Génère 5-10 légendes pertinentes et précises adaptées au niveau ${schoolLevel || 'de l\'élève'}.`;

      const legendResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [{ role: 'user', content: legendPrompt }],
          max_tokens: 2000,
          temperature: 0.5,
        }),
      });

      let legends = '';
      if (legendResponse.ok) {
        const legendData = await legendResponse.json();
        legends = legendData.choices?.[0]?.message?.content || '';
      }

      return new Response(
        JSON.stringify({ result: legends, imageUrl, type: 'schema' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Text content generation (revision_sheet, mind_map)
    let systemPrompt = '';
    let userPrompt = '';

    const levelInstruction = schoolLevel
      ? `\n\nNIVEAU SCOLAIRE DE L'ÉLÈVE: ${schoolLevel}\nTu DOIS adapter le vocabulaire, la complexité des explications, la profondeur du contenu et les exemples à ce niveau précis.`
      : '';

    const courseInstruction = content
      ? `\n\nCOURS FOURNI PAR L'ÉLÈVE:\n${content.substring(0, 6000)}\n\nINSTRUCTION CRITIQUE: Tu DOIS te baser EN PRIORITÉ sur ce cours fourni. Résume-le, structure-le, et enrichis-le.`
      : '';

    const subjectInstruction = subject
      ? `\n\nMATIÈRE: ${subject}\nAdapte ton contenu spécifiquement à cette matière.`
      : '';

    switch (type) {
      case 'revision_sheet':
        systemPrompt = `Tu es un professeur expert et pédagogue exceptionnel, spécialisé dans la création de fiches de révision PARFAITES.

RÈGLE ABSOLUE D'ORTHOGRAPHE ET DE GRAMMAIRE:
- Tu DOIS écrire un français IMPECCABLE, sans AUCUNE faute d'orthographe, de grammaire, de conjugaison ou de syntaxe.
- RELIS CHAQUE PHRASE avant de la valider. Si tu as un doute sur l'orthographe d'un mot, vérifie-le.
- Accorde systématiquement les participes passés, les adjectifs, les sujets et les verbes.
- N'invente JAMAIS de faits, dates, formules ou définitions. Si tu n'es pas sûr à 100%, ne l'inclus pas.
${levelInstruction}${subjectInstruction}

OBJECTIF: Créer LA fiche de révision définitive sur le sujet.

FORMAT OBLIGATOIRE:
📚 **FICHE DE RÉVISION: [TITRE]**
${subject ? `📖 Matière: ${subject}` : ''}
${schoolLevel ? `🎓 Niveau: ${schoolLevel}` : ''}

**🎯 CE QUE TU DOIS SAVOIR APRÈS CETTE FICHE:**
- [Objectif 1]
- [Objectif 2]

**📝 DÉFINITIONS ESSENTIELLES:**
• **[Terme 1]**: [Définition précise]

**🔑 LES CONCEPTS FONDAMENTAUX:**

**1. [Premier concept majeur]**
📌 Explication claire
💡 Exemple concret

**📐 FORMULES / RÈGLES / MÉTHODES:** (si applicable)

**⚠️ PIÈGES CLASSIQUES ET ERREURS À ÉVITER:**
❌ [Erreur] → ✅ [Correction]

**✅ L'ESSENTIEL EN 5-7 POINTS:**
1. [Point clé 1]
2. [Point clé 2]

RÈGLES ABSOLUES:
- Sois EXHAUSTIF: couvre TOUT ce qui est important
- Sois PRÉCIS et STRUCTURÉ
- VÉRIFIE chaque information: dates, formules, noms propres doivent être EXACTS
- Ne génère AUCUNE information dont tu n'es pas certain
${content ? '- Si un cours est fourni, RÉSUME-LE et STRUCTURE-LE en priorité' : ''}`;

        userPrompt = `Crée une fiche de révision COMPLÈTE et ULTRA-CLAIRE sur: "${topic}"
${contextBlock}

IMPORTANT: Sois le plus précis et complet possible. Adapte au niveau scolaire et à la matière.
VÉRIFIE CHAQUE FAIT, DATE ET FORMULE avant de les inclure. Zéro erreur toléré.
${content ? '- BASE-TOI EN PRIORITÉ sur le cours fourni par l\'élève' : ''}`;
        break;

      case 'mind_map':
        systemPrompt = `Tu es un expert en pédagogie et en cartographie mentale. Tu crées des cartes mentales COMPLÈTES.

RÈGLE ABSOLUE D'ORTHOGRAPHE ET DE GRAMMAIRE:
- Tu DOIS écrire un français IMPECCABLE.
${levelInstruction}${subjectInstruction}

FORMAT OBLIGATOIRE:
🎯 **CONCEPT CENTRAL: [TITRE]**
${subject ? `📖 Matière: ${subject}` : ''}
${schoolLevel ? `🎓 Niveau: ${schoolLevel}` : ''}

├── 📌 **BRANCHE 1: [Thème principal 1]**
│   ├── 🔹 [Sous-concept 1.1]
│   │   └── • [Détail essentiel]
│   └── 🔹 [Sous-concept 1.2]

├── 📌 **BRANCHE 2: [Thème principal 2]**
│   └── 🔹 [Sous-concepts...]

🔗 **CONNEXIONS CLÉS ENTRE LES CONCEPTS:**
• [Concept A] ↔ [Concept B]: [Pourquoi ils sont liés]

⚡ **SYNTHÈSE EXPRESS:**
1. [L'idée la plus importante]
2. [La deuxième]

RÈGLES:
- Minimum 5 branches principales, chacune avec 2-4 sous-concepts
- Sois EXHAUSTIF dans la couverture du sujet
${content ? '- Reprends les concepts et termes du cours fourni par l\'élève' : ''}`;

        userPrompt = `Crée une carte mentale COMPLÈTE et DÉTAILLÉE sur: "${topic}"
${contextBlock}

IMPORTANT: Couvre TOUS les aspects importants avec des connexions claires.
${content ? '- BASE-TOI EN PRIORITÉ sur le cours fourni, structure ses concepts' : ''}`;
        break;
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 4000,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      console.error('AI API error:', response.status);
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Trop de requêtes, veuillez réessayer" }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const result = data.choices?.[0]?.message?.content || "Erreur lors de la génération.";

    return new Response(
      JSON.stringify({ result, type }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in generate-revision-content:', error);
    return new Response(
      JSON.stringify({ error: "Une erreur est survenue" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
