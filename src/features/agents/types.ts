import type { Profile, Company } from "@/lib/types";

export type AgentWithCompanies = Profile & {
  companies: Company[];
};
