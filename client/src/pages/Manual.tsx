import { useState } from "react";
import { useManualSections, useUserProgress, useMarkProgress } from "@/hooks/use-manual";
import { ManualCard } from "@/components/ManualCard";
import { motion } from "framer-motion";
import { Search, Filter, Loader2 } from "lucide-react";

type RoleFilter = 'ALL' | 'FOH' | 'BOH';

export default function Manual() {
  const { data: sections, isLoading: isLoadingSections } = useManualSections();
  const { data: progress, isLoading: isLoadingProgress } = useUserProgress();
  const { mutate: markProgress, isPending: isMarking } = useMarkProgress();
  
  const [filter, setFilter] = useState<RoleFilter>('ALL');
  const [search, setSearch] = useState("");

  if (isLoadingSections || isLoadingProgress) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary/20" />
      </div>
    );
  }

  const filteredSections = sections?.filter(section => {
    const matchesRole = filter === 'ALL' || section.role === 'ALL' || section.role === filter;
    const matchesSearch = section.title.toLowerCase().includes(search.toLowerCase()) || 
                          section.content.toLowerCase().includes(search.toLowerCase());
    return matchesRole && matchesSearch;
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Operations Manual</h1>
          <p className="mt-2 text-muted-foreground">Standard operating procedures and service standards.</p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Search manual..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border bg-card py-2.5 pl-9 pr-4 text-sm shadow-sm transition-all focus:border-primary focus:ring-1 focus:ring-primary sm:w-64"
            />
          </div>

          {/* Filter */}
          <div className="flex rounded-xl border bg-card p-1 shadow-sm">
            {(['ALL', 'FOH', 'BOH'] as RoleFilter[]).map((role) => (
              <button
                key={role}
                onClick={() => setFilter(role)}
                className={`rounded-lg px-4 py-1.5 text-xs font-bold transition-all ${
                  filter === role 
                    ? 'bg-primary text-primary-foreground shadow-sm' 
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                {role === 'ALL' ? 'All Staff' : role}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-6">
        {filteredSections?.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed bg-muted/30 py-20 text-center">
            <Filter className="mb-4 h-10 w-10 text-muted-foreground/30" />
            <h3 className="font-display text-lg font-medium text-foreground">No sections found</h3>
            <p className="text-sm text-muted-foreground">Try adjusting your search or filters.</p>
          </div>
        ) : (
          filteredSections?.map((section) => (
            <ManualCard
              key={section.id}
              section={section}
              isAcknowledged={progress?.some(p => p.sectionId === section.id) ?? false}
              onAcknowledge={(id) => markProgress(id)}
              isPending={isMarking}
            />
          ))
        )}
      </div>
    </div>
  );
}
