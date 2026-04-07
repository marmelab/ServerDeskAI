import { useQuery } from "@tanstack/react-query";
import { fetchCustomers } from "../services/customers";
import type { Customer } from "@/lib/types";

export const useCustomers = () =>
  useQuery<Customer[]>({
    queryKey: ["customers"],
    queryFn: fetchCustomers,
  });
