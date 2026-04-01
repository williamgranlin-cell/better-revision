import { useState, useEffect, useRef, useCallback } from "react";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import {
  Plus, Trash2, BookOpen, ChevronRight, ChevronDown, Mic, MicOff, Sparkles,
  Save, ArrowLeft, FileText, Folder, Loader2, Check, X, Edit2,
  Volume2, Brain, Settings, RefreshCw, Wand2, Import
} from "lucide-react";
import { useCourseNotes, CourseSubject, CourseChapter } from "@/hooks/useCourseNotes";
import { useCourses } from "@/hooks/useCourses";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import DOMPurify from "dompurify";

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

type View = "list" | "editor" | "live";

const CoursNotes = () => {
  const { subjects, chapters, loading, addSubject, deleteSubject, addChapter, deleteChapter, getNote, saveNote } = useCourseNotes();
  const { courses } = useCourses();
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
  const [noteLoading, setNoteLoading] = useState(false);

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isEnhancing, setIsEnhancing] = useState(false);
  // Live transcription state
  const [liveTranscript, setLiveTranscript] = useState("");
  const [liveAiContent, setLiveAiContent] = useState("");
  const [isLiveRecording, setIsLiveRecording] = useState(false);
  const [liveSeconds, setLiveSeconds] = useState(0);
  const liveRecognitionRef = useRef<any>(null);
  const liveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const liveFinalRef = useRef<string>("");
  const liveEnhanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [micDevices, setMicDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedMicId, setSelectedMicId] = useState<string>("");
  const [showMicSelector, setShowMicSelector] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const recognitionRef = useRef<any>(null);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const finalTranscriptRef = useRef<string>("");

  // Import from courses
  const [showImportCourse, setShowImportCourse] = useState(false);

  // Add subject dialog
  const [showAddSubject, setShowAddSubject] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [newSubjectColor, setNewSubjectColor] = useState(SUBJECT_COLORS[0].value);
  const [newSubjectEmoji, setNewSubjectEmoji] = useState(SUBJECT_EMOJIS[0]);

  // Add chapter dialog
  const [addingChapterForSubject, setAddingChapterForSubject] = useState<string | null>(null);
  const [newChapterName, setNewChapterName] = useState("");

  // Auto-save every 30 seconds
  const autoSaveRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const noteContentRef = useRef(noteContent);
  const aiContentRef = useRef(aiContent);
  noteContentRef.current = noteContent;
  aiContentRef.current = aiContent;

  // Load microphone devices
  useEffect(() => {
    const loadMics = async () => {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = devices.filter((d) => d.kind === "audioinput");
        setMicDevices(audioInputs);
        if (audioInputs.length > 0 && !selectedMicId) {
          setSelectedMicId(audioInputs[0].deviceId);
        }
      } catch {
        // Permission not granted yet
      }
    };
    loadMics();
  }, []);

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
    setNoteContent("");
    setAiContent("");
    setNoteLoading(true);
    try {
      const note = await getNote(chapter.id);
      setNoteContent(note?.content || "");
      setAiContent(note?.ai_enhanced_content || "");
    } finally {
      setNoteLoading(false);
    }
    setView("editor");
  };

  // Setup autosave when in editor
  useEffect(() => {
    if (view !== "editor" || !selectedChapter) return;
    autoSaveRef.current = setInterval(async () => {
      await saveNote(selectedChapter.id, noteContentRef.current, aiContentRef.current || undefined);
    }, 30000);
    return () => {
      if (autoSaveRef.current) clearInterval(autoSaveRef.current);
    };
  }, [view, selectedChapter]);

  const handleSave = async () => {
    if (!selectedChapter) return;
    setSavingNote(true);
    await saveNote(selectedChapter.id, noteContent, aiContent || undefined);
    setSavingNote(false);
    setSavedIndicator(true);
    setTimeout(() => setSavedIndicator(false), 2500);
  };

  // Save before leaving editor
  const handleBackToList = async () => {
    if (selectedChapter && noteContent) {
      await saveNote(selectedChapter.id, noteContent, aiContent || undefined);
    }
    setView("list");
    setTranscript("");
    setIsRecording(false);
    recognitionRef.current?.stop();
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
  };

  const requestMicPermission = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter((d) => d.kind === "audioinput");
      setMicDevices(audioInputs);
      if (audioInputs.length > 0) setSelectedMicId(audioInputs[0].deviceId);
      setShowMicSelector(true);
    } catch {
      toast({
        title: "Accès refusé",
        description: "Veuillez autoriser l'accès au microphone dans les paramètres du navigateur.",
        variant: "destructive",
      });
    }
  };

  const startRecording = () => {
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      toast({
        title: "Non supporté",
        description: "La reconnaissance vocale n'est pas disponible. Utilisez Chrome ou Edge.",
        variant: "destructive",
      });
      return;
    }

    finalTranscriptRef.current = "";
    const recognition = new SpeechRecognitionAPI();
    recognition.lang = "fr-FR";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscriptRef.current += result[0].transcript + " ";
        } else {
          interim += result[0].transcript;
        }
      }
      setTranscript(finalTranscriptRef.current + interim);
    };

    recognition.onerror = (e: any) => {
      console.error("Speech recognition error", e.error);
      if (e.error !== "no-speech") {
        toast({
          title: "Erreur d'enregistrement",
          description: e.error === "not-allowed"
            ? "Accès au microphone refusé. Vérifiez les permissions."
            : `Erreur: ${e.error}`,
          variant: "destructive",
        });
      }
      setIsRecording(false);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    };

    recognition.onend = () => {
      // Auto-restart if recognition ref still points to this instance (handles Chrome's 60s timeout)
      if (recognitionRef.current === recognition) {
        try {
          recognition.start();
        } catch {
          setIsRecording(false);
          if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
        }
      } else {
        setIsRecording(false);
        if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
      setIsRecording(true);
      setTranscript("");
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((s) => s + 1);
      }, 1000);
    } catch {
      toast({ title: "Impossible de démarrer", description: "Vérifiez votre microphone.", variant: "destructive" });
    }
  };

  const stopRecording = () => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsRecording(false);
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  };

  const insertTranscriptInNote = () => {
    if (!transcript.trim()) return;
    setNoteContent((prev) => prev + (prev ? "\n\n" : "") + transcript.trim());
    setTranscript("");
    toast({ title: "Transcription insérée", description: "Le texte a été ajouté à vos notes." });
  };

  const enhanceWithAI = async () => {
    const textToEnhance = noteContent.trim() || transcript.trim();
    if (!textToEnhance) {
      toast({ title: "Aucun contenu", description: "Écris un cours ou enregistre ta voix d'abord.", variant: "destructive" });
      return;
    }

    setIsEnhancing(true);
    setAiContent("");
    setShowAiView(true);

    try {
      const session = (await supabase.auth.getSession()).data.session;
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/transcribe-and-enhance`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            transcript: textToEnhance,
            subject: selectedSubject?.name || "",
            chapterName: selectedChapter?.name || "",
            schoolLevel: "",
          }),
        }
      );

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.error || "Erreur du service IA");
      }

      if (!resp.body) throw new Error("Streaming non supporté");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              fullContent += content;
              setAiContent(fullContent);
            }
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }

      // Flush remaining buffer
      if (buffer.trim()) {
        for (let raw of buffer.split("\n")) {
          if (!raw) continue;
          if (raw.endsWith("\r")) raw = raw.slice(0, -1);
          if (!raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              fullContent += content;
              setAiContent(fullContent);
            }
          } catch { /* ignore */ }
        }
      }

      // Save the complete AI content
      if (fullContent) {
        await saveNote(selectedChapter!.id, noteContent, fullContent);
        toast({ title: "✨ Cours amélioré !", description: "L'IA a restructuré et corrigé votre cours." });
      }
    } catch (e: any) {
      toast({ title: "Erreur IA", description: e.message || "Impossible d'améliorer le cours", variant: "destructive" });
    } finally {
      setIsEnhancing(false);
    }
  };

  const importFromCourse = (courseName: string) => {
    const text = `# ${courseName}\n\nCours importé depuis le calendrier de révision.\n\n`;
    setNoteContent((prev) => prev + text);
    setShowImportCourse(false);
    toast({ title: "Cours importé", description: `"${courseName}" a été inséré dans l'éditeur.` });
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

  const formatRecordingTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const renderMarkdown = (text: string) => {
    if (!text) return "";
    const html = text
      .replace(/^### (.+)$/gm, '<h3 class="text-base font-bold mt-4 mb-2 text-foreground">$1</h3>')
      .replace(/^## (.+)$/gm, '<h2 class="text-lg font-bold mt-5 mb-2 text-primary">$1</h2>')
      .replace(/^# (.+)$/gm, '<h1 class="text-xl font-bold mt-6 mb-3 text-primary font-display">$1</h1>')
      .replace(/\*\*(.+?)\*\*/g, '<strong class="font-bold text-foreground">$1</strong>')
      .replace(/\*(.+?)\*/g, '<em class="italic text-muted-foreground">$1</em>')
      .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc text-foreground/90 mb-1">$1</li>')
      .replace(/^(\d+)\. (.+)$/gm, '<li class="ml-4 list-decimal text-foreground/90 mb-1">$2</li>')
      .replace(/\n\n/g, '</p><p class="mb-3">')
      .replace(/\n/g, "<br/>");
    return DOMPurify.sanitize(html);
  };

  // ─── EDITOR VIEW ─────────────────────────────────────────────────────────────
  if (view === "editor" && selectedChapter && selectedSubject) {
    return (
      <div className="min-h-screen pb-24 bg-background flex flex-col">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-lg border-b border-border/50 shadow-sm">
          <div className="max-w-screen-xl mx-auto px-4 py-3 flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={handleBackToList} className="shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-0.5">
                <span className={cn("w-2.5 h-2.5 rounded-full", selectedSubject.color)} />
                <span>{selectedSubject.emoji} {selectedSubject.name}</span>
                <ChevronRight className="w-3 h-3" />
              </div>
              <h1 className="text-lg font-bold font-display text-foreground truncate">{selectedChapter.name}</h1>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <AnimatePresence>
                {savedIndicator && (
                  <motion.span
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 font-medium"
                  >
                    <Check className="w-3.5 h-3.5" /> Sauvegardé
                  </motion.span>
                )}
              </AnimatePresence>
              <Button size="sm" onClick={handleSave} disabled={savingNote} className="gradient-primary shadow-colored">
                {savingNote ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span className="hidden sm:inline ml-1">Sauvegarder</span>
              </Button>
            </div>
          </div>
        </header>

        {noteLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="flex-1 max-w-screen-xl mx-auto w-full px-4 py-4 flex flex-col gap-4">
            {/* Tab switcher */}
            <div className="flex gap-1.5 p-1.5 bg-muted rounded-xl">
              <button
                onClick={() => setShowAiView(false)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                  !showAiView ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Edit2 className="w-4 h-4" /> Mon cours
              </button>
              <button
                onClick={() => aiContent && setShowAiView(true)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                  showAiView ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground",
                  !aiContent && "opacity-40 cursor-not-allowed"
                )}
              >
                <Brain className="w-4 h-4" /> Version IA {aiContent && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
              </button>
            </div>

            {!showAiView ? (
              <div className="flex flex-col gap-4 flex-1">
                {/* ── Voice recording card ── */}
                <Card className="p-4 border-border/50 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", isRecording ? "bg-red-500/10" : "bg-primary/10")}>
                        <Volume2 className={cn("w-4 h-4", isRecording ? "text-red-500" : "text-primary")} />
                      </div>
                      <div>
                        <p className="font-semibold text-sm">Enregistrement vocal</p>
                        <p className="text-xs text-muted-foreground">
                          {isRecording ? `⏱ ${formatRecordingTime(recordingSeconds)}` : "Transcription du cours en temps réel"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={requestMicPermission}
                        className="text-muted-foreground hover:text-foreground h-8 w-8 p-0"
                        title="Choisir un microphone"
                      >
                        <Settings className="w-3.5 h-3.5" />
                      </Button>
                      {!isRecording ? (
                        <Button
                          size="sm"
                          onClick={startRecording}
                          className="bg-red-500 hover:bg-red-600 text-white shadow-sm"
                        >
                          <Mic className="w-4 h-4 mr-1" /> Enregistrer
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={stopRecording}
                          variant="outline"
                          className="border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                        >
                          <MicOff className="w-4 h-4 mr-1" /> Arrêter
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Mic selector */}
                  <AnimatePresence>
                    {showMicSelector && micDevices.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mb-3 overflow-hidden"
                      >
                        <p className="text-xs text-muted-foreground mb-1.5 font-medium">Sélectionner un microphone :</p>
                        <div className="flex flex-col gap-1">
                          {micDevices.map((device) => (
                            <button
                              key={device.deviceId}
                              onClick={() => { setSelectedMicId(device.deviceId); setShowMicSelector(false); }}
                              className={cn(
                                "flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-colors",
                                selectedMicId === device.deviceId
                                  ? "bg-primary/10 text-primary font-medium"
                                  : "hover:bg-muted text-foreground"
                              )}
                            >
                              <Mic className="w-3.5 h-3.5 shrink-0" />
                              {device.label || `Microphone ${micDevices.indexOf(device) + 1}`}
                              {selectedMicId === device.deviceId && <Check className="w-3.5 h-3.5 ml-auto" />}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Live transcript */}
                  <AnimatePresence>
                    {(isRecording || transcript) && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                      >
                        <div className={cn(
                          "rounded-xl p-3 min-h-[72px] text-sm text-foreground/85 border transition-all duration-300",
                          isRecording ? "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800" : "bg-muted/50 border-border/50"
                        )}>
                          {isRecording && (
                            <div className="flex items-center gap-2 mb-2">
                              <span className="inline-block w-2 h-2 bg-red-500 rounded-full animate-ping" />
                              <span className="text-xs text-red-500 font-semibold tracking-wide">ENREGISTREMENT</span>
                            </div>
                          )}
                          {transcript ? (
                            <p className="leading-relaxed">{transcript}</p>
                          ) : (
                            <p className="text-muted-foreground italic text-xs">Parlez distinctement, la transcription apparaît ici en temps réel...</p>
                          )}
                        </div>
                        {transcript && !isRecording && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={insertTranscriptInNote}
                            className="mt-2 w-full text-primary border-primary/30 hover:bg-primary/5"
                          >
                            <Plus className="w-3.5 h-3.5 mr-1.5" /> Insérer dans mes notes
                          </Button>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>

                {/* Import from courses */}
                <AnimatePresence>
                  {showImportCourse && courses.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                    >
                      <Card className="p-4 border-primary/20 bg-primary/5">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-sm font-semibold">Importer depuis mes cours de révision</p>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowImportCourse(false)}>
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                        <div className="flex flex-col gap-1 max-h-40 overflow-y-auto">
                          {courses.map((c) => (
                            <button
                              key={c.id}
                              onClick={() => importFromCourse(c.name)}
                              className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-primary/10 text-sm text-left transition-colors"
                            >
                              <span className={cn("w-3 h-3 rounded-full shrink-0", c.color || "bg-primary")} />
                              {c.name}
                            </button>
                          ))}
                        </div>
                      </Card>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Text editor */}
                <div className="flex flex-col gap-2 flex-1">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-foreground">Notes du cours</label>
                    <div className="flex gap-2">
                      {courses.length > 0 && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setShowImportCourse(!showImportCourse)}
                          className="text-xs h-7 px-2 text-muted-foreground hover:text-foreground"
                        >
                          <Import className="w-3.5 h-3.5 mr-1" /> Importer un cours
                        </Button>
                      )}
                      <span className="text-xs text-muted-foreground self-center">
                        {noteContent.length > 0 && `${noteContent.length} car.`}
                      </span>
                    </div>
                  </div>
                  <Textarea
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    placeholder="Écris ici le contenu de ton cours... Tu peux aussi combiner avec l'enregistrement vocal ci-dessus."
                    className="flex-1 min-h-[260px] resize-none text-sm leading-relaxed bg-card font-mono"
                  />
                  <p className="text-xs text-muted-foreground">
                    💾 Sauvegarde automatique toutes les 30 secondes
                  </p>
                </div>

                {/* AI enhance button */}
                <Button
                  onClick={enhanceWithAI}
                  disabled={isEnhancing || (!noteContent.trim() && !transcript.trim())}
                  className="gradient-primary shadow-colored w-full py-3 text-base font-semibold"
                >
                  {isEnhancing ? (
                    <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> L'IA améliore votre cours...</>
                  ) : (
                    <><Wand2 className="w-5 h-5 mr-2" /> Améliorer avec l'IA ✨</>
                  )}
                </Button>
              </div>
            ) : (
              // ── AI VIEW ──
              <div className="flex-1 flex flex-col gap-3">
                <Card className="p-5 border-primary/20 bg-gradient-to-br from-primary/5 to-secondary/5 flex-1">
                  <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border/30">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Brain className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-primary text-sm">Cours restructuré par l'IA</p>
                      <p className="text-xs text-muted-foreground">Orthographe et structure corrigées</p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={enhanceWithAI}
                      disabled={isEnhancing}
                      className="ml-auto text-xs h-7 px-2"
                    >
                      {isEnhancing ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3 mr-1" />}
                      Régénérer
                    </Button>
                  </div>
                  <div
                    className="prose prose-sm max-w-none text-foreground leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: `<p class="mb-3">${renderMarkdown(aiContent)}</p>` }}
                  />
                </Card>
                <Button
                  onClick={() => setShowAiView(false)}
                  variant="outline"
                  className="w-full"
                >
                  <Edit2 className="w-4 h-4 mr-2" /> Modifier mon cours original
                </Button>
              </div>
            )}
          </div>
        )}
        <BottomNav />
      </div>
    );
  }

  // ─── LIST VIEW ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen pb-24 bg-background">
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-lg border-b border-border/50 shadow-sm">
        <div className="max-w-screen-xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-display font-bold bg-gradient-primary bg-clip-text text-transparent">
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
              className="mb-4"
            >
              <Card className="p-4 border-primary/30 bg-primary/5">
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
                          className={cn(
                            "w-9 h-9 rounded-lg text-lg transition-all",
                            newSubjectEmoji === emoji ? "ring-2 ring-primary bg-primary/10 scale-110" : "hover:bg-muted"
                          )}
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
                          className={cn(
                            "w-8 h-8 rounded-lg transition-all",
                            c.value,
                            newSubjectColor === c.value ? "ring-2 ring-foreground ring-offset-2 scale-110" : "hover:scale-105"
                          )}
                          title={c.name}
                        />
                      ))}
                    </div>
                  </div>
                  {/* Preview */}
                  {newSubjectName && (
                    <div className="flex items-center gap-3 p-3 bg-muted/40 rounded-xl">
                      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-sm", newSubjectColor)}>
                        {newSubjectEmoji}
                      </div>
                      <span className="font-semibold text-sm">{newSubjectName}</span>
                    </div>
                  )}
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

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}

        {/* Empty state */}
        {!loading && subjects.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <div className="w-24 h-24 mx-auto mb-5 bg-primary/10 rounded-full flex items-center justify-center">
              <BookOpen className="w-12 h-12 text-primary/60" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Aucune matière</h3>
            <p className="text-muted-foreground mb-6 max-w-sm mx-auto text-sm">
              Crée ta première matière pour commencer à organiser tes cours avec l'aide de l'IA.
            </p>
            <Button onClick={() => setShowAddSubject(true)} className="gradient-primary shadow-colored">
              <Plus className="w-4 h-4 mr-2" /> Créer une matière
            </Button>
          </motion.div>
        )}

        {/* Subject list */}
        <div className="space-y-3">
          {subjects.map((subject, idx) => {
            const subjectChapters = chapters.filter((c) => c.subject_id === subject.id);
            const isExpanded = expandedSubjects.has(subject.id);

            return (
              <motion.div
                key={subject.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
              >
                <Card className="overflow-hidden border-border/50 hover:border-primary/30 hover:shadow-md transition-all duration-200">
                  {/* Subject header */}
                  <div
                    className="flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/30 transition-colors select-none"
                    onClick={() => toggleSubject(subject.id)}
                  >
                    <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center text-xl shadow-sm shrink-0", subject.color)}>
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
                        className="w-8 h-8 text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100"
                        onClick={(e) => { e.stopPropagation(); deleteSubject(subject.id); }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                      <motion.div
                        animate={{ rotate: isExpanded ? 90 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </motion.div>
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
                          {subjectChapters.length === 0 && (
                            <p className="text-xs text-muted-foreground italic px-4 py-3">
                              Aucun chapitre — ajoute-en un ci-dessous
                            </p>
                          )}
                          {subjectChapters.map((chapter) => (
                            <div
                              key={chapter.id}
                              className="flex items-center gap-3 px-4 py-3 hover:bg-primary/5 transition-colors group cursor-pointer border-b border-border/15 last:border-0"
                              onClick={() => openEditor(chapter, subject)}
                            >
                              <FileText className="w-4 h-4 text-primary/50 shrink-0" />
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
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleAddChapter();
                                  if (e.key === "Escape") setAddingChapterForSubject(null);
                                }}
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
