import Link from "next/link";
import { ArrowUpDown } from "lucide-react";
import { formatDocument } from "@/lib/documents/document";
import { StatusBadge } from "@/components/certificates/status-badge";
import { CertificateRowActions } from "@/components/dashboard/certificate-row-actions";
import type { ColumnDef } from "@/lib/certificates/columns";
import type { CertificateWithCompany } from "@/lib/types/database";
import { SORTABLE_FIELDS } from "@/lib/certificates/filters";

function formatDate(value: string | null): string {
  if (!value) return "-";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function renderCell(row: CertificateWithCompany, key: string, defaultWarningDays: number): React.ReactNode {
  switch (key) {
    case "company_code":
      return row.company_code;
    case "company_document":
      return formatDocument(row.company_document);
    case "company_corporate_name":
      return (
        <div>
          <p className="font-medium text-slate-900">{row.company_corporate_name}</p>
          {row.company_short_name && (
            <p className="text-xs text-slate-500">{row.company_short_name}</p>
          )}
        </div>
      );
    case "company_municipality":
      return row.company_municipality ?? "-";
    case "company_uf":
      return row.company_uf ?? "-";
    case "type":
      return row.type === "e-cnpj" ? "e-CNPJ" : "e-CPF";
    case "model":
      return row.model;
    case "valid_to":
      return formatDate(row.valid_to);
    case "days_remaining":
      return row.archived ? "-" : row.days_remaining;
    case "status":
      return <StatusBadge status={row.status} />;
    case "warning_days":
      return row.warning_days ? `${row.warning_days} dias` : `Padrão (${defaultWarningDays} dias)`;
    case "company_responsible":
      return row.company_responsible ?? "-";
    case "created_at":
      return formatDate(row.created_at.slice(0, 10));
    case "updated_at":
      return formatDate(row.updated_at.slice(0, 10));
    default:
      return "-";
  }
}

function SortableHeader({
  column,
  currentSort,
  currentDir,
  currentQuery,
}: {
  column: ColumnDef;
  currentSort: string;
  currentDir: "asc" | "desc";
  currentQuery: string;
}) {
  const isSortable = (SORTABLE_FIELDS as readonly string[]).includes(column.key);
  if (!isSortable) {
    return <span>{column.label}</span>;
  }

  const nextDir = currentSort === column.key && currentDir === "asc" ? "desc" : "asc";
  const params = new URLSearchParams(currentQuery);
  params.set("sort", column.key);
  params.set("dir", nextDir);
  params.set("page", "1");

  return (
    <Link
      href={`?${params.toString()}`}
      className="inline-flex items-center gap-1 hover:text-slate-900"
    >
      {column.label}
      <ArrowUpDown size={11} className={currentSort === column.key ? "text-slate-900" : "text-slate-300"} />
    </Link>
  );
}

export function CertificatesTable({
  rows,
  columns,
  sort,
  dir,
  currentQuery,
  isAdmin,
  defaultWarningDays,
}: {
  rows: CertificateWithCompany[];
  columns: ColumnDef[];
  sort: string;
  dir: "asc" | "desc";
  currentQuery: string;
  isAdmin: boolean;
  defaultWarningDays: number;
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-slate-300 bg-white py-16 text-center">
        <p className="text-sm text-slate-500">Nenhum certificado encontrado com os filtros atuais.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
      <table className="w-full min-w-max text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium uppercase tracking-wide text-slate-500">
            {columns.map((col) => (
              <th key={col.key} className="whitespace-nowrap px-4 py-2.5">
                <SortableHeader column={col} currentSort={sort} currentDir={dir} currentQuery={currentQuery} />
              </th>
            ))}
            <th className="whitespace-nowrap px-4 py-2.5">Ações</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
              {columns.map((col) => (
                <td key={col.key} className="whitespace-nowrap px-4 py-2.5 text-slate-700">
                  {renderCell(row, col.key, defaultWarningDays)}
                </td>
              ))}
              <td className="whitespace-nowrap px-4 py-2.5">
                <CertificateRowActions
                  certificateId={row.id}
                  companyId={row.company_id}
                  archived={row.archived}
                  isAdmin={isAdmin}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
