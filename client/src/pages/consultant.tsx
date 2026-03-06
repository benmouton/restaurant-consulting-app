import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Link, useSearch } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { TOTAL_DOMAIN_COUNT } from "@/config/tierConfig";
import { isNativeApp } from "@/lib/native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowLeft, ChefHat, Send, LogOut, Loader2, User, Plus, MessageSquare, Trash2,
  Clock, ImagePlus, X, Lock, ArrowRight, Copy, Pin, RefreshCw, Share2,
  ChevronDown, ChevronUp, Zap, BookOpen, CheckSquare, BarChart3,
  UtensilsCrossed, Users, CalendarDays, GraduationCap, DollarSign, Star,
  ClipboardList, AlertTriangle, Building, Smartphone, BookMarked, Package
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
  domainTag?: string;
  timestamp?: number;
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

interface PinnedAnswer {
  messageId: string;
  content: string;
  domainTag?: string;
}

const DOMAIN_TAGS = [
  { id: "kitchen", label: "Kitchen Ops", Icon: UtensilsCrossed },
  { id: "hr", label: "HR & Docs", Icon: Users },
  { id: "scheduling", label: "Scheduling", Icon: CalendarDays },
  { id: "training", label: "Training", Icon: GraduationCap },
  { id: "financials", label: "Financials", Icon: DollarSign },
  { id: "reviews", label: "Reviews", Icon: Star },
  { id: "sops", label: "SOPs", Icon: ClipboardList },
  { id: "crisis", label: "Crisis", Icon: AlertTriangle },
  { id: "facilities", label: "Facilities", Icon: Building },
  { id: "social", label: "Social Media", Icon: Smartphone },
  { id: "menu", label: "Menu", Icon: BookMarked },
  { id: "inventory", label: "Inventory", Icon: Package },
];

const DOMAIN_STARTERS: Record<string, string[]> = {
  default: [
    "What's the single most important system I'm probably missing?",
    "We're struggling with food cost. Where do I start?",
    "Help me write a 90-day onboarding plan for a new kitchen manager.",
    "What does a well-run Saturday night look like?",
  ],
  kitchen: [
    "What's the right prep checklist for a high-volume brunch?",
    "How do I reduce ticket times without sacrificing quality?",
    "Help me build a kitchen opening/closing checklist.",
    "What's causing inconsistency in my plating?",
  ],
  hr: [
    "Write a write-up template for a no-call no-show.",
    "What should be in my employee handbook?",
    "How do I legally handle tip disputes?",
    "Give me a 30/60/90 review framework.",
  ],
  scheduling: [
    "How do I build a schedule for a 3-station kitchen with 8 staff?",
    "What's the right labor % target for a full-service restaurant?",
    "Help me create a schedule template for my busiest week.",
    "How do I handle a last-minute call-out during service?",
  ],
  training: [
    "Build me a new hire training checklist for front-of-house.",
    "How do I train staff to upsell without being pushy?",
    "What does a good 30-day onboarding look like?",
    "How do I train my opener so they don't need me there?",
  ],
  financials: [
    "What's a healthy prime cost target for a casual dining concept?",
    "How do I find out where my money is actually going?",
    "Help me build a simple weekly P&L tracker.",
    "What should my food cost % be?",
  ],
  reviews: [
    "Help me respond to a 1-star review about slow service.",
    "How do I get more 5-star reviews without begging?",
    "A competitor is leaving us fake reviews. What do I do?",
    "Write a response to a glowing review that I can reuse.",
  ],
  sops: [
    "Build me a closing checklist for a full-service restaurant.",
    "What SOPs should every restaurant have before they hire their 10th employee?",
    "How do I write an SOP my staff will actually follow?",
    "Give me a template for a daily manager log.",
  ],
  crisis: [
    "A health inspector just walked in. What do I do right now?",
    "My head cook just quit 30 minutes before service. Walk me through it.",
    "We just got a bad health inspection score. How do I respond publicly?",
    "I'm overwhelmed and behind on everything. Where do I start?",
  ],
  facilities: [
    "My walk-in cooler is making a strange noise. What do I check first?",
    "How do I build a preventive maintenance schedule?",
    "What should be in my vendor contact list?",
    "Help me document an equipment issue for my landlord.",
  ],
  social: [
    "Write 3 Instagram captions for our new weekend brunch launch.",
    "How often should I post on social media?",
    "What kind of content actually works for restaurants?",
    "Write a response to a negative comment on Instagram.",
  ],
  menu: [
    "Help me engineer my menu for higher margins.",
    "How do I know which items to cut from my menu?",
    "What's the right number of items for a focused menu?",
    "How do I price a new dish?",
  ],
  inventory: [
    "Build me a weekly inventory count sheet template.",
    "How do I reduce food waste in a high-volume kitchen?",
    "What's the best way to do a physical inventory count?",
    "How do I track par levels for my top 20 items?",
  ],
};

const DOMAIN_FOLLOWUPS: Record<string, string[]> = {
  default: [
    "Can you give me a step-by-step version of that?",
    "What's the most common mistake operators make here?",
    "How would you prioritize this if I'm short-staffed?",
  ],
  financials: [
    "What benchmarks should I be hitting?",
    "How do I track this weekly?",
    "What would this look like in a real restaurant?",
  ],
  crisis: [
    "What do I say to my staff after this?",
    "How do I prevent this from happening again?",
    "Should I document this and how?",
  ],
  hr: [
    "Can you make this into a template?",
    "What are the legal risks I should know about?",
    "How do I deliver this message to my team?",
  ],
  kitchen: [
    "How do I train my team on this?",
    "What does this look like on a busy Friday?",
    "How long should this take to implement?",
  ],
};

const RESPONSE_MODES = [
  { id: "quick", icon: Zap, label: "Quick Answer", suffix: "Be concise. Give a direct 1-3 sentence answer. No preamble." },
  { id: "full", icon: BookOpen, label: "Full Breakdown", suffix: "" },
  { id: "checklist", icon: CheckSquare, label: "Give Me a Checklist", suffix: "Respond ONLY with a numbered or bulleted checklist. No intro, no outro." },
];

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
  const [selectedDomains, setSelectedDomains] = useState<string[]>([]);
  const [responseMode, setResponseMode] = useState("full");
  const [pinnedAnswers, setPinnedAnswers] = useState<PinnedAnswer[]>([]);
  const [showPinned, setShowPinned] = useState(false);
  const [sessionStart, setSessionStart] = useState<number | null>(null);
  const [responseTimes, setResponseTimes] = useState<number[]>([]);
  const [clearHoldTimer, setClearHoldTimer] = useState<any>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messageRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const { toast } = useToast();

  const { data: conversationList } = useQuery<Conversation[]>({
    queryKey: ["/api/consultant/conversations"],
  });

  const { data: restaurantProfile } = useQuery<any>({
    queryKey: ["/api/restaurant-profile"],
  });

  const sessionMetrics = useMemo(() => {
    const userMsgCount = messages.filter(m => m.role === "user").length;
    const domainsUsed = new Set(messages.filter(m => m.domainTag).map(m => m.domainTag));
    const avgTime = responseTimes.length > 0
      ? (responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length / 1000).toFixed(1) + "s"
      : "--";
    let sessionElapsed = "Not started";
    if (sessionStart) {
      const mins = Math.floor((Date.now() - sessionStart) / 60000);
      sessionElapsed = mins < 1 ? "Just now" : `${mins} min ago`;
    }
    return { userMsgCount, domainsUsed: domainsUsed.size, avgTime, sessionElapsed };
  }, [messages, responseTimes, sessionStart]);

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
          timestamp: new Date(m.createdAt).getTime(),
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
    setSelectedDomains([]);
    setPinnedAnswers([]);
    setSessionStart(null);
    setResponseTimes([]);
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
      if (activeConversationId === convId) startNewConversation();
    } catch (err) {
      console.error("Failed to delete conversation:", err);
    }
  }, [activeConversationId, startNewConversation, queryClient]);

  const toggleDomain = (domainId: string) => {
    setSelectedDomains(prev =>
      prev.includes(domainId) ? prev.filter(d => d !== domainId) : [...prev, domainId]
    );
  };

  const getDomainContext = () => {
    if (selectedDomains.length === 0) return "";
    const names = selectedDomains.map(id => DOMAIN_TAGS.find(d => d.id === id)?.label || id);
    return `The operator is asking about: ${names.join(", ")}. `;
  };

  const getResponseModeSuffix = () => {
    const mode = RESPONSE_MODES.find(m => m.id === responseMode);
    return mode?.suffix || "";
  };

  const getActiveStarters = () => {
    if (selectedDomains.length === 1) {
      return DOMAIN_STARTERS[selectedDomains[0]] || DOMAIN_STARTERS.default;
    }
    return DOMAIN_STARTERS.default;
  };

  const getFollowUps = () => {
    const lastDomain = [...messages].reverse().find(m => m.domainTag)?.domainTag;
    if (lastDomain && DOMAIN_FOLLOWUPS[lastDomain]) return DOMAIN_FOLLOWUPS[lastDomain];
    if (selectedDomains.length === 1 && DOMAIN_FOLLOWUPS[selectedDomains[0]]) return DOMAIN_FOLLOWUPS[selectedDomains[0]];
    return DOMAIN_FOLLOWUPS.default;
  };

  const handlePinMessage = (msg: ChatMessage) => {
    if (pinnedAnswers.find(p => p.messageId === msg.id)) {
      setPinnedAnswers(prev => prev.filter(p => p.messageId !== msg.id));
      toast({ title: "Answer unpinned" });
      return;
    }
    const newPinned = [...pinnedAnswers, { messageId: msg.id, content: msg.content, domainTag: msg.domainTag }];
    if (newPinned.length > 4) newPinned.shift();
    setPinnedAnswers(newPinned);
    setShowPinned(true);
    toast({ title: "Answer pinned" });
  };

  const handleCopyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    toast({ title: "Copied to clipboard" });
  };

  const handleShareMessage = (userMsg: string, aiMsg: string) => {
    const text = `Q: ${userMsg}\n\nA: ${aiMsg}\n\n-- via The Restaurant Consultant`;
    if (navigator.share) {
      navigator.share({ title: "Restaurant Consultant", text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text);
      toast({ title: "Copied to clipboard for sharing" });
    }
  };

  const handleRegenerateMessage = (messageId: string) => {
    const msgIndex = messages.findIndex(m => m.id === messageId);
    if (msgIndex <= 0) return;
    const userMsg = messages[msgIndex - 1];
    if (userMsg.role !== "user") return;
    const trimmed = messages.slice(0, msgIndex - 1);
    setMessages(trimmed);
    submitQuestion(userMsg.content, userMsg.domainTag ? `The operator is asking about: ${DOMAIN_TAGS.find(d => d.id === userMsg.domainTag)?.label || userMsg.domainTag}. ` : undefined);
  };

  const scrollToMessage = (messageId: string) => {
    const el = messageRefs.current[messageId];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.style.animation = "goldGlowPulse 0.6s ease-out";
      setTimeout(() => { el.style.animation = ""; }, 700);
    }
  };

  const submitQuestion = async (questionText: string, context?: string) => {
    if ((!questionText.trim() && attachedImages.length === 0) || isLoading) return;

    const messageText = questionText.trim() || (attachedImages.length > 0 ? "What do you see in these images?" : "");
    const currentImages = [...attachedImages];
    const domainContext = context || getDomainContext();
    const modeSuffix = getResponseModeSuffix();
    const fullContext = [domainContext, modeSuffix].filter(Boolean).join(" ");
    const activeDomain = selectedDomains.length === 1 ? selectedDomains[0] : undefined;

    if (!sessionStart) setSessionStart(Date.now());
    const sendTime = Date.now();

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: messageText,
      imageUrls: currentImages.length > 0 ? currentImages.map((img) => img.previewUrl) : undefined,
      domainTag: activeDomain,
      timestamp: Date.now(),
    };

    const currentMessages = [...messages, userMessage];
    setMessages(currentMessages);
    setInput("");
    setAttachedImages([]);
    setSelectedDomains([]);
    setIsLoading(true);

    const assistantId = (Date.now() + 1).toString();
    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: "assistant", content: "", timestamp: Date.now() },
    ]);

    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    let firstTokenReceived = false;

    try {
      const response = await fetch("/api/consultant/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          question: messageText,
          context: fullContext || undefined,
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
                if (!firstTokenReceived) {
                  firstTokenReceived = true;
                  setResponseTimes(prev => [...prev, Date.now() - sendTime]);
                }
                fullContent += data.content;
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantId ? { ...msg, content: fullContent } : msg
                  )
                );
              }
              if (data.conversationId && !activeConversationId) {
                setActiveConversationId(data.conversationId);
                queryClient.invalidateQueries({ queryKey: ["/api/consultant/conversations"] });
              }
            } catch {}
          }
        }
      }
      queryClient.invalidateQueries({ queryKey: ["/api/consultant/conversations"] });
    } catch (error) {
      console.error("Error:", error);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantId ? { ...msg, content: "Sorry, I encountered an error. Please try again." } : msg
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

  const handleClearHoldStart = () => {
    const timer = setTimeout(() => {
      startNewConversation();
      toast({ title: "Chat cleared" });
    }, 500);
    setClearHoldTimer(timer);
  };

  const handleClearHoldEnd = () => {
    if (clearHoldTimer) {
      clearTimeout(clearHoldTimer);
      setClearHoldTimer(null);
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

  const activeDomainLabel = selectedDomains.length === 1
    ? DOMAIN_TAGS.find(d => d.id === selectedDomains[0])?.label
    : undefined;

  return (
    <div className="h-screen flex flex-col" style={{ backgroundColor: '#0f1117' }}>
      <header className="border-b sticky top-0 z-50 backdrop-blur" style={{ borderColor: '#2a2d3e', backgroundColor: 'rgba(15,17,23,0.95)', paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-3 flex-wrap">
            <Link href="/">
              <Button variant="ghost" size="icon" data-testid="button-back" className="text-white hover:bg-white/10">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <Button variant="ghost" size="icon" onClick={() => setShowHistory(!showHistory)} data-testid="button-toggle-history"
              className="text-white hover:bg-white/10">
              <Clock className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2">
              <ChefHat className="h-5 w-5" style={{ color: '#d4a017' }} />
              <span className="font-bold text-sm sm:text-base text-white" data-testid="text-page-title">The Consultant</span>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-wrap">
            <Button variant="ghost" size="sm" onClick={startNewConversation} data-testid="button-new-conversation"
              className="text-white hover:bg-white/10">
              <Plus className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">New</span>
            </Button>
            <Button variant="ghost" size="icon" onClick={() => logout()} data-testid="button-logout"
              className="text-white hover:bg-white/10">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {!canAccessDomain("consultant") ? (
        <div className="flex-1 overflow-hidden relative">
          <div className="absolute inset-0 pointer-events-none select-none" style={{ filter: "blur(6px)", opacity: 0.4 }}>
            <div className="flex h-full flex-col" style={{ backgroundColor: '#0f1117' }}>
              <div className="flex-1 overflow-auto">
                <div className="max-w-3xl mx-auto px-4 py-8 sm:py-16">
                  <div className="text-center mb-8">
                    <ChefHat className="h-12 w-12 mx-auto mb-3" style={{ color: '#d4a017' }} />
                    <h2 className="text-xl font-semibold mb-2 text-white">Ask the Consultant</h2>
                    <p className="max-w-md mx-auto text-sm" style={{ color: '#9ca3af' }}>
                      Ask anything about restaurant operations.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="absolute inset-0 flex items-start justify-center pt-20 z-10">
            <Card className="max-w-md w-full shadow-xl mx-4" style={{ backgroundColor: '#1a1d2e', border: '1px solid #2a2d3e' }} data-testid="card-consultant-upgrade">
              <CardContent className="p-8 text-center">
                <div className="mx-auto w-14 h-14 rounded-full flex items-center justify-center mb-5" style={{ backgroundColor: 'rgba(212,160,23,0.1)' }}>
                  <Lock className="h-7 w-7" style={{ color: '#d4a017' }} />
                </div>
                <h2 className="text-xl font-bold mb-2 text-white" data-testid="text-consultant-upgrade-title">
                  Unlock the Operations Consultant
                </h2>
                <p className="text-sm mb-4" style={{ color: '#9ca3af' }}>
                  Expert guidance on any restaurant operations challenge -- staffing, costs, service, leadership, and more.
                </p>
                {isNativeApp() ? (
                  <p className="text-sm" style={{ color: '#9ca3af' }}>
                    This feature requires a subscription. Subscribe at <span className="font-medium" style={{ color: '#d4a017' }}>restaurantai.consulting</span>
                  </p>
                ) : (
                  <>
                    <p className="text-sm font-medium mb-6 text-white">
                      All {TOTAL_DOMAIN_COUNT} domains + consultant starting at <span style={{ color: '#d4a017' }}>$10/month</span>
                    </p>
                    <Link href="/pricing">
                      <Button className="w-full mb-3" style={{ backgroundColor: '#d4a017', color: '#0f1117' }} data-testid="btn-consultant-upgrade">
                        Upgrade Now
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </Link>
                    <Link href="/pricing" className="text-sm underline underline-offset-4" style={{ color: '#9ca3af' }} data-testid="link-consultant-plans">
                      See all plans
                    </Link>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
      <div className="flex-1 flex overflow-hidden">
        {/* History Sidebar */}
        {showHistory && (
          <div className="w-72 flex flex-col shrink-0" style={{ backgroundColor: '#1a1d2e', borderRight: '1px solid #2a2d3e' }} data-testid="panel-history">
            <div className="p-3" style={{ borderBottom: '1px solid #2a2d3e' }}>
              <h3 className="font-semibold text-sm text-white">Past Conversations</h3>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-1">
                {!conversationList || conversationList.length === 0 ? (
                  <div className="px-3 py-6 text-center text-sm" style={{ color: '#9ca3af' }} data-testid="text-no-conversations">
                    <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    Your past conversations will appear here.
                  </div>
                ) : (
                  conversationList.map((conv) => (
                    <div
                      key={conv.id}
                      className="group flex items-start gap-2 px-3 py-2 rounded-md text-sm cursor-pointer transition-colors"
                      style={{ backgroundColor: activeConversationId === conv.id ? 'rgba(212,160,23,0.1)' : 'transparent' }}
                      data-testid={`conversation-item-${conv.id}`}
                    >
                      <button type="button" className="flex-1 text-left min-w-0" onClick={() => loadConversation(conv.id)} data-testid={`button-load-conversation-${conv.id}`}>
                        <p className="font-medium truncate text-white">{conv.title}</p>
                        <p className="text-xs flex items-center gap-1 mt-0.5" style={{ color: '#6b7280' }}>
                          <Clock className="h-3 w-3" />
                          {formatDate(conv.createdAt)}
                        </p>
                      </button>
                      <Button variant="ghost" size="icon" className="shrink-0 invisible group-hover:visible"
                        onClick={(e) => { e.stopPropagation(); deleteConversation(conv.id); }}
                        data-testid={`button-delete-conversation-${conv.id}`}>
                        <Trash2 className="h-3.5 w-3.5" style={{ color: '#6b7280' }} />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        )}

        <div className="flex-1 flex flex-col min-w-0">
          {/* Session Intelligence Strip */}
          <div className="flex gap-3 px-4 py-3 overflow-x-auto" style={{ borderBottom: '1px solid #2a2d3e' }} data-testid="session-strip">
            {[
              { label: "Questions Asked", value: `${sessionMetrics.userMsgCount} questions`, icon: MessageSquare },
              { label: "Domains Covered", value: `${sessionMetrics.domainsUsed} domains`, icon: BarChart3 },
              { label: "Avg. Response Time", value: sessionMetrics.avgTime, icon: Clock },
              { label: "Session Started", value: sessionMetrics.sessionElapsed, icon: Zap },
            ].map((metric, i) => (
              <div key={metric.label} className="flex-shrink-0 min-w-[130px] rounded-lg p-3"
                style={{ backgroundColor: '#1a1d2e', borderLeft: '3px solid #d4a017', animation: `scheduleStaggerIn 0.3s ease-out ${i * 30}ms both` }}
                data-testid={`metric-${metric.label.toLowerCase().replace(/ /g, '-')}`}>
                <div className="flex items-center gap-1.5 mb-0.5">
                  <metric.icon className="h-3 w-3" style={{ color: '#9ca3af' }} />
                  <span className="text-[10px]" style={{ color: '#9ca3af' }}>{metric.label}</span>
                </div>
                <div className="text-sm font-bold text-white">{metric.value}</div>
              </div>
            ))}
          </div>

          {/* Chat Area */}
          <ScrollArea className="flex-1" ref={scrollRef}>
            <div className="max-w-3xl mx-auto px-4 py-4">
              {/* Pinned Answers */}
              {pinnedAnswers.length > 0 && (
                <div className="mb-4 rounded-lg overflow-hidden" style={{ backgroundColor: '#1a1d2e', border: '1px solid #2a2d3e' }}>
                  <button className="w-full px-4 py-2 flex items-center justify-between" style={{ borderBottom: showPinned ? '1px solid #2a2d3e' : 'none' }}
                    onClick={() => setShowPinned(!showPinned)} data-testid="btn-toggle-pinned">
                    <div className="flex items-center gap-2">
                      <Pin className="h-3.5 w-3.5" style={{ color: '#d4a017' }} />
                      <span className="text-sm font-medium text-white">Pinned Answers ({pinnedAnswers.length})</span>
                    </div>
                    {showPinned ? <ChevronUp className="h-4 w-4" style={{ color: '#9ca3af' }} /> : <ChevronDown className="h-4 w-4" style={{ color: '#9ca3af' }} />}
                  </button>
                  {showPinned && (
                    <div className="p-2 space-y-2" style={{ animation: 'scheduleStaggerIn 0.2s ease-out both' }}>
                      {pinnedAnswers.map((pin) => (
                        <div key={pin.messageId} className="flex items-start gap-2 p-2 rounded cursor-pointer"
                          style={{ borderLeft: '3px solid #d4a017', backgroundColor: '#2a2d3e' }}
                          onClick={() => scrollToMessage(pin.messageId)}
                          data-testid={`pinned-card-${pin.messageId}`}>
                          <div className="flex-1 min-w-0">
                            {pin.domainTag && (() => {
                              const dt = DOMAIN_TAGS.find(d => d.id === pin.domainTag);
                              return dt ? (
                                <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full mr-1" style={{ backgroundColor: 'rgba(212,160,23,0.15)', color: '#d4a017' }}>
                                  <dt.Icon className="h-2.5 w-2.5" /> {dt.label}
                                </span>
                              ) : null;
                            })()}
                            <p className="text-xs line-clamp-2 mt-1" style={{ color: '#9ca3af' }}>{pin.content}</p>
                          </div>
                          <button onClick={(e) => { e.stopPropagation(); setPinnedAnswers(prev => prev.filter(p => p.messageId !== pin.messageId)); }}
                            className="p-1 flex-shrink-0" style={{ color: '#6b7280' }}
                            data-testid={`btn-unpin-${pin.messageId}`}>
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Empty State + Starters */}
              {messages.length === 0 ? (
                <div className="py-8 sm:py-12">
                  <div className="text-center mb-8" style={{ animation: 'scheduleStaggerIn 0.3s ease-out both' }}>
                    <ChefHat className="h-12 w-12 mx-auto mb-3" style={{ color: '#d4a017' }} />
                    <h2 className="text-xl font-semibold mb-2 text-white" data-testid="text-empty-title">
                      Ask Anything. Get Operator-Grade Answers.
                    </h2>
                    <p className="max-w-md mx-auto text-sm" style={{ color: '#9ca3af' }}>
                      Built by operators, for operators. No generic advice.
                    </p>
                    {restaurantProfile?.restaurantName && (
                      <p className="text-xs mt-2" style={{ color: '#6b7280' }} data-testid="text-personalized">
                        Tailored for <span className="font-medium text-white">{restaurantProfile.restaurantName}</span>
                      </p>
                    )}
                  </div>

                  {/* Prompt Starters */}
                  {!input && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl mx-auto" data-testid="section-prompt-starters"
                      style={{ animation: 'scheduleStaggerIn 0.3s ease-out 80ms both' }}>
                      {activeDomainLabel && (
                        <div className="col-span-full text-xs font-medium mb-1" style={{ color: '#d4a017' }}>
                          {activeDomainLabel} questions:
                        </div>
                      )}
                      {getActiveStarters().map((q, i) => (
                        <div key={q} className="p-3 rounded-lg cursor-pointer transition-transform active:scale-[0.97]"
                          style={{ backgroundColor: '#1a1d2e', border: '1px solid #2a2d3e', animation: `scheduleStaggerIn 0.3s ease-out ${(i + 2) * 80}ms both` }}
                          onClick={() => { setInput(q); textareaRef.current?.focus(); }}
                          data-testid={`starter-${i}`}>
                          <p className="text-sm" style={{ color: '#9ca3af' }}>{q}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4 pb-4">
                  {messages.map((message, msgIndex) => (
                    <div
                      key={message.id}
                      ref={(el) => { messageRefs.current[message.id] = el; }}
                      className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
                      data-testid={`message-${message.role}-${message.id}`}
                    >
                      {message.role === "assistant" && (
                        <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(212,160,23,0.15)' }}>
                          <ChefHat className="h-4 w-4" style={{ color: '#d4a017' }} />
                        </div>
                      )}
                      <div className="max-w-[85%] space-y-1">
                        {message.role === "assistant" && (
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-medium" style={{ color: '#d4a017' }}>The Consultant</span>
                            {message.timestamp && (
                              <span className="text-[10px]" style={{ color: '#6b7280' }}>
                                {new Date(message.timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                              </span>
                            )}
                          </div>
                        )}
                        {message.role === "user" && message.domainTag && (() => {
                          const dt = DOMAIN_TAGS.find(d => d.id === message.domainTag);
                          return dt ? (
                            <div className="flex justify-end mb-1">
                              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(212,160,23,0.15)', color: '#d4a017' }}>
                                <dt.Icon className="h-2.5 w-2.5" /> {dt.label}
                              </span>
                            </div>
                          ) : null;
                        })()}
                        <div
                          className="p-4 rounded-xl"
                          style={message.role === "user" ? {
                            backgroundColor: 'rgba(184,134,11,0.15)',
                            border: '1px solid rgba(212,160,23,0.3)',
                            borderRadius: '12px 12px 2px 12px',
                          } : {
                            backgroundColor: '#1a1d2e',
                            border: '1px solid rgba(255,255,255,0.06)',
                            borderRadius: '12px 12px 12px 2px',
                            borderLeft: isLoading && msgIndex === messages.length - 1 && !message.content
                              ? '3px solid #d4a017'
                              : message.content ? '3px solid rgba(255,255,255,0.1)' : '3px solid #d4a017',
                            ...(isLoading && msgIndex === messages.length - 1 ? { animation: 'goldStreamBorder 1.5s ease-in-out infinite' } : {}),
                          }}
                        >
                          {message.imageUrls && message.imageUrls.length > 0 && (
                            <div className={`mb-2 flex flex-wrap gap-2 ${message.imageUrls.length === 1 ? '' : 'grid grid-cols-2'}`}>
                              {message.imageUrls.map((url, idx) => (
                                <img key={idx} src={url} alt={`Attached ${idx + 1}`} className="rounded-lg max-h-48 w-auto object-contain" data-testid={`img-attachment-${message.id}-${idx}`} />
                              ))}
                            </div>
                          )}
                          {message.role === "assistant" && !message.content && isLoading ? (
                            <div className="flex gap-1.5 py-1">
                              {[0, 1, 2].map(i => (
                                <div key={i} className="w-2 h-2 rounded-full" style={{ backgroundColor: '#d4a017', animation: `consultantTypingDot 1.2s ease-in-out ${i * 0.15}s infinite` }} />
                              ))}
                            </div>
                          ) : message.role === "assistant" ? (
                            <div className="prose prose-sm prose-invert max-w-none">
                              <ReactMarkdown>{message.content || "..."}</ReactMarkdown>
                            </div>
                          ) : (
                            <p className="text-sm text-white whitespace-pre-wrap">{message.content}</p>
                          )}
                        </div>

                        {/* Timestamp for user messages */}
                        {message.role === "user" && message.timestamp && (
                          <div className="flex justify-end">
                            <span className="text-[10px]" style={{ color: '#6b7280' }}>
                              {new Date(message.timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                            </span>
                          </div>
                        )}

                        {/* Action tray for completed AI messages */}
                        {message.role === "assistant" && message.content && !isLoading && (
                          <div className="flex items-center gap-1 mt-1 opacity-100 sm:opacity-60 hover:opacity-100 transition-opacity"
                            style={{ animation: 'scheduleStaggerIn 0.2s ease-out both' }}>
                            <button className="p-1.5 rounded transition-colors" style={{ color: '#6b7280' }}
                              onClick={() => handleCopyMessage(message.content)} data-testid={`btn-copy-${message.id}`} title="Copy">
                              <Copy className="h-3.5 w-3.5" />
                            </button>
                            <button className="p-1.5 rounded transition-colors" data-testid={`btn-pin-${message.id}`} title="Pin"
                              style={{ color: pinnedAnswers.find(p => p.messageId === message.id) ? '#d4a017' : '#6b7280' }}
                              onClick={() => handlePinMessage(message)}>
                              <Pin className="h-3.5 w-3.5" />
                            </button>
                            <button className="p-1.5 rounded transition-colors" style={{ color: '#6b7280' }}
                              onClick={() => handleRegenerateMessage(message.id)} data-testid={`btn-regenerate-${message.id}`} title="Regenerate">
                              <RefreshCw className="h-3.5 w-3.5" />
                            </button>
                            <button className="p-1.5 rounded transition-colors" style={{ color: '#6b7280' }}
                              onClick={() => {
                                const userMsg = messages[msgIndex - 1];
                                handleShareMessage(userMsg?.content || "", message.content);
                              }} data-testid={`btn-share-${message.id}`} title="Share">
                              <Share2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}

                        {/* Suggested Follow-Ups after last completed AI message */}
                        {message.role === "assistant" && message.content && !isLoading && msgIndex === messages.length - 1 && !input && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {getFollowUps().map((fu, i) => (
                              <button key={fu} className="text-xs px-3 py-1.5 rounded-full transition-transform active:scale-[0.97]"
                                style={{
                                  border: '1px solid rgba(212,160,23,0.3)',
                                  color: '#9ca3af',
                                  backgroundColor: 'transparent',
                                  animation: `scheduleStaggerIn 0.2s ease-out ${i * 200}ms both`,
                                }}
                                onClick={() => { setInput(fu); textareaRef.current?.focus(); }}
                                data-testid={`followup-${i}`}>
                                {fu}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {message.role === "user" && (
                        <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden" style={{ backgroundColor: '#2a2d3e' }}>
                          {user?.profileImageUrl ? (
                            <img src={user.profileImageUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <User className="h-4 w-4 text-white" />
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Prompt starters when messages exist but input is empty */}
              {messages.length > 0 && !input && !isLoading && selectedDomains.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-2xl mx-auto mt-2 mb-4">
                  {getActiveStarters().slice(0, 2).map((q, i) => (
                    <div key={q} className="p-2 rounded-lg cursor-pointer text-xs transition-transform active:scale-[0.97]"
                      style={{ backgroundColor: '#1a1d2e', border: '1px solid #2a2d3e', color: '#9ca3af' }}
                      onClick={() => { setInput(q); textareaRef.current?.focus(); }}>
                      {q}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input Area */}
          <div style={{ borderTop: '1px solid #2a2d3e', backgroundColor: '#0f1117' }}>
            <div className="max-w-3xl mx-auto px-4 py-3 space-y-3">
              {/* Domain Tags + Response Mode Toggle */}
              <div className="flex items-center gap-2">
                <div className="flex-1 flex gap-1.5 overflow-x-auto pb-1" data-testid="domain-tags">
                  {DOMAIN_TAGS.map((domain) => {
                    const isSelected = selectedDomains.includes(domain.id);
                    return (
                      <button key={domain.id} className="flex-shrink-0 inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full transition-all"
                        style={{
                          backgroundColor: isSelected ? '#b8860b' : '#1a1d2e',
                          color: isSelected ? 'white' : '#9ca3af',
                          border: isSelected ? '1px solid #d4a017' : '1px solid #2a2d3e',
                          transform: isSelected ? 'scale(1.03)' : 'scale(1)',
                        }}
                        onClick={() => toggleDomain(domain.id)}
                        data-testid={`domain-${domain.id}`}>
                        <domain.Icon className="h-3 w-3" /> {domain.label}
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-center gap-0.5 flex-shrink-0" style={{ borderLeft: '1px solid #2a2d3e', paddingLeft: '8px' }}>
                  {RESPONSE_MODES.map((mode) => (
                    <button key={mode.id} className="p-1.5 rounded transition-colors relative" title={mode.label}
                      style={{ color: responseMode === mode.id ? '#d4a017' : '#6b7280' }}
                      onClick={() => setResponseMode(mode.id)}
                      data-testid={`mode-${mode.id}`}>
                      <mode.icon className="h-4 w-4" />
                      {responseMode === mode.id && (
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3 h-0.5 rounded-full" style={{ backgroundColor: '#d4a017' }} />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Image previews */}
              {attachedImages.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {attachedImages.map((img, idx) => (
                    <div key={idx} className="relative">
                      <img src={img.previewUrl} alt={`Preview ${idx + 1}`} className="h-16 w-auto rounded-lg object-contain" style={{ border: '1px solid #2a2d3e' }}
                        data-testid={`img-attachment-preview-${idx}`} />
                      <button type="button" onClick={() => removeAttachedImage(idx)}
                        className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full shadow-sm"
                        style={{ backgroundColor: '#ef4444', color: 'white' }}
                        data-testid={`button-remove-attachment-${idx}`}>
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Input Row */}
              <form onSubmit={handleSubmit} className="flex gap-2 items-end relative">
                <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageSelect} data-testid="input-file-upload" />
                <Button type="button" variant="ghost" size="icon" className="shrink-0 mb-0.5" style={{ color: '#9ca3af' }}
                  onClick={() => fileInputRef.current?.click()} disabled={isLoading} data-testid="button-attach-image">
                  <ImagePlus className="h-5 w-5" />
                </Button>
                <div className="flex-1 relative">
                  <Textarea ref={textareaRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown}
                    placeholder="Ask anything about restaurant operations..."
                    className="min-h-[52px] max-h-[120px] resize-none pr-10"
                    style={{ backgroundColor: '#1a1d2e', border: '1px solid #2a2d3e', color: 'white', borderRadius: '12px' }}
                    disabled={isLoading} data-testid="input-consultant-message" />
                  {input.length > 80 && (
                    <span className="absolute bottom-2 right-3 text-[10px]" style={{ color: '#6b7280' }}>{input.length}</span>
                  )}
                </div>
                {messages.length > 0 && (
                  <Button type="button" variant="ghost" size="icon" className="shrink-0 mb-0.5" style={{ color: '#6b7280' }}
                    onMouseDown={handleClearHoldStart} onMouseUp={handleClearHoldEnd} onMouseLeave={handleClearHoldEnd}
                    onTouchStart={handleClearHoldStart} onTouchEnd={handleClearHoldEnd}
                    title="Hold to clear chat" data-testid="button-clear-chat">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
                <Button type="submit" size="icon" className="shrink-0 mb-0.5 font-semibold"
                  style={{ backgroundColor: '#d4a017', color: '#0f1117' }}
                  disabled={isLoading || (!input.trim() && attachedImages.length === 0)}
                  data-testid="button-send-message">
                  {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
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
