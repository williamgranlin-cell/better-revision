import { useState } from "react";
import { BottomNav } from "@/components/BottomNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileUp, Brain, FileText, BookOpen, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useFlashcards } from "@/hooks/useFlashcards";
const Flashcards = () => {
  const {
    addFlashcard
  } = useFlashcards();
  const [isManualDialogOpen, setIsManualDialogOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [subject, setSubject] = useState("");
  const handleManualCreate = async () => {
    if (!question || !answer) return;
    await addFlashcard(question, answer, subject || undefined, "manual");
    setQuestion("");
    setAnswer("");
    setSubject("");
    setIsManualDialogOpen(false);
  };
  return <div className="min-h-screen pb-24 bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      

      <main className="max-w-screen-xl mx-auto px-4 py-6">
        <Tabs defaultValue="create" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="create">Créer</TabsTrigger>
            <TabsTrigger value="review">Réviser</TabsTrigger>
          </TabsList>

          <TabsContent value="create" className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              {/* Manual Creation */}
              <Card className="p-6 gradient-card border-0 shadow-sm hover:shadow-colored cursor-pointer transition-smooth group" onClick={() => setIsManualDialogOpen(true)}>
                <div className="flex flex-col items-center text-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-smooth">
                    <Plus className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Création manuelle</h3>
                    <p className="text-sm text-muted-foreground">
                      Crée tes flashcards avec support des formules mathématiques (KaTeX)
                    </p>
                  </div>
                </div>
              </Card>

              {/* Import Course */}
              <Card className="p-6 gradient-card border-0 shadow-sm hover:shadow-colored cursor-pointer transition-smooth group opacity-60">
                <div className="flex flex-col items-center text-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-secondary/10 flex items-center justify-center group-hover:bg-secondary/20 transition-smooth">
                    <FileUp className="w-8 h-8 text-secondary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Import de cours</h3>
                    <p className="text-sm text-muted-foreground">
                      Importe un fichier PDF ou DOCX de ton cours
                    </p>
                    <p className="text-xs text-warning mt-2">Bientôt disponible</p>
                  </div>
                </div>
              </Card>

              {/* AI Generation */}
              <Card className="p-6 gradient-card border-0 shadow-sm hover:shadow-colored cursor-pointer transition-smooth group opacity-60">
                <div className="flex flex-col items-center text-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 transition-smooth">
                    <Brain className="w-8 h-8 text-accent" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Génération IA</h3>
                    <p className="text-sm text-muted-foreground">
                      L'IA crée automatiquement des flashcards depuis ton texte de cours
                    </p>
                    <p className="text-xs text-warning mt-2">Bientôt disponible</p>
                  </div>
                </div>
              </Card>

              {/* From Revision Sheet */}
              <Card className="p-6 gradient-card border-0 shadow-sm hover:shadow-colored cursor-pointer transition-smooth group opacity-60">
                <div className="flex flex-col items-center text-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-success/10 flex items-center justify-center group-hover:bg-success/20 transition-smooth">
                    <FileText className="w-8 h-8 text-success" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Depuis fiche de révision</h3>
                    <p className="text-sm text-muted-foreground">
                      Utilise une fiche de révision existante pour créer tes flashcards
                    </p>
                    <p className="text-xs text-warning mt-2">Bientôt disponible</p>
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="review">
            <Card className="p-12 text-center gradient-card border-0">
              <BookOpen className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">Aucune flashcard à réviser</h3>
              <p className="text-muted-foreground mb-6">
                Commence par créer tes premières flashcards !
              </p>
              <Button onClick={() => setIsManualDialogOpen(true)} className="gradient-primary">
                Créer ma première flashcard
              </Button>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Manual Creation Dialog */}
      <Dialog open={isManualDialogOpen} onOpenChange={setIsManualDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Créer une flashcard manuellement</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="subject">Matière (optionnel)</Label>
              <Input id="subject" placeholder="Ex: Mathématiques, Physique..." value={subject} onChange={e => setSubject(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="question">Question</Label>
              <Textarea id="question" placeholder="Ex: Quelle est la formule de l'aire d'un cercle ?" value={question} onChange={e => setQuestion(e.target.value)} rows={3} />
              <p className="text-xs text-muted-foreground">
                Support KaTeX : utilisez \frac{"{a}"}{"{b}"} pour les fractions, x^2 pour les exposants
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="answer">Réponse</Label>
              <Textarea id="answer" placeholder="Ex: A = π × r²" value={answer} onChange={e => setAnswer(e.target.value)} rows={3} />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsManualDialogOpen(false)} className="flex-1">
                Annuler
              </Button>
              <Button onClick={handleManualCreate} disabled={!question || !answer} className="flex-1 gradient-primary">
                Créer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>;
};
export default Flashcards;