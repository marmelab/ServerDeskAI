import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useCreateCompany } from "../hooks/useCreateCompany";

const companySchema = z.object({
  name: z.string().min(1, "Company name is required"),
});

type CompanyValues = z.infer<typeof companySchema>;

type CompanyFormProps = {
  onClose: () => void;
};

export const CompanyForm = ({ onClose }: CompanyFormProps) => {
  const createCompany = useCreateCompany();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CompanyValues>({
    resolver: zodResolver(companySchema),
  });

  const onSubmit = async (values: CompanyValues) => {
    try {
      await createCompany.mutateAsync(values.name);
      onClose();
    } catch {
      // Error is handled by mutation state
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit(onSubmit)} className="flex items-end gap-4">
          <div className="flex-1 space-y-2">
            <Label htmlFor="company-name">Company name</Label>
            <Input
              id="company-name"
              placeholder="Enter company name"
              {...register("name")}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
            {createCompany.error && (
              <p className="text-sm text-destructive">{createCompany.error.message}</p>
            )}
          </div>
          <Button type="submit" disabled={createCompany.isPending}>
            {createCompany.isPending ? "Creating..." : "Create"}
          </Button>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
