import { useState, useEffect, useCallback, useRef } from "react";
import { BottomNav } from "@/components/BottomNav";
import { useFlashcards, Flashcard } from "@/hooks/useFlashcards";
import { useFlashcardSets } from "@/hooks/useFlashcardSets";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Brain,
  CheckCircle2,
  XCircle,
  Trophy,
  Flame,
  Zap,
  RefreshCw,
  Sparkles,
  Loader2,
  Infinity,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

interface QuizQuestion {
  flashcard: Flashcard;
  options: string[];
  correctIndex: number;
  isLoading?: boolean;
}

const Quiz = () => {
  const { flashcards, loading: flashcardsLoading, recordReview } = useFlashcards();
  const { sets, loading: setsLoading } = useFlashcardSets();
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

  const getFilteredCards = useCallback(() => {
    if (selectedSetId === "all") return flashcards;
    return flashcards.filter((f) => {
      const set = sets.find(s => s.id === selectedSetId);
      return f.subject === selectedSetId || set?.name === f.subject;
    });
  }, [flashcards, sets, selectedSetId]);

  // Generate AI-powered wrong answers for a question
  const generateAIWrongAnswers = async (flashcard: Flashcard, subject: string): Promise<string[]> => {
    try {
      const { data, error } = await supabase.functions.invoke('generate-flashcards', {
        body: {
          generateQuizOptions: true,
          question: flashcard.question,
          correctAnswer: flashcard.answer,
          subject: subject,
          difficulty: "medium",
        }
      });

      if (error || !data.wrongAnswers) {
        console.error("Error generating AI options:", error);
        return [];
      }

      return data.wrongAnswers;
    } catch (err) {
      console.error("Failed to generate AI options:", err);
      return [];
    }
  };

  // Generate a single question
  const generateNextQuestion = useCallback(async () => {
    const filteredCards = getFilteredCards();
    if (filteredCards.length === 0) return;

    setIsGenerating(true);

    // Get available cards (not yet used)
    let availableCards = filteredCards.filter(c => !usedFlashcardIds.current.has(c.id));
    
    // If all cards used, reset the pool
    if (availableCards.length === 0) {
      usedFlashcardIds.current.clear();
      availableCards = filteredCards;
    }

    // Pick a random card
    const randomIndex = Math.floor(Math.random() * availableCards.length);
    const flashcard = availableCards[randomIndex];
    usedFlashcardIds.current.add(flashcard.id);

    const subject = flashcard.subject || 
      sets.find(s => s.id === selectedSetId)?.name || 
      "Culture générale";

    // Generate wrong answers
    const wrongAnswers = await generateAIWrongAnswers(flashcard, subject);
    
    let finalWrongAnswers = wrongAnswers;
    const optionsCount = 4;
    const neededWrongAnswers = optionsCount - 1;

    // Fallback: use other flashcard answers if AI fails
    if (finalWrongAnswers.length < neededWrongAnswers) {
      const otherAnswers = filteredCards
        .filter((c) => c.id !== flashcard.id)
        .map((c) => c.answer)
        .sort(() => Math.random() - 0.5)
        .slice(0, neededWrongAnswers - finalWrongAnswers.length);
      finalWrongAnswers = [...finalWrongAnswers, ...otherAnswers];
    }

    // If still not enough, add generic options
    while (finalWrongAnswers.length < neededWrongAnswers) {
      finalWrongAnswers.push(`Option ${finalWrongAnswers.length + 1}`);
    }

    const correctIndex = Math.floor(Math.random() * optionsCount);
    const options = [...finalWrongAnswers.slice(0, optionsCount - 1)];
    options.splice(correctIndex, 0, flashcard.answer);

    setCurrentQuestion({
      flashcard,
      options: options.slice(0, optionsCount),
      correctIndex,
      isLoading: false,
    });
    setIsGenerating(false);
  }, [getFilteredCards, sets, selectedSetId]);

  // Start quiz
  const startQuiz = async () => {
    usedFlashcardIds.current.clear();
    setScore(0);
    setStreak(0);
    setTotalAnswered(0);
    setQuizStarted(true);
    await generateNextQuestion();
  };

  // Reset quiz
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
    if (isAnswered || !currentQuestion || currentQuestion.isLoading) return;

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

    // Record review in flashcard stats
    await recordReview(currentQuestion.flashcard.id, isCorrect);
  };

  const nextQuestion = async () => {
    setSelectedAnswer(null);
    setIsAnswered(false);
    await generateNextQuestion();
  };

  const availableCards = getFilteredCards();
  const accuracy = totalAnswered > 0 ? Math.round((score / totalAnswered) * 100) : 0;

  if (flashcardsLoading || setsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <Brain className="w-16 h-16 text-primary animate-bounce" />
          <p className="text-muted-foreground">Chargement des quiz...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 glass-card border-b border-white/10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-fuchsia-500 to-violet-600 shadow-lg">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="font-display text-2xl font-bold bg-gradient-to-r from-fuchsia-500 to-violet-600 bg-clip-text text-transparent">
                  Quiz Infini
                </h1>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Infinity className="w-3 h-3" />
                  Basé sur vos flashcards
                </p>
              </div>
            </div>

            {/* Stats badges */}
            {quizStarted && (
              <div className="flex gap-2">
                <Badge variant="outline" className="bg-emerald-500/10 border-emerald-500/30 text-emerald-400">
                  <Trophy className="w-3 h-3 mr-1" />
                  {score}
                </Badge>
                <Badge variant="outline" className="bg-orange-500/10 border-orange-500/30 text-orange-400">
                  <Flame className="w-3 h-3 mr-1" />
                  {streak}
                </Badge>
              </div>
            )}
          </div>

          {/* Set selector - only show when not started */}
          {!quizStarted && (
            <Select value={selectedSetId} onValueChange={setSelectedSetId}>
              <SelectTrigger className="glass-input">
                <SelectValue placeholder="Sélectionner un set" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les flashcards</SelectItem>
                {sets.map((set) => (
                  <SelectItem key={set.id} value={set.id}>
                    {set.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Stats bar when playing */}
          {quizStarted && (
            <div className="mt-2 flex items-center justify-between text-sm text-muted-foreground">
              <span>Questions: {totalAnswered}</span>
              <span>{accuracy}% de précision</span>
              <span>Meilleure série: {bestStreak}</span>
            </div>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="container mx-auto px-4 py-6">
        {!quizStarted ? (
          /* Start screen */
          <div className="space-y-6">
            {availableCards.length === 0 ? (
              <Card className="glass-card p-8 text-center">
                <Brain className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h2 className="text-xl font-semibold mb-2">Pas assez de flashcards</h2>
                <p className="text-muted-foreground mb-4">
                  Créez au moins 1 flashcard pour commencer un quiz.
                </p>
                <Button
                  onClick={() => window.location.href = '/flashcards'}
                  className="bg-gradient-to-r from-fuchsia-500 to-violet-600"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Créer des flashcards
                </Button>
              </Card>
            ) : (
              <Card className="glass-card p-6">
                <div className="text-center mb-6">
                  <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-fuchsia-500 to-violet-600 flex items-center justify-center">
                    <Infinity className="w-10 h-10 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold mb-2">Mode Infini</h2>
                  <p className="text-muted-foreground">
                    Les questions défilent sans fin basées sur vos flashcards
                  </p>
                </div>

                <div className="flex items-center justify-center gap-8 mb-6 p-4 rounded-xl bg-muted/30">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-primary">{availableCards.length}</p>
                    <p className="text-sm text-muted-foreground">Flashcards</p>
                  </div>
                  <div className="h-12 w-px bg-border" />
                  <div className="text-center">
                    <Infinity className="w-8 h-8 mx-auto text-primary" />
                    <p className="text-sm text-muted-foreground">Questions</p>
                  </div>
                </div>
                
                <Button
                  onClick={startQuiz}
                  className="w-full py-6 text-lg bg-gradient-to-r from-fuchsia-500 to-violet-600"
                >
                  <Zap className="w-5 h-5 mr-2" />
                  Commencer
                </Button>
              </Card>
            )}
          </div>
        ) : isGenerating && !currentQuestion ? (
          <Card className="glass-card p-8 text-center">
            <Loader2 className="w-16 h-16 mx-auto mb-4 text-primary animate-spin" />
            <h2 className="text-xl font-semibold mb-2">Génération de la question...</h2>
            <p className="text-muted-foreground">
              L'IA prépare les réponses
            </p>
          </Card>
        ) : currentQuestion ? (
          /* Question card */
          <AnimatePresence mode="wait">
            <motion.div
              key={currentQuestion.flashcard.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Question */}
              <Card className="glass-card p-6">
                <div className="flex items-start gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Brain className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground mb-1">
                      {currentQuestion.flashcard.subject || "Question"}
                    </p>
                    <h2 className="text-xl font-semibold leading-relaxed">
                      {currentQuestion.flashcard.question}
                    </h2>
                  </div>
                </div>
              </Card>

              {/* Options */}
              <div className="space-y-3">
                {isGenerating ? (
                  <div className="flex items-center justify-center p-8">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : (
                  currentQuestion.options.map((option, index) => {
                    const isSelected = selectedAnswer === index;
                    const isCorrect = index === currentQuestion.correctIndex;
                    const showResult = isAnswered;

                    let bgClass = "bg-muted/30 hover:bg-muted/50 border-transparent";
                    if (showResult) {
                      if (isCorrect) {
                        bgClass = "bg-emerald-500/20 border-emerald-500/50";
                      } else if (isSelected && !isCorrect) {
                        bgClass = "bg-red-500/20 border-red-500/50";
                      }
                    } else if (isSelected) {
                      bgClass = "bg-primary/20 border-primary/50";
                    }

                    return (
                      <motion.button
                        key={index}
                        onClick={() => handleAnswer(index)}
                        disabled={isAnswered}
                        className={`w-full p-4 rounded-2xl text-left transition-all duration-200 border-2 ${bgClass}`}
                        whileHover={!isAnswered ? { scale: 1.02 } : {}}
                        whileTap={!isAnswered ? { scale: 0.98 } : {}}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                            showResult && isCorrect
                              ? "bg-emerald-500 text-white"
                              : showResult && isSelected && !isCorrect
                              ? "bg-red-500 text-white"
                              : "bg-muted text-muted-foreground"
                          }`}>
                            {showResult && isCorrect ? (
                              <CheckCircle2 className="w-5 h-5" />
                            ) : showResult && isSelected && !isCorrect ? (
                              <XCircle className="w-5 h-5" />
                            ) : (
                              String.fromCharCode(65 + index)
                            )}
                          </div>
                          <span className={`flex-1 ${showResult && isCorrect ? "font-semibold text-emerald-400" : ""}`}>
                            {option}
                          </span>
                        </div>
                      </motion.button>
                    );
                  })
                )}
              </div>

              {/* Next button */}
              {isAnswered && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-3"
                >
                  <Button
                    onClick={nextQuestion}
                    className="w-full py-6 text-lg bg-gradient-to-r from-fuchsia-500 to-violet-600"
                    disabled={isGenerating}
                  >
                    {isGenerating ? (
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    ) : (
                      <Zap className="w-5 h-5 mr-2" />
                    )}
                    Question suivante
                  </Button>
                  
                  <Button
                    onClick={resetQuiz}
                    variant="outline"
                    className="w-full"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Terminer le quiz
                  </Button>
                </motion.div>
              )}
            </motion.div>
          </AnimatePresence>
        ) : null}
      </div>

      <BottomNav />
    </div>
  );
};

export default Quiz;
