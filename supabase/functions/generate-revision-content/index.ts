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
        const imagePrompt = `Create a STUNNING, professional educational diagram about: "${topic}".
${subject ? `Subject: ${subject}` : ''}
${schoolLevel ? `Academic level: ${schoolLevel}` : ''}

VISUAL STYLE (very important):
- Modern textbook illustration style, clean and elegant
- Bright, harmonious color palette (blues, greens, soft oranges) — NOT washed out
- Crisp white or very light pastel background
- Smooth gradients and subtle shadows for depth
- Premium quality, like a National Geographic / Britannica infographic

CONTENT REQUIREMENTS:
- Scientifically accurate and pedagogically clear
- Numbered labels (①②③④⑤...) pointing to each key element
- Each label has a short FRENCH caption directly on the diagram
- Include arrows, brackets or connecting lines where helpful
- Adapt complexity to the academic level
- Cover ALL key elements of the topic comprehensively
- The diagram MUST be self-explanatory at a glance

LAYOUT:
- Centered composition, balanced
- Title at the top in bold elegant typography
- Legends placed clearly without overlapping
- High contrast, very readable text`;

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
        if (imageResponse.status === 402) {
          return new Response(
            JSON.stringify({ error: "Crédits IA insuffisants. Ajoute des crédits dans Lovable Cloud." }),
            { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        return new Response(
          JSON.stringify({ error: "Le générateur d'image n'a pas répondu. Réessaie." }),
          { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const imageData = await imageResponse.json();
      const imageUrl = imageData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      if (!imageUrl) {
        return new Response(
          JSON.stringify({ error: "Aucune image générée. Essaie de reformuler ton sujet plus précisément." }),
          { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const legendPrompt = `Tu es un professeur expert qui rédige les légendes d'un schéma éducatif sur "${topic}". Français IMPECCABLE, ZÉRO faute, ZÉRO invention.
${contextBlock}

Réponds EXACTEMENT dans ce format Markdown (pas de texte avant/après) :

# 🎨 ${topic}
${subject ? `**Matière** : ${subject}  ` : ''}
${schoolLevel ? `**Niveau** : ${schoolLevel}` : ''}

## 🏷️ Légendes du schéma

**①** **[Élément 1]** — [Description précise : rôle / fonction]
**②** **[Élément 2]** — [Description précise : rôle / fonction]
**③** **[Élément 3]** — [Description précise : rôle / fonction]
**④** **[Élément 4]** — [Description précise : rôle / fonction]
**⑤** **[Élément 5]** — [Description précise : rôle / fonction]

## 📝 Explications clés

- **[Notion 1]** : explication en 1-2 phrases.
- **[Notion 2]** : explication en 1-2 phrases.
- **[Notion 3]** : explication en 1-2 phrases.

## 💡 À retenir

> [Synthèse claire en 2-3 phrases des concepts essentiels.]

Génère 5 à 8 légendes pertinentes, adaptées au niveau ${schoolLevel || 'de l\'élève'}. Si tu n'es pas sûr d'un élément, ne l'invente pas.`;

      const legendResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-3-flash-preview',
          messages: [{ role: 'user', content: legendPrompt }],
          max_tokens: 2000,
          temperature: 0.3,
        }),
      });

      let legends = '';
      if (legendResponse.ok) {
        const legendData = await legendResponse.json();
        legends = legendData.choices?.[0]?.message?.content || '';
      }
      if (!legends) {
        legends = `# 🎨 ${topic}\n\nLe schéma a été généré. Les légendes détaillées n'ont pas pu être chargées, mais l'image ci-dessus illustre le sujet.`;
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

    // ===== Cas spécial : revision_sheet utilise OpenAI GPT-5 + image illustrative =====
    if (type === 'revision_sheet') {
      const userBasePrompt = `À partir de ce cours, j'aimerai que tu me génères une fiche de révision esthétique avec les éléments essentiels à connaître. Si besoin tu peux schématiser, faire des graphiques ou tableaux.

Sujet / titre : "${topic}"
${subject ? `Matière : ${subject}` : ''}
${schoolLevel ? `Niveau scolaire : ${schoolLevel}` : ''}

${content ? `COURS FOURNI PAR L'ÉLÈVE (à utiliser EN PRIORITÉ) :\n${content.substring(0, 8000)}` : '(Aucun cours fourni — base-toi sur tes connaissances en restant rigoureusement exact.)'}

CONSIGNES STRICTES :
- Français IMPECCABLE, zéro faute, zéro invention.
- Mets en forme avec du Markdown clair : titres, sous-titres, listes, **gras** sur les mots-clés.
- Tu peux insérer des tableaux Markdown ou des schémas ASCII si pertinent.
- Structure : objectifs → définitions essentielles → concepts clés (avec exemples) → méthodes/formules → pièges fréquents → l'essentiel à retenir.
- Sois exhaustif mais synthétique. Adapte la profondeur au niveau.`;

      const textResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'openai/gpt-5',
          messages: [
            {
              role: 'system',
              content: 'Tu es un professeur expert qui rédige des fiches de révision esthétiques, structurées et rigoureuses, en français impeccable. Tu n\'inventes jamais de fait.',
            },
            { role: 'user', content: userBasePrompt },
          ],
        }),
      });

      if (!textResponse.ok) {
        console.error('GPT-5 error:', textResponse.status);
        if (textResponse.status === 429) {
          return new Response(JSON.stringify({ error: "Trop de requêtes, réessaie dans un instant." }), {
            status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        if (textResponse.status === 402) {
          return new Response(JSON.stringify({ error: "Crédits IA insuffisants." }), {
            status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        return new Response(JSON.stringify({ error: "La génération de la fiche a échoué." }), {
          status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const textData = await textResponse.json();
      const sheetText = textData.choices?.[0]?.message?.content || "Erreur lors de la génération.";

      // Image illustrative associée
      let illustrationUrl: string | undefined;
      try {
        const imgResp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-3.1-flash-image-preview',
            messages: [{
              role: 'user',
              content: `Crée une illustration éducative élégante et claire sur "${topic}"${subject ? ` (${subject})` : ''}${schoolLevel ? `, niveau ${schoolLevel}` : ''}. Style infographie de manuel scolaire moderne, fond clair, éléments principaux légendés en français.`
            }],
            modalities: ['image', 'text'],
          }),
        });
        if (imgResp.ok) {
          const imgData = await imgResp.json();
          illustrationUrl = imgData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
        }
      } catch (e) {
        console.warn('Illustration non générée:', e);
      }

      return new Response(
        JSON.stringify({ result: sheetText, imageUrl: illustrationUrl, type: 'revision_sheet' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    switch (type) {

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
