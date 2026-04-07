import { useState } from "react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCompanies } from "../hooks/useCompanies";
import { CompanyForm } from "./CompanyForm";

export const CompanyList = () => {
  const { data: companies, isLoading } = useCompanies();
  const [showCreate, setShowCreate] = useState(false);

  if (isLoading) {
    return <p className="text-muted-foreground">Loading companies...</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Companies</h1>
        <Button onClick={() => setShowCreate(true)}>New Company</Button>
      </div>

      {showCreate && (
        <CompanyForm onClose={() => setShowCreate(false)} />
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Created</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {companies?.map((company) => (
            <TableRow key={company.id}>
              <TableCell className="font-medium">{company.name}</TableCell>
              <TableCell>
                {new Date(company.created_at).toLocaleDateString()}
              </TableCell>
              <TableCell>
                <Link to={`/companies/${company.id}`}>
                  <Button variant="ghost" size="sm">
                    View
                  </Button>
                </Link>
              </TableCell>
            </TableRow>
          ))}
          {companies?.length === 0 && (
            <TableRow>
              <TableCell colSpan={3} className="text-center text-muted-foreground">
                No companies yet
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};
