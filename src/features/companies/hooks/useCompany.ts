import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Company } from "@/lib/types";

export const useCompany = (id: string | undefined) => {
  return useQuery<Company>({
    queryKey: ["company", id],
    queryFn: async () => {
      if (!id) throw new Error("Company id is required");
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
};
