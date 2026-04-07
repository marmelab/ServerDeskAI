import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { AgentWithCompanies } from "../types";

export const useAgents = () => {
  return useQuery<AgentWithCompanies[]>({
    queryKey: ["agents"],
    queryFn: async () => {
      // Get all agent profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .eq("role", "agent")
        .order("name");

      if (profilesError) throw profilesError;

      const agentUserIds = profiles.map((p) => p.user_id);

      const { data: userCompanies, error: ucError } = await supabase
        .from("user_companies")
        .select("user_id, companies(*)")
        .in("user_id", agentUserIds);

      if (ucError) throw ucError;

      const companiesByAgent = new Map<string, AgentWithCompanies["companies"]>();
      for (const uc of userCompanies ?? []) {
        if (!uc.companies) continue;
        const existing = companiesByAgent.get(uc.user_id) ?? [];
        existing.push(uc.companies as AgentWithCompanies["companies"][number]);
        companiesByAgent.set(uc.user_id, existing);
      }

      return profiles.map((profile) => ({
        ...profile,
        companies: companiesByAgent.get(profile.user_id) ?? [],
      }));
    },
  });
};
