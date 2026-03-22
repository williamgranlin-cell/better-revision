import { useState, useEffect } from "react";
import { BottomNav } from "@/components/BottomNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useRevisionContent } from "@/hooks/useRevisionContent";
import { useCourseNotes } from "@/hooks/useCourseNotes";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckSquare, FileText, BookOpen, Trophy, RotateCcw, Sparkles, ArrowRight, ChevronDown } from "lucide-react";
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
  const [difficulty, setDifficulty] = useState("medium");

  // QCM state
  const [questions, setQuestions] = useState<QCMQuestion[]>([]);
  const [generating, setGenerating] = useState(false);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, Set<string>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState({ correct: 0, total: 0 });

  useEffect(() => {
    if (selectedSubjectId) fetchChapters(selectedSubjectId);
  }, [selectedSubjectId]);

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
      if (!item?.content) {
        toast({ title: "Sélectionne une fiche", variant: "destructive" });
        return null;
      }
      return item.content;
    }

    if (sourceType === "course") {
      if (!selectedChapterId) {
        toast({ title: "Sélectionne un chapitre", variant: "destructive" });
        return null;
      }
      const { data } = await supabase
        .from("course_notes")
        .select("content, ai_enhanced_content")
        .eq("chapter_id", selectedChapterId)
        .maybeSingle();
      const content = data?.ai_enhanced_content || data?.content;
      if (!content || content.trim().length < 20) {
        toast({ title: "Ce chapitre est vide", variant: "destructive" });
        return null;
      }
      return content;
    }
    return null;
  };

  const generateQCM = async () => {
    const content = await getContentForGeneration();
    if (!content) return;

    setGenerating(true);
    setQuestions([]);
    setSelectedAnswers({});
    setSubmitted(false);

    try {
      const { data, error } = await supabase.functions.invoke("generate-qcm", {
        body: { content, numQuestions: parseInt(numQuestions), difficulty },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (!data?.questions?.length) throw new Error("Aucune question générée");

      setQuestions(data.questions);
      toast({ title: "QCM généré ! ✅", description: `${data.questions.length} questions créées` });
    } catch (e: any) {
      console.error(e);
      toast({ title: "Erreur", description: e.message || "Impossible de générer le QCM", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const toggleAnswer = (qIndex: number, label: string) => {
    if (submitted) return;
    setSelectedAnswers(prev => {
      const current = new Set(prev[qIndex] || []);
      if (current.has(label)) current.delete(label);
      else current.add(label);
      return { ...prev, [qIndex]: current };
    });
  };

  const handleSubmit = () => {
    let correct = 0;
    questions.forEach((q, i) => {
      const selected = selectedAnswers[i] || new Set();
      const correctLabels = new Set(q.options.filter(o => o.correct).map(o => o.label));
      const isCorrect = selected.size === correctLabels.size && [...selected].every(l => correctLabels.has(l));
      if (isCorrect) correct++;
    });
    setScore({ correct, total: questions.length });
    setSubmitted(true);
  };

  const resetQCM = () => {
    setQuestions([]);
    setSelectedAnswers({});
    setSubmitted(false);
  };

  const percentage = score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0;

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
        {questions.length === 0 ? (
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
                <Textarea
                  placeholder="Colle ici ton cours, tes notes ou ta fiche de révision..."
                  value={textContent}
                  onChange={e => setTextContent(e.target.value)}
                  className="min-h-[150px]"
                />
              )}

              {sourceType === "revision" && (
                <Select value={selectedRevisionId} onValueChange={setSelectedRevisionId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionne une fiche..." />
                  </SelectTrigger>
                  <SelectContent>
                    {revisionItems.filter(r => r.content).map(r => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.title} {r.subject && `(${r.subject})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {sourceType === "course" && (
                <div className="space-y-3">
                  <Select value={selectedSubjectId} onValueChange={v => { setSelectedSubjectId(v); setSelectedChapterId(""); }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Matière..." />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.emoji} {s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedSubjectId && (
                    <Select value={selectedChapterId} onValueChange={setSelectedChapterId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Chapitre..." />
                      </SelectTrigger>
                      <SelectContent>
                        {chapters.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
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
                  <Select value={numQuestions} onValueChange={setNumQuestions}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["5", "10", "15", "20"].map(n => (
                        <SelectItem key={n} value={n}>{n} questions</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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

            <Button
              onClick={generateQCM}
              disabled={generating}
              className="w-full gradient-primary text-lg py-6"
            >
              {generating ? (
                <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Génération en cours...</>
              ) : (
                <><CheckSquare className="w-5 h-5 mr-2" /> Générer le QCM</>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Score banner */}
            {submitted && (
              <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
                <Card className={cn(
                  "p-6 border-0 text-center",
                  percentage >= 80 ? "bg-emerald-500/10" : percentage >= 50 ? "bg-amber-500/10" : "bg-red-500/10"
                )}>
                  <Trophy className={cn(
                    "w-12 h-12 mx-auto mb-2",
                    percentage >= 80 ? "text-emerald-500" : percentage >= 50 ? "text-amber-500" : "text-red-500"
                  )} />
                  <h2 className="text-3xl font-bold">{score.correct}/{score.total}</h2>
                  <p className="text-lg font-medium">{percentage}% de réussite</p>
                  <p className="text-muted-foreground mt-1">
                    {percentage >= 80 ? "Excellent ! 🎉" : percentage >= 50 ? "Pas mal, continue ! 💪" : "Révise encore un peu 📖"}
                  </p>
                  <Button onClick={resetQCM} variant="outline" className="mt-4">
                    <RotateCcw className="w-4 h-4 mr-2" /> Nouveau QCM
                  </Button>
                </Card>
              </motion.div>
            )}

            {/* Questions */}
            {questions.map((q, qIndex) => {
              const userAnswers = selectedAnswers[qIndex] || new Set();
              const correctLabels = new Set(q.options.filter(o => o.correct).map(o => o.label));
              const isQuestionCorrect = submitted && userAnswers.size === correctLabels.size && [...userAnswers].every(l => correctLabels.has(l));

              return (
                <motion.div
                  key={qIndex}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: qIndex * 0.05 }}
                >
                  <Card className={cn(
                    "p-5 border-2 transition-all",
                    submitted && isQuestionCorrect && "border-emerald-500/50 bg-emerald-500/5",
                    submitted && !isQuestionCorrect && "border-red-500/50 bg-red-500/5",
                    !submitted && "border-border"
                  )}>
                    <div className="flex items-start gap-3 mb-4">
                      <Badge variant="outline" className="shrink-0 mt-0.5">{qIndex + 1}</Badge>
                      <p className="font-semibold text-base">{q.question}</p>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3 ml-10">⚠️ Plusieurs réponses possibles</p>

                    <div className="space-y-2 ml-10">
                      {q.options.map(opt => {
                        const isSelected = userAnswers.has(opt.label);
                        const showCorrect = submitted && opt.correct;
                        const showWrong = submitted && isSelected && !opt.correct;

                        return (
                          <button
                            key={opt.label}
                            onClick={() => toggleAnswer(qIndex, opt.label)}
                            disabled={submitted}
                            className={cn(
                              "w-full flex items-center gap-3 p-3 rounded-lg border-2 text-left transition-all",
                              !submitted && isSelected && "border-primary bg-primary/10",
                              !submitted && !isSelected && "border-border hover:border-primary/50 bg-muted/20",
                              showCorrect && "border-emerald-500 bg-emerald-500/10",
                              showWrong && "border-red-500 bg-red-500/10",
                              submitted && !showCorrect && !showWrong && "border-border bg-muted/10 opacity-60"
                            )}
                          >
                            <Checkbox
                              checked={submitted ? opt.correct : isSelected}
                              className={cn(
                                showCorrect && "border-emerald-500 data-[state=checked]:bg-emerald-500",
                                showWrong && "border-red-500 data-[state=checked]:bg-red-500"
                              )}
                              tabIndex={-1}
                            />
                            <span className="font-mono text-sm font-bold text-muted-foreground">{opt.label}.</span>
                            <span className="flex-1">{opt.text}</span>
                          </button>
                        );
                      })}
                    </div>

                    {submitted && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="mt-3 ml-10 p-3 rounded-lg bg-muted/50 border border-border"
                      >
                        <p className="text-sm"><span className="font-semibold">💡 Explication :</span> {q.explanation}</p>
                      </motion.div>
                    )}
                  </Card>
                </motion.div>
              );
            })}

            {!submitted && (
              <Button onClick={handleSubmit} className="w-full gradient-primary text-lg py-6">
                <ArrowRight className="w-5 h-5 mr-2" /> Valider mes réponses
              </Button>
            )}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default QCM;
