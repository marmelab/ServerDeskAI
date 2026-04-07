import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { AppRole } from "@/lib/types";

type CreateInviteParams = {
  email: string;
  role: AppRole;
  companyIds: string[];
};

const generateToken = () => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
};

export const useCreateInvite = () => {
  return useMutation({
    mutationFn: async ({ email, role, companyIds }: CreateInviteParams) => {
      const token = generateToken();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 day expiry

      const { data: invite, error: inviteError } = await supabase
        .from("invites")
        .insert({
          email,
          role,
          token,
          invited_by: (await supabase.auth.getUser()).data.user!.id,
          expires_at: expiresAt.toISOString(),
        })
        .select()
        .single();

      if (inviteError) throw inviteError;

      if (companyIds.length > 0) {
        const { error: icError } = await supabase
          .from("invite_companies")
          .insert(
            companyIds.map((companyId) => ({
              invite_id: invite.id,
              company_id: companyId,
            })),
          );
        if (icError) throw icError;
      }

      return { invite, token };
    },
  });
};
