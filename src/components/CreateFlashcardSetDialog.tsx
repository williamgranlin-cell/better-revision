import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useFlashcardSets } from "@/hooks/useFlashcardSets";
import { useFlashcards } from "@/hooks/useFlashcards";
import { Upload, X, Sparkles, Brain, FileText, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface RevisionItem {
  id: string;
  title: string;
  type: string;
  content: string | null;
  subject: string | null;
}

interface CreateFlashcardSetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  creationMethod: "manual" | "import" | "ai" | "revision_sheet";
}

export const CreateFlashcardSetDialog = ({
  open,
  onOpenChange,
  creationMethod,
}: CreateFlashcardSetDialogProps) => {
  const { addSet } = useFlashcardSets();
  const { addFlashcardBatch } = useFlashcards();
  const { toast } = useToast();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [setName, setSetName] = useState("");
  const [setDescription, setSetDescription] = useState("");
  const [subject, setSubject] = useState("");
  const [count, setCount] = useState(10);
  const [content, setContent] = useState("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [flashcards, setFlashcards] = useState<Array<{ question: string; answer: string }>>([]);
  const [currentCard, setCurrentCard] = useState(0);

  // Revision sheet selection state
  const [revisionItems, setRevisionItems] = useState<RevisionItem[]>([]);
  const [loadingRevisions, setLoadingRevisions] = useState(false);
  const [selectedRevisionId, setSelectedRevisionId] = useState<string | null>(null);

  // Fetch revision sheets when dialog opens with revision_sheet method
  useEffect(() => {
    if (open && creationMethod === "revision_sheet" && user) {
      setLoadingRevisions(true);
      supabase
        .from("revision_content")
        .select("id, title, type, content, subject")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .then(({ data, error }) => {
          if (!error && data) {
            setRevisionItems(data.filter((d: any) => d.content && d.content.trim().length > 0) as RevisionItem[]);
          }
          setLoadingRevisions(false);
        });
    }
  }, [open, creationMethod, user]);

  const handleSelectRevision = (item: RevisionItem) => {
    setSelectedRevisionId(item.id);
    setContent(item.content || "");
    if (!setName) setSetName(item.title);
    if (!subject && item.subject) setSubject(item.subject);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = 20 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({ title: "Fichier trop volumineux", description: "La taille maximale est de 20MB", variant: "destructive" });
      return;
    }

    setUploadedFile(file);
    setIsProcessingFile(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-flashcards`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
          body: formData,
        }
      );

      if (!response.ok) throw new Error("Erreur lors du traitement du fichier");

      const data = await response.json();
      setContent(data.extractedText);
      toast({ title: "Fichier traité", description: "Le texte a été extrait avec succès" });
    } catch (error) {
      console.error("Error processing file:", error);
      toast({ title: "Erreur", description: "Impossible de traiter le fichier", variant: "destructive" });
      setUploadedFile(null);
    } finally {
      setIsProcessingFile(false);
    }
  };

  const handleRemoveFile = () => {
    setUploadedFile(null);
    setContent("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleGenerate = async () => {
    if (creationMethod === "ai") {
      if (!subject.trim()) {
        toast({ title: "Sujet requis", description: "Veuillez entrer un sujet pour générer les flashcards", variant: "destructive" });
        return;
      }
    } else {
      if (!content.trim()) {
        toast({ title: "Contenu requis", description: creationMethod === "revision_sheet" ? "Sélectionnez une fiche de révision" : "Veuillez fournir du contenu", variant: "destructive" });
        return;
      }
    }
    
    setIsGenerating(true);
    try {
      const requestBody = creationMethod === "ai" 
        ? { subject, type: "ai_subject", count }
        : { content, type: creationMethod === "import" ? "text" : "revision_sheet", count };

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-flashcards`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify(requestBody),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erreur lors de la génération");
      }

      const data = await response.json();
      setFlashcards(data.flashcards);
      setCurrentCard(0);
      toast({ title: "Flashcards générées", description: `${data.flashcards.length} flashcards ont été créées` });
    } catch (error) {
      console.error("Error generating flashcards:", error);
      toast({ title: "Erreur", description: error instanceof Error ? error.message : "Impossible de générer les flashcards", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUpdateCard = (field: "question" | "answer", value: string) => {
    const updated = [...flashcards];
    updated[currentCard][field] = value;
    setFlashcards(updated);
  };

  const handleSaveSet = async () => {
    if (!setName.trim() || flashcards.length === 0) return;

    const set = await addSet(setName, setDescription);
    if (set) {
      await addFlashcardBatch(flashcards, subject || undefined, creationMethod, set.id);
      resetForm();
      onOpenChange(false);
    }
  };

  const resetForm = () => {
    setSetName("");
    setSetDescription("");
    setSubject("");
    setContent("");
    setUploadedFile(null);
    setFlashcards([]);
    setCurrentCard(0);
    setCount(10);
    setSelectedRevisionId(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const canGenerate = creationMethod === "ai" 
    ? subject.trim() && setName.trim() 
    : content.trim() && setName.trim();

  const typeLabels: Record<string, string> = {
    revision_sheet: "📝",
    mind_map: "🧠",
    schema: "🖼️",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center gap-2">
            {creationMethod === "ai" && <Brain className="w-5 h-5 text-primary" />}
            {creationMethod === "revision_sheet" && <FileText className="w-5 h-5 text-primary" />}
            {creationMethod === "import" 
              ? "Importer un cours" 
              : creationMethod === "ai" 
              ? "Générer avec l'IA" 
              : "Depuis fiche de révision"}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-80px)] px-6 pb-6">
          {flashcards.length === 0 ? (
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="setName">Nom du lot</Label>
                <Input
                  id="setName"
                  placeholder="Ex: Chapitre 3 - Mathématiques"
                  value={setName}
                  onChange={(e) => setSetName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="setDescription">Description (optionnel)</Label>
                <Input
                  id="setDescription"
                  placeholder="Description du lot de flashcards"
                  value={setDescription}
                  onChange={(e) => setSetDescription(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject">
                  {creationMethod === "ai" ? "Sujet à étudier *" : "Matière (optionnel)"}
                </Label>
                <Input
                  id="subject"
                  placeholder={creationMethod === "ai" 
                    ? "Ex: La Révolution française, Les équations du second degré..."
                    : "Ex: Mathématiques, Physique..."}
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className={creationMethod === "ai" ? "border-primary/50" : ""}
                />
                {creationMethod === "ai" && (
                  <p className="text-xs text-muted-foreground">
                    L'IA générera des flashcards complètes sur ce sujet
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="count">Nombre de flashcards (max 50)</Label>
                <Input
                  id="count"
                  type="number"
                  min="1"
                  max="50"
                  value={count}
                  onChange={(e) => setCount(Math.min(50, Math.max(1, parseInt(e.target.value) || 1)))}
                />
              </div>

              {/* Revision sheet selector */}
              {creationMethod === "revision_sheet" && (
                <div className="space-y-2">
                  <Label>Sélectionner une fiche de révision</Label>
                  {loadingRevisions ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                  ) : revisionItems.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground text-sm border rounded-lg bg-muted/30">
                      <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>Aucune fiche de révision trouvée.</p>
                      <p className="text-xs mt-1">Crée des fiches dans l'onglet "Fiches" d'abord.</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto border rounded-lg p-2 bg-muted/20">
                      {revisionItems.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => handleSelectRevision(item)}
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm transition-colors ${
                            selectedRevisionId === item.id 
                              ? "bg-primary/15 border border-primary/30 text-foreground" 
                              : "hover:bg-muted border border-transparent text-foreground/80"
                          }`}
                        >
                          <span className="text-base shrink-0">{typeLabels[item.type] || "📄"}</span>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{item.title}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {item.subject || "Sans matière"} • {item.content?.substring(0, 60)}...
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* File upload only for import */}
              {creationMethod === "import" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="file">Fichier du cours (PDF, Word, Image)</Label>
                    <div className="flex gap-2">
                      <Input
                        ref={fileInputRef}
                        id="file"
                        type="file"
                        accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.webp"
                        onChange={handleFileUpload}
                        disabled={isProcessingFile}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isProcessingFile || !!uploadedFile}
                        className="flex-1"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        {isProcessingFile ? "Traitement..." : uploadedFile ? "Fichier chargé" : "Choisir un fichier"}
                      </Button>
                      {uploadedFile && (
                        <Button type="button" variant="ghost" size="icon" onClick={handleRemoveFile}>
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    {uploadedFile && (
                      <p className="text-sm text-muted-foreground">
                        {uploadedFile.name} ({(uploadedFile.size / 1024 / 1024).toFixed(2)} MB)
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="content">Texte du cours</Label>
                    <Textarea
                      id="content"
                      placeholder="Le texte sera extrait automatiquement du fichier ou collez-le ici..."
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      rows={10}
                      disabled={isProcessingFile}
                    />
                  </div>
                </>
              )}

              <Button
                onClick={handleGenerate}
                disabled={!canGenerate || isGenerating || isProcessingFile}
                className="w-full bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white"
              >
                {isGenerating ? (
                  <>
                    <div className="w-4 h-4 mr-2 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Génération en cours...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Générer les flashcards
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-4 pt-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">
                  Flashcard {currentCard + 1} sur {flashcards.length}
                </p>
                <div className="flex gap-2 justify-center mb-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentCard(Math.max(0, currentCard - 1))}
                    disabled={currentCard === 0}
                  >
                    Précédent
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentCard(Math.min(flashcards.length - 1, currentCard + 1))}
                    disabled={currentCard === flashcards.length - 1}
                  >
                    Suivant
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Question</Label>
                <Textarea
                  value={flashcards[currentCard]?.question || ""}
                  onChange={(e) => handleUpdateCard("question", e.target.value)}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Réponse</Label>
                <Textarea
                  value={flashcards[currentCard]?.answer || ""}
                  onChange={(e) => handleUpdateCard("answer", e.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setFlashcards([])} className="flex-1">
                  Recommencer
                </Button>
                <Button onClick={handleSaveSet} className="flex-1 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white">
                  Enregistrer le lot
                </Button>
              </div>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};