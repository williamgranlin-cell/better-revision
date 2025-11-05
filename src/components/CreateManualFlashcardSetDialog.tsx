import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";
import { useFlashcardSets } from "@/hooks/useFlashcardSets";
import { useFlashcards } from "@/hooks/useFlashcards";

interface CreateManualFlashcardSetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface FlashcardDraft {
  question: string;
  answer: string;
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
  const [flashcards, setFlashcards] = useState<FlashcardDraft[]>([
    { question: "", answer: "" },
  ]);

  const addFlashcardField = () => {
    if (flashcards.length < 50) {
      setFlashcards([...flashcards, { question: "", answer: "" }]);
    }
  };

  const removeFlashcardField = (index: number) => {
    if (flashcards.length > 1) {
      setFlashcards(flashcards.filter((_, i) => i !== index));
    }
  };

  const updateFlashcard = (index: number, field: "question" | "answer", value: string) => {
    const updated = [...flashcards];
    updated[index][field] = value;
    setFlashcards(updated);
  };

  const handleSave = async () => {
    if (!setName.trim()) return;

    const validFlashcards = flashcards.filter(
      (fc) => fc.question.trim() && fc.answer.trim()
    );

    if (validFlashcards.length === 0) return;

    const set = await addSet(setName, setDescription || undefined);
    if (set) {
      await addFlashcardBatch(
        validFlashcards,
        subject || undefined,
        "manual",
        set.id
      );
      resetForm();
      onOpenChange(false);
    }
  };

  const resetForm = () => {
    setSetName("");
    setSetDescription("");
    setSubject("");
    setFlashcards([{ question: "", answer: "" }]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Créer un lot de flashcards manuellement</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="setName">Nom du lot *</Label>
              <Input
                id="setName"
                placeholder="Ex: Chapitre 3 - Mathématiques"
                value={setName}
                onChange={(e) => setSetName(e.target.value)}
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

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Flashcards ({flashcards.length}/50)</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addFlashcardField}
                disabled={flashcards.length >= 50}
              >
                <Plus className="h-4 w-4 mr-2" />
                Ajouter une carte
              </Button>
            </div>

            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
              {flashcards.map((flashcard, index) => (
                <Card key={index} className="p-4 gradient-card border-0">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-muted-foreground">
                        Carte {index + 1}
                      </span>
                      {flashcards.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFlashcardField(index)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`question-${index}`}>Question</Label>
                      <Textarea
                        id={`question-${index}`}
                        placeholder="Ex: Quelle est la formule de l'aire d'un cercle ?"
                        value={flashcard.question}
                        onChange={(e) =>
                          updateFlashcard(index, "question", e.target.value)
                        }
                        rows={2}
                      />
                      <p className="text-xs text-muted-foreground">
                        Support KaTeX : \frac{"{a}"}{"{b}"} pour fractions, x^2 pour exposants
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`answer-${index}`}>Réponse</Label>
                      <Textarea
                        id={`answer-${index}`}
                        placeholder="Ex: A = π × r²"
                        value={flashcard.answer}
                        onChange={(e) =>
                          updateFlashcard(index, "answer", e.target.value)
                        }
                        rows={2}
                      />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                resetForm();
                onOpenChange(false);
              }}
              className="flex-1"
            >
              Annuler
            </Button>
            <Button
              onClick={handleSave}
              disabled={
                !setName.trim() ||
                !flashcards.some((fc) => fc.question.trim() && fc.answer.trim())
              }
              className="flex-1 gradient-primary"
            >
              Créer le lot
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
