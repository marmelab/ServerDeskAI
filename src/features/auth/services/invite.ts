import { supabase } from "@/lib/supabase";

export const validateInvite = async (token: string): Promise<{ email: string }> => {
  const { data, error } = await supabase.rpc("validate_invite", { p_token: token });
  if (error) throw error;

  const row = data?.[0];
  if (!row) throw new Error("Invalid or expired invite link");

  return { email: row.email as string };
};
