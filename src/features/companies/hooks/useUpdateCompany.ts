import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateCompany } from "../services/companies";

export const useUpdateCompany = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateCompany,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["companies"] }),
  });
};
