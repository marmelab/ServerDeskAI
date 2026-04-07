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
      // Delete existing assignments
      const { error: deleteError } = await supabase
        .from("user_companies")
        .delete()
        .eq("user_id", agentId);

      if (deleteError) throw deleteError;

      // Insert new assignments
      if (companyIds.length > 0) {
        const { error: insertError } = await supabase
          .from("user_companies")
          .insert(
            companyIds.map((companyId) => ({
              user_id: agentId,
              company_id: companyId,
            })),
          );

        if (insertError) throw insertError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agents"] });
    },
  });
};
