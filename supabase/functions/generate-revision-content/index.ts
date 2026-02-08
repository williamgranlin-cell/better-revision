import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, topic, content, subject, photoBase64, redrawPhoto } = await req.json();

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

    // For schema type, generate an actual image
    if (type === 'schema') {
      console.log('Generating schema image for topic:', topic, 'redrawPhoto:', redrawPhoto);
      
      let imagePrompt: string;
      let messages: any[];
      
      if (redrawPhoto && photoBase64) {
        // Redraw from photo
        imagePrompt = `Redessine ce schéma de manière propre, claire et professionnelle. 
Sujet: "${topic}"
Style: Schéma éducatif propre comme dans un manuel scolaire.
Consignes:
- Garde les mêmes éléments et structure que l'image originale
- Améliore la lisibilité et la clarté
- Ajoute des numéros (1, 2, 3...) pour chaque partie importante
- Utilise des couleurs distinctes pour différencier les éléments
- Fond blanc ou très clair
- Ajoute des légendes claires en français
- Rends le schéma plus professionnel et facile à comprendre`;

        messages = [
          { 
            role: 'user', 
            content: [
              { type: 'text', text: imagePrompt },
              { type: 'image_url', image_url: { url: photoBase64 } }
            ]
          }
        ];
      } else {
        // Generate from scratch
        imagePrompt = `Create a clear, educational scientific diagram/illustration about: "${topic}". 
Style: Clean educational diagram like in a textbook. 
Include: Labels with numbers (1, 2, 3...) pointing to each important part. 
Colors: Use distinct colors to differentiate parts.
Background: White or light colored.
Text: Include brief labels in French for each numbered element.
Make it simple, clear and easy to understand for students.`;

        messages = [
          { role: 'user', content: imagePrompt }
        ];
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
      console.log('Image response received');
      
      const imageUrl = imageData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      const textContent = imageData.choices?.[0]?.message?.content || '';

      if (!imageUrl) {
        throw new Error('No image generated');
      }

      // Now generate legends for the image
      const legendPrompt = `Pour un schéma éducatif sur "${topic}", génère une liste de légendes numérotées en français.

FORMAT:
🎨 **SCHÉMA: ${topic}**

**🏷️ LÉGENDES:**
① [Élément principal] → [Description courte]
② [Deuxième élément] → [Description courte]
③ [Troisième élément] → [Description courte]
④ [Quatrième élément] → [Description courte]
⑤ [Cinquième élément] → [Description courte]

**💡 À RETENIR:**
[Résumé en 1-2 phrases du concept illustré]

Génère 5-8 légendes pertinentes pour ce sujet.`;

      const legendResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'user', content: legendPrompt }
          ],
          max_tokens: 1500,
          temperature: 0.7,
        }),
      });

      let legends = '';
      if (legendResponse.ok) {
        const legendData = await legendResponse.json();
        legends = legendData.choices?.[0]?.message?.content || '';
      }

      return new Response(
        JSON.stringify({ 
          result: legends,
          imageUrl: imageUrl,
          type: 'schema'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // For other types (revision_sheet, mind_map), generate text content
    let systemPrompt = '';
    let userPrompt = '';

    switch (type) {
      case 'revision_sheet':
        systemPrompt = `Tu es un expert pédagogique de niveau universitaire, spécialisé dans la création de fiches de révision de haute qualité.

OBJECTIF: Créer une fiche de révision COMPLÈTE, PRÉCISE et STRUCTURÉE qui couvre TOUS les aspects importants du sujet.

FORMAT OBLIGATOIRE:
📚 **FICHE DE RÉVISION: [TITRE]**
${subject ? `📖 Matière: ${subject}` : ''}

**🎯 OBJECTIFS D'APPRENTISSAGE:**
- [Ce que l'étudiant doit maîtriser après cette fiche]

**📝 DÉFINITIONS CLÉS:**
• **[Terme 1]**: [Définition précise et complète]
• **[Terme 2]**: [Définition précise et complète]

**🔑 CONCEPTS FONDAMENTAUX:**
1. **[Concept 1]**
   - Explication détaillée
   - Exemple concret
   
2. **[Concept 2]**
   - Explication détaillée
   - Exemple concret

**📐 FORMULES / RÈGLES IMPORTANTES:** (si applicable)
• [Formule 1]: [Explication de chaque variable]
• [Formule 2]: [Explication de chaque variable]

**💡 EXEMPLES D'APPLICATION:**
[Exemples concrets avec résolution étape par étape]

**⚠️ ERREURS COURANTES À ÉVITER:**
• [Erreur 1] → [Comment l'éviter]
• [Erreur 2] → [Comment l'éviter]

**🧠 MOYENS MNÉMOTECHNIQUES:**
[Astuces pour mémoriser]

**✅ RÉSUMÉ EN 5 POINTS:**
1. [Point essentiel 1]
2. [Point essentiel 2]
3. [Point essentiel 3]
4. [Point essentiel 4]
5. [Point essentiel 5]

RÈGLES:
- Sois EXHAUSTIF et PRÉCIS
- Utilise un vocabulaire adapté au niveau d'études
- Chaque définition doit être claire et complète
- Les exemples doivent être concrets et instructifs
- Adapte la complexité au sujet (lycée vs études supérieures)`;
        userPrompt = `Crée une fiche de révision COMPLÈTE et DÉTAILLÉE sur: "${topic}"
${subject ? `Matière: ${subject}` : ''}
${content ? `\nContenu de référence fourni:\n${content.substring(0, 5000)}` : ''}

IMPORTANT: Sois le plus précis et complet possible. Cette fiche doit permettre à l'étudiant de maîtriser parfaitement le sujet.`;
        break;

      case 'mind_map':
        systemPrompt = `Tu es un expert en cartographie mentale et en pédagogie. Crée des cartes mentales DÉTAILLÉES et STRUCTURÉES qui permettent de visualiser TOUS les concepts et leurs relations.

FORMAT OBLIGATOIRE (utilise cette structure textuelle):
🎯 **CONCEPT CENTRAL: [TITRE]**
${subject ? `📖 Matière: ${subject}` : ''}

├── 📌 **BRANCHE 1: [Thème principal 1]**
│   ├── 🔹 [Sous-concept 1.1]
│   │   ├── • Détail important
│   │   └── • Exemple ou application
│   ├── 🔹 [Sous-concept 1.2]
│   │   ├── • Détail important
│   │   └── • Exemple ou application
│   └── 🔹 [Sous-concept 1.3]
│       └── • Détail important

├── 📌 **BRANCHE 2: [Thème principal 2]**
│   ├── 🔹 [Sous-concept 2.1]
│   │   └── • Détails...
│   └── 🔹 [Sous-concept 2.2]
│       └── • Détails...

├── 📌 **BRANCHE 3: [Thème principal 3]**
│   └── [Sous-concepts avec détails...]

├── 📌 **BRANCHE 4: [Thème principal 4]**
│   └── [Sous-concepts avec détails...]

└── 📌 **BRANCHE 5: [Thème principal 5]**
    └── [Sous-concepts avec détails...]

🔗 **CONNEXIONS IMPORTANTES:**
• [Concept A] ↔ [Concept B]: [Explication du lien]
• [Concept C] → [Concept D]: [Relation de cause/effet]

💡 **POINTS CLÉS À RETENIR:**
1. [Élément essentiel 1]
2. [Élément essentiel 2]
3. [Élément essentiel 3]

RÈGLES:
- Minimum 5 branches principales
- Chaque branche doit avoir 2-4 sous-concepts
- Utilise des émojis pertinents pour chaque catégorie
- Montre les RELATIONS entre les concepts
- Sois EXHAUSTIF dans la couverture du sujet`;
        userPrompt = `Crée une carte mentale COMPLÈTE et DÉTAILLÉE sur: "${topic}"
${subject ? `Matière: ${subject}` : ''}
${content ? `\nContenu de référence fourni:\n${content.substring(0, 5000)}` : ''}

IMPORTANT: La carte doit couvrir TOUS les aspects importants du sujet avec des connexions claires entre les concepts.`;
        break;
    }

    if (content) {
      userPrompt += `\n\nContenu de base à utiliser:\n${content.substring(0, 5000)}`;
    }
    if (subject) {
      userPrompt = `[Matière: ${subject}]\n\n${userPrompt}`;
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
        max_tokens: 3000,
        temperature: 0.7,
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
