import { useState } from "react";
import { PageTransition } from "@/components/PageTransition";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SubjectSelect } from "@/components/SubjectSelect";
import { Send, Sparkles, Video, BookOpen, Loader2, GraduationCap, HelpCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import DOMPurify from "dompurify";

interface Message {
  role: "user" | "assistant";
  content: string;
}

type Difficulty = "easy" | "medium" | "hard";
type ActiveTab = "videos" | "exercises" | "homework";

const StudyChat = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>("videos");
  
  // Video chat state
  const [videoMessages, setVideoMessages] = useState<Message[]>([]);
  const [videoInput, setVideoInput] = useState("");
  const [videoLoading, setVideoLoading] = useState(false);
  
  // Exercise state
  const [exerciseInput, setExerciseInput] = useState("");
  const [exerciseResult, setExerciseResult] = useState("");
  const [exerciseLoading, setExerciseLoading] = useState(false);
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [exerciseCount, setExerciseCount] = useState(3);

  // Homework help state
  const [homeworkMessages, setHomeworkMessages] = useState<Message[]>([]);
  const [homeworkInput, setHomeworkInput] = useState("");
  const [homeworkSubject, setHomeworkSubject] = useState("");
  const [homeworkLoading, setHomeworkLoading] = useState(false);
  
  const { toast } = useToast();

  const handleVideoSend = async () => {
    if (!videoInput.trim() || videoLoading) return;

    const userMessage: Message = { role: "user", content: videoInput };
    setVideoMessages(prev => [...prev, userMessage]);
    setVideoInput("");
    setVideoLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("ai-study-chat", {
        body: { message: videoInput }
      });

      if (error) throw error;

      const assistantMessage: Message = {
        role: "assistant",
        content: data.response
      };

      setVideoMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error("Error calling AI:", error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de contacter l'IA",
        variant: "destructive",
      });
    } finally {
      setVideoLoading(false);
    }
  };

  const handleExerciseGenerate = async () => {
    if (!exerciseInput.trim() || exerciseLoading) return;

    setExerciseLoading(true);
    setExerciseResult("");

    try {
      const { data, error } = await supabase.functions.invoke("generate-exercises", {
        body: { 
          topic: exerciseInput,
          difficulty,
          count: exerciseCount
        }
      });

      if (error) throw error;

      if (data.exercises) {
        setExerciseResult(data.exercises);
      }
    } catch (error: any) {
      console.error("Error generating exercises:", error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de générer les exercices",
        variant: "destructive",
      });
    } finally {
      setExerciseLoading(false);
    }
  };

  const handleHomeworkSend = async () => {
    if (!homeworkInput.trim() || homeworkLoading) return;

    const userMessage: Message = { role: "user", content: homeworkInput };
    setHomeworkMessages(prev => [...prev, userMessage]);
    const questionText = homeworkInput;
    setHomeworkInput("");
    setHomeworkLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("ai-homework-help", {
        body: { 
          question: questionText,
          subject: homeworkSubject || undefined
        }
      });

      if (error) throw error;

      const assistantMessage: Message = {
        role: "assistant",
        content: data.answer
      };

      setHomeworkMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error("Error calling AI:", error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de contacter l'IA",
        variant: "destructive",
      });
    } finally {
      setHomeworkLoading(false);
    }
  };

  const handleVideoKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleVideoSend();
    }
  };

  const handleExerciseKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleExerciseGenerate();
    }
  };

  const handleHomeworkKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleHomeworkSend();
    }
  };

  const formatVideoMessage = (content: string) => {
    let formatted = content
      .replace(/🔗 (https:\/\/www\.youtube\.com\/watch\?v=[\w-]+)/g, 
        '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline font-medium">🔗 Regarder la vidéo</a>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br/>');
    
    return DOMPurify.sanitize(formatted, {
      ALLOWED_TAGS: ['a', 'strong', 'br', 'p', 'div', 'span'],
      ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
      ALLOWED_URI_REGEXP: /^https:\/\/www\.youtube\.com\/watch\?v=[\w-]+$/
    });
  };

  const formatExerciseContent = (content: string) => {
    let formatted = content
      .replace(/\*\*(.*?)\*\*/g, '<strong class="text-foreground">$1</strong>')
      .replace(/📝/g, '<span class="text-xl">📝</span>')
      .replace(/---/g, '<hr class="my-4 border-border"/>')
      .replace(/\n/g, '<br/>');
    
    return DOMPurify.sanitize(formatted, {
      ALLOWED_TAGS: ['strong', 'br', 'p', 'div', 'span', 'hr'],
      ALLOWED_ATTR: ['class']
    });
  };

  const formatHomeworkMessage = (content: string) => {
    let formatted = content
      .replace(/\*\*(.*?)\*\*/g, '<strong class="text-foreground">$1</strong>')
      .replace(/\n/g, '<br/>');
    
    return DOMPurify.sanitize(formatted, {
      ALLOWED_TAGS: ['strong', 'br', 'p', 'div', 'span', 'em', 'code'],
      ALLOWED_ATTR: ['class']
    });
  };

  const getDifficultyLabel = (diff: Difficulty) => {
    switch (diff) {
      case "easy": return "Facile";
      case "medium": return "Moyen";
      case "hard": return "Difficile";
    }
  };

  return (
    <PageTransition>
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-lg border-b border-border/50 shadow-sm">
        <div className="container max-w-4xl md:max-w-5xl lg:max-w-6xl mx-auto px-4 md:px-6 py-4">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <HelpCircle className="w-5 h-5 md:w-6 md:h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl lg:text-3xl font-display font-bold text-foreground">Aide 🤗</h1>
              <p className="text-sm md:text-base text-muted-foreground">
                Vidéos, exercices et assistance devoirs
              </p>
            </div>
          </div>
        </div>
      </header>
      <div className="container max-w-4xl md:max-w-5xl lg:max-w-6xl mx-auto p-4 md:p-6">

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ActiveTab)}>
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="videos" className="flex items-center gap-2">
              <Video className="h-4 w-4" />
              <span className="hidden sm:inline">Vidéos</span>
            </TabsTrigger>
            <TabsTrigger value="exercises" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Exercices</span>
            </TabsTrigger>
            <TabsTrigger value="homework" className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4" />
              <span className="hidden sm:inline">Devoirs</span>
            </TabsTrigger>
          </TabsList>

          {/* Videos Tab */}
          <TabsContent value="videos" className="space-y-4">
            <ScrollArea className="h-[calc(100vh-350px)]">
              {videoMessages.length === 0 ? (
                <Card className="p-8 text-center border-dashed">
                  <Video className="w-12 h-12 mx-auto mb-4 text-primary opacity-50" />
                  <h3 className="text-lg font-display font-semibold mb-2">Rechercher des vidéos</h3>
                  <p className="text-muted-foreground">
                    Dites-moi quel sujet vous souhaitez apprendre et je vous proposerai des vidéos YouTube pertinentes.
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Exemple: "trigonométrie", "photosynthèse", "révolution française"
                  </p>
                </Card>
              ) : (
                <div className="space-y-4">
                  {videoMessages.map((message, index) => (
                    <Card
                      key={index}
                      className={`p-4 ${
                        message.role === "user"
                          ? "bg-primary/5 ml-12"
                          : "bg-muted/50 mr-12"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {message.role === "assistant" && (
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <Sparkles className="w-4 h-4 text-primary" />
                          </div>
                        )}
                        <div className="flex-1 whitespace-pre-wrap text-sm">
                          {message.role === "assistant" ? (
                            <div 
                              dangerouslySetInnerHTML={{
                                __html: formatVideoMessage(message.content)
                              }}
                            />
                          ) : (
                            message.content
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                  {videoLoading && (
                    <Card className="p-4 bg-muted/50 mr-12">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Sparkles className="w-4 h-4 text-primary animate-pulse" />
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Recherche de vidéos en cours...
                        </div>
                      </div>
                    </Card>
                  )}
                </div>
              )}
            </ScrollArea>

            <Card className="p-4">
              <div className="flex gap-2">
                <Input
                  value={videoInput}
                  onChange={(e) => setVideoInput(e.target.value)}
                  onKeyPress={handleVideoKeyPress}
                  placeholder="Ex: trigonométrie, photosynthèse..."
                  className="flex-1"
                  disabled={videoLoading}
                  maxLength={500}
                />
                <Button
                  onClick={handleVideoSend}
                  disabled={!videoInput.trim() || videoLoading}
                  size="icon"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          </TabsContent>

          {/* Exercises Tab */}
          <TabsContent value="exercises" className="space-y-4">
            {/* Options */}
            <Card className="p-4">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Difficulté</label>
                  <Select value={difficulty} onValueChange={(v) => setDifficulty(v as Difficulty)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="easy">Facile</SelectItem>
                      <SelectItem value="medium">Moyen</SelectItem>
                      <SelectItem value="hard">Difficile</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Nombre</label>
                  <Select value={String(exerciseCount)} onValueChange={(v) => setExerciseCount(Number(v))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 exercice</SelectItem>
                      <SelectItem value="2">2 exercices</SelectItem>
                      <SelectItem value="3">3 exercices</SelectItem>
                      <SelectItem value="5">5 exercices</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-2">
                <Input
                  value={exerciseInput}
                  onChange={(e) => setExerciseInput(e.target.value)}
                  onKeyPress={handleExerciseKeyPress}
                  placeholder="Sujet des exercices (ex: équations du second degré)"
                  className="flex-1"
                  disabled={exerciseLoading}
                  maxLength={200}
                />
                <Button
                  onClick={handleExerciseGenerate}
                  disabled={!exerciseInput.trim() || exerciseLoading}
                >
                  {exerciseLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Générer"
                  )}
                </Button>
              </div>
            </Card>

            {/* Result */}
            <ScrollArea className="h-[calc(100vh-450px)]">
              {!exerciseResult && !exerciseLoading ? (
                <Card className="p-8 text-center border-dashed">
                  <BookOpen className="w-12 h-12 mx-auto mb-4 text-primary opacity-50" />
                  <h3 className="text-lg font-display font-semibold mb-2">Générer des exercices</h3>
                  <p className="text-muted-foreground">
                    Entrez un sujet et je créerai des exercices personnalisés avec les solutions.
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Exemple: "dérivées", "verbes irréguliers anglais", "guerre froide"
                  </p>
                </Card>
              ) : exerciseLoading ? (
                <Card className="p-8 text-center">
                  <Loader2 className="w-12 h-12 mx-auto mb-4 text-primary animate-spin" />
                  <h3 className="text-lg font-display font-semibold mb-2">Génération en cours...</h3>
                  <p className="text-muted-foreground">
                    Création de {exerciseCount} exercice{exerciseCount > 1 ? "s" : ""} niveau {getDifficultyLabel(difficulty).toLowerCase()}
                  </p>
                </Card>
              ) : (
                <Card className="p-6">
                  <div className="flex items-center gap-2 mb-4 pb-3 border-b">
                    <BookOpen className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold">Exercices - {exerciseInput}</h3>
                    <span className="ml-auto text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                      {getDifficultyLabel(difficulty)}
                    </span>
                  </div>
                  <div 
                    className="prose prose-sm max-w-none text-foreground"
                    dangerouslySetInnerHTML={{
                      __html: formatExerciseContent(exerciseResult)
                    }}
                  />
                </Card>
              )}
            </ScrollArea>
          </TabsContent>

          {/* Homework Help Tab */}
          <TabsContent value="homework" className="space-y-4">
            <ScrollArea className="h-[calc(100vh-400px)]">
              {homeworkMessages.length === 0 ? (
                <Card className="p-8 text-center border-dashed">
                  <GraduationCap className="w-12 h-12 mx-auto mb-4 text-primary opacity-50" />
                  <h3 className="text-lg font-display font-semibold mb-2">Aide aux devoirs</h3>
                  <p className="text-muted-foreground">
                    Posez-moi vos questions sur vos devoirs et je vous guiderai vers la solution.
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Je vous explique étape par étape sans donner directement la réponse !
                  </p>
                </Card>
              ) : (
                <div className="space-y-4">
                  {homeworkMessages.map((message, index) => (
                    <Card
                      key={index}
                      className={`p-4 ${
                        message.role === "user"
                          ? "bg-primary/5 ml-12"
                          : "bg-muted/50 mr-12"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {message.role === "assistant" && (
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <GraduationCap className="w-4 h-4 text-primary" />
                          </div>
                        )}
                        <div className="flex-1 whitespace-pre-wrap text-sm">
                          {message.role === "assistant" ? (
                            <div 
                              dangerouslySetInnerHTML={{
                                __html: formatHomeworkMessage(message.content)
                              }}
                            />
                          ) : (
                            message.content
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                  {homeworkLoading && (
                    <Card className="p-4 bg-muted/50 mr-12">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <GraduationCap className="w-4 h-4 text-primary animate-pulse" />
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Réflexion en cours...
                        </div>
                      </div>
                    </Card>
                  )}
                </div>
              )}
            </ScrollArea>

            <Card className="p-4">
              <div className="mb-3">
                <SubjectSelect
                  value={homeworkSubject}
                  onValueChange={setHomeworkSubject}
                  allLabel="Toutes matières"
                />
              </div>
              <div className="flex gap-2">
                <Textarea
                  value={homeworkInput}
                  onChange={(e) => setHomeworkInput(e.target.value)}
                  onKeyPress={handleHomeworkKeyPress}
                  placeholder="Décrivez votre exercice ou posez votre question..."
                  className="flex-1 min-h-[80px] resize-none"
                  disabled={homeworkLoading}
                  maxLength={2000}
                />
                <Button
                  onClick={handleHomeworkSend}
                  disabled={!homeworkInput.trim() || homeworkLoading}
                  size="icon"
                  className="h-auto"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <BottomNav />
    </div>
    </PageTransition>
  );
};

export default StudyChat;
