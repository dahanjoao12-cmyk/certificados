import { cn } from "@/lib/utils/cn";
import {
  CERTIFICATE_STATUS_BADGE_CLASSES,
  CERTIFICATE_STATUS_LABELS,
} from "@/lib/certificates/status";
import type { CertificateStatus } from "@/lib/types/database";

export function StatusBadge({ status }: { status: CertificateStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset",
        CERTIFICATE_STATUS_BADGE_CLASSES[status]
      )}
    >
      {CERTIFICATE_STATUS_LABELS[status]}
    </span>
  );
}
