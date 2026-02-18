import { useState, useEffect, useRef, useCallback } from "react";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import {
  Plus, Trash2, BookOpen, ChevronRight, ChevronDown, Mic, MicOff, Sparkles,
  Save, ArrowLeft, FileText, Folder, FolderOpen, Loader2, Check, X, Edit2,
  Volume2, Brain
} from "lucide-react";
import { useCourseNotes, CourseSubject, CourseChapter } from "@/hooks/useCourseNotes";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

const SUBJECT_COLORS = [
  { name: "Bleu", value: "bg-blue-500" },
  { name: "Violet", value: "bg-purple-500" },
  { name: "Vert", value: "bg-green-500" },
  { name: "Rouge", value: "bg-red-500" },
  { name: "Orange", value: "bg-orange-500" },
  { name: "Rose", value: "bg-pink-500" },
  { name: "Cyan", value: "bg-cyan-500" },
  { name: "Amber", value: "bg-amber-500" },
];

const SUBJECT_EMOJIS = ["📚", "🔬", "🧮", "📐", "🌍", "📖", "🎨", "⚗️", "🏛️", "💻", "🎵", "🌱", "⚽", "🧬", "📊"];

type View = "list" | "editor";

const CoursNotes = () => {
  const { subjects, chapters, loading, addSubject, deleteSubject, addChapter, deleteChapter, getNote, saveNote } = useCourseNotes();
  const { toast } = useToast();

  const [view, setView] = useState<View>("list");
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set());
  const [selectedChapter, setSelectedChapter] = useState<CourseChapter | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<CourseSubject | null>(null);

  // Note editor state
  const [noteContent, setNoteContent] = useState("");
  const [aiContent, setAiContent] = useState("");
  const [showAiView, setShowAiView] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const [savedIndicator, setSavedIndicator] = useState(false);

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isEnhancing, setIsEnhancing] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Add subject dialog
  const [showAddSubject, setShowAddSubject] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [newSubjectColor, setNewSubjectColor] = useState(SUBJECT_COLORS[0].value);
  const [newSubjectEmoji, setNewSubjectEmoji] = useState(SUBJECT_EMOJIS[0]);

  // Add chapter dialog
  const [addingChapterForSubject, setAddingChapterForSubject] = useState<string | null>(null);
  const [newChapterName, setNewChapterName] = useState("");

  const toggleSubject = (id: string) => {
    setExpandedSubjects((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const openEditor = async (chapter: CourseChapter, subject: CourseSubject) => {
    setSelectedChapter(chapter);
    setSelectedSubject(subject);
    setShowAiView(false);
    const note = await getNote(chapter.id);
    setNoteContent(note?.content || "");
    setAiContent(note?.ai_enhanced_content || "");
    setView("editor");
  };

  const handleSave = async () => {
    if (!selectedChapter) return;
    setSavingNote(true);
    await saveNote(selectedChapter.id, noteContent, aiContent || undefined);
    setSavingNote(false);
    setSavedIndicator(true);
    setTimeout(() => setSavedIndicator(false), 2000);
  };

  // Auto-save every 30 seconds
  useEffect(() => {
    if (view !== "editor" || !selectedChapter) return;
    const interval = setInterval(() => {
      saveNote(selectedChapter.id, noteContent, aiContent || undefined);
    }, 30000);
    return () => clearInterval(interval);
  }, [view, selectedChapter, noteContent, aiContent]);

  const startRecording = () => {
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      toast({ title: "Non supporté", description: "La reconnaissance vocale n'est pas disponible sur ce navigateur.", variant: "destructive" });
      return;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.lang = "fr-FR";
    recognition.continuous = true;
    recognition.interimResults = true;

    let finalTranscript = "";

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript + " ";
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      setTranscript(finalTranscript + interim);
    };

    recognition.onerror = (e: any) => {
      console.error("Speech recognition error", e);
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
    setTranscript("");
  };

  const stopRecording = () => {
    recognitionRef.current?.stop();
    setIsRecording(false);
  };

  const enhanceWithAI = async () => {
    const textToEnhance = transcript || noteContent;
    if (!textToEnhance.trim()) {
      toast({ title: "Aucun contenu", description: "Enregistre un cours vocal ou écris du texte d'abord.", variant: "destructive" });
      return;
    }

    setIsEnhancing(true);
    try {
      const { data, error } = await supabase.functions.invoke("transcribe-and-enhance", {
        body: {
          transcript: textToEnhance,
          subject: selectedSubject?.name || "",
          chapterName: selectedChapter?.name || "",
          schoolLevel: "",
        },
      });

      if (error || data?.error) throw new Error(data?.error || error?.message);

      setAiContent(data.enhancedContent);
      setShowAiView(true);
      await saveNote(selectedChapter!.id, noteContent, data.enhancedContent);
      toast({ title: "✨ Cours amélioré !", description: "L'IA a restructuré et corrigé votre cours." });
    } catch (e: any) {
      toast({ title: "Erreur IA", description: e.message || "Impossible d'améliorer le cours", variant: "destructive" });
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleAddSubject = async () => {
    if (!newSubjectName.trim()) return;
    await addSubject(newSubjectName.trim(), newSubjectColor, newSubjectEmoji);
    setNewSubjectName("");
    setShowAddSubject(false);
    toast({ title: "Matière créée !", description: `"${newSubjectName}" a été ajoutée.` });
  };

  const handleAddChapter = async () => {
    if (!addingChapterForSubject || !newChapterName.trim()) return;
    await addChapter(addingChapterForSubject, newChapterName.trim());
    setExpandedSubjects((prev) => new Set([...prev, addingChapterForSubject]));
    setNewChapterName("");
    setAddingChapterForSubject(null);
  };

  const renderMarkdown = (text: string) => {
    if (!text) return "";
    return text
      .replace(/^### (.+)$/gm, '<h3 class="text-base font-bold mt-4 mb-2 text-foreground">$1</h3>')
      .replace(/^## (.+)$/gm, '<h2 class="text-lg font-bold mt-5 mb-2 text-primary">$1</h2>')
      .replace(/^# (.+)$/gm, '<h1 class="text-xl font-bold mt-6 mb-3 text-primary font-display">$1</h1>')
      .replace(/\*\*(.+?)\*\*/g, '<strong class="font-bold text-foreground">$1</strong>')
      .replace(/\*(.+?)\*/g, '<em class="italic text-muted-foreground">$1</em>')
      .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc text-foreground/90">$1</li>')
      .replace(/^(\d+)\. (.+)$/gm, '<li class="ml-4 list-decimal text-foreground/90">$2</li>')
      .replace(/\n\n/g, '</p><p class="mb-3">')
      .replace(/\n/g, "<br/>");
  };

  if (view === "editor" && selectedChapter && selectedSubject) {
    return (
      <div className="min-h-screen pb-24 bg-background flex flex-col">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-lg border-b border-border/50 shadow-sm">
          <div className="max-w-screen-xl mx-auto px-4 py-3 flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setView("list")} className="shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-0.5">
                <span>{selectedSubject.emoji} {selectedSubject.name}</span>
                <ChevronRight className="w-3 h-3" />
              </div>
              <h1 className="text-lg font-bold font-display text-foreground truncate">{selectedChapter.name}</h1>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {savedIndicator ? (
                <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                  <Check className="w-3 h-3" /> Sauvegardé
                </span>
              ) : null}
              <Button size="sm" onClick={handleSave} disabled={savingNote} className="gradient-primary shadow-colored">
                {savingNote ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span className="hidden sm:inline ml-1">Sauvegarder</span>
              </Button>
            </div>
          </div>
        </header>

        <div className="flex-1 max-w-screen-xl mx-auto w-full px-4 py-4 flex flex-col gap-4">
          {/* Tab switcher */}
          <div className="flex gap-2 p-1 bg-muted rounded-xl">
            <button
              onClick={() => setShowAiView(false)}
              className={cn("flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                !showAiView ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}
            >
              <Edit2 className="w-4 h-4" /> Mon cours
            </button>
            <button
              onClick={() => setShowAiView(true)}
              disabled={!aiContent}
              className={cn("flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                showAiView ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground",
                !aiContent && "opacity-40 cursor-not-allowed")}
            >
              <Brain className="w-4 h-4" /> Version IA
            </button>
          </div>

          {!showAiView ? (
            <div className="flex flex-col gap-4 flex-1">
              {/* Voice recording */}
              <Card className="p-4 border-border/50">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-primary" />
                    <span className="font-semibold text-sm">Enregistrement vocal du cours</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {!isRecording ? (
                      <Button size="sm" onClick={startRecording} variant="outline" className="border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-950">
                        <Mic className="w-4 h-4 mr-1" /> Enregistrer
                      </Button>
                    ) : (
                      <Button size="sm" onClick={stopRecording} className="bg-red-500 hover:bg-red-600 text-white animate-pulse">
                        <MicOff className="w-4 h-4 mr-1" /> Arrêter
                      </Button>
                    )}
                  </div>
                </div>
                {(isRecording || transcript) && (
                  <div className="bg-muted/50 rounded-lg p-3 min-h-[60px] text-sm text-foreground/80">
                    {isRecording && (
                      <div className="flex items-center gap-2 mb-2">
                        <span className="inline-block w-2 h-2 bg-red-500 rounded-full animate-ping" />
                        <span className="text-xs text-red-500 font-medium">Enregistrement en cours...</span>
                      </div>
                    )}
                    {transcript ? (
                      <p className="leading-relaxed">{transcript}</p>
                    ) : (
                      <p className="text-muted-foreground italic">Parlez, la transcription apparaîtra ici...</p>
                    )}
                  </div>
                )}
              </Card>

              {/* Text editor */}
              <div className="flex flex-col gap-2 flex-1">
                <label className="text-sm font-medium text-foreground">Notes manuscrites / saisie clavier</label>
                <Textarea
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  placeholder="Écris ici le contenu de ton cours... Tu peux aussi combiner avec l'enregistrement vocal ci-dessus."
                  className="flex-1 min-h-[280px] resize-none text-sm leading-relaxed bg-card"
                />
              </div>

              {/* AI enhance button */}
              <Button
                onClick={enhanceWithAI}
                disabled={isEnhancing}
                className="gradient-primary shadow-colored w-full py-3 text-base font-semibold"
              >
                {isEnhancing ? (
                  <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> L'IA améliore votre cours...</>
                ) : (
                  <><Sparkles className="w-5 h-5 mr-2" /> Améliorer avec l'IA</>
                )}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                L'IA corrige, structure et enrichit votre cours pour le rendre parfait
              </p>
            </div>
          ) : (
            <div className="flex-1">
              <Card className="p-5 border-primary/20 bg-gradient-to-br from-primary/5 to-secondary/5">
                <div className="flex items-center gap-2 mb-4">
                  <Brain className="w-5 h-5 text-primary" />
                  <span className="font-semibold text-primary">Cours restructuré par l'IA</span>
                </div>
                <div
                  className="prose prose-sm max-w-none text-foreground leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: `<p class="mb-3">${renderMarkdown(aiContent)}</p>` }}
                />
              </Card>
              <Button
                onClick={() => setShowAiView(false)}
                variant="outline"
                className="mt-3 w-full"
              >
                <Edit2 className="w-4 h-4 mr-2" /> Modifier mon cours original
              </Button>
            </div>
          )}
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-lg border-b border-border/50 shadow-sm">
        <div className="max-w-screen-xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-display font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Mes Cours 📓
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Organise et enrichis tes cours avec l'IA
            </p>
          </div>
          <Button
            onClick={() => setShowAddSubject(true)}
            size="sm"
            className="gradient-primary shadow-colored"
          >
            <Plus className="w-4 h-4 mr-1" />
            Matière
          </Button>
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto px-4 md:px-6 py-4">
        {/* Add Subject Dialog */}
        <AnimatePresence>
          {showAddSubject && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <Card className="p-4 mb-4 border-primary/30 bg-primary/5">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Folder className="w-4 h-4 text-primary" /> Nouvelle matière
                </h3>
                <div className="space-y-3">
                  <Input
                    value={newSubjectName}
                    onChange={(e) => setNewSubjectName(e.target.value)}
                    placeholder="Nom de la matière (ex : Mathématiques)"
                    onKeyDown={(e) => e.key === "Enter" && handleAddSubject()}
                    autoFocus
                  />
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Emoji</p>
                    <div className="flex flex-wrap gap-2">
                      {SUBJECT_EMOJIS.map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => setNewSubjectEmoji(emoji)}
                          className={cn("w-9 h-9 rounded-lg text-lg transition-all", newSubjectEmoji === emoji ? "ring-2 ring-primary bg-primary/10" : "hover:bg-muted")}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Couleur</p>
                    <div className="flex flex-wrap gap-2">
                      {SUBJECT_COLORS.map((c) => (
                        <button
                          key={c.value}
                          onClick={() => setNewSubjectColor(c.value)}
                          className={cn("w-8 h-8 rounded-lg transition-all", c.value, newSubjectColor === c.value ? "ring-2 ring-foreground ring-offset-2" : "hover:scale-110")}
                          title={c.name}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleAddSubject} className="gradient-primary flex-1" disabled={!newSubjectName.trim()}>
                      <Check className="w-4 h-4 mr-1" /> Créer
                    </Button>
                    <Button variant="outline" onClick={() => { setShowAddSubject(false); setNewSubjectName(""); }}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty state */}
        {!loading && subjects.length === 0 && (
          <div className="text-center py-16">
            <div className="w-20 h-20 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
              <BookOpen className="w-10 h-10 text-primary/60" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Aucune matière</h3>
            <p className="text-muted-foreground mb-4 max-w-sm mx-auto">
              Crée ta première matière pour commencer à organiser tes cours avec l'aide de l'IA.
            </p>
            <Button onClick={() => setShowAddSubject(true)} className="gradient-primary shadow-colored">
              <Plus className="w-4 h-4 mr-2" /> Créer une matière
            </Button>
          </div>
        )}

        {/* Subject list */}
        <div className="space-y-3">
          {subjects.map((subject) => {
            const subjectChapters = chapters.filter((c) => c.subject_id === subject.id);
            const isExpanded = expandedSubjects.has(subject.id);

            return (
              <motion.div
                key={subject.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="overflow-hidden border-border/50 hover:border-primary/20 transition-all duration-200">
                  {/* Subject header */}
                  <div
                    className="flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => toggleSubject(subject.id)}
                  >
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-sm", subject.color)}>
                      {subject.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground">{subject.name}</h3>
                      <p className="text-xs text-muted-foreground">
                        {subjectChapters.length} chapitre{subjectChapters.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-8 h-8 text-muted-foreground hover:text-red-500"
                        onClick={(e) => { e.stopPropagation(); deleteSubject(subject.id); }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                      {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                    </div>
                  </div>

                  {/* Chapters */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="border-t border-border/30 bg-muted/20">
                          {subjectChapters.map((chapter) => (
                            <div
                              key={chapter.id}
                              className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors group cursor-pointer border-b border-border/20 last:border-0"
                              onClick={() => openEditor(chapter, subject)}
                            >
                              <FileText className="w-4 h-4 text-primary/60 shrink-0" />
                              <span className="flex-1 text-sm font-medium text-foreground">{chapter.name}</span>
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="w-7 h-7 text-muted-foreground hover:text-red-500"
                                  onClick={(e) => { e.stopPropagation(); deleteChapter(chapter.id); }}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                                <ChevronRight className="w-4 h-4 text-muted-foreground" />
                              </div>
                            </div>
                          ))}

                          {/* Add chapter */}
                          {addingChapterForSubject === subject.id ? (
                            <div className="flex items-center gap-2 px-4 py-3 border-t border-border/20">
                              <Input
                                value={newChapterName}
                                onChange={(e) => setNewChapterName(e.target.value)}
                                placeholder="Nom du chapitre..."
                                className="h-8 text-sm"
                                autoFocus
                                onKeyDown={(e) => { if (e.key === "Enter") handleAddChapter(); if (e.key === "Escape") setAddingChapterForSubject(null); }}
                              />
                              <Button size="icon" className="h-8 w-8 gradient-primary shrink-0" onClick={handleAddChapter}>
                                <Check className="w-3.5 h-3.5" />
                              </Button>
                              <Button size="icon" variant="outline" className="h-8 w-8 shrink-0" onClick={() => setAddingChapterForSubject(null)}>
                                <X className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          ) : (
                            <button
                              className="flex items-center gap-2 px-4 py-3 w-full text-sm text-primary/70 hover:text-primary hover:bg-primary/5 transition-colors"
                              onClick={() => { setAddingChapterForSubject(subject.id); setNewChapterName(""); }}
                            >
                              <Plus className="w-3.5 h-3.5" /> Ajouter un chapitre
                            </button>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default CoursNotes;
