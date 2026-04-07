import { supabase } from "@/lib/supabase";
import type { Company } from "@/lib/types";

export const fetchCompanies = async (): Promise<Company[]> => {
  const { data, error } = await supabase.from("companies").select("*").order("name");
  if (error) throw error;
  return data;
};

export const fetchCompany = async (id: string): Promise<Company> => {
  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
};

export const createCompany = async (name: string): Promise<Company> => {
  const { data, error } = await supabase
    .from("companies")
    .insert({ name })
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const updateCompany = async ({ id, name }: { id: string; name: string }): Promise<Company> => {
  const { data, error } = await supabase
    .from("companies")
    .update({ name })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const deleteCompany = async (id: string): Promise<void> => {
  const { error } = await supabase.from("companies").delete().eq("id", id);
  if (error) throw error;
};
