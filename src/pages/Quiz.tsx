import { useState, useEffect, useCallback } from "react";
import { BottomNav } from "@/components/BottomNav";
import { useFlashcards, Flashcard } from "@/hooks/useFlashcards";
import { useFlashcardSets } from "@/hooks/useFlashcardSets";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
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
  ChevronDown,
  Sparkles,
  Target,
  TrendingUp,
  Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

interface QuizQuestion {
  flashcard: Flashcard;
  options: string[];
  correctIndex: number;
  isLoading?: boolean;
}

type DifficultyLevel = "easy" | "medium" | "hard";

const difficultyConfig = {
  easy: {
    label: "Facile",
    color: "from-emerald-500 to-green-600",
    bgColor: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
    description: "Réponses évidentes, distinctions claires",
    optionsCount: 3,
  },
  medium: {
    label: "Moyen",
    color: "from-amber-500 to-orange-600",
    bgColor: "bg-amber-500/10 border-amber-500/30 text-amber-400",
    description: "Réponses plausibles, nuances subtiles",
    optionsCount: 4,
  },
  hard: {
    label: "Difficile",
    color: "from-red-500 to-rose-600",
    bgColor: "bg-red-500/10 border-red-500/30 text-red-400",
    description: "Réponses très similaires, pièges inclus",
    optionsCount: 4,
  },
};

const Quiz = () => {
  const { flashcards, loading: flashcardsLoading, recordReview } = useFlashcards();
  const { sets, loading: setsLoading } = useFlashcardSets();
  const [selectedSetId, setSelectedSetId] = useState<string>("all");
  const [difficulty, setDifficulty] = useState<DifficultyLevel>("medium");
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [totalAnswered, setTotalAnswered] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [generatingOptions, setGeneratingOptions] = useState(false);
  const [quizStarted, setQuizStarted] = useState(false);

  // Generate AI-powered wrong answers for a question
  const generateAIWrongAnswers = async (flashcard: Flashcard, subject: string, diffLevel: DifficultyLevel): Promise<string[]> => {
    try {
      const { data, error } = await supabase.functions.invoke('generate-flashcards', {
        body: {
          generateQuizOptions: true,
          question: flashcard.question,
          correctAnswer: flashcard.answer,
          subject: subject,
          difficulty: diffLevel,
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

  // Generate quiz questions from flashcards with AI-generated wrong answers
  const generateQuestions = useCallback(async (cards: Flashcard[], diffLevel: DifficultyLevel) => {
    if (cards.length < 1) return [];

    const shuffled = [...cards].sort(() => Math.random() - 0.5);
    const selectedCards = shuffled.slice(0, Math.min(shuffled.length, 20)); // Limit to 20 questions
    
    // Get the subject from the first card or set
    const subject = selectedCards[0]?.subject || 
      sets.find(s => s.id === selectedSetId)?.name || 
      "Culture générale";

    setGeneratingOptions(true);

    const optionsCount = difficultyConfig[diffLevel].optionsCount;

    // Generate questions with placeholder options first
    const initialQuestions: QuizQuestion[] = selectedCards.map((flashcard) => {
      const correctIndex = Math.floor(Math.random() * optionsCount);
      return {
        flashcard,
        options: Array(optionsCount).fill("Chargement..."),
        correctIndex,
        isLoading: true,
      };
    });

    setQuestions(initialQuestions);

    // Generate AI options for each question
    const questionsWithAI = await Promise.all(
      selectedCards.map(async (flashcard, idx) => {
        const wrongAnswers = await generateAIWrongAnswers(flashcard, subject, diffLevel);
        
        let finalWrongAnswers = wrongAnswers;
        const neededWrongAnswers = optionsCount - 1;
        
        // Fallback: use other flashcard answers if AI fails
        if (finalWrongAnswers.length < neededWrongAnswers) {
          const otherAnswers = cards
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

        return {
          flashcard,
          options: options.slice(0, optionsCount),
          correctIndex,
          isLoading: false,
        };
      })
    );

    setGeneratingOptions(false);
    return questionsWithAI;
  }, [sets, selectedSetId]);

  // Start quiz with selected settings
  const startQuiz = async () => {
    const filteredCards =
      selectedSetId === "all"
        ? flashcards
        : flashcards.filter((f) => {
            const set = sets.find(s => s.id === selectedSetId);
            return f.subject === selectedSetId || set?.name === f.subject;
          });

    if (filteredCards.length > 0) {
      setQuizStarted(true);
      const newQuestions = await generateQuestions(filteredCards, difficulty);
      setQuestions(newQuestions);
    }
  };

  const resetQuiz = () => {
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setIsAnswered(false);
    setScore(0);
    setStreak(0);
    setTotalAnswered(0);
    setShowResults(false);
    setQuizStarted(false);
    setQuestions([]);
  };

  const handleAnswer = async (index: number) => {
    if (isAnswered || questions[currentIndex]?.isLoading) return;

    setSelectedAnswer(index);
    setIsAnswered(true);

    const isCorrect = index === questions[currentIndex].correctIndex;
    
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
    await recordReview(questions[currentIndex].flashcard.id, isCorrect);
  };

  const nextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((i) => i + 1);
      setSelectedAnswer(null);
      setIsAnswered(false);
    } else {
      setShowResults(true);
    }
  };

  const handleRestart = async () => {
    resetQuiz();
  };

  const handleNewQuiz = async () => {
    const filteredCards =
      selectedSetId === "all"
        ? flashcards
        : flashcards.filter((f) => {
            const set = sets.find(s => s.id === selectedSetId);
            return f.subject === selectedSetId || set?.name === f.subject;
          });

    setCurrentIndex(0);
    setSelectedAnswer(null);
    setIsAnswered(false);
    setScore(0);
    setStreak(0);
    setTotalAnswered(0);
    setShowResults(false);
    
    const newQuestions = await generateQuestions(filteredCards, difficulty);
    setQuestions(newQuestions);
  };

  const currentQuestion = questions[currentIndex];
  const availableCards = selectedSetId === "all"
    ? flashcards
    : flashcards.filter((f) => {
        const set = sets.find(s => s.id === selectedSetId);
        return f.subject === selectedSetId || set?.name === f.subject;
      });
  const progress = questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0;
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
              <div className={`p-2 rounded-xl bg-gradient-to-br ${quizStarted ? difficultyConfig[difficulty].color : 'from-fuchsia-500 to-violet-600'} shadow-lg`}>
                <Brain className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="font-display text-2xl font-bold bg-gradient-to-r from-fuchsia-500 to-violet-600 bg-clip-text text-transparent">
                  Quiz Intelligent
                </h1>
                <p className="text-xs text-muted-foreground">
                  {quizStarted ? `Mode ${difficultyConfig[difficulty].label}` : 'Basé sur vos flashcards'}
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

          {/* Progress bar */}
          {quizStarted && questions.length > 0 && !showResults && (
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Question {currentIndex + 1}/{questions.length}</span>
                <span>{accuracy}% de précision</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="container mx-auto px-4 py-6">
        {!quizStarted && !generatingOptions ? (
          /* Difficulty selection screen */
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
              <>
                <Card className="glass-card p-6">
                  <h2 className="text-xl font-semibold mb-4 text-center">Choisissez la difficulté</h2>
                  <div className="grid gap-3">
                    {(Object.keys(difficultyConfig) as DifficultyLevel[]).map((level) => {
                      const config = difficultyConfig[level];
                      const isSelected = difficulty === level;
                      return (
                        <motion.button
                          key={level}
                          onClick={() => setDifficulty(level)}
                          className={`p-4 rounded-2xl text-left transition-all duration-300 border-2 ${
                            isSelected
                              ? `bg-gradient-to-r ${config.color} text-white border-transparent`
                              : `bg-muted/30 border-transparent hover:border-white/20`
                          }`}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-semibold text-lg">{config.label}</p>
                              <p className={`text-sm ${isSelected ? 'text-white/80' : 'text-muted-foreground'}`}>
                                {config.description}
                              </p>
                            </div>
                            <Badge variant="outline" className={isSelected ? 'bg-white/20 border-white/30 text-white' : config.bgColor}>
                              {config.optionsCount} choix
                            </Badge>
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                </Card>

                <Card className="glass-card p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Flashcards disponibles</p>
                      <p className="text-2xl font-bold">{availableCards.length}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Questions du quiz</p>
                      <p className="text-2xl font-bold">{Math.min(availableCards.length, 20)}</p>
                    </div>
                  </div>
                  
                  <Button
                    onClick={startQuiz}
                    className={`w-full py-6 text-lg bg-gradient-to-r ${difficultyConfig[difficulty].color}`}
                  >
                    <Zap className="w-5 h-5 mr-2" />
                    Commencer le Quiz
                  </Button>
                </Card>
              </>
            )}
          </div>
        ) : generatingOptions && questions.length === 0 ? (
          <Card className="glass-card p-8 text-center">
            <Loader2 className="w-16 h-16 mx-auto mb-4 text-primary animate-spin" />
            <h2 className="text-xl font-semibold mb-2">Génération des questions...</h2>
            <p className="text-muted-foreground">
              L'IA génère des réponses {difficultyConfig[difficulty].label.toLowerCase()}s
            </p>
          </Card>
        ) : generatingOptions ? (
          <Card className="glass-card p-8 text-center">
            <Loader2 className="w-16 h-16 mx-auto mb-4 text-primary animate-spin" />
            <h2 className="text-xl font-semibold mb-2">Génération des questions...</h2>
            <p className="text-muted-foreground">
              L'IA génère des réponses cohérentes avec le sujet
            </p>
          </Card>
        ) : questions.length === 0 ? (
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
        ) : showResults ? (
          /* Results screen */
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-6"
          >
            <Card className="glass-card p-8 text-center">
              <div className="mb-6">
                <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-br from-fuchsia-500 to-violet-600 flex items-center justify-center">
                  <Trophy className="w-12 h-12 text-white" />
                </div>
                <h2 className="font-display text-3xl font-bold mb-2">Quiz terminé !</h2>
                <p className="text-muted-foreground">Voici vos résultats</p>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                  <Target className="w-8 h-8 mx-auto mb-2 text-emerald-400" />
                  <p className="text-2xl font-bold text-emerald-400">{accuracy}%</p>
                  <p className="text-xs text-muted-foreground">Précision</p>
                </div>
                <div className="p-4 rounded-2xl bg-violet-500/10 border border-violet-500/20">
                  <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-violet-400" />
                  <p className="text-2xl font-bold text-violet-400">{score}/{questions.length}</p>
                  <p className="text-xs text-muted-foreground">Bonnes réponses</p>
                </div>
                <div className="p-4 rounded-2xl bg-orange-500/10 border border-orange-500/20">
                  <Flame className="w-8 h-8 mx-auto mb-2 text-orange-400" />
                  <p className="text-2xl font-bold text-orange-400">{bestStreak}</p>
                  <p className="text-xs text-muted-foreground">Meilleure série</p>
                </div>
              </div>

              <div className="flex gap-4">
                <Button
                  onClick={handleNewQuiz}
                  variant="outline"
                  className="flex-1"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Rejouer
                </Button>
                <Button
                  onClick={handleRestart}
                  className={`flex-1 bg-gradient-to-r ${difficultyConfig[difficulty].color}`}
                >
                  Changer difficulté
                </Button>
              </div>
            </Card>
          </motion.div>
        ) : (
          /* Question card - Doom scroll style */
          <div className="space-y-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentIndex}
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -50 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="glass-card overflow-hidden">
                  {/* Streak indicator */}
                  {streak >= 3 && (
                    <div className="bg-gradient-to-r from-orange-500 to-red-500 px-4 py-2 flex items-center justify-center gap-2">
                      <Flame className="w-5 h-5 text-white animate-pulse" />
                      <span className="text-white font-semibold">
                        Série de {streak} ! 🔥
                      </span>
                    </div>
                  )}

                  {/* Question */}
                  <div className="p-6">
                    <div className="flex items-start gap-3 mb-6">
                      <div className="p-2 rounded-xl bg-gradient-to-br from-fuchsia-500/20 to-violet-600/20">
                        <Zap className="w-5 h-5 text-fuchsia-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground mb-1">Question</p>
                        <h3 className="text-xl font-semibold leading-relaxed">
                          {currentQuestion?.flashcard.question}
                        </h3>
                      </div>
                    </div>

                    {/* Options */}
                    <div className="space-y-3">
                      {currentQuestion?.isLoading ? (
                        <div className="flex flex-col items-center justify-center py-8 gap-4">
                          <Loader2 className="w-8 h-8 text-primary animate-spin" />
                          <p className="text-muted-foreground text-sm">Génération des options...</p>
                        </div>
                      ) : (
                        currentQuestion?.options.map((option, index) => {
                          const isSelected = selectedAnswer === index;
                          const isCorrect = index === currentQuestion.correctIndex;
                          const showCorrect = isAnswered && isCorrect;
                          const showWrong = isAnswered && isSelected && !isCorrect;

                          return (
                            <motion.button
                              key={index}
                              onClick={() => handleAnswer(index)}
                              disabled={isAnswered}
                              className={`w-full p-4 rounded-2xl text-left transition-all duration-300 border-2 ${
                                showCorrect
                                  ? "bg-emerald-500/20 border-emerald-500 text-emerald-400"
                                  : showWrong
                                  ? "bg-red-500/20 border-red-500 text-red-400"
                                  : isSelected
                                  ? "bg-primary/20 border-primary"
                                  : "bg-muted/30 border-transparent hover:bg-muted/50 hover:border-white/20"
                              }`}
                              whileHover={!isAnswered ? { scale: 1.02 } : {}}
                              whileTap={!isAnswered ? { scale: 0.98 } : {}}
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                                    showCorrect
                                      ? "bg-emerald-500 text-white"
                                      : showWrong
                                      ? "bg-red-500 text-white"
                                      : "bg-muted text-muted-foreground"
                                  }`}
                                >
                                  {showCorrect ? (
                                    <CheckCircle2 className="w-5 h-5" />
                                  ) : showWrong ? (
                                    <XCircle className="w-5 h-5" />
                                  ) : (
                                    String.fromCharCode(65 + index)
                                  )}
                                </div>
                                <span className="flex-1 font-medium">{option}</span>
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
                        className="mt-6"
                      >
                        <Button
                          onClick={nextQuestion}
                          className="w-full bg-gradient-to-r from-fuchsia-500 to-violet-600 py-6 text-lg"
                        >
                          {currentIndex < questions.length - 1 ? (
                            <>
                              Question suivante
                              <ChevronDown className="w-5 h-5 ml-2 rotate-[-90deg]" />
                            </>
                          ) : (
                            <>
                              Voir les résultats
                              <TrendingUp className="w-5 h-5 ml-2" />
                            </>
                          )}
                        </Button>
                      </motion.div>
                    )}
                  </div>
                </Card>
              </motion.div>
            </AnimatePresence>

            {/* Scroll hint */}
            {!isAnswered && !currentQuestion?.isLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center text-muted-foreground text-sm"
              >
                <p>Sélectionnez une réponse pour continuer</p>
              </motion.div>
            )}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default Quiz;