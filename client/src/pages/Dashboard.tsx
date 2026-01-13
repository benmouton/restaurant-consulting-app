import { useManualSections, useUserProgress } from "@/hooks/use-manual";
import { useAuth } from "@/hooks/use-auth";
import { ChatInterface } from "@/components/ChatInterface";
import { motion } from "framer-motion";
import { BookOpen, CheckCircle2, TrendingUp, Sparkles } from "lucide-react";
import { Link } from "wouter";

export default function Dashboard() {
  const { user } = useAuth();
  const { data: sections = [] } = useManualSections();
  const { data: progress = [] } = useUserProgress();

  const totalSections = sections.length;
  const completedSections = progress.length;
  const progressPercentage = totalSections > 0 ? Math.round((completedSections / totalSections) * 100) : 0;

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-primary px-8 py-10 text-primary-foreground shadow-2xl shadow-primary/20"
      >
        <div className="absolute right-0 top-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-accent/20 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl"></div>
        
        <div className="relative z-10 max-w-2xl">
          <h1 className="font-display text-4xl font-bold">Welcome back, {user?.firstName}.</h1>
          <p className="mt-2 text-lg text-primary-foreground/80">
            Let's maintain excellence today. You've completed {progressPercentage}% of your training material.
          </p>
          <Link href="/manual">
            <button className="mt-6 flex items-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-bold text-primary transition-all hover:bg-white hover:text-primary active:scale-95">
              <BookOpen className="h-4 w-4" />
              Continue Training
            </button>
          </Link>
        </div>
      </motion.div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Left Column: Progress & Stats */}
        <div className="space-y-8 lg:col-span-2">
          {/* Stats Cards */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border bg-card p-6 shadow-sm">
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                <BookOpen className="h-5 w-5" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">Total Sections</p>
              <p className="font-display text-3xl font-bold text-foreground">{totalSections}</p>
            </div>
            
            <div className="rounded-2xl border bg-card p-6 shadow-sm">
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-green-50 text-green-600">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">Completed</p>
              <p className="font-display text-3xl font-bold text-foreground">{completedSections}</p>
            </div>
            
            <div className="rounded-2xl border bg-card p-6 shadow-sm">
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-orange-50 text-orange-600">
                <TrendingUp className="h-5 w-5" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">Progress</p>
              <p className="font-display text-3xl font-bold text-foreground">{progressPercentage}%</p>
            </div>
          </div>

          {/* Progress Detailed View */}
          <div className="rounded-2xl border bg-card p-6 shadow-sm">
            <h3 className="mb-6 font-display text-xl font-bold">Training Progress</h3>
            <div className="h-4 w-full overflow-hidden rounded-full bg-muted">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${progressPercentage}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="h-full bg-primary"
              />
            </div>
            <div className="mt-8 grid gap-4">
              {sections.slice(0, 3).map((section) => {
                const isDone = progress.some(p => p.sectionId === section.id);
                return (
                  <div key={section.id} className="flex items-center justify-between rounded-xl border border-dashed p-4">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${isDone ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground'}`}>
                        {section.sequenceOrder}
                      </div>
                      <span className={`font-medium ${isDone ? 'text-foreground' : 'text-muted-foreground'}`}>{section.title}</span>
                    </div>
                    {isDone ? (
                      <span className="flex items-center gap-1 text-xs font-bold text-green-600">
                        <CheckCircle2 className="h-3 w-3" /> Done
                      </span>
                    ) : (
                      <span className="text-xs font-medium text-orange-500">Pending</span>
                    )}
                  </div>
                );
              })}
              {sections.length > 3 && (
                 <Link href="/manual" className="text-center text-sm font-medium text-primary hover:underline">
                   View all sections
                 </Link>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Chat */}
        <div className="lg:col-span-1">
          <div className="sticky top-24">
            <div className="mb-4 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-accent" />
              <h2 className="font-display text-xl font-bold">Consultant Chat</h2>
            </div>
            <ChatInterface userId={user?.id || ""} />
          </div>
        </div>
      </div>
    </div>
  );
}
