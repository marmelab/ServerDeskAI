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

      // Get user_companies and companies for each agent
      const agents: AgentWithCompanies[] = [];

      for (const profile of profiles) {
        const { data: userCompanies } = await supabase
          .from("user_companies")
          .select("company_id, companies(*)")
          .eq("user_id", profile.user_id);

        agents.push({
          ...profile,
          companies:
            userCompanies?.map(
              (uc) => uc.companies as unknown as AgentWithCompanies["companies"][number],
            ) ?? [],
        });
      }

      return agents;
    },
  });
};
