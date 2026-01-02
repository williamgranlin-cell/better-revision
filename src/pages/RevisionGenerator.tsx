import { useState, useRef } from "react";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Network, Shapes, Loader2, Upload, Sparkles, Copy, Check, FileUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import DOMPurify from "dompurify";

type GenerationType = "revision_sheet" | "mind_map" | "schema";

const RevisionGenerator = () => {
  const [generationType, setGenerationType] = useState<GenerationType>("revision_sheet");
  const [topic, setTopic] = useState("");
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { toast } = useToast();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Fichier trop volumineux",
        description: "Le fichier ne doit pas dépasser 5MB",
        variant: "destructive",
      });
      return;
    }

    // Read file content for text files
    if (file.type === "text/plain" || file.name.endsWith(".txt") || file.name.endsWith(".md")) {
      const text = await file.text();
      setContent(text.substring(0, 10000)); // Limit to 10k chars
      setUploadedFile(file);
      toast({
        title: "Fichier importé",
        description: `${file.name} a été chargé`,
      });
    } else {
      // For other file types, we just note the file was uploaded
      setUploadedFile(file);
      toast({
        title: "Fichier sélectionné",
        description: `${file.name} sera utilisé pour la génération`,
      });
    }
  };

  const handleGenerate = async () => {
    if (!topic.trim() || loading) return;

    setLoading(true);
    setResult("");

    try {
      const { data, error } = await supabase.functions.invoke("generate-revision-content", {
        body: { 
          type: generationType,
          topic,
          subject: subject || undefined,
          content: content || undefined
        }
      });

      if (error) throw error;

      if (data.result) {
        setResult(data.result);
      }
    } catch (error: any) {
      console.error("Error generating content:", error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de générer le contenu",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(result);
      setCopied(true);
      toast({
        title: "Copié !",
        description: "Le contenu a été copié dans le presse-papier",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: "Erreur",
        description: "Impossible de copier le contenu",
        variant: "destructive",
      });
    }
  };

  const formatContent = (text: string) => {
    let formatted = text
      .replace(/\*\*(.*?)\*\*/g, '<strong class="text-foreground font-semibold">$1</strong>')
      .replace(/\n/g, '<br/>');
    
    return DOMPurify.sanitize(formatted, {
      ALLOWED_TAGS: ['strong', 'br', 'p', 'div', 'span', 'em', 'code', 'hr'],
      ALLOWED_ATTR: ['class']
    });
  };

  const getTypeInfo = (type: GenerationType) => {
    switch (type) {
      case "revision_sheet":
        return {
          icon: FileText,
          title: "Fiche de révision",
          description: "Une fiche structurée avec les points clés à retenir"
        };
      case "mind_map":
        return {
          icon: Network,
          title: "Carte mentale",
          description: "Une carte mentale textuelle pour visualiser les concepts"
        };
      case "schema":
        return {
          icon: Shapes,
          title: "Schéma conceptuel",
          description: "Un schéma montrant les relations entre les éléments"
        };
    }
  };

  const typeInfo = getTypeInfo(generationType);

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="container max-w-4xl mx-auto p-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Générateur IA</h1>
            <p className="text-sm text-muted-foreground">
              Fiches de révision, cartes mentales et schémas
            </p>
          </div>
        </div>

        {/* Type Selection */}
        <Tabs value={generationType} onValueChange={(v) => setGenerationType(v as GenerationType)} className="mb-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="revision_sheet" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Fiche</span>
            </TabsTrigger>
            <TabsTrigger value="mind_map" className="flex items-center gap-2">
              <Network className="h-4 w-4" />
              <span className="hidden sm:inline">Carte</span>
            </TabsTrigger>
            <TabsTrigger value="schema" className="flex items-center gap-2">
              <Shapes className="h-4 w-4" />
              <span className="hidden sm:inline">Schéma</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Input Form */}
        <Card className="p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <typeInfo.icon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">{typeInfo.title}</h3>
              <p className="text-sm text-muted-foreground">{typeInfo.description}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Sujet / Thème *</label>
              <Input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Ex: La Révolution française, Les dérivées, La photosynthèse..."
                maxLength={200}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Matière (optionnel)</label>
              <Select value={subject} onValueChange={setSubject}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une matière" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Aucune</SelectItem>
                  <SelectItem value="maths">Mathématiques</SelectItem>
                  <SelectItem value="physique">Physique-Chimie</SelectItem>
                  <SelectItem value="svt">SVT</SelectItem>
                  <SelectItem value="francais">Français</SelectItem>
                  <SelectItem value="histoire">Histoire-Géo</SelectItem>
                  <SelectItem value="anglais">Anglais</SelectItem>
                  <SelectItem value="philosophie">Philosophie</SelectItem>
                  <SelectItem value="ses">SES</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Contenu de base (optionnel)</label>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Collez ici votre cours ou vos notes pour une génération plus précise..."
                className="min-h-[120px]"
                maxLength={10000}
              />
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-muted-foreground">
                  {content.length}/10000 caractères
                </span>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".txt,.md,.doc,.docx,.pdf"
                  className="hidden"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2"
                >
                  <FileUp className="h-4 w-4" />
                  Importer un fichier
                </Button>
              </div>
              {uploadedFile && (
                <p className="text-xs text-muted-foreground mt-1">
                  Fichier: {uploadedFile.name}
                </p>
              )}
            </div>

            <Button
              onClick={handleGenerate}
              disabled={!topic.trim() || loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Génération en cours...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Générer
                </>
              )}
            </Button>
          </div>
        </Card>

        {/* Result */}
        {(result || loading) && (
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4 pb-3 border-b">
              <div className="flex items-center gap-2">
                <typeInfo.icon className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">{typeInfo.title} - {topic}</h3>
              </div>
              {result && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopy}
                  className="flex items-center gap-2"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4" />
                      Copié
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copier
                    </>
                  )}
                </Button>
              )}
            </div>
            
            <ScrollArea className="h-[400px]">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
                  <p className="text-muted-foreground">Génération de votre {typeInfo.title.toLowerCase()}...</p>
                </div>
              ) : (
                <div 
                  className="prose prose-sm max-w-none text-foreground font-mono text-sm leading-relaxed whitespace-pre-wrap"
                  dangerouslySetInnerHTML={{
                    __html: formatContent(result)
                  }}
                />
              )}
            </ScrollArea>
          </Card>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default RevisionGenerator;
