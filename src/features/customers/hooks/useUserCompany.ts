import { useQuery } from "@tanstack/react-query";
import { fetchUserCompany } from "../services/customers";

export const useUserCompany = (userId: string | undefined) =>
  useQuery({
    queryKey: ["user-company", userId],
    queryFn: () => {
      if (!userId) throw new Error("Not authenticated");
      return fetchUserCompany(userId);
    },
    enabled: !!userId,
  });
