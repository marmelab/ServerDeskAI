import { useState } from "react";
import { useParams, useNavigate } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCompany } from "../hooks/useCompany";
import { useUpdateCompany, useDeleteCompany } from "../hooks/useCompanies";
import { InviteCMDialog } from "./InviteCMDialog";

const editSchema = z.object({
  name: z.string().min(1, "Company name is required"),
});

type EditValues = z.infer<typeof editSchema>;

export const CompanyDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: company, isLoading, isError, error: queryError } = useCompany(id);
  const updateCompany = useUpdateCompany();
  const deleteCompany = useDeleteCompany();
  const [editing, setEditing] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EditValues>({
    values: { name: company?.name ?? "" },
    resolver: zodResolver(editSchema),
  });

  if (isLoading) {
    return <p className="text-muted-foreground">Loading...</p>;
  }

  if (isError) {
    return <p className="text-destructive">Failed to load company: {queryError.message}</p>;
  }

  if (!company) {
    return <p className="text-destructive">Company not found</p>;
  }

  const onSubmit = async (values: EditValues) => {
    try {
      await updateCompany.mutateAsync({ id: company.id, name: values.name });
      setEditing(false);
    } catch {
      // Error is handled by mutation state
    }
  };

  const handleDelete = async () => {
    if (confirm("Delete this company? This will also delete all related data.")) {
      try {
        await deleteCompany.mutateAsync(company.id);
        navigate("/companies");
      } catch {
        // Error is handled by mutation state
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{company.name}</h1>
        <div className="flex gap-2">
          <InviteCMDialog companyId={company.id} companyName={company.name} />
          <Button variant="outline" onClick={() => setEditing(!editing)}>
            {editing ? "Cancel" : "Edit"}
          </Button>
          <Button variant="destructive" onClick={handleDelete}>
            Delete
          </Button>
        </div>
      </div>

      {updateCompany.error && (
        <p className="text-sm text-destructive">{updateCompany.error.message}</p>
      )}
      {deleteCompany.error && (
        <p className="text-sm text-destructive">{deleteCompany.error.message}</p>
      )}

      {editing && (
        <Card>
          <CardHeader>
            <CardTitle>Edit Company</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="flex items-end gap-4">
              <div className="flex-1 space-y-2">
                <Label htmlFor="edit-name">Name</Label>
                <Input id="edit-name" {...register("name")} />
                {errors.name && (
                  <p className="text-sm text-destructive">
                    {errors.name.message}
                  </p>
                )}
              </div>
              <Button type="submit" disabled={updateCompany.isPending}>
                Save
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Company Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <span className="text-muted-foreground">Created:</span>{" "}
            {new Date(company.created_at).toLocaleDateString()}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
