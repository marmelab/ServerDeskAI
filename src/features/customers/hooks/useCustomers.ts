import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Customer } from "@/lib/types";
import type { TablesInsert, TablesUpdate } from "@/lib/database.types";

export const useCustomers = () => {
  return useQuery<Customer[]>({
    queryKey: ["customers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
  });
};

export const useCreateCustomer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      name,
      email,
      companyId,
    }: {
      name: string;
      email: string;
      companyId: string;
    }) => {
      const payload: TablesInsert<"customers"> = {
        name,
        email,
        company_id: companyId,
      };
      const { data, error } = await supabase
        .from("customers")
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });
};

export const useUpdateCustomer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      name,
      email,
    }: {
      id: string;
      name: string;
      email: string;
    }) => {
      const payload: TablesUpdate<"customers"> = { name, email };
      const { data, error } = await supabase
        .from("customers")
        .update(payload)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });
};
