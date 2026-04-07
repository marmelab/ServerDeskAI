import { useQuery } from "@tanstack/react-query";
import { fetchAgents } from "../services/agents";
import type { AgentWithCompanies } from "../types";

export const useAgents = () =>
  useQuery<AgentWithCompanies[]>({
    queryKey: ["agents"],
    queryFn: fetchAgents,
  });
