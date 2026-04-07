import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAgents } from "../hooks/useAgents";
import { InviteAgentDialog } from "./InviteAgentDialog";
import { AssignCompaniesDialog } from "./AssignCompaniesDialog";

export const AgentList = () => {
  const { data: agents, isLoading } = useAgents();

  if (isLoading) {
    return <p className="text-muted-foreground">Loading agents...</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Agents</h1>
        <InviteAgentDialog />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Companies</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {agents?.map((agent) => (
            <TableRow key={agent.user_id}>
              <TableCell className="font-medium">{agent.name}</TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {agent.companies.map((c) => (
                    <Badge key={c.id} variant="secondary">
                      {c.name}
                    </Badge>
                  ))}
                  {agent.companies.length === 0 && (
                    <span className="text-sm text-muted-foreground">
                      No companies
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <AssignCompaniesDialog agent={agent} />
              </TableCell>
            </TableRow>
          ))}
          {agents?.length === 0 && (
            <TableRow>
              <TableCell colSpan={3} className="text-center text-muted-foreground">
                No agents yet
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};
