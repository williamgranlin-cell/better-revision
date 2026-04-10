import { useState, useRef } from "react";
import { PageTransition } from "@/components/PageTransition";
import { ScrollToTop } from "@/components/ScrollToTop";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SubjectSelect } from "@/components/SubjectSelect";
import { SchoolLevelSelect } from "@/components/SchoolLevelSelect";
import { FileText, Network, Shapes, Loader2, Sparkles, Copy, Check, FileUp, ImageIcon, Save, Globe, Lock, Trash2, BookOpen, Pencil, Camera, Upload, GraduationCap, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useRevisionContent, RevisionContent } from "@/hooks/useRevisionContent";
import { useAuth } from "@/contexts/AuthContext";
import DOMPurify from "dompurify";
import { cn } from "@/lib/utils";
import { getSubjectLabel } from "@/lib/subjects";

type GenerationType = "revision_sheet" | "mind_map" | "schema";
type ViewMode = "create" | "my_content" | "public";
type CreationMode = "ai" | "manual" | "photo";

const RevisionGenerator = () => {
  const [viewMode, setViewMode] = useState<ViewMode>("create");
  const [generationType, setGenerationType] = useState<GenerationType>("revision_sheet");
  const [creationMode, setCreationMode] = useState<CreationMode>("ai");
  const [topic, setTopic] = useState("");
  const [subject, setSubject] = useState("");
  const [schoolLevel, setSchoolLevel] = useState("");
  const [content, setContent] = useState("");
  const [result, setResult] = useState("");
  const [schemaImage, setSchemaImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedPhoto, setUploadedPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [selectedContent, setSelectedContent] = useState<RevisionContent | null>(null);
  
  // Manual creation state
  const [manualTitle, setManualTitle] = useState("");
  const [manualContent, setManualContent] = useState("");
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  
  const { toast } = useToast();
  const { user } = useAuth();
  const { items, publicItems, loading: loadingContent, saveContent, togglePublic, deleteContent } = useRevisionContent();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Fichier trop volumineux",
        description: "Le fichier ne doit pas dépasser 5MB",
        variant: "destructive",
      });
      return;
    }

    if (file.type === "text/plain" || file.name.endsWith(".txt") || file.name.endsWith(".md")) {
      const text = await file.text();
      setContent(text.substring(0, 10000));
      setUploadedFile(file);
      toast({
        title: "Fichier importé",
        description: `${file.name} a été chargé`,
      });
    } else {
      setUploadedFile(file);
      toast({
        title: "Fichier sélectionné",
        description: `${file.name} sera utilisé pour la génération`,
      });
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "Image trop volumineuse",
        description: "L'image ne doit pas dépasser 10MB",
        variant: "destructive",
      });
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Format invalide",
        description: "Veuillez sélectionner une image",
        variant: "destructive",
      });
      return;
    }

    setUploadedPhoto(file);
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
    
    toast({
      title: "Photo sélectionnée",
      description: `${file.name} sera redessinée au propre`,
    });
  };

  const handleGenerate = async () => {
    if (!topic.trim() || loading) return;

    setLoading(true);
    setResult("");
    setSchemaImage(null);

    try {
      let photoBase64: string | undefined;
      
      if (creationMode === "photo" && uploadedPhoto) {
        const reader = new FileReader();
        photoBase64 = await new Promise((resolve) => {
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(uploadedPhoto);
        });
      }

      const { data, error } = await supabase.functions.invoke("generate-revision-content", {
        body: { 
          type: generationType,
          topic,
          subject: subject || undefined,
          schoolLevel: schoolLevel || undefined,
          content: content || undefined,
          photoBase64: photoBase64,
          redrawPhoto: creationMode === "photo"
        }
      });

      if (error) throw error;

      if (data.result) {
        setResult(data.result);
      }
      
      if (data.imageUrl) {
        setSchemaImage(data.imageUrl);
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

  const handleSaveManual = async () => {
    if (!manualTitle.trim() || !manualContent.trim()) {
      toast({
        title: "Champs requis",
        description: "Veuillez remplir le titre et le contenu",
        variant: "destructive",
      });
      return;
    }

    const saved = await saveContent({
      title: manualTitle,
      type: generationType,
      content: manualContent,
      subject: subject || undefined,
    });

    if (saved) {
      setManualTitle("");
      setManualContent("");
      setViewMode("my_content");
      toast({
        title: "Sauvegardé !",
        description: "Votre fiche a été créée avec succès",
      });
    }
  };

  const handleSave = async () => {
    if (!result && !schemaImage) return;
    
    const saved = await saveContent({
      title: topic,
      type: generationType,
      content: result || undefined,
      image_url: schemaImage || undefined,
      subject: subject || undefined,
    });

    if (saved) {
      setViewMode("my_content");
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

  const handleExportPDF = async (title: string, contentHtml?: string, imageUrl?: string | null) => {
    try {
      toast({ title: "Export en cours...", description: "Préparation du PDF" });
      
      const { default: jsPDF } = await import("jspdf");
      const { default: html2canvas } = await import("html2canvas");
      
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      const usableWidth = pageWidth - margin * 2;
      let yPos = margin;

      // Title
      pdf.setFontSize(18);
      pdf.setFont("helvetica", "bold");
      const titleLines = pdf.splitTextToSize(title, usableWidth);
      pdf.text(titleLines, margin, yPos + 6);
      yPos += titleLines.length * 8 + 6;

      // Separator line
      pdf.setDrawColor(200);
      pdf.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 8;

      // Schema image
      if (imageUrl) {
        try {
          const img = new Image();
          img.crossOrigin = "anonymous";
          await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = reject;
            img.src = imageUrl;
          });
          
          const imgRatio = img.width / img.height;
          const imgWidth = Math.min(usableWidth, 160);
          const imgHeight = imgWidth / imgRatio;
          
          if (yPos + imgHeight > pageHeight - margin) {
            pdf.addPage();
            yPos = margin;
          }
          
          pdf.addImage(img, "PNG", (pageWidth - imgWidth) / 2, yPos, imgWidth, imgHeight);
          yPos += imgHeight + 10;
        } catch {
          console.warn("Could not load schema image for PDF");
        }
      }

      // Text content
      if (contentHtml) {
        // Clean markdown-like content to plain text
        const plainText = contentHtml
          .replace(/\*\*(.*?)\*\*/g, "$1")
          .replace(/<[^>]*>/g, "")
          .replace(/&nbsp;/g, " ");
        
        pdf.setFontSize(10);
        pdf.setFont("helvetica", "normal");
        
        const lines = plainText.split("\n");
        
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) {
            yPos += 3;
            continue;
          }

          // Check if it's a header-like line (starts with emoji or is in caps)
          const isHeader = /^[📚🎯📝🔑📐💡⚠️🧠✅🎨🏷️🔗⚡├└│📌🔹①②③④⑤⑥⑦⑧⑨⑩]/.test(trimmed) || 
                          (trimmed.length < 60 && trimmed === trimmed.toUpperCase() && trimmed.length > 3);
          
          if (isHeader) {
            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(11);
          } else {
            pdf.setFont("helvetica", "normal");
            pdf.setFontSize(10);
          }

          const wrappedLines = pdf.splitTextToSize(trimmed, usableWidth);
          const blockHeight = wrappedLines.length * 4.5;
          
          if (yPos + blockHeight > pageHeight - margin) {
            pdf.addPage();
            yPos = margin;
          }
          
          pdf.text(wrappedLines, margin, yPos);
          yPos += blockHeight + 1;
        }
      }

      pdf.save(`${title.replace(/[^a-zA-Z0-9àâäéèêëïîôùûüÿçœæ\s-]/g, "").substring(0, 50)}.pdf`);
      
      toast({ title: "PDF exporté ! 📄", description: "Le fichier a été téléchargé" });
    } catch (error) {
      console.error("PDF export error:", error);
      toast({
        title: "Erreur d'export",
        description: "Impossible de générer le PDF",
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
          description: "Une fiche structurée avec les points clés à retenir",
          emoji: "📝"
        };
      case "mind_map":
        return {
          icon: Network,
          title: "Carte mentale",
          description: "Une carte mentale textuelle pour visualiser les concepts",
          emoji: "🧠"
        };
      case "schema":
        return {
          icon: Shapes,
          title: "Schéma illustré",
          description: "Un dessin avec des légendes pour visualiser le concept",
          emoji: "🎨"
        };
    }
  };

  const typeInfo = getTypeInfo(generationType);

  const renderContentCard = (item: RevisionContent, isOwner: boolean) => {
    const info = getTypeInfo(item.type);
    return (
      <Card
        key={item.id}
        className={cn(
          "p-4 hover-lift cursor-pointer border-border/50",
          selectedContent?.id === item.id && "ring-2 ring-primary"
        )}
        onClick={() => setSelectedContent(item)}
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <span className="text-lg">{info.emoji}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold truncate">{item.title}</h3>
              {item.is_public ? (
                <Globe className="w-3.5 h-3.5 text-success shrink-0" />
              ) : (
                <Lock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              )}
            </div>
            <p className="text-sm text-muted-foreground">{info.title}</p>
            {item.subject && (
              <span className="text-xs bg-muted px-2 py-0.5 rounded-full mt-1 inline-block">
                {getSubjectLabel(item.subject)}
              </span>
            )}
          </div>
          {isOwner && (
            <div className="flex gap-1 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={(e) => {
                  e.stopPropagation();
                  togglePublic(item.id, !item.is_public);
                }}
              >
                {item.is_public ? (
                  <Lock className="w-4 h-4" />
                ) : (
                  <Globe className="w-4 h-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteContent(item.id);
                  if (selectedContent?.id === item.id) {
                    setSelectedContent(null);
                  }
                }}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="container max-w-4xl md:max-w-5xl lg:max-w-6xl mx-auto p-4 md:p-6">
        {/* Header */}
        <header className="bg-card/95 backdrop-blur-lg -mx-4 md:-mx-6 -mt-4 md:-mt-6 px-4 md:px-6 py-4 mb-6 border-b border-border/50 shadow-sm">
          <div className="flex items-center gap-3 md:gap-4 animate-fade-in">
            <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-primary/10 flex items-center justify-center shadow-lg animate-float">
              <Sparkles className="w-6 h-6 md:w-7 md:h-7 text-primary" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl lg:text-3xl font-display font-bold text-foreground">
                Fiches & Schémas ✨
              </h1>
              <p className="text-sm md:text-base text-muted-foreground">
                Crée, sauvegarde et partage tes révisions !
              </p>
            </div>
          </div>
        </header>

        {/* View Mode Tabs */}
        <Tabs value={viewMode} onValueChange={(v) => { setViewMode(v as ViewMode); setSelectedContent(null); }} className="mb-6 animate-fade-in stagger-1">
          <TabsList className="grid w-full grid-cols-3 p-1 bg-muted/50 rounded-2xl">
            <TabsTrigger value="create" className="flex items-center gap-2 rounded-xl data-[state=active]:bg-card data-[state=active]:shadow-md transition-all duration-300">
              <Sparkles className="h-4 w-4" />
              <span className="hidden sm:inline">Créer</span>
            </TabsTrigger>
            <TabsTrigger value="my_content" className="flex items-center gap-2 rounded-xl data-[state=active]:bg-card data-[state=active]:shadow-md transition-all duration-300">
              <BookOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Mes fiches</span>
              {items.length > 0 && (
                <span className="text-xs bg-primary/20 text-primary px-1.5 rounded-full">{items.length}</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="public" className="flex items-center gap-2 rounded-xl data-[state=active]:bg-card data-[state=active]:shadow-md transition-all duration-300">
              <Globe className="h-4 w-4" />
              <span className="hidden sm:inline">Publiques</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Create Mode */}
        {viewMode === "create" && (
          <>
            {/* Type Selection */}
            <Tabs value={generationType} onValueChange={(v) => { setGenerationType(v as GenerationType); setResult(""); setSchemaImage(null); }} className="mb-4 animate-fade-in stagger-2">
              <TabsList className="grid w-full grid-cols-3 p-1 bg-muted/50 rounded-2xl">
                <TabsTrigger value="revision_sheet" className="flex items-center gap-2 rounded-xl data-[state=active]:bg-card data-[state=active]:shadow-md transition-all duration-300">
                  <FileText className="h-4 w-4" />
                  <span className="hidden sm:inline">Fiche</span>
                  <span className="sm:hidden">📝</span>
                </TabsTrigger>
                <TabsTrigger value="mind_map" className="flex items-center gap-2 rounded-xl data-[state=active]:bg-card data-[state=active]:shadow-md transition-all duration-300">
                  <Network className="h-4 w-4" />
                  <span className="hidden sm:inline">Carte</span>
                  <span className="sm:hidden">🧠</span>
                </TabsTrigger>
                <TabsTrigger value="schema" className="flex items-center gap-2 rounded-xl data-[state=active]:bg-card data-[state=active]:shadow-md transition-all duration-300">
                  <ImageIcon className="h-4 w-4" />
                  <span className="hidden sm:inline">Schéma</span>
                  <span className="sm:hidden">🎨</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Creation Mode Selection */}
            <div className="grid grid-cols-3 gap-3 mb-6 animate-fade-in stagger-3">
              <Card
                className={cn(
                  "p-4 cursor-pointer transition-all duration-300 hover-lift border-2",
                  creationMode === "ai" ? "border-primary bg-primary/5" : "border-transparent"
                )}
                onClick={() => setCreationMode("ai")}
              >
                <div className="flex flex-col items-center text-center gap-2">
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center",
                    creationMode === "ai" ? "bg-primary/20" : "bg-muted"
                  )}>
                    <Sparkles className={cn("w-6 h-6", creationMode === "ai" ? "text-primary" : "text-muted-foreground")} />
                  </div>
                  <span className="text-sm font-medium">IA</span>
                </div>
              </Card>
              
              <Card
                className={cn(
                  "p-4 cursor-pointer transition-all duration-300 hover-lift border-2",
                  creationMode === "manual" ? "border-secondary bg-secondary/5" : "border-transparent"
                )}
                onClick={() => setCreationMode("manual")}
              >
                <div className="flex flex-col items-center text-center gap-2">
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center",
                    creationMode === "manual" ? "bg-secondary/20" : "bg-muted"
                  )}>
                    <Pencil className={cn("w-6 h-6", creationMode === "manual" ? "text-secondary" : "text-muted-foreground")} />
                  </div>
                  <span className="text-sm font-medium">Manuel</span>
                </div>
              </Card>

              {generationType === "schema" && (
                <Card
                  className={cn(
                    "p-4 cursor-pointer transition-all duration-300 hover-lift border-2",
                    creationMode === "photo" ? "border-accent bg-accent/5" : "border-transparent"
                  )}
                  onClick={() => setCreationMode("photo")}
                >
                  <div className="flex flex-col items-center text-center gap-2">
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center",
                      creationMode === "photo" ? "bg-accent/20" : "bg-muted"
                    )}>
                      <Camera className={cn("w-6 h-6", creationMode === "photo" ? "text-accent" : "text-muted-foreground")} />
                    </div>
                    <span className="text-sm font-medium">Photo</span>
                  </div>
                </Card>
              )}
              
              {generationType !== "schema" && (
                <Card className="p-4 opacity-50 cursor-not-allowed border-2 border-transparent">
                  <div className="flex flex-col items-center text-center gap-2">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-muted">
                      <Camera className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <span className="text-sm font-medium text-muted-foreground">Photo</span>
                  </div>
                </Card>
              )}
            </div>

            {/* Manual Creation Form */}
            {creationMode === "manual" && (
              <Card className="p-6 mb-6 animate-fade-in hover-lift border-border/50">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-secondary/10 to-accent/10 flex items-center justify-center">
                    <Pencil className="w-6 h-6 text-secondary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">Création manuelle</h3>
                    <p className="text-sm text-muted-foreground">Rédigez votre propre {typeInfo.title.toLowerCase()}</p>
                  </div>
                  <span className="text-2xl">✍️</span>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Titre *</label>
                    <Input
                      value={manualTitle}
                      onChange={(e) => setManualTitle(e.target.value)}
                      placeholder="Ex: Les guerres mondiales, Le système digestif..."
                      maxLength={200}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Matière (optionnel)</label>
                    <SubjectSelect
                      value={subject}
                      onValueChange={setSubject}
                      allLabel="Aucune"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Niveau scolaire (optionnel)</label>
                    <SchoolLevelSelect
                      value={schoolLevel}
                      onValueChange={setSchoolLevel}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Contenu *</label>
                    <Textarea
                      value={manualContent}
                      onChange={(e) => setManualContent(e.target.value)}
                      placeholder="Rédigez le contenu de votre fiche ici..."
                      className="min-h-[200px]"
                      maxLength={20000}
                    />
                    <span className="text-xs text-muted-foreground">
                      {manualContent.length}/20000 caractères
                    </span>
                  </div>

                  <Button
                    onClick={handleSaveManual}
                    disabled={!manualTitle.trim() || !manualContent.trim()}
                    className="w-full btn-friendly text-base py-6 rounded-xl font-semibold"
                  >
                    <Save className="w-5 h-5 mr-2" />
                    Sauvegarder ma fiche 💾
                  </Button>
                </div>
              </Card>
            )}

            {/* Photo to Schema Form */}
            {creationMode === "photo" && generationType === "schema" && (
              <Card className="p-6 mb-6 animate-fade-in hover-lift border-border/50">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent/10 to-primary/10 flex items-center justify-center">
                    <Camera className="w-6 h-6 text-accent" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">Redessiner depuis une photo</h3>
                    <p className="text-sm text-muted-foreground">L'IA va redessiner proprement votre schéma</p>
                  </div>
                  <span className="text-2xl">📸</span>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Titre du schéma *</label>
                    <Input
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      placeholder="Ex: Le cœur humain, La cellule..."
                      maxLength={200}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Photo du schéma *</label>
                    <input
                      type="file"
                      ref={photoInputRef}
                      onChange={handlePhotoUpload}
                      accept="image/*"
                      className="hidden"
                    />
                    
                    {photoPreview ? (
                      <div className="relative">
                        <img 
                          src={photoPreview} 
                          alt="Aperçu" 
                          className="w-full max-h-64 object-contain rounded-xl border border-border"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          className="absolute top-2 right-2"
                          onClick={() => {
                            setUploadedPhoto(null);
                            setPhotoPreview(null);
                          }}
                        >
                          Changer
                        </Button>
                      </div>
                    ) : (
                      <div
                        onClick={() => photoInputRef.current?.click()}
                        className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                      >
                        <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                        <p className="text-muted-foreground">
                          Cliquez pour importer votre photo de schéma
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          JPG, PNG, WEBP (max 10MB)
                        </p>
                      </div>
                    )}
                  </div>

                  <Button
                    onClick={handleGenerate}
                    disabled={!topic.trim() || !uploadedPhoto || loading}
                    className="w-full btn-friendly text-base py-6 rounded-xl font-semibold"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Redessinage en cours... 🎨
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5 mr-2" />
                        Redessiner au propre ✨
                      </>
                    )}
                  </Button>
                </div>
              </Card>
            )}

            {/* AI Generation Form */}
            {creationMode === "ai" && (
              <Card className="p-6 mb-6 animate-fade-in hover-lift border-border/50">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
                    <typeInfo.icon className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{typeInfo.title}</h3>
                    <p className="text-sm text-muted-foreground">{typeInfo.description}</p>
                  </div>
                  <span className="text-2xl animate-bounce-soft">{typeInfo.emoji}</span>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Sujet / Thème *</label>
                    <Input
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      placeholder={generationType === "schema" ? "Ex: Le cœur humain, La cellule, Le cycle de l'eau..." : "Ex: La Révolution française, Les dérivées, La photosynthèse..."}
                      maxLength={200}
                    />
                    {generationType === "schema" && (
                      <p className="text-xs text-muted-foreground mt-1">
                        💡 Une image sera générée avec des légendes explicatives
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Matière (optionnel)</label>
                    <SubjectSelect
                      value={subject}
                      onValueChange={setSubject}
                      allLabel="Aucune"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Niveau scolaire (optionnel)</label>
                    <SchoolLevelSelect
                      value={schoolLevel}
                      onValueChange={setSchoolLevel}
                    />
                  </div>

                  {generationType !== "schema" && (
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
                  )}

                  <Button
                    onClick={handleGenerate}
                    disabled={!topic.trim() || loading}
                    className="w-full btn-friendly text-base py-6 rounded-xl font-semibold"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        {generationType === "schema" ? "Création de l'image... 🎨" : "La magie opère... ✨"}
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5 mr-2" />
                        {generationType === "schema" ? "Générer mon schéma 🎨" : `Générer ma ${generationType === "revision_sheet" ? "fiche" : "carte"} 🚀`}
                      </>
                    )}
                  </Button>
                </div>
              </Card>
            )}

            {/* Result */}
            {(result || schemaImage || loading) && (
              <Card className="p-6 animate-fade-in hover-lift border-border/50">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-border/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
                      <typeInfo.icon className="w-5 h-5 text-success" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{typeInfo.title}</h3>
                      <p className="text-sm text-muted-foreground">{topic}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {result && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCopy}
                        className="flex items-center gap-2 hover-scale"
                      >
                        {copied ? (
                          <>
                            <Check className="h-4 w-4 text-success" />
                            Copié !
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4" />
                            Copier
                          </>
                        )}
                      </Button>
                    )}
                    {(result || schemaImage) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleExportPDF(topic, result || undefined, schemaImage)}
                        className="flex items-center gap-2 hover-scale"
                      >
                        <Download className="h-4 w-4" />
                        PDF
                      </Button>
                    )}
                    {(result || schemaImage) && user && (
                      <Button
                        size="sm"
                        onClick={handleSave}
                        className="flex items-center gap-2 btn-friendly"
                      >
                        <Save className="h-4 w-4" />
                        Sauvegarder
                      </Button>
                    )}
                  </div>
                </div>
                
                <ScrollArea className="h-[500px]">
                  {loading ? (
                    <div className="flex flex-col items-center justify-center py-16">
                      <div className="relative">
                        <Loader2 className="w-16 h-16 text-primary animate-spin" />
                        <span className="absolute inset-0 flex items-center justify-center text-2xl animate-pulse-soft">
                          {generationType === "schema" ? "🎨" : "🧠"}
                        </span>
                      </div>
                      <p className="text-muted-foreground mt-6 text-center">
                        {generationType === "schema" ? (
                          <>
                            L'IA dessine ton schéma...
                            <br />
                            <span className="text-sm">Ça peut prendre quelques secondes ! 🖌️</span>
                          </>
                        ) : (
                          <>
                            L'IA réfléchit à ta {typeInfo.title.toLowerCase()}...
                            <br />
                            <span className="text-sm">Ça arrive dans quelques secondes ! ⏳</span>
                          </>
                        )}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {schemaImage && (
                        <div className="flex flex-col items-center gap-4">
                          <div className="relative w-full max-w-lg mx-auto rounded-xl overflow-hidden shadow-lg border border-border">
                            <img 
                              src={schemaImage} 
                              alt={`Schéma: ${topic}`}
                              className="w-full h-auto"
                            />
                          </div>
                          <p className="text-sm text-muted-foreground text-center">
                            🎨 Schéma généré par IA • Clic droit pour sauvegarder
                          </p>
                        </div>
                      )}
                      
                      {result && (
                        <div 
                          className="prose prose-sm max-w-none text-foreground font-mono text-sm leading-relaxed whitespace-pre-wrap"
                          dangerouslySetInnerHTML={{
                            __html: formatContent(result)
                          }}
                        />
                      )}
                    </div>
                  )}
                </ScrollArea>
              </Card>
            )}
          </>
        )}

        {/* My Content Mode */}
        {viewMode === "my_content" && (
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                Mes fiches ({items.length})
              </h3>
              {loadingContent ? (
                <div className="text-center py-8 text-muted-foreground">Chargement...</div>
              ) : items.length === 0 ? (
                <Card className="p-8 text-center border-dashed">
                  <div className="text-4xl mb-3">📚</div>
                  <p className="text-muted-foreground">Aucune fiche sauvegardée</p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => setViewMode("create")}
                  >
                    Créer ma première fiche
                  </Button>
                </Card>
              ) : (
                <ScrollArea className="h-[500px] pr-2">
                  <div className="space-y-3">
                    {items.map((item) => renderContentCard(item, true))}
                  </div>
                </ScrollArea>
              )}
            </div>

            {/* Selected Content Preview */}
            <div className="space-y-3">
              <h3 className="font-semibold text-lg">Aperçu</h3>
              {selectedContent ? (
                <Card className="p-4 border-border/50">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{getTypeInfo(selectedContent.type).emoji}</span>
                      <div>
                        <h4 className="font-semibold">{selectedContent.title}</h4>
                        <p className="text-xs text-muted-foreground">
                          {new Date(selectedContent.created_at).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleExportPDF(selectedContent.title, selectedContent.content || undefined, selectedContent.image_url)}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      PDF
                    </Button>
                  </div>
                  <ScrollArea className="h-[400px]">
                    {selectedContent.image_url && (
                      <img 
                        src={selectedContent.image_url} 
                        alt={selectedContent.title}
                        className="w-full rounded-lg mb-4"
                      />
                    )}
                    {selectedContent.content && (
                      <div 
                        className="prose prose-sm max-w-none text-foreground text-sm whitespace-pre-wrap"
                        dangerouslySetInnerHTML={{
                          __html: formatContent(selectedContent.content)
                        }}
                      />
                    )}
                  </ScrollArea>
                </Card>
              ) : (
                <Card className="p-8 text-center border-dashed border-border/50">
                  <p className="text-muted-foreground">Sélectionnez une fiche pour la visualiser</p>
                </Card>
              )}
            </div>
          </div>
        )}

        {/* Public Content Mode */}
        {viewMode === "public" && (
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <Globe className="w-5 h-5" />
                Fiches publiques ({publicItems.length})
              </h3>
              {publicItems.length === 0 ? (
                <Card className="p-8 text-center border-dashed">
                  <div className="text-4xl mb-3">🌍</div>
                  <p className="text-muted-foreground">Aucune fiche publique pour le moment</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Soyez le premier à partager vos révisions !
                  </p>
                </Card>
              ) : (
                <ScrollArea className="h-[500px] pr-2">
                  <div className="space-y-3">
                    {publicItems.map((item) => renderContentCard(item, user?.id === item.user_id))}
                  </div>
                </ScrollArea>
              )}
            </div>

            {/* Selected Content Preview */}
            <div className="space-y-3">
              <h3 className="font-semibold text-lg">Aperçu</h3>
              {selectedContent ? (
                <Card className="p-4 border-border/50">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{getTypeInfo(selectedContent.type).emoji}</span>
                      <div>
                        <h4 className="font-semibold">{selectedContent.title}</h4>
                        <p className="text-xs text-muted-foreground">
                          {new Date(selectedContent.created_at).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleExportPDF(selectedContent.title, selectedContent.content || undefined, selectedContent.image_url)}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      PDF
                    </Button>
                  </div>
                  <ScrollArea className="h-[400px]">
                    {selectedContent.image_url && (
                      <img 
                        src={selectedContent.image_url} 
                        alt={selectedContent.title}
                        className="w-full rounded-lg mb-4"
                      />
                    )}
                    {selectedContent.content && (
                      <div 
                        className="prose prose-sm max-w-none text-foreground text-sm whitespace-pre-wrap"
                        dangerouslySetInnerHTML={{
                          __html: formatContent(selectedContent.content)
                        }}
                      />
                    )}
                  </ScrollArea>
                </Card>
              ) : (
                <Card className="p-8 text-center border-dashed border-border/50">
                  <p className="text-muted-foreground">Sélectionnez une fiche pour la visualiser</p>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default RevisionGenerator;
