import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useFlashcardSets } from "@/hooks/useFlashcardSets";
import { useFlashcards } from "@/hooks/useFlashcards";

interface CreateManualFlashcardSetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreateManualFlashcardSetDialog = ({
  open,
  onOpenChange,
}: CreateManualFlashcardSetDialogProps) => {
  const { addSet } = useFlashcardSets();
  const { addFlashcardBatch } = useFlashcards();

  const [setName, setSetName] = useState("");
  const [setDescription, setSetDescription] = useState("");
  const [subject, setSubject] = useState("");
  const [count, setCount] = useState(10);
  const [flashcards, setFlashcards] = useState<Array<{ question: string; answer: string }>>([]);
  const [currentCard, setCurrentCard] = useState(0);

  const handleStartCreation = () => {
    const emptyCards = Array.from({ length: count }, () => ({ question: "", answer: "" }));
    setFlashcards(emptyCards);
    setCurrentCard(0);
  };

  const handleUpdateCard = (field: "question" | "answer", value: string) => {
    const updated = [...flashcards];
    updated[currentCard][field] = value;
    setFlashcards(updated);
  };

  const handleSaveSet = async () => {
    if (!setName.trim() || flashcards.length === 0) return;

    const validFlashcards = flashcards.filter(
      (fc) => fc.question.trim() && fc.answer.trim()
    );

    if (validFlashcards.length === 0) return;

    const set = await addSet(setName, setDescription || undefined);
    if (set) {
      await addFlashcardBatch(validFlashcards, subject || undefined, "manual", set.id);
      resetForm();
      onOpenChange(false);
    }
  };

  const resetForm = () => {
    setSetName("");
    setSetDescription("");
    setSubject("");
    setFlashcards([]);
    setCurrentCard(0);
    setCount(10);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Créer un lot de flashcards manuellement</DialogTitle>
        </DialogHeader>

        {flashcards.length === 0 ? (
          <div className="space-y-4">
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
              <Label htmlFor="subject">Matière (optionnel)</Label>
              <Input
                id="subject"
                placeholder="Ex: Mathématiques, Physique..."
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
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

            <Button
              onClick={handleStartCreation}
              disabled={!setName.trim()}
              className="w-full gradient-primary"
            >
              Commencer la création
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
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
                placeholder="Ex: Quelle est la formule de l'aire d'un cercle ?"
              />
              <p className="text-xs text-muted-foreground">
                Support KaTeX : \frac{"{a}"}{"{b}"} pour fractions, x^2 pour exposants
              </p>
            </div>

            <div className="space-y-2">
              <Label>Réponse</Label>
              <Textarea
                value={flashcards[currentCard]?.answer || ""}
                onChange={(e) => handleUpdateCard("answer", e.target.value)}
                rows={3}
                placeholder="Ex: A = π × r²"
              />
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setFlashcards([])} className="flex-1">
                Recommencer
              </Button>
              <Button onClick={handleSaveSet} className="flex-1 gradient-primary">
                Enregistrer le lot
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
