import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
          model: 'google/gemini-2.5-flash-image-preview',
          messages,
          modalities: ['image', 'text']
        }),
      });

      if (!imageResponse.ok) {
        const errorText = await imageResponse.text();
        console.error('Image generation error:', imageResponse.status, errorText);
        if (imageResponse.status === 429) {
          return new Response(
            JSON.stringify({ error: "Trop de requêtes, veuillez réessayer dans quelques instants" }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        throw new Error(`Image generation failed: ${imageResponse.status}`);
      }

      const imageData = await imageResponse.json();
      const imageUrl = imageData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      if (!imageUrl) throw new Error('No image generated');

      // Generate legends
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
[Pour chaque élément important, une explication de 1-2 phrases sur son rôle, sa fonction ou son importance dans le contexte du sujet]

**💡 À RETENIR:**
[Résumé en 2-3 phrases des concepts essentiels illustrés par ce schéma]

${content ? `\nIMPORTANT: Base-toi sur le cours fourni par l'élève pour les légendes et explications. Reprends les termes exacts du cours.` : ''}

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
      ? `\n\nNIVEAU SCOLAIRE DE L'ÉLÈVE: ${schoolLevel}\nTu DOIS adapter le vocabulaire, la complexité des explications, la profondeur du contenu et les exemples à ce niveau précis. Un élève de 6ème n'a pas les mêmes connaissances qu'un étudiant en Master.`
      : '';

    const courseInstruction = content
      ? `\n\nCOURS FOURNI PAR L'ÉLÈVE:\n${content.substring(0, 6000)}\n\nINSTRUCTION CRITIQUE: Tu DOIS te baser EN PRIORITÉ sur ce cours fourni. Résume-le, structure-le, et enrichis-le. Ne génère pas un contenu générique : utilise les termes, exemples et concepts présents dans le cours de l'élève. Complète avec tes connaissances uniquement pour clarifier ou enrichir.`
      : '';

    const subjectInstruction = subject
      ? `\n\nMATIÈRE: ${subject}\nAdapte ton contenu spécifiquement à cette matière. Utilise la méthodologie, le vocabulaire technique et les conventions propres à cette discipline.`
      : '';

    switch (type) {
      case 'revision_sheet':
        systemPrompt = `Tu es un professeur expert et pédagogue exceptionnel, spécialisé dans la création de fiches de révision PARFAITES. Tu sais rendre n'importe quel sujet limpide et mémorable.

RÈGLE ABSOLUE D'ORTHOGRAPHE ET DE GRAMMAIRE:
- Tu DOIS écrire un français IMPECCABLE, sans AUCUNE faute d'orthographe, de grammaire, de conjugaison ou de syntaxe.
- Vérifie chaque mot, chaque accord (sujet-verbe, adjectif-nom, participe passé), chaque accent.
- Utilise le vocabulaire technique EXACT de la matière concernée avec l'orthographe correcte.
- En cas de doute sur un mot, utilise une formulation dont tu es certain.
${levelInstruction}${subjectInstruction}

OBJECTIF: Créer LA fiche de révision définitive sur le sujet. Elle doit être si bien faite qu'un élève qui la lit et la comprend maîtrisera parfaitement le sujet.

FORMAT OBLIGATOIRE:
📚 **FICHE DE RÉVISION: [TITRE]**
${subject ? `📖 Matière: ${subject}` : ''}
${schoolLevel ? `🎓 Niveau: ${schoolLevel}` : ''}

**🎯 CE QUE TU DOIS SAVOIR APRÈS CETTE FICHE:**
- [Objectif 1 clair et mesurable]
- [Objectif 2]
- [Objectif 3]

**📝 DÉFINITIONS ESSENTIELLES:**
• **[Terme 1]**: [Définition précise, claire, avec un exemple concret entre parenthèses si utile]
• **[Terme 2]**: [Définition précise]
(Continue avec TOUS les termes importants du sujet)

**🔑 LES CONCEPTS FONDAMENTAUX:**

**1. [Premier concept majeur]**
📌 Explication claire et progressive (du simple au complexe)
💡 Exemple concret qui rend le concept évident
🔗 Lien avec les autres concepts

**2. [Deuxième concept majeur]**
📌 Explication claire et progressive
💡 Exemple concret
🔗 Lien avec les autres concepts

(Continue avec TOUS les concepts importants)

**📐 FORMULES / RÈGLES / MÉTHODES:** (si applicable)
• [Formule/Règle 1]: [Explication de chaque élément + quand l'utiliser]
• [Formule/Règle 2]: [Explication]

**💡 EXEMPLES RÉSOLUS ÉTAPE PAR ÉTAPE:**
[Au moins 2 exemples complets avec chaque étape expliquée]

**⚠️ PIÈGES CLASSIQUES ET ERREURS À ÉVITER:**
❌ [Erreur 1] → ✅ [Ce qu'il faut faire à la place]
❌ [Erreur 2] → ✅ [Correction]

**🧠 ASTUCES POUR MÉMORISER:**
[Moyens mnémotechniques, analogies, images mentales]

**✅ L'ESSENTIEL EN 5-7 POINTS:**
1. [Point clé 1]
2. [Point clé 2]
3. [Point clé 3]
4. [Point clé 4]
5. [Point clé 5]

RÈGLES ABSOLUES:
- Sois EXHAUSTIF: couvre TOUT ce qui est important
- Sois PRÉCIS: chaque information doit être exacte et vérifiable
- Sois CLAIR: un élève doit comprendre du premier coup
- Sois STRUCTURÉ: l'organisation doit faciliter la révision
- ADAPTE le niveau de complexité au niveau scolaire indiqué
- Si un cours est fourni, RÉSUME-LE et STRUCTURE-LE en priorité`;

        userPrompt = `Crée une fiche de révision COMPLÈTE, PRÉCISE et ULTRA-CLAIRE sur: "${topic}"
${contextBlock}

IMPORTANT: 
- Sois le plus précis et complet possible
- Cette fiche doit permettre de maîtriser PARFAITEMENT le sujet
- Adapte absolument tout au niveau scolaire et à la matière
${content ? '- BASE-TOI EN PRIORITÉ sur le cours fourni par l\'élève, résume-le et structure-le' : ''}`;
        break;

      case 'mind_map':
        systemPrompt = `Tu es un expert en pédagogie et en cartographie mentale. Tu crées des cartes mentales COMPLÈTES qui permettent de visualiser et comprendre TOUT un sujet en un coup d'œil.

RÈGLE ABSOLUE D'ORTHOGRAPHE ET DE GRAMMAIRE:
- Tu DOIS écrire un français IMPECCABLE, sans AUCUNE faute d'orthographe, de grammaire, de conjugaison ou de syntaxe.
- Vérifie chaque mot, chaque accord, chaque accent. Utilise le vocabulaire technique EXACT.
${levelInstruction}${subjectInstruction}

FORMAT OBLIGATOIRE:
🎯 **CONCEPT CENTRAL: [TITRE]**
${subject ? `📖 Matière: ${subject}` : ''}
${schoolLevel ? `🎓 Niveau: ${schoolLevel}` : ''}

├── 📌 **BRANCHE 1: [Thème principal 1]**
│   ├── 🔹 [Sous-concept 1.1]
│   │   ├── • [Détail essentiel]
│   │   ├── • [Exemple concret]
│   │   └── • [À retenir]
│   ├── 🔹 [Sous-concept 1.2]
│   │   ├── • [Détail]
│   │   └── • [Exemple]
│   └── 🔹 [Sous-concept 1.3]
│       └── • [Détail]

├── 📌 **BRANCHE 2: [Thème principal 2]**
│   ├── 🔹 [Sous-concept 2.1]
│   │   └── • [Détails...]
│   └── 🔹 [Sous-concept 2.2]
│       └── • [Détails...]

├── 📌 **BRANCHE 3: [Thème principal 3]**
│   └── [Sous-concepts avec détails...]

├── 📌 **BRANCHE 4: [Thème principal 4]**
│   └── [Sous-concepts avec détails...]

└── 📌 **BRANCHE 5: [Thème principal 5]**
    └── [Sous-concepts avec détails...]

🔗 **CONNEXIONS CLÉS ENTRE LES CONCEPTS:**
• [Concept A] ↔ [Concept B]: [Pourquoi ils sont liés]
• [Concept C] → [Concept D]: [Relation cause/effet]

⚡ **SYNTHÈSE EXPRESS (pour réviser en 2 min):**
1. [L'idée la plus importante]
2. [La deuxième plus importante]
3. [La troisième]

RÈGLES:
- Minimum 5 branches principales, chacune avec 2-4 sous-concepts
- Montre les RELATIONS entre les concepts
- Sois EXHAUSTIF dans la couverture du sujet
- Adapte la profondeur au niveau scolaire
${content ? '- Reprends les concepts et termes du cours fourni par l\'élève' : ''}`;

        userPrompt = `Crée une carte mentale COMPLÈTE et DÉTAILLÉE sur: "${topic}"
${contextBlock}

IMPORTANT: 
- Couvre TOUS les aspects importants avec des connexions claires
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
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 4000,
        temperature: 0.5,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
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
      JSON.stringify({ error: error.message || "Une erreur est survenue" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
