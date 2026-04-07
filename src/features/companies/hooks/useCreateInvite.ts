import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { AppRole } from "@/lib/types";

type CreateInviteParams = {
  email: string;
  role: AppRole;
  companyIds: string[];
};

export const useCreateInvite = () => {
  return useMutation({
    mutationFn: async ({ email, role, companyIds }: CreateInviteParams) => {
      const { data, error } = await supabase.rpc("create_invite", {
        p_email: email,
        p_role: role,
        p_company_ids: companyIds,
      });

      if (error) throw error;

      const row = data?.[0];
      if (!row) throw new Error("Failed to create invite");

      return { invite: { id: row.invite_id }, token: row.token };
    },
  });
};
