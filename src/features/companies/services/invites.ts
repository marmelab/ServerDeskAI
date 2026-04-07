import { supabase } from "@/lib/supabase";
import type { AppRole } from "@/lib/types";

type CreateInviteParams = {
  email: string;
  role: AppRole;
  companyIds: string[];
};

export const createInvite = async ({
  email,
  role,
  companyIds,
}: CreateInviteParams): Promise<{ invite: { id: string }; token: string }> => {
  const params: { p_email: string; p_role: AppRole; p_company_ids?: string[] } = {
    p_email: email,
    p_role: role,
  };
  if (companyIds.length > 0) {
    params.p_company_ids = companyIds;
  }
  const { data, error } = await supabase.rpc("create_invite", params);
  if (error) throw error;

  const row = data?.[0];
  if (!row) throw new Error("Failed to create invite");

  return { invite: { id: row.invite_id }, token: row.token };
};

export const validateInvite = async (token: string): Promise<{ email: string }> => {
  const { data, error } = await supabase.rpc("validate_invite", { p_token: token });
  if (error) throw error;

  const row = (data as { email: string }[] | null)?.[0];
  if (!row) throw new Error("Invalid or expired invite link");

  return { email: row.email };
};
