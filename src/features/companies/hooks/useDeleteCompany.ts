import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteCompany } from "../services/companies";

export const useDeleteCompany = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteCompany,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["companies"] }),
  });
};
