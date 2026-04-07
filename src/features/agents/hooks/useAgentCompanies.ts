import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateAgentCompanies } from "../services/agents";

export const useUpdateAgentCompanies = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateAgentCompanies,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["agents"] }),
  });
};
