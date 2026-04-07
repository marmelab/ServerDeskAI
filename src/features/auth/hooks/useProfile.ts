import { useQuery } from "@tanstack/react-query";
import { fetchProfile } from "../services/profile";
import type { Profile } from "@/lib/types";

export const useProfile = (userId: string | undefined) =>
  useQuery<Profile>({
    queryKey: ["profile", userId],
    queryFn: () => {
      if (!userId) throw new Error("userId is required");
      return fetchProfile(userId);
    },
    enabled: !!userId,
  });
