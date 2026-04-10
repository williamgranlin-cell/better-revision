import { useState, useEffect, useCallback, useRef } from "react";
import { PageTransition } from "@/components/PageTransition";
import { BottomNav } from "@/components/BottomNav";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileUp, Brain, FileText, Plus, Trash2, BookOpen, Zap, Trophy, Flame, Infinity, CheckCircle2, XCircle, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { useFlashcardSets } from "@/hooks/useFlashcardSets";
import { useFlashcards, Flashcard } from "@/hooks/useFlashcards";
import { CreateFlashcardSetDialog } from "@/components/CreateFlashcardSetDialog";
import { FlashcardReviewDialog } from "@/components/FlashcardReviewDialog";
import { CreateManualFlashcardSetDialog } from "@/components/CreateManualFlashcardSetDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

interface QuizQuestion {
  flashcard: Flashcard;
  options: string[];
  correctIndex: number;
}

const Flashcards = () => {
  const { sets, deleteSet } = useFlashcardSets();
  const { flashcards, recordReview } = useFlashcards();
  
  const [isManualDialogOpen, setIsManualDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isAIDialogOpen, setIsAIDialogOpen] = useState(false);
  const [isRevisionDialogOpen, setIsRevisionDialogOpen] = useState(false);
  const [reviewSetId, setReviewSetId] = useState<string | null>(null);
  const [reviewSetName, setReviewSetName] = useState("");

  // Quiz state
  const [selectedSetId, setSelectedSetId] = useState<string>("all");
  const [currentQuestion, setCurrentQuestion] = useState<QuizQuestion | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [totalAnswered, setTotalAnswered] = useState(0);
  const [quizStarted, setQuizStarted] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const usedFlashcardIds = useRef<Set<string>>(new Set());

  const handleReviewSet = (setId: string, name: string) => {
    setReviewSetId(setId);
    setReviewSetName(name);
  };

  const getFilteredCards = useCallback(() => {
    if (selectedSetId === "all") return flashcards;
    return flashcards.filter((f) => f.set_id === selectedSetId);
  }, [flashcards, selectedSetId]);

  const generateNextQuestion = useCallback(async () => {
    const filteredCards = getFilteredCards();
    if (filteredCards.length === 0) return;

    setIsGenerating(true);

    let availableCards = filteredCards.filter(c => !usedFlashcardIds.current.has(c.id));
    if (availableCards.length === 0) {
      usedFlashcardIds.current.clear();
      availableCards = filteredCards;
    }

    const randomIndex = Math.floor(Math.random() * availableCards.length);
    const flashcard = availableCards[randomIndex];
    usedFlashcardIds.current.add(flashcard.id);

    // Get wrong answers from other flashcards
    const otherAnswers = filteredCards
      .filter((c) => c.id !== flashcard.id)
      .map((c) => c.answer)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);

    while (otherAnswers.length < 3) {
      otherAnswers.push(`Option ${otherAnswers.length + 1}`);
    }

    const correctIndex = Math.floor(Math.random() * 4);
    const options = [...otherAnswers];
    options.splice(correctIndex, 0, flashcard.answer);

    setCurrentQuestion({ flashcard, options: options.slice(0, 4), correctIndex });
    setIsGenerating(false);
  }, [getFilteredCards]);

  const startQuiz = async () => {
    usedFlashcardIds.current.clear();
    setScore(0);
    setStreak(0);
    setTotalAnswered(0);
    setQuizStarted(true);
    await generateNextQuestion();
  };

  const resetQuiz = () => {
    setCurrentQuestion(null);
    setSelectedAnswer(null);
    setIsAnswered(false);
    setScore(0);
    setStreak(0);
    setTotalAnswered(0);
    setQuizStarted(false);
    usedFlashcardIds.current.clear();
  };

  const handleAnswer = async (index: number) => {
    if (isAnswered || !currentQuestion) return;
    setSelectedAnswer(index);
    setIsAnswered(true);
    const isCorrect = index === currentQuestion.correctIndex;
    if (isCorrect) {
      setScore((s) => s + 1);
      setStreak((s) => {
        const newStreak = s + 1;
        if (newStreak > bestStreak) setBestStreak(newStreak);
        return newStreak;
      });
    } else {
      setStreak(0);
    }
    setTotalAnswered((t) => t + 1);
    await recordReview(currentQuestion.flashcard.id, isCorrect);
  };

  const nextQuestion = async () => {
    setSelectedAnswer(null);
    setIsAnswered(false);
    await generateNextQuestion();
  };

  const availableCards = getFilteredCards();
  const accuracy = totalAnswered > 0 ? Math.round((score / totalAnswered) * 100) : 0;

  return (
    <div className="min-h-screen pb-24 bg-background">
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-lg border-b border-border/50 shadow-sm">
        <div className="max-w-screen-xl mx-auto px-4 md:px-6 py-4">
          <h1 className="text-xl md:text-2xl lg:text-3xl font-display font-bold bg-gradient-primary bg-clip-text text-transparent">
            Flashcards 🃏
          </h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1">
            Crée et révise tes cartes mémoire
          </p>
        </div>
      </header>
      <main className="max-w-screen-xl mx-auto px-4 md:px-6 py-4 md:py-6">
        <Tabs defaultValue="create" className="space-y-4 md:space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="create">Créer</TabsTrigger>
            <TabsTrigger value="review">Réviser</TabsTrigger>
            <TabsTrigger value="quiz" className="flex items-center gap-1">
              <Zap className="h-4 w-4" />
              <span className="hidden sm:inline">Quiz</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="create" className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              <Card className="p-4 md:p-6 gradient-card border-0 shadow-sm hover:shadow-colored cursor-pointer transition-smooth group" onClick={() => setIsManualDialogOpen(true)}>
                <div className="flex flex-col items-center text-center gap-3 md:gap-4">
                  <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-smooth">
                    <Plus className="w-6 h-6 md:w-8 md:h-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-display font-semibold text-sm md:text-lg mb-1 md:mb-2">Création manuelle</h3>
                    <p className="text-xs md:text-sm text-muted-foreground hidden sm:block">Crée un lot de flashcards manuellement (max 50)</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4 md:p-6 gradient-card border-0 shadow-sm hover:shadow-colored cursor-pointer transition-smooth group" onClick={() => setIsImportDialogOpen(true)}>
                <div className="flex flex-col items-center text-center gap-3 md:gap-4">
                  <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-secondary/10 flex items-center justify-center group-hover:bg-secondary/20 transition-smooth">
                    <FileUp className="w-6 h-6 md:w-8 md:h-8 text-secondary" />
                  </div>
                  <div>
                    <h3 className="font-display font-semibold text-sm md:text-lg mb-1 md:mb-2">Import de cours</h3>
                    <p className="text-xs md:text-sm text-muted-foreground hidden sm:block">Importe un fichier PDF, Word ou image</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4 md:p-6 gradient-card border-0 shadow-sm hover:shadow-colored cursor-pointer transition-smooth group" onClick={() => setIsAIDialogOpen(true)}>
                <div className="flex flex-col items-center text-center gap-3 md:gap-4">
                  <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 transition-smooth">
                    <Brain className="w-6 h-6 md:w-8 md:h-8 text-accent" />
                  </div>
                  <div>
                    <h3 className="font-display font-semibold text-sm md:text-lg mb-1 md:mb-2">Génération IA</h3>
                    <p className="text-xs md:text-sm text-muted-foreground hidden sm:block">L'IA crée automatiquement des flashcards</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4 md:p-6 gradient-card border-0 shadow-sm hover:shadow-colored cursor-pointer transition-smooth group" onClick={() => setIsRevisionDialogOpen(true)}>
                <div className="flex flex-col items-center text-center gap-3 md:gap-4">
                  <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-success/10 flex items-center justify-center group-hover:bg-success/20 transition-smooth">
                    <FileText className="w-6 h-6 md:w-8 md:h-8 text-success" />
                  </div>
                  <div>
                    <h3 className="font-display font-semibold text-sm md:text-lg mb-1 md:mb-2">Depuis fiche</h3>
                    <p className="text-xs md:text-sm text-muted-foreground hidden sm:block">Utilise une fiche existante</p>
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="review">
            {sets.length === 0 ? (
              <Card className="p-12 text-center gradient-card border-0">
                <BookOpen className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-display font-semibold mb-2">Aucun lot à réviser</h3>
                <p className="text-muted-foreground mb-6">Commence par créer ton premier lot !</p>
                <Button onClick={() => setIsManualDialogOpen(true)} className="gradient-primary">Créer mon premier lot</Button>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sets.map((set) => (
                  <Card key={set.id} className="p-6 gradient-card border-0 shadow-sm hover:shadow-colored transition-smooth">
                    <div className="flex flex-col gap-4">
                      <div>
                        <h3 className="font-display font-semibold text-lg mb-1">{set.name}</h3>
                        {set.description && <p className="text-sm text-muted-foreground">{set.description}</p>}
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={() => handleReviewSet(set.id, set.name)} className="flex-1 gradient-primary">Réviser</Button>
                        <Button variant="destructive" size="icon" onClick={() => deleteSet(set.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="quiz" className="space-y-4">
            {!quizStarted ? (
              <Card className="p-6">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-fuchsia-500 to-violet-600 flex items-center justify-center">
                    <Infinity className="w-8 h-8 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold mb-2">Quiz Infini</h2>
                  <p className="text-muted-foreground">Questions basées sur vos flashcards</p>
                </div>
                <Select value={selectedSetId} onValueChange={setSelectedSetId}>
                  <SelectTrigger className="mb-4">
                    <SelectValue placeholder="Sélectionner un set" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les flashcards</SelectItem>
                    {sets.map((set) => (<SelectItem key={set.id} value={set.id}>{set.name}</SelectItem>))}
                  </SelectContent>
                </Select>
                {availableCards.length === 0 ? (
                  <p className="text-center text-muted-foreground">Créez des flashcards pour commencer</p>
                ) : (
                  <Button onClick={startQuiz} className="w-full bg-gradient-to-r from-fuchsia-500 to-violet-600">
                    <Zap className="w-4 h-4 mr-2" /> Commencer ({availableCards.length} cartes)
                  </Button>
                )}
              </Card>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex gap-2">
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400"><Trophy className="w-3 h-3 mr-1" />{score}</Badge>
                    <Badge variant="outline" className="bg-orange-500/10 text-orange-400"><Flame className="w-3 h-3 mr-1" />{streak}</Badge>
                  </div>
                  <span className="text-sm text-muted-foreground">{accuracy}% précision</span>
                </div>
                {isGenerating ? (
                  <Card className="p-8 text-center"><Loader2 className="w-8 h-8 mx-auto animate-spin text-primary" /></Card>
                ) : currentQuestion && (
                  <AnimatePresence mode="wait">
                    <motion.div key={currentQuestion.flashcard.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                      <Card className="p-6 mb-4">
                        <p className="text-xs text-muted-foreground mb-2">{currentQuestion.flashcard.subject || "Question"}</p>
                        <h2 className="text-xl font-semibold">{currentQuestion.flashcard.question}</h2>
                      </Card>
                      <div className="space-y-3">
                        {currentQuestion.options.map((option, index) => {
                          const isSelected = selectedAnswer === index;
                          const isCorrect = index === currentQuestion.correctIndex;
                          let bgClass = "bg-muted/30 hover:bg-muted/50";
                          if (isAnswered) {
                            if (isCorrect) bgClass = "bg-emerald-500/20 border-emerald-500/50";
                            else if (isSelected) bgClass = "bg-red-500/20 border-red-500/50";
                          }
                          return (
                            <motion.button key={index} onClick={() => handleAnswer(index)} disabled={isAnswered} className={`w-full p-4 rounded-xl text-left border-2 ${bgClass}`} whileHover={!isAnswered ? { scale: 1.02 } : {}}>
                              <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${isAnswered && isCorrect ? "bg-emerald-500 text-white" : isAnswered && isSelected ? "bg-red-500 text-white" : "bg-muted"}`}>
                                  {isAnswered && isCorrect ? <CheckCircle2 className="w-5 h-5" /> : isAnswered && isSelected ? <XCircle className="w-5 h-5" /> : String.fromCharCode(65 + index)}
                                </div>
                                <span>{option}</span>
                              </div>
                            </motion.button>
                          );
                        })}
                      </div>
                      {isAnswered && (
                        <div className="mt-4 space-y-2">
                          <Button onClick={nextQuestion} className="w-full bg-gradient-to-r from-fuchsia-500 to-violet-600"><Zap className="w-4 h-4 mr-2" />Suivant</Button>
                          <Button onClick={resetQuiz} variant="outline" className="w-full"><RefreshCw className="w-4 h-4 mr-2" />Terminer</Button>
                        </div>
                      )}
                    </motion.div>
                  </AnimatePresence>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      <CreateManualFlashcardSetDialog open={isManualDialogOpen} onOpenChange={setIsManualDialogOpen} />
      <CreateFlashcardSetDialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen} creationMethod="import" />
      <CreateFlashcardSetDialog open={isAIDialogOpen} onOpenChange={setIsAIDialogOpen} creationMethod="ai" />
      <CreateFlashcardSetDialog open={isRevisionDialogOpen} onOpenChange={setIsRevisionDialogOpen} creationMethod="revision_sheet" />
      {reviewSetId && <FlashcardReviewDialog open={!!reviewSetId} onOpenChange={(open) => !open && setReviewSetId(null)} setId={reviewSetId} setName={reviewSetName} />}
      <BottomNav />
    </div>
  );
};

export default Flashcards;
