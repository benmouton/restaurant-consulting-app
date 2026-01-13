import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { type ManualSection, type UserProgress } from "@shared/schema";

export function useManualSections() {
  return useQuery({
    queryKey: [api.manual.list.path],
    queryFn: async () => {
      const res = await fetch(api.manual.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch manual sections");
      return api.manual.list.responses[200].parse(await res.json());
    },
  });
}

export function useUserProgress() {
  return useQuery({
    queryKey: [api.progress.list.path],
    queryFn: async () => {
      const res = await fetch(api.progress.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch user progress");
      return api.progress.list.responses[200].parse(await res.json());
    },
  });
}

export function useMarkProgress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (sectionId: number) => {
      const res = await fetch(api.progress.mark.path, {
        method: api.progress.mark.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sectionId }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to mark progress");
      return api.progress.mark.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.progress.list.path] });
    },
  });
}
