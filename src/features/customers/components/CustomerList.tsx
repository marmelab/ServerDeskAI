import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCustomers } from "../hooks/useCustomers";
import { useAuthContext } from "@/features/auth/AuthProvider";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { CustomerForm } from "./CustomerForm";
import type { Customer } from "@/lib/types";

export const CustomerList = () => {
  const { data: customers, isLoading, isError, error } = useCustomers();
  const { user } = useAuthContext();
  const [showCreate, setShowCreate] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  // Get the CM's company ID
  const { data: userCompany } = useQuery({
    queryKey: ["user-company", user?.id],
    queryFn: async () => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("user_companies")
        .select("company_id")
        .eq("user_id", user.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  if (isLoading) {
    return <p className="text-muted-foreground">Loading customers...</p>;
  }

  if (isError) {
    return <p className="text-destructive">{error.message}</p>;
  }

  const companyId = userCompany?.company_id;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Customers</h1>
        <Button onClick={() => setShowCreate(true)} disabled={!companyId}>
          New Customer
        </Button>
      </div>

      {showCreate && companyId && (
        <CustomerForm
          companyId={companyId}
          onClose={() => setShowCreate(false)}
        />
      )}

      {editingCustomer && companyId && (
        <CustomerForm
          companyId={companyId}
          customer={editingCustomer}
          onClose={() => setEditingCustomer(null)}
        />
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Created</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {customers?.map((customer) => (
            <TableRow key={customer.id}>
              <TableCell className="font-medium">{customer.name}</TableCell>
              <TableCell>{customer.email}</TableCell>
              <TableCell>
                {new Date(customer.created_at).toLocaleDateString()}
              </TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingCustomer(customer)}
                >
                  Edit
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {customers?.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground">
                No customers yet
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};
