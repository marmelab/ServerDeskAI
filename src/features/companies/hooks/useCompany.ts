import { useQuery } from "@tanstack/react-query";
import { fetchCompany } from "../services/companies";
import type { Company } from "@/lib/types";

export const useCompany = (id: string | undefined) =>
  useQuery<Company>({
    queryKey: ["company", id],
    queryFn: () => {
      if (!id) throw new Error("Company id is required");
      return fetchCompany(id);
    },
    enabled: !!id,
  });
