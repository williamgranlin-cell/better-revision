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
        systemPrompt = `Tu es un expert en création de fiches de révision. Crée des fiches claires, concises et structurées pour aider les étudiants à mémoriser efficacement.

FORMAT:
- Utilise des titres clairs avec **
- Organise par sections thématiques
- Inclus les définitions clés
- Ajoute des formules si pertinent
- Utilise des listes à puces
- Ajoute des exemples courts
- Termine par les points essentiels à retenir

IMPORTANT: La fiche doit tenir sur 1-2 pages maximum.`;
        userPrompt = `Crée une fiche de révision complète sur: ${topic}`;
        break;

      case 'mind_map':
        systemPrompt = `Tu es un expert en création de cartes mentales. Crée une carte mentale textuelle structurée pour visualiser les concepts et leurs relations.

FORMAT (utilise cette structure textuelle):
🎯 **CONCEPT CENTRAL: [Titre]**

├── 📌 **Branche 1: [Thème]**
│   ├── • Point clé 1
│   ├── • Point clé 2
│   └── • Point clé 3

├── 📌 **Branche 2: [Thème]**
│   ├── • Point clé 1
│   └── • Point clé 2

└── 📌 **Branche 3: [Thème]**
    ├── • Point clé 1
    └── • Point clé 2

RÈGLES:
- Maximum 5-6 branches principales
- 3-4 sous-points par branche
- Utilise des émojis pour les catégories
- Relations claires entre concepts`;
        userPrompt = `Crée une carte mentale sur: ${topic}`;
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
