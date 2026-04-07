import { useQuery } from "@tanstack/react-query";
import { fetchCompanies } from "../services/companies";
import type { Company } from "@/lib/types";

export const useCompanies = () =>
  useQuery<Company[]>({
    queryKey: ["companies"],
    queryFn: fetchCompanies,
  });
