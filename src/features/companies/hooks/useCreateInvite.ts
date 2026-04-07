import { useMutation } from "@tanstack/react-query";
import { createInvite } from "../services/invites";
import type { AppRole } from "@/lib/types";

type CreateInviteParams = {
  email: string;
  role: AppRole;
  companyIds: string[];
};

export const useCreateInvite = () =>
  useMutation({
    mutationFn: (params: CreateInviteParams) => createInvite(params),
  });
