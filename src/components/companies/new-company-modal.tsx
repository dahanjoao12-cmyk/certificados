"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { CompanyWithCertificateForm } from "./company-with-certificate-form";

export function NewCompanyModal({
  defaultWarningDays,
  users,
}: {
  defaultWarningDays: number;
  users: { id: string; full_name: string }[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus size={14} /> Novo cliente
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Novo cliente">
        <CompanyWithCertificateForm defaultWarningDays={defaultWarningDays} users={users} onCancel={() => setOpen(false)} />
      </Modal>
    </>
  );
}
