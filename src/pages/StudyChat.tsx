import { useState } from "react";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Sparkles, Video } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const StudyChat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("ai-study-chat", {
        body: { message: input }
      });

      if (error) throw error;

      const assistantMessage: Message = {
        role: "assistant",
        content: data.response
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error("Error calling AI:", error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de contacter l'IA",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="container max-w-4xl mx-auto p-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Video className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Assistant d'étude</h1>
            <p className="text-sm text-muted-foreground">
              Demandez des vidéos YouTube sur n'importe quel sujet
            </p>
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="h-[calc(100vh-280px)] mb-4">
          {messages.length === 0 ? (
            <Card className="p-8 text-center border-dashed">
              <Sparkles className="w-12 h-12 mx-auto mb-4 text-primary opacity-50" />
              <h3 className="text-lg font-semibold mb-2">Commencez votre recherche</h3>
              <p className="text-muted-foreground">
                Dites-moi quel sujet vous souhaitez apprendre et je vous proposerai des vidéos YouTube pertinentes.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Exemple: "trigonométrie", "photosynthèse", "révolution française"
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              {messages.map((message, index) => (
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
                            __html: message.content
                              .replace(/🔗 (https:\/\/www\.youtube\.com\/watch\?v=[\w-]+)/g, 
                                '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline font-medium">🔗 Regarder la vidéo</a>')
                              .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                              .replace(/\n/g, '<br/>')
                          }}
                        />
                      ) : (
                        message.content
                      )}
                    </div>
                  </div>
                </Card>
              ))}
              {isLoading && (
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

        {/* Input */}
        <Card className="p-4">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ex: trigonométrie, photosynthèse..."
              className="flex-1"
              disabled={isLoading}
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              size="icon"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </Card>
      </div>

      <BottomNav />
    </div>
  );
};

export default StudyChat;
