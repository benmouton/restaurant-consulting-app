import { motion } from "framer-motion";
import { type ManualSection } from "@shared/schema";
import { Check, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

interface ManualCardProps {
  section: ManualSection;
  isAcknowledged: boolean;
  onAcknowledge: (id: number) => void;
  isPending: boolean;
}

export function ManualCard({ section, isAcknowledged, onAcknowledge, isPending }: ManualCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "group relative overflow-hidden rounded-xl border bg-card p-6 shadow-sm transition-all duration-300 hover:shadow-md",
        isAcknowledged ? "border-green-100 bg-green-50/10" : "border-border"
      )}
    >
      <div className="mb-4 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={cn(
            "flex h-10 w-10 items-center justify-center rounded-full transition-colors",
            isAcknowledged ? "bg-green-100 text-green-700" : "bg-primary/5 text-primary"
          )}>
            {isAcknowledged ? (
              <Check className="h-5 w-5" />
            ) : (
              <span className="font-display font-bold text-lg">{section.sequenceOrder}</span>
            )}
          </div>
          <div>
            <h3 className="font-display text-xl font-semibold text-foreground">
              {section.title}
            </h3>
            <span className="inline-flex items-center rounded-md bg-accent/10 px-2 py-1 text-xs font-medium text-accent-foreground ring-1 ring-inset ring-accent/20">
              {section.category}
            </span>
          </div>
        </div>
        
        <span className={cn(
          "text-xs font-semibold uppercase tracking-wider",
          section.role === 'FOH' ? 'text-blue-600' :
          section.role === 'BOH' ? 'text-orange-600' : 'text-gray-500'
        )}>
          {section.role === 'ALL' ? 'Everyone' : section.role}
        </span>
      </div>

      <div className="prose prose-sm prose-gray mb-6 max-w-none text-muted-foreground">
        <p className="whitespace-pre-wrap leading-relaxed">{section.content}</p>
      </div>

      <div className="flex items-center justify-end border-t pt-4">
        <button
          onClick={() => !isAcknowledged && onAcknowledge(section.id)}
          disabled={isAcknowledged || isPending}
          className={cn(
            "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200",
            isAcknowledged
              ? "cursor-default text-green-700"
              : "bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/20 active:scale-95 disabled:opacity-50"
          )}
        >
          {isAcknowledged ? (
            <>
              <Check className="h-4 w-4" />
              Acknowledged
            </>
          ) : (
            <>
              <BookOpen className="h-4 w-4" />
              {isPending ? "Marking..." : "Acknowledge Read"}
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
}
