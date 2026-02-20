import { useState, useEffect, useRef } from "react";
import { useChatStream, useConversation, useCreateConversation } from "@/hooks/use-chat";
import { Send, Bot, User, Loader2, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface ChatInterfaceProps {
  userId: string;
}

export function ChatInterface({ userId }: ChatInterfaceProps) {
  // Simple implementation: Single conversation per user session or generic "Consultant Chat"
  // For this MVP, we'll try to use a fixed conversation ID or create one if missing
  // Real implementation would manage list of conversations.
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [input, setInput] = useState("");
  
  const { mutateAsync: createConv } = useCreateConversation();
  const { data: conversation, isLoading: isLoadingConv } = useConversation(conversationId);
  const { sendMessage, isStreaming, streamingContent } = useChatStream();
  
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto-create a conversation if none exists
    if (!conversationId) {
      createConv("Consultant Session").then(c => setConversationId(c.id));
    }
  }, [conversationId, createConv]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [conversation?.messages, streamingContent, isStreaming]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !conversationId || isStreaming) return;
    
    const msg = input;
    setInput("");
    await sendMessage(conversationId, msg);
  };

  return (
    <div className="flex h-[600px] flex-col overflow-hidden rounded-2xl border bg-card shadow-xl ring-1 ring-black/5">
      {/* Header */}
      <div className="flex items-center gap-3 border-b bg-primary px-6 py-4 text-primary-foreground">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-accent">
          <Bot className="h-6 w-6" />
        </div>
        <div>
          <h3 className="font-display text-lg font-bold">Virtual Consultant</h3>
          <p className="text-xs text-primary-foreground/70">Ask about operations, service, or policy</p>
        </div>
      </div>

      {/* Messages */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto bg-muted/30 p-6 scrollbar-thin"
      >
        {!conversationId || isLoadingConv ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Welcome Message */}
            {conversation?.messages.length === 0 && (
              <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
                <Sparkles className="mb-4 h-12 w-12 text-accent" />
                <h4 className="mb-2 font-display text-lg font-semibold text-foreground">
                  Hello! I'm Mouton's Virtual Consultant.
                </h4>
                <p className="max-w-xs text-sm">
                  I'm trained on our complete operations manual. Ask me anything about FOH service steps, BOH prep, or opening/closing duties.
                </p>
              </div>
            )}

            {conversation?.messages.map((msg) => (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={msg.id}
                className={cn(
                  "flex w-full gap-3",
                  msg.role === "user" ? "flex-row-reverse" : "flex-row"
                )}
              >
                <div className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                  msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground"
                )}>
                  {msg.role === "user" ? <User className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
                </div>
                
                <div className={cn(
                  "max-w-[80%] rounded-2xl px-4 py-3 text-sm shadow-sm",
                  msg.role === "user" 
                    ? "bg-primary text-primary-foreground rounded-tr-none" 
                    : "bg-card text-foreground rounded-tl-none border"
                )}>
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                </div>
              </motion.div>
            ))}

            {/* Streaming Message */}
            {isStreaming && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex w-full flex-row gap-3"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
                  <Bot className="h-5 w-5" />
                </div>
                <div className="max-w-[80%] rounded-2xl rounded-tl-none border bg-card px-4 py-3 text-sm shadow-sm">
                  <div className="prose prose-sm max-w-none">
                    <ReactMarkdown>{streamingContent}</ReactMarkdown>
                  </div>
                  {!streamingContent && (
                    <span className="flex gap-1">
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:-0.3s]"></span>
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:-0.15s]"></span>
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/50"></span>
                    </span>
                  )}
                </div>
              </motion.div>
            )}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t bg-background p-4">
        <form onSubmit={handleSend} className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question about the manual..."
            className="w-full rounded-full border border-input bg-muted/20 px-6 py-4 pr-14 text-sm shadow-inner transition-all focus:border-primary focus:bg-background focus:outline-none focus:ring-1 focus:ring-primary"
            disabled={isStreaming}
          />
          <button
            type="submit"
            disabled={!input.trim() || isStreaming}
            className="absolute right-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md disabled:opacity-50"
          >
            {isStreaming ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5 translate-x-0.5" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
