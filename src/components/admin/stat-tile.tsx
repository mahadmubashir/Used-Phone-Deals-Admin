import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * A single KPI. The number is the point, so it carries the visual weight and
 * everything else recedes; `tone` is reserved for counts that represent work
 * waiting on someone, never for decoration.
 */
export function StatTile({
  label,
  value,
  sub,
  href,
  tone = "neutral",
}: {
  label: string;
  value: string;
  sub?: string;
  href?: string;
  tone?: "neutral" | "attention";
}) {
  const body = (
    <>
      <p className="text-xs font-medium uppercase tracking-wide text-fg-subtle">
        {label}
      </p>
      <p
        className={cn(
          "tnum mt-2 font-display text-3xl font-bold leading-none tracking-tight",
          tone === "attention" ? "text-warning" : "text-foreground",
        )}
      >
        {value}
      </p>
      {sub && <p className="mt-1.5 text-xs text-fg-muted">{sub}</p>}
    </>
  );

  const shell =
    "block rounded-card border border-border bg-card p-4 transition-colors";

  return href ? (
    <Link href={href} className={cn(shell, "focus-ring hover:border-border-strong")}>
      {body}
    </Link>
  ) : (
    <div className={shell}>{body}</div>
  );
}
