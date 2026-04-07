import { supabase } from "@/lib/supabase";
import type { Customer } from "@/lib/types";
import type { TablesInsert, TablesUpdate } from "@/lib/database.types";

export const fetchCustomers = async (): Promise<Customer[]> => {
  const { data, error } = await supabase.from("customers").select("*").order("name");
  if (error) throw error;
  return data;
};

export const createCustomer = async ({
  name,
  email,
  companyId,
}: {
  name: string;
  email: string;
  companyId: string;
}): Promise<Customer> => {
  const payload: TablesInsert<"customers"> = { name, email, company_id: companyId };
  const { data, error } = await supabase
    .from("customers")
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const updateCustomer = async ({
  id,
  name,
  email,
}: {
  id: string;
  name: string;
  email: string;
}): Promise<Customer> => {
  const payload: TablesUpdate<"customers"> = { name, email };
  const { data, error } = await supabase
    .from("customers")
    .update(payload)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const fetchUserCompany = async (userId: string): Promise<{ company_id: string }> => {
  const { data, error } = await supabase
    .from("user_companies")
    .select("company_id")
    .eq("user_id", userId)
    .single();
  if (error) throw error;
  return data;
};
