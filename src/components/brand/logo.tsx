import Link from "next/link";
import { cn } from "@/lib/utils";

/** Compact "UPD" monogram in a rounded-square lockup. */
export function Monogram({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-grid size-9 place-items-center rounded-[0.7rem] bg-primary font-display text-sm font-bold tracking-tight text-primary-foreground",
        className,
      )}
      aria-hidden
    >
      UPD
    </span>
  );
}

export function Logo({
  className,
  withMonogram = true,
}: {
  className?: string;
  withMonogram?: boolean;
}) {
  return (
    <Link
      href="/"
      className={cn(
        "focus-ring flex items-center gap-2.5 rounded-md",
        className,
      )}
      aria-label="UsedPhoneDeals home"
    >
      {withMonogram && <Monogram />}
      <span className="font-display text-base font-bold leading-none tracking-tight text-foreground sm:text-lg">
        Used<span className="text-fg-muted">Phone</span>
        <span className="text-primary">Deals</span>
      </span>
    </Link>
  );
}
