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
import { useCreateInvite } from "../hooks/useCreateInvite";

const inviteSchema = z.object({
  email: z.email("Please enter a valid email"),
});

type InviteValues = z.infer<typeof inviteSchema>;

type InviteCMDialogProps = {
  companyId: string;
  companyName: string;
};

export const InviteCMDialog = ({
  companyId,
  companyName,
}: InviteCMDialogProps) => {
  const [open, setOpen] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const createInvite = useCreateInvite();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InviteValues>({
    resolver: zodResolver(inviteSchema),
  });

  const onSubmit = async (values: InviteValues) => {
    try {
      const result = await createInvite.mutateAsync({
        email: values.email,
        role: "customer_manager",
        companyIds: [companyId],
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
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : handleClose())}>
      <DialogTrigger render={<Button variant="outline" />}>
        Invite Customer Manager
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite Customer Manager to {companyName}</DialogTitle>
        </DialogHeader>
        {inviteLink ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Share this link with the customer manager:
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
              <Label htmlFor="invite-email">Email address</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="manager@company.com"
                {...register("email")}
              />
              {errors.email && (
                <p className="text-sm text-destructive">
                  {errors.email.message}
                </p>
              )}
            </div>
            {createInvite.error && (
              <p className="text-sm text-destructive">{createInvite.error.message}</p>
            )}
            <Button
              type="submit"
              className="w-full"
              disabled={createInvite.isPending}
            >
              {createInvite.isPending ? "Creating invite..." : "Generate invite link"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};
