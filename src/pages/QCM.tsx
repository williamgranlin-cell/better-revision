import { useState, useEffect, useCallback } from "react";
import { BottomNav } from "@/components/BottomNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useRevisionContent } from "@/hooks/useRevisionContent";
import { useCourseNotes } from "@/hooks/useCourseNotes";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckSquare, FileText, BookOpen, Trophy, RotateCcw, Sparkles, ArrowRight, Play, X, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface QCMOption {
  label: string;
  text: string;
  correct: boolean;
}

interface QCMQuestion {
  question: string;
  options: QCMOption[];
  explanation: string;
}

type SourceType = "text" | "revision" | "course";
type QCMMode = "setup" | "preview" | "fullscreen" | "results";

const QCM = () => {
  const { toast } = useToast();
  const { items: revisionItems, loading: revisionLoading } = useRevisionContent();
  const { subjects, chapters } = useCourseNotes();

  // Source selection
  const [sourceType, setSourceType] = useState<SourceType>("text");
  const [textContent, setTextContent] = useState("");
  const [selectedRevisionId, setSelectedRevisionId] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [selectedChapterId, setSelectedChapterId] = useState("");
  const [numQuestions, setNumQuestions] = useState("10");
  const [customNum, setCustomNum] = useState("");
  const [difficulty, setDifficulty] = useState("medium");

  // QCM state
  const [questions, setQuestions] = useState<QCMQuestion[]>([]);
  const [generating, setGenerating] = useState(false);
  const [mode, setMode] = useState<QCMMode>("setup");

  // Fullscreen quiz state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, Set<string>>>({});
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<number>>(new Set());
  const [score, setScore] = useState({ correct: 0, total: 0 });

  const filteredChapters = chapters.filter(c => c.subject_id === selectedSubjectId);

  const effectiveNumQuestions = customNum ? parseInt(customNum) : parseInt(numQuestions);

  const getContentForGeneration = async (): Promise<string | null> => {
    if (sourceType === "text") {
      if (textContent.trim().length < 20) {
        toast({ title: "Contenu trop court", description: "Écris au moins 20 caractères", variant: "destructive" });
        return null;
      }
      return textContent;
    }
    if (sourceType === "revision") {
      const item = revisionItems.find(r => r.id === selectedRevisionId);
      if (!item?.content) { toast({ title: "Sélectionne une fiche", variant: "destructive" }); return null; }
      return item.content;
    }
    if (sourceType === "course") {
      if (!selectedChapterId) { toast({ title: "Sélectionne un chapitre", variant: "destructive" }); return null; }
      const { data } = await supabase.from("course_notes").select("content, ai_enhanced_content").eq("chapter_id", selectedChapterId).maybeSingle();
      const content = data?.ai_enhanced_content || data?.content;
      if (!content || content.trim().length < 20) { toast({ title: "Ce chapitre est vide", variant: "destructive" }); return null; }
      return content;
    }
    return null;
  };

  const generateQCM = async () => {
    const content = await getContentForGeneration();
    if (!content) return;
    const num = Math.min(Math.max(effectiveNumQuestions || 10, 1), 100);

    setGenerating(true);
    setQuestions([]);
    setSelectedAnswers({});
    setAnsweredQuestions(new Set());
    setMode("setup");

    try {
      const { data, error } = await supabase.functions.invoke("generate-qcm", {
        body: { content, numQuestions: num, difficulty },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (!data?.questions?.length) throw new Error("Aucune question générée");

      setQuestions(data.questions);
      setMode("preview");
      toast({ title: "QCM généré ! ✅", description: `${data.questions.length} questions créées` });
    } catch (e: any) {
      console.error(e);
      toast({ title: "Erreur", description: e.message || "Impossible de générer le QCM", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const toggleAnswer = (qIndex: number, label: string) => {
    if (answeredQuestions.has(qIndex)) return;
    setSelectedAnswers(prev => {
      const current = new Set(prev[qIndex] || []);
      if (current.has(label)) current.delete(label); else current.add(label);
      return { ...prev, [qIndex]: current };
    });
  };

  const confirmAnswer = () => {
    const userAnswers = selectedAnswers[currentIndex] || new Set();
    if (userAnswers.size === 0) return;
    setAnsweredQuestions(prev => new Set([...prev, currentIndex]));

    // Auto-advance after 1.5s
    setTimeout(() => {
      if (currentIndex < questions.length - 1) {
        setCurrentIndex(prev => prev + 1);
      } else {
        // Calculate final score
        let correct = 0;
        const allAnswered = new Set([...answeredQuestions, currentIndex]);
        questions.forEach((q, i) => {
          if (!allAnswered.has(i)) return;
          const selected = selectedAnswers[i] || new Set();
          const correctLabels = new Set(q.options.filter(o => o.correct).map(o => o.label));
          const isCorrect = selected.size === correctLabels.size && [...selected].every(l => correctLabels.has(l));
          if (isCorrect) correct++;
        });
        setScore({ correct, total: questions.length });
        setMode("results");
      }
    }, 1500);
  };

  const startFullscreen = () => {
    setCurrentIndex(0);
    setSelectedAnswers({});
    setAnsweredQuestions(new Set());
    setMode("fullscreen");
  };

  const resetQCM = () => {
    setQuestions([]);
    setSelectedAnswers({});
    setAnsweredQuestions(new Set());
    setMode("setup");
    setCurrentIndex(0);
  };

  const percentage = score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0;

  // ─── FULLSCREEN QUIZ MODE ────────────────────────────────────────────────────
  if (mode === "fullscreen" && questions.length > 0) {
    const q = questions[currentIndex];
    const userAnswers = selectedAnswers[currentIndex] || new Set();
    const isAnswered = answeredQuestions.has(currentIndex);
    const correctLabels = new Set(q.options.filter(o => o.correct).map(o => o.label));
    const isCorrect = isAnswered && userAnswers.size === correctLabels.size && [...userAnswers].every(l => correctLabels.has(l));

    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-card/95 backdrop-blur-lg">
          <Button variant="ghost" size="sm" onClick={() => setMode("preview")}>
            <X className="w-4 h-4 mr-1" /> Quitter
          </Button>
          <span className="text-sm font-semibold">{currentIndex + 1} / {questions.length}</span>
          <Badge variant={difficulty === "easy" ? "secondary" : difficulty === "hard" ? "destructive" : "outline"}>
            {difficulty === "easy" ? "🟢 Facile" : difficulty === "hard" ? "🔴 Difficile" : "🟡 Moyen"}
          </Badge>
        </div>

        {/* Progress */}
        <Progress value={((currentIndex + 1) / questions.length) * 100} className="h-1.5 rounded-none" />

        {/* Question */}
        <div className="flex-1 flex flex-col justify-center px-4 py-6 max-w-2xl mx-auto w-full overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div>
                <p className="text-xs text-muted-foreground mb-2">Question {currentIndex + 1}</p>
                <h2 className="text-xl md:text-2xl font-bold font-display leading-tight">{q.question}</h2>
                <p className="text-xs text-muted-foreground mt-2">⚠️ Plusieurs réponses possibles</p>
              </div>

              <div className="space-y-3">
                {q.options.map(opt => {
                  const isSelected = userAnswers.has(opt.label);
                  const showCorrect = isAnswered && opt.correct;
                  const showWrong = isAnswered && isSelected && !opt.correct;

                  return (
                    <motion.button
                      key={opt.label}
                      onClick={() => toggleAnswer(currentIndex, opt.label)}
                      disabled={isAnswered}
                      whileTap={!isAnswered ? { scale: 0.98 } : {}}
                      className={cn(
                        "w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all",
                        !isAnswered && isSelected && "border-primary bg-primary/10 shadow-sm",
                        !isAnswered && !isSelected && "border-border hover:border-primary/50 bg-card",
                        showCorrect && "border-emerald-500 bg-emerald-500/10",
                        showWrong && "border-red-500 bg-red-500/10",
                        isAnswered && !showCorrect && !showWrong && "border-border bg-muted/10 opacity-50"
                      )}
                    >
                      <Checkbox
                        checked={isAnswered ? opt.correct : isSelected}
                        className={cn(
                          "w-5 h-5",
                          showCorrect && "border-emerald-500 data-[state=checked]:bg-emerald-500",
                          showWrong && "border-red-500 data-[state=checked]:bg-red-500"
                        )}
                        tabIndex={-1}
                      />
                      <span className="font-mono text-sm font-bold text-muted-foreground w-6">{opt.label}.</span>
                      <span className="flex-1 text-base">{opt.text}</span>
                    </motion.button>
                  );
                })}
              </div>

              {/* Explanation after answer */}
              <AnimatePresence>
                {isAnswered && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "p-4 rounded-xl border",
                      isCorrect ? "bg-emerald-500/10 border-emerald-500/30" : "bg-red-500/10 border-red-500/30"
                    )}
                  >
                    <p className="font-semibold text-sm mb-1">{isCorrect ? "✅ Correct !" : "❌ Incorrect"}</p>
                    <p className="text-sm text-muted-foreground">💡 {q.explanation}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Bottom action */}
        <div className="px-4 py-4 border-t border-border/50 bg-card/95 backdrop-blur-lg">
          {!isAnswered ? (
            <Button
              onClick={confirmAnswer}
              disabled={userAnswers.size === 0}
              className="w-full gradient-primary text-base py-5"
            >
              Valider <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : currentIndex < questions.length - 1 ? (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> Passage à la question suivante...
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> Calcul des résultats...
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── RESULTS MODE ────────────────────────────────────────────────────────────
  if (mode === "results") {
    return (
      <div className="min-h-screen pb-24 bg-background">
        <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-lg border-b border-border/50 shadow-sm">
          <div className="max-w-screen-xl mx-auto px-4 md:px-6 py-4">
            <h1 className="text-xl md:text-2xl font-display font-bold">Résultats du QCM 🏆</h1>
          </div>
        </header>

        <main className="max-w-screen-xl mx-auto px-4 md:px-6 py-6 space-y-6">
          {/* Score card */}
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
            <Card className={cn(
              "p-8 border-0 text-center",
              percentage >= 80 ? "bg-emerald-500/10" : percentage >= 50 ? "bg-amber-500/10" : "bg-red-500/10"
            )}>
              <Trophy className={cn("w-16 h-16 mx-auto mb-3", percentage >= 80 ? "text-emerald-500" : percentage >= 50 ? "text-amber-500" : "text-red-500")} />
              <h2 className="text-4xl font-bold font-display">{score.correct}/{score.total}</h2>
              <p className="text-xl font-medium mt-1">{percentage}% de réussite</p>
              <p className="text-muted-foreground mt-2 text-lg">
                {percentage >= 80 ? "Excellent ! 🎉" : percentage >= 50 ? "Pas mal, continue ! 💪" : "Révise encore un peu 📖"}
              </p>
              <div className="flex gap-3 justify-center mt-6">
                <Button onClick={startFullscreen} variant="outline">
                  <RotateCcw className="w-4 h-4 mr-2" /> Recommencer
                </Button>
                <Button onClick={resetQCM} className="gradient-primary">
                  <Sparkles className="w-4 h-4 mr-2" /> Nouveau QCM
                </Button>
              </div>
            </Card>
          </motion.div>

          {/* Review all questions */}
          <h3 className="text-lg font-semibold font-display">📋 Correction détaillée</h3>
          {questions.map((q, qIndex) => {
            const userAns = selectedAnswers[qIndex] || new Set();
            const correctLabels = new Set(q.options.filter(o => o.correct).map(o => o.label));
            const isQCorrect = userAns.size === correctLabels.size && [...userAns].every(l => correctLabels.has(l));

            return (
              <motion.div key={qIndex} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: qIndex * 0.03 }}>
                <Card className={cn("p-5 border-2", isQCorrect ? "border-emerald-500/50 bg-emerald-500/5" : "border-red-500/50 bg-red-500/5")}>
                  <div className="flex items-start gap-3 mb-3">
                    <Badge variant="outline" className="shrink-0 mt-0.5">{qIndex + 1}</Badge>
                    <p className="font-semibold">{q.question}</p>
                    <span className="ml-auto text-lg">{isQCorrect ? "✅" : "❌"}</span>
                  </div>
                  <div className="space-y-1.5 ml-10">
                    {q.options.map(opt => (
                      <div key={opt.label} className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-lg text-sm",
                        opt.correct && "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-medium",
                        userAns.has(opt.label) && !opt.correct && "bg-red-500/10 text-red-700 dark:text-red-400 line-through",
                      )}>
                        <span className="font-mono font-bold w-5">{opt.label}.</span>
                        <span>{opt.text}</span>
                        {opt.correct && <span className="ml-auto text-xs">✓</span>}
                        {userAns.has(opt.label) && !opt.correct && <span className="ml-auto text-xs">✗</span>}
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 ml-10 p-3 rounded-lg bg-muted/50 border border-border">
                    <p className="text-sm"><span className="font-semibold">💡 Explication :</span> {q.explanation}</p>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </main>
        <BottomNav />
      </div>
    );
  }

  // ─── PREVIEW MODE (questions generated, choose to launch) ────────────────────
  if (mode === "preview" && questions.length > 0) {
    return (
      <div className="min-h-screen pb-24 bg-background">
        <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-lg border-b border-border/50 shadow-sm">
          <div className="max-w-screen-xl mx-auto px-4 md:px-6 py-4">
            <h1 className="text-xl md:text-2xl font-display font-bold bg-gradient-primary bg-clip-text text-transparent">
              QCM prêt ! 🎯
            </h1>
          </div>
        </header>
        <main className="max-w-screen-xl mx-auto px-4 md:px-6 py-6 space-y-6">
          <Card className="p-6 gradient-card border-0 text-center">
            <CheckSquare className="w-16 h-16 mx-auto mb-4 text-primary" />
            <h2 className="text-2xl font-bold font-display mb-2">{questions.length} questions générées</h2>
            <p className="text-muted-foreground mb-1">
              Difficulté : {difficulty === "easy" ? "🟢 Facile" : difficulty === "hard" ? "🔴 Difficile" : "🟡 Moyen"}
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              Les questions passeront en plein écran une par une. Réponds et passe automatiquement à la suite !
            </p>
            <div className="flex flex-col gap-3 max-w-xs mx-auto">
              <Button onClick={startFullscreen} className="gradient-primary text-lg py-6 shadow-colored">
                <Play className="w-5 h-5 mr-2" /> Lancer le QCM
              </Button>
              <Button onClick={resetQCM} variant="outline">
                <RotateCcw className="w-4 h-4 mr-2" /> Nouveau QCM
              </Button>
            </div>
          </Card>

          {/* Preview list */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground">Aperçu des questions :</h3>
            {questions.map((q, i) => (
              <div key={i} className="flex items-start gap-2 p-3 rounded-xl bg-muted/30 border border-border/30">
                <Badge variant="outline" className="shrink-0 mt-0.5 text-xs">{i + 1}</Badge>
                <p className="text-sm">{q.question}</p>
              </div>
            ))}
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  // ─── SETUP MODE ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen pb-24 bg-background">
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-lg border-b border-border/50 shadow-sm">
        <div className="max-w-screen-xl mx-auto px-4 md:px-6 py-4">
          <h1 className="text-xl md:text-2xl lg:text-3xl font-display font-bold bg-gradient-primary bg-clip-text text-transparent">
            QCM Intelligent ✅
          </h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1">
            Génère un QCM à cases à cocher depuis tes cours ou fiches
          </p>
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto px-4 md:px-6 py-4 md:py-6 space-y-6">
        <div className="space-y-4">
          {/* Source type */}
          <Card className="p-6 gradient-card border-0">
            <h2 className="font-display font-semibold text-lg mb-4">📄 Source du contenu</h2>
            <div className="grid grid-cols-3 gap-3 mb-4">
              {([
                { value: "text" as SourceType, icon: FileText, label: "Texte libre" },
                { value: "revision" as SourceType, icon: Sparkles, label: "Fiche de révision" },
                { value: "course" as SourceType, icon: BookOpen, label: "Cours" },
              ]).map(s => (
                <button
                  key={s.value}
                  onClick={() => setSourceType(s.value)}
                  className={cn(
                    "p-3 rounded-xl border-2 text-center transition-all",
                    sourceType === s.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-muted/30 text-muted-foreground hover:border-primary/50"
                  )}
                >
                  <s.icon className="w-6 h-6 mx-auto mb-1" />
                  <span className="text-xs font-medium">{s.label}</span>
                </button>
              ))}
            </div>

            {sourceType === "text" && (
              <Textarea placeholder="Colle ici ton cours, tes notes ou ta fiche de révision..." value={textContent} onChange={e => setTextContent(e.target.value)} className="min-h-[150px]" />
            )}
            {sourceType === "revision" && (
              <Select value={selectedRevisionId} onValueChange={setSelectedRevisionId}>
                <SelectTrigger><SelectValue placeholder="Sélectionne une fiche..." /></SelectTrigger>
                <SelectContent>
                  {revisionItems.filter(r => r.content).map(r => (
                    <SelectItem key={r.id} value={r.id}>{r.title} {r.subject && `(${r.subject})`}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {sourceType === "course" && (
              <div className="space-y-3">
                <Select value={selectedSubjectId} onValueChange={v => { setSelectedSubjectId(v); setSelectedChapterId(""); }}>
                  <SelectTrigger><SelectValue placeholder="Matière..." /></SelectTrigger>
                  <SelectContent>
                    {subjects.map(s => (<SelectItem key={s.id} value={s.id}>{s.emoji} {s.name}</SelectItem>))}
                  </SelectContent>
                </Select>
                {selectedSubjectId && (
                  <Select value={selectedChapterId} onValueChange={setSelectedChapterId}>
                    <SelectTrigger><SelectValue placeholder="Chapitre..." /></SelectTrigger>
                    <SelectContent>
                      {filteredChapters.map(c => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}
          </Card>

          {/* Settings */}
          <Card className="p-6 gradient-card border-0">
            <h2 className="font-display font-semibold text-lg mb-4">⚙️ Paramètres</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1 block">Nombre de questions</label>
                <Select value={customNum ? "custom" : numQuestions} onValueChange={v => { if (v === "custom") { setCustomNum("25"); setNumQuestions(""); } else { setNumQuestions(v); setCustomNum(""); } }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["5", "10", "15", "20", "30", "50"].map(n => (
                      <SelectItem key={n} value={n}>{n} questions</SelectItem>
                    ))}
                    <SelectItem value="custom">Personnalisé...</SelectItem>
                  </SelectContent>
                </Select>
                {customNum && (
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    value={customNum}
                    onChange={e => setCustomNum(e.target.value)}
                    className="mt-2"
                    placeholder="1-100"
                  />
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1 block">Difficulté</label>
                <Select value={difficulty} onValueChange={setDifficulty}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">🟢 Facile</SelectItem>
                    <SelectItem value="medium">🟡 Moyen</SelectItem>
                    <SelectItem value="hard">🔴 Difficile</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>

          <Button onClick={generateQCM} disabled={generating} className="w-full gradient-primary text-lg py-6">
            {generating ? (
              <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Génération en cours...</>
            ) : (
              <><CheckSquare className="w-5 h-5 mr-2" /> Générer le QCM</>
            )}
          </Button>
        </div>
      </main>
      <BottomNav />
    </div>
  );
};

export default QCM;
