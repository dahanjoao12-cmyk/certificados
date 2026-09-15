"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { CompanyWithCertificateForm } from "./company-with-certificate-form";

export function NewCompanyModal({ defaultWarningDays }: { defaultWarningDays: number }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus size={14} /> Nova empresa
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Nova empresa">
        <CompanyWithCertificateForm defaultWarningDays={defaultWarningDays} onCancel={() => setOpen(false)} />
      </Modal>
    </>
  );
}
