import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useCompanies } from "@/features/companies/hooks/useCompanies";
import { useCreateInvite } from "@/features/companies/hooks/useCreateInvite";

const inviteSchema = z.object({
  email: z.email("Please enter a valid email"),
});

type InviteValues = z.infer<typeof inviteSchema>;

export const InviteAgentDialog = () => {
  const [open, setOpen] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const { data: companies } = useCompanies();
  const createInvite = useCreateInvite();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InviteValues>({
    resolver: zodResolver(inviteSchema),
  });

  const toggleCompany = (companyId: string) => {
    setSelectedCompanies((prev) =>
      prev.includes(companyId)
        ? prev.filter((id) => id !== companyId)
        : [...prev, companyId],
    );
  };

  const onSubmit = async (values: InviteValues) => {
    try {
      const result = await createInvite.mutateAsync({
        email: values.email,
        role: "agent",
        companyIds: selectedCompanies,
      });
      setInviteLink(`${window.location.origin}/signup/${result.token}`);
    } catch {
      // Error is handled by mutation state
    }
  };

  const handleCopy = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }).catch(() => {
        // Clipboard API not available — fall back silently
      });
    }
  };

  const handleClose = () => {
    setOpen(false);
    setInviteLink(null);
    setCopied(false);
    setSelectedCompanies([]);
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : handleClose())}>
      <DialogTrigger render={<Button />}>
        Invite Agent
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite Agent</DialogTitle>
        </DialogHeader>
        {inviteLink ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Share this link with the agent:
            </p>
            <div className="flex gap-2">
              <Input value={inviteLink} readOnly />
              <Button onClick={handleCopy}>
                {copied ? "Copied!" : "Copy"}
              </Button>
            </div>
            <Button variant="outline" className="w-full" onClick={handleClose}>
              Done
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="agent-email">Email address</Label>
              <Input
                id="agent-email"
                type="email"
                placeholder="agent@example.com"
                {...register("email")}
              />
              {errors.email && (
                <p className="text-sm text-destructive">
                  {errors.email.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Assign to companies (optional)</Label>
              <div className="max-h-40 space-y-2 overflow-y-auto rounded-md border p-3">
                {companies?.map((company) => (
                  <label
                    key={company.id}
                    className="flex items-center gap-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={selectedCompanies.includes(company.id)}
                      onChange={() => toggleCompany(company.id)}
                    />
                    {company.name}
                  </label>
                ))}
                {companies?.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No companies created yet
                  </p>
                )}
              </div>
            </div>
            {createInvite.error && (
              <p className="text-sm text-destructive">{createInvite.error.message}</p>
            )}
            <Button
              type="submit"
              className="w-full"
              disabled={createInvite.isPending}
            >
              {createInvite.isPending
                ? "Creating invite..."
                : "Generate invite link"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};
