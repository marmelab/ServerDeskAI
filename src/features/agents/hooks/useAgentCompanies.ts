import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export const useUpdateAgentCompanies = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      agentId,
      companyIds,
    }: {
      agentId: string;
      companyIds: string[];
    }) => {
      const { error } = await supabase.rpc("update_agent_companies", {
        p_agent_id: agentId,
        p_company_ids: companyIds,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agents"] });
    },
  });
};
