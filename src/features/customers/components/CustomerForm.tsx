import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCreateCustomer } from "../hooks/useCreateCustomer";
import { useUpdateCustomer } from "../hooks/useUpdateCustomer";
import type { Customer } from "@/lib/types";

const customerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Please enter a valid email"),
});

type CustomerValues = z.infer<typeof customerSchema>;

type CustomerFormProps = {
  companyId: string;
  customer?: Customer;
  onClose: () => void;
};

export const CustomerForm = ({
  companyId,
  customer,
  onClose,
}: CustomerFormProps) => {
  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();
  const isEditing = !!customer;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CustomerValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: customer
      ? { name: customer.name, email: customer.email }
      : undefined,
  });

  const onSubmit = async (values: CustomerValues) => {
    try {
      if (isEditing) {
        await updateCustomer.mutateAsync({
          id: customer.id,
          name: values.name,
          email: values.email,
        });
      } else {
        await createCustomer.mutateAsync({
          name: values.name,
          email: values.email,
          companyId,
        });
      }
      onClose();
    } catch {
      // error displayed via mutation.error below
    }
  };

  const isPending = createCustomer.isPending || updateCustomer.isPending;
  const mutationError = createCustomer.error ?? updateCustomer.error;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEditing ? "Edit Customer" : "New Customer"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="customer-name">Name</Label>
            <Input id="customer-name" {...register("name")} />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="customer-email">Email</Label>
            <Input id="customer-email" type="email" {...register("email")} />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>
          {mutationError && (
            <p className="text-sm text-destructive">{mutationError.message}</p>
          )}
          <div className="flex gap-2">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : isEditing ? "Save" : "Create"}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
