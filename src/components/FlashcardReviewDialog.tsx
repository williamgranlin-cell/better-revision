import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, RotateCcw, RefreshCw, Loader2 } from "lucide-react";
import { Flashcard } from "@/hooks/useFlashcards";
import { useFlashcards } from "@/hooks/useFlashcards";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface FlashcardReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  setId: string;
  setName: string;
}

export const FlashcardReviewDialog = ({
  open,
  onOpenChange,
  setId,
  setName,
}: FlashcardReviewDialogProps) => {
  const { getFlashcardsBySet, recordReview, updateFlashcard } = useFlashcards();
  const { toast } = useToast();
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => {
    if (open) {
      loadCards();
    }
  }, [open, setId]);

  const loadCards = async () => {
    setLoading(true);
    const flashcards = await getFlashcardsBySet(setId);
    setCards(flashcards);
    setCurrentIndex(0);
    setIsFlipped(false);
    setLoading(false);
  };

  const handleNext = () => {
    if (currentIndex < cards.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsFlipped(false);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setIsFlipped(false);
    }
  };

  const handleAnswer = async (isCorrect: boolean) => {
    if (cards[currentIndex]) {
      await recordReview(cards[currentIndex].id, isCorrect);
      handleNext();
    }
  };

  const handleRegenerate = async () => {
    const currentCard = cards[currentIndex];
    if (!currentCard) return;

    setRegenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-flashcards', {
        body: {
          regenerateSingle: true,
          question: currentCard.question,
          subject: currentCard.subject || setName,
        }
      });

      if (error) throw error;

      if (data.flashcard) {
        // Update the flashcard in the database
        await updateFlashcard(currentCard.id, {
          question: data.flashcard.question,
          answer: data.flashcard.answer,
        });

        // Update local state
        const updatedCards = [...cards];
        updatedCards[currentIndex] = {
          ...currentCard,
          question: data.flashcard.question,
          answer: data.flashcard.answer,
        };
        setCards(updatedCards);
        setIsFlipped(false);

        toast({
          title: "Flashcard régénérée",
          description: "La flashcard a été mise à jour avec succès",
        });
      }
    } catch (error) {
      console.error("Error regenerating flashcard:", error);
      toast({
        title: "Erreur",
        description: "Impossible de régénérer la flashcard",
        variant: "destructive",
      });
    } finally {
      setRegenerating(false);
    }
  };

  const currentCard = cards[currentIndex];

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <p className="text-center">Chargement...</p>
        </DialogContent>
      </Dialog>
    );
  }

  if (cards.length === 0) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{setName}</DialogTitle>
          </DialogHeader>
          <p className="text-center text-muted-foreground">
            Aucune flashcard dans ce lot
          </p>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{setName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-center text-sm text-muted-foreground">
            {currentIndex + 1} / {cards.length}
          </div>

          <Card
            className="p-8 min-h-[300px] flex items-center justify-center cursor-pointer gradient-card border-0 shadow-sm hover:shadow-colored transition-smooth relative"
            onClick={() => setIsFlipped(!isFlipped)}
          >
            {/* Regenerate button */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 opacity-60 hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation();
                handleRegenerate();
              }}
              disabled={regenerating}
              title="Régénérer cette flashcard"
            >
              {regenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>

            <div className="text-center">
              {!isFlipped ? (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Question</p>
                  <p className="text-lg">{currentCard?.question}</p>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Réponse</p>
                  <p className="text-lg">{currentCard?.answer}</p>
                </div>
              )}
            </div>
          </Card>

          <div className="flex gap-2 justify-center">
            <Button
              variant="outline"
              size="icon"
              onClick={handlePrevious}
              disabled={currentIndex === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setIsFlipped(!isFlipped)}
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleNext}
              disabled={currentIndex === cards.length - 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {isFlipped && (
            <div className="flex gap-2 justify-center">
              <Button
                variant="destructive"
                onClick={() => handleAnswer(false)}
                className="flex-1"
              >
                Incorrect
              </Button>
              <Button
                onClick={() => handleAnswer(true)}
                className="flex-1 gradient-primary"
              >
                Correct
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};