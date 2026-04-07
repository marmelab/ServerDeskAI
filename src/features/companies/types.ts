import type { Company } from "@/lib/types";

export type CompanyWithCounts = Company & {
  customer_count: number;
  ticket_count: number;
};
