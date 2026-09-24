import { cn } from "@/lib/utils/cn";
import { ALVARA_STATUS_BADGE_CLASSES, ALVARA_STATUS_LABELS } from "@/lib/alvaras/status";
import type { AlvaraStatus } from "@/lib/types/database";

export function AlvaraStatusBadge({ status }: { status: AlvaraStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset",
        ALVARA_STATUS_BADGE_CLASSES[status]
      )}
    >
      {ALVARA_STATUS_LABELS[status]}
    </span>
  );
}
