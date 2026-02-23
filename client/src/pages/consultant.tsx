import { useState, useRef, useEffect, useCallback } from "react";
import { Link, useSearch } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { TOTAL_DOMAIN_COUNT } from "@/config/tierConfig";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  ArrowLeft,
  ChefHat,
  Send,
  LogOut,
  Loader2,
  User,
  Plus,
  MessageSquare,
  Trash2,
  Clock,
  Users,
  DollarSign,
  Star,
  Briefcase,
  PanelLeftClose,
  PanelLeftOpen,
  ImagePlus,
  X,
  Lock,
  ArrowRight
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useToast } from "@/hooks/use-toast";
import { useTierAccess } from "@/hooks/use-tier-access";

interface AttachedImage {
  base64: string;
  previewUrl: string;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  imageUrls?: string[];
}

interface Conversation {
  id: number;
  userId: string;
  title: string;
  createdAt: string;
}

interface DbMessage {
  id: number;
  conversationId: number;
  role: string;
  content: string;
  createdAt: string;
}

const QUESTION_CATEGORIES = [
  {
    label: "Staffing & Labor",
    icon: Users,
    questions: [
      "How do I handle a no-call no-show during a busy shift?",
      "What's a fair tip-out structure for my servers and support staff?",
    ],
  },
  {
    label: "Cost & Margins",
    icon: DollarSign,
    questions: [
      "My food cost is out of control. Where do I start?",
      "How do I figure out if a menu item is actually profitable?",
    ],
  },
  {
    label: "Service & Guest Experience",
    icon: Star,
    questions: [
      "What's a good comp policy for service failures?",
      "How do I deal with a bad Google review from last night?",
    ],
  },
  {
    label: "Leadership & Operations",
    icon: Briefcase,
    questions: [
      "I'm working 70 hours a week. How do I start delegating?",
      "How do I hold my managers accountable without micromanaging?",
    ],
  },
];

function getContextAwareQuestions(profile: any): typeof QUESTION_CATEGORIES {
  if (!profile) return QUESTION_CATEGORIES;

  const categories = QUESTION_CATEGORIES.map((cat) => ({ ...cat, questions: [...cat.questions] }));

  if (profile.staffCount && profile.staffCount > 20) {
    categories[3].questions = [
      "With a team my size, how do I build management layers that actually work?",
      "How do I hold my managers accountable without micromanaging?",
    ];
  }

  if (profile.restaurantType === "bar") {
    categories[2].questions = [
      "What's a good policy for cutting off intoxicated guests?",
      "How do I handle late-night incidents without calling the cops every time?",
    ];
  }

  const hour = new Date().getHours();
  const dayOfWeek = new Date().getDay();

  if (dayOfWeek === 5 && hour >= 12) {
    categories[0].questions[0] = "How should I prepare my team for a busy weekend service?";
  } else if (hour < 11) {
    categories[3].questions[0] = "What should I prioritize in my morning walkthrough before open?";
  }

  return categories;
}

export default function ConsultantPage() {
  const { user, logout } = useAuth();
  const { canAccessDomain } = useTierAccess();
  const queryClient = useQueryClient();
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [autoSentRef, setAutoSentRef] = useState(false);
  const [attachedImages, setAttachedImages] = useState<AttachedImage[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { toast } = useToast();

  const { data: conversationList } = useQuery<Conversation[]>({
    queryKey: ["/api/consultant/conversations"],
  });

  const { data: restaurantProfile } = useQuery<any>({
    queryKey: ["/api/restaurant-profile"],
  });

  const categories = getContextAwareQuestions(restaurantProfile);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    const prompt = params.get("prompt");
    const context = params.get("context");
    if (prompt && !autoSentRef && messages.length === 0) {
      setAutoSentRef(true);
      submitQuestion(prompt, context || undefined);
    }
  }, []);

  const loadConversation = useCallback(async (convId: number) => {
    try {
      const res = await fetch(`/api/consultant/conversations/${convId}/messages`, { credentials: "include" });
      if (!res.ok) return;
      const msgs: DbMessage[] = await res.json();
      setMessages(
        msgs.map((m) => ({
          id: m.id.toString(),
          role: m.role as "user" | "assistant",
          content: m.content,
        }))
      );
      setActiveConversationId(convId);
      setShowHistory(false);
    } catch (err) {
      console.error("Failed to load conversation:", err);
    }
  }, []);

  const startNewConversation = useCallback(() => {
    setMessages([]);
    setActiveConversationId(null);
    setInput("");
    setAttachedImages([]);
  }, []);

  const handleImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      if (file.size > 10 * 1024 * 1024) {
        toast({ title: "Image too large", description: `"${file.name}" is over 10MB and was skipped.`, variant: "destructive" });
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(",")[1];
        setAttachedImages((prev) => [...prev, { base64, previewUrl: result }]);
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [toast]);

  const removeAttachedImage = useCallback((index: number) => {
    setAttachedImages((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const deleteConversation = useCallback(async (convId: number) => {
    try {
      await apiRequest("DELETE", `/api/consultant/conversations/${convId}`);
      queryClient.invalidateQueries({ queryKey: ["/api/consultant/conversations"] });
      if (activeConversationId === convId) {
        startNewConversation();
      }
    } catch (err) {
      console.error("Failed to delete conversation:", err);
    }
  }, [activeConversationId, startNewConversation, queryClient]);

  const submitQuestion = async (questionText: string, context?: string) => {
    if ((!questionText.trim() && attachedImages.length === 0) || isLoading) return;

    const messageText = questionText.trim() || (attachedImages.length > 0 ? "What do you see in these images?" : "");
    const currentImages = [...attachedImages];

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: messageText,
      imageUrls: currentImages.length > 0 ? currentImages.map((img) => img.previewUrl) : undefined,
    };

    const currentMessages = [...messages, userMessage];
    setMessages(currentMessages);
    setInput("");
    setAttachedImages([]);
    setIsLoading(true);

    const assistantId = (Date.now() + 1).toString();
    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: "assistant", content: "" },
    ]);

    const history = messages.map((m) => ({ role: m.role, content: m.content }));

    try {
      const response = await fetch("/api/consultant/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          question: messageText,
          context,
          images: currentImages.length > 0 ? currentImages.map((img) => img.base64) : undefined,
          conversationId: activeConversationId || undefined,
          history: history.length > 0 ? history : undefined,
        }),
      });

      if (!response.ok) throw new Error("Failed to get response");

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader available");

      const decoder = new TextDecoder();
      let fullContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.content) {
                fullContent += data.content;
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantId
                      ? { ...msg, content: fullContent }
                      : msg
                  )
                );
              }
              if (data.conversationId && !activeConversationId) {
                setActiveConversationId(data.conversationId);
                queryClient.invalidateQueries({ queryKey: ["/api/consultant/conversations"] });
              }
            } catch {
            }
          }
        }
      }
      queryClient.invalidateQueries({ queryKey: ["/api/consultant/conversations"] });
    } catch (error) {
      console.error("Error:", error);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantId
            ? { ...msg, content: "Sorry, I encountered an error. Please try again." }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    submitQuestion(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;
    return d.toLocaleDateString();
  };

  return (
    <div className="h-screen bg-background flex flex-col">
      <header className="border-b border-border sticky top-0 bg-background/95 backdrop-blur z-50" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-3 flex-wrap">
            <Link href="/">
              <Button variant="ghost" size="icon" data-testid="button-back">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowHistory(!showHistory)}
              data-testid="button-toggle-history"
            >
              {showHistory ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
            </Button>
            <div className="flex items-center gap-2">
              <ChefHat className="h-5 w-5 text-primary" />
              <span className="font-bold text-sm sm:text-base" data-testid="text-page-title">The Consultant</span>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-wrap">
            <Button
              variant="ghost"
              size="sm"
              onClick={startNewConversation}
              data-testid="button-new-conversation"
            >
              <Plus className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">New</span>
            </Button>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => logout()}
              data-testid="button-logout"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {!canAccessDomain("consultant") ? (
        <div className="flex-1 overflow-hidden relative">
          <div className="absolute inset-0 pointer-events-none select-none" style={{ filter: "blur(6px)", opacity: 0.4 }}>
            <div className="flex h-full flex-col">
              <div className="flex-1 overflow-auto">
                <div className="max-w-3xl mx-auto px-4 py-8 sm:py-16">
                  <div className="text-center mb-8">
                    <ChefHat className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                    <h2 className="text-xl font-semibold mb-2">Ask the Consultant</h2>
                    <p className="text-muted-foreground max-w-md mx-auto text-sm">
                      Ask anything about restaurant operations. You'll get direct, practical answers—no fluff,
                      no theory, just what works on a real floor.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
                    {categories.map((category) => (
                      <div key={category.label}>
                        <div className="flex items-center gap-2 mb-2 px-1">
                          <category.icon className="h-4 w-4 text-muted-foreground" />
                          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{category.label}</span>
                        </div>
                        <div className="space-y-2">
                          {category.questions.map((q) => (
                            <Card key={q} className="p-3">
                              <p className="text-sm">{q}</p>
                            </Card>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="border-t border-border bg-background">
                <div className="max-w-3xl mx-auto px-4 py-3">
                  <div className="flex gap-2 items-end">
                    <div className="flex-1 min-h-[44px] rounded-md border border-input bg-background px-3 py-2">
                      <span className="text-sm text-muted-foreground">Ask about any restaurant operations challenge...</span>
                    </div>
                    <div className="h-10 w-10 rounded-md bg-primary flex items-center justify-center">
                      <Send className="h-4 w-4 text-primary-foreground" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="absolute inset-0 flex items-start justify-center pt-20 z-10">
            <Card className="max-w-md w-full shadow-xl border-primary/20 mx-4" data-testid="card-consultant-upgrade">
              <CardContent className="p-8 text-center">
                <div className="mx-auto w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mb-5">
                  <Lock className="h-7 w-7 text-primary" />
                </div>
                <h2 className="text-xl font-bold mb-2" data-testid="text-consultant-upgrade-title">
                  Unlock the Operations Consultant
                </h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Expert guidance on any restaurant operations challenge — staffing, costs, service, leadership, and more.
                </p>
                <p className="text-sm font-medium mb-6">
                  All {TOTAL_DOMAIN_COUNT} domains + consultant starting at <span className="text-primary">$10/month</span>
                </p>
                <Link href="/pricing">
                  <Button className="w-full mb-3" data-testid="btn-consultant-upgrade">
                    Upgrade Now
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
                <Link href="/pricing" className="text-sm text-muted-foreground underline underline-offset-4" data-testid="link-consultant-plans">
                  See all plans
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
      <div className="flex-1 flex overflow-hidden">
        {showHistory && (
          <div className="w-72 border-r border-border bg-muted/30 flex flex-col shrink-0" data-testid="panel-history">
            <div className="p-3 border-b border-border">
              <h3 className="font-semibold text-sm">Past Conversations</h3>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-1">
                {!conversationList || conversationList.length === 0 ? (
                  <div className="px-3 py-6 text-center text-sm text-muted-foreground" data-testid="text-no-conversations">
                    <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    No conversations yet
                  </div>
                ) : (
                  conversationList.map((conv) => (
                    <div
                      key={conv.id}
                      className={`group flex items-start gap-2 px-3 py-2 rounded-md text-sm cursor-pointer hover-elevate ${
                        activeConversationId === conv.id ? "bg-accent" : ""
                      }`}
                      data-testid={`conversation-item-${conv.id}`}
                    >
                      <button
                        type="button"
                        className="flex-1 text-left min-w-0"
                        onClick={() => loadConversation(conv.id)}
                        data-testid={`button-load-conversation-${conv.id}`}
                      >
                        <p className="font-medium truncate">{conv.title}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Clock className="h-3 w-3" />
                          {formatDate(conv.createdAt)}
                        </p>
                      </button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0 invisible group-hover:visible"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteConversation(conv.id);
                        }}
                        data-testid={`button-delete-conversation-${conv.id}`}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        )}

        <div className="flex-1 flex flex-col min-w-0">
          <ScrollArea className="flex-1" ref={scrollRef}>
            <div className="max-w-3xl mx-auto px-4 py-4">
              {messages.length === 0 ? (
                <div className="py-8 sm:py-16">
                  <div className="text-center mb-8">
                    <ChefHat className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                    <h2 className="text-xl font-semibold mb-2" data-testid="text-empty-title">Ask the Consultant</h2>
                    <p className="text-muted-foreground max-w-md mx-auto text-sm">
                      Ask anything about restaurant operations. You'll get direct, practical answers—no fluff,
                      no theory, just what works on a real floor.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto" data-testid="section-question-categories">
                    {categories.map((category) => (
                      <div key={category.label}>
                        <div className="flex items-center gap-2 mb-2 px-1">
                          <category.icon className="h-4 w-4 text-muted-foreground" />
                          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{category.label}</span>
                        </div>
                        <div className="space-y-2">
                          {category.questions.map((q) => (
                            <Card
                              key={q}
                              className="p-3 cursor-pointer hover-elevate active-elevate-2"
                              onClick={() => submitQuestion(q)}
                              data-testid={`card-question-${q.slice(0, 30).replace(/\s+/g, '-').toLowerCase()}`}
                            >
                              <p className="text-sm">{q}</p>
                            </Card>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {restaurantProfile?.restaurantName && (
                    <p className="text-xs text-muted-foreground text-center mt-6" data-testid="text-personalized">
                      Suggestions tailored for <span className="font-medium text-foreground">{restaurantProfile.restaurantName}</span>
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-6 pb-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex gap-3 flex-wrap ${
                        message.role === "user" ? "justify-end" : "justify-start"
                      }`}
                      data-testid={`message-${message.role}-${message.id}`}
                    >
                      {message.role === "assistant" && (
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarFallback className="bg-primary text-primary-foreground">
                            <ChefHat className="h-4 w-4" />
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <Card
                        className={`p-4 max-w-[85%] ${
                          message.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-card"
                        }`}
                      >
                        {message.imageUrls && message.imageUrls.length > 0 && (
                          <div className={`mb-2 flex flex-wrap gap-2 ${message.imageUrls.length === 1 ? '' : 'grid grid-cols-2'}`}>
                            {message.imageUrls.map((url, idx) => (
                              <img
                                key={idx}
                                src={url}
                                alt={`Attached ${idx + 1}`}
                                className="rounded-lg max-h-48 w-auto object-contain"
                                data-testid={`img-attachment-${message.id}-${idx}`}
                              />
                            ))}
                          </div>
                        )}
                        {message.role === "assistant" ? (
                          <div className="prose prose-sm dark:prose-invert max-w-none">
                            <ReactMarkdown>{message.content || "..."}</ReactMarkdown>
                          </div>
                        ) : (
                          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        )}
                      </Card>
                      {message.role === "user" && (
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarImage src={user?.profileImageUrl || undefined} />
                          <AvatarFallback>
                            <User className="h-4 w-4" />
                          </AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="border-t border-border bg-background">
            <div className="max-w-3xl mx-auto px-4 py-3">
              {attachedImages.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-2">
                  {attachedImages.map((img, idx) => (
                    <div key={idx} className="relative">
                      <img
                        src={img.previewUrl}
                        alt={`Attached preview ${idx + 1}`}
                        className="h-20 w-auto rounded-lg border border-border object-contain"
                        data-testid={`img-attachment-preview-${idx}`}
                      />
                      <button
                        type="button"
                        onClick={() => removeAttachedImage(idx)}
                        className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-sm"
                        data-testid={`button-remove-attachment-${idx}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <form onSubmit={handleSubmit} className="flex gap-2 items-end">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleImageSelect}
                  data-testid="input-file-upload"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0 mb-0.5"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading}
                  data-testid="button-attach-image"
                >
                  <ImagePlus className="h-5 w-5" />
                </Button>
                <Textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask anything about restaurant operations..."
                  className="min-h-[52px] max-h-[120px] resize-none"
                  disabled={isLoading}
                  data-testid="input-consultant-message"
                />
                <Button 
                  type="submit" 
                  size="icon"
                  className="shrink-0 mb-0.5"
                  disabled={isLoading || (!input.trim() && attachedImages.length === 0)}
                  data-testid="button-send-message"
                >
                  {isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Send className="h-5 w-5" />
                  )}
                </Button>
              </form>
            </div>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
