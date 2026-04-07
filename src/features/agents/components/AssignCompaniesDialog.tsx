import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useCompanies } from "@/features/companies/hooks/useCompanies";
import { useUpdateAgentCompanies } from "../hooks/useAgentCompanies";
import type { AgentWithCompanies } from "../types";

type AssignCompaniesDialogProps = {
  agent: AgentWithCompanies;
};

export const AssignCompaniesDialog = ({
  agent,
}: AssignCompaniesDialogProps) => {
  const [open, setOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const { data: companies } = useCompanies();
  const updateCompanies = useUpdateAgentCompanies();

  useEffect(() => {
    if (open) {
      setSelectedIds(agent.companies.map((c) => c.id));
    }
  }, [open, agent.companies]);

  const toggleCompany = (companyId: string) => {
    setSelectedIds((prev) =>
      prev.includes(companyId)
        ? prev.filter((id) => id !== companyId)
        : [...prev, companyId],
    );
  };

  const handleSave = async () => {
    await updateCompanies.mutateAsync({
      agentId: agent.user_id,
      companyIds: selectedIds,
    });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="ghost" size="sm" />}>
        Edit companies
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign companies to {agent.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Companies</Label>
            <div className="max-h-60 space-y-2 overflow-y-auto rounded-md border p-3">
              {companies?.map((company) => (
                <label
                  key={company.id}
                  className="flex items-center gap-2 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(company.id)}
                    onChange={() => toggleCompany(company.id)}
                  />
                  {company.name}
                </label>
              ))}
            </div>
          </div>
          <Button
            className="w-full"
            onClick={handleSave}
            disabled={updateCompanies.isPending}
          >
            {updateCompanies.isPending ? "Saving..." : "Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
