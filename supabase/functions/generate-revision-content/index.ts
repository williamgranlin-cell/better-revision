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
    const { type, topic, content, subject } = await req.json();

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

      case 'schema':
        systemPrompt = `Tu es un expert en création de schémas conceptuels. Crée un schéma textuel qui montre les relations et processus.

FORMAT:
📊 **SCHÉMA: [Titre]**

**1. Vue d'ensemble**
┌─────────────────────────────────────┐
│          Concept Principal          │
└──────────────┬──────────────────────┘
               │
    ┌──────────┴──────────┐
    ▼                     ▼
┌───────┐           ┌───────┐
│ Élém 1│───────────│ Élém 2│
└───────┘           └───────┘

**2. Relations et processus**
[Décris les liens entre éléments]

**3. Points clés**
• ...

RÈGLES:
- Utilise des caractères ASCII pour les boîtes
- Montre les flèches de relation
- Explique chaque connexion`;
        userPrompt = `Crée un schéma conceptuel sur: ${topic}`;
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
