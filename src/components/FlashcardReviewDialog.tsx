import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { Flashcard } from "@/hooks/useFlashcards";
import { useFlashcards } from "@/hooks/useFlashcards";

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
  const { getFlashcardsBySet, recordReview } = useFlashcards();
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [loading, setLoading] = useState(true);

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
            className="p-8 min-h-[300px] flex items-center justify-center cursor-pointer gradient-card border-0 shadow-sm hover:shadow-colored transition-smooth"
            onClick={() => setIsFlipped(!isFlipped)}
          >
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
