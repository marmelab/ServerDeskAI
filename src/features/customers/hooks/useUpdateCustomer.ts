import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateCustomer } from "../services/customers";

export const useUpdateCustomer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateCustomer,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["customers"] }),
  });
};
