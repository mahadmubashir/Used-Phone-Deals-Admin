"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Store,
  Receipt,
  Users,
  LifeBuoy,
  BarChart3,
  Settings,
  Boxes,
  Upload,
  Wallet,
  Bell,
  ShieldCheck,
} from "lucide-react";
import { canAccess, PORTAL_ROLES, ROLE_LABELS, type PortalSection, type Role } from "@/shared";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { useRole } from "./role-context";

/**
 * Every portal section, mapped to a route. `href: null` means the section is
 * real in the permission model but not built in this milestone — it is shown
 * disabled rather than hidden, so the navigation is an honest reflection of
 * ROLE_SECTIONS instead of a curated demo menu.
 */
const SECTIONS: {
  section: PortalSection;
  label: string;
  href: string | null;
  Icon: typeof LayoutDashboard;
  group: string;
}[] = [
  { section: "admin:home", label: "Dashboard", href: "/", Icon: LayoutDashboard, group: "Platform" },
  { section: "admin:catalogue", label: "Catalogue", href: "/catalogue", Icon: Package, group: "Platform" },
  { section: "admin:suppliers", label: "Suppliers", href: "/suppliers", Icon: Store, group: "Platform" },
  { section: "admin:orders", label: "Orders", href: "/orders", Icon: Receipt, group: "Platform" },
  { section: "admin:buyers", label: "Buyers", href: "/buyers", Icon: Users, group: "Platform" },
  { section: "admin:reports", label: "Reports", href: "/reports", Icon: BarChart3, group: "Platform" },
  { section: "admin:settings", label: "Settings", href: null, Icon: Settings, group: "Platform" },

  { section: "csr:queue", label: "Case queue", href: "/cases", Icon: LifeBuoy, group: "Customer service" },
  { section: "csr:orders", label: "Order lookup", href: "/orders", Icon: Receipt, group: "Customer service" },
  { section: "csr:home", label: "CSR overview", href: null, Icon: LayoutDashboard, group: "Customer service" },

  { section: "supplier:home", label: "Overview", href: null, Icon: LayoutDashboard, group: "Supplier" },
  { section: "supplier:submit-stock", label: "Submit stock", href: null, Icon: Upload, group: "Supplier" },
  { section: "supplier:stock", label: "My stock", href: null, Icon: Boxes, group: "Supplier" },
  { section: "supplier:orders", label: "Orders", href: null, Icon: Receipt, group: "Supplier" },
  { section: "supplier:csr-notifications", label: "CSR requests", href: null, Icon: Bell, group: "Supplier" },
  { section: "supplier:earnings", label: "Earnings", href: null, Icon: Wallet, group: "Supplier" },
  { section: "supplier:settings", label: "Settings", href: null, Icon: Settings, group: "Supplier" },
];

function useVisibleSections(role: Role) {
  const allowed = SECTIONS.filter((s) => canAccess(role, s.section));
  const groups: Record<string, typeof SECTIONS> = {};
  for (const s of allowed) (groups[s.group] ||= []).push(s);
  return groups;
}

function NavItem({
  item,
  active,
  onNavigate,
}: {
  item: (typeof SECTIONS)[number];
  active: boolean;
  onNavigate?: () => void;
}) {
  const inner = (
    <>
      <item.Icon className="size-4 shrink-0" />
      <span className="truncate">{item.label}</span>
    </>
  );

  if (!item.href) {
    return (
      <span
        className="flex cursor-not-allowed items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-fg-subtle/70"
        title="Section exists in the permission model but is not built in this milestone"
      >
        {inner}
        <span className="ml-auto rounded-full border border-border px-1.5 py-px text-[10px] font-medium text-fg-subtle">
          Soon
        </span>
      </span>
    );
  }

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "focus-ring flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-primary/10 text-primary"
          : "text-fg-muted hover:bg-surface-inset hover:text-foreground",
      )}
    >
      {inner}
    </Link>
  );
}

function NoAccess({ role }: { role: Role }) {
  return (
    <div className="mx-auto max-w-md rounded-card border border-border bg-card p-8 text-center">
      <span className="mx-auto grid size-11 place-items-center rounded-full bg-surface-inset text-fg-muted">
        <ShieldCheck className="size-5" />
      </span>
      <h1 className="mt-3 font-display text-lg font-bold tracking-tight">
        Not available to {ROLE_LABELS[role]}
      </h1>
      <p className="mt-1.5 text-sm text-fg-muted">
        This section is outside your role’s permissions. Access is checked on the
        route, so the data is never rendered — not merely hidden from the menu.
      </p>
      <Link
        href="/"
        className="focus-ring mt-4 inline-block rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-surface-inset"
      >
        Back to a permitted section
      </Link>
    </div>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { role, setRole } = useRole();
  const groups = useVisibleSections(role);

  const isActive = (href: string | null) =>
    !!href && (href === "/" ? pathname === "/" : pathname.startsWith(href));

  /**
   * Route guard, not just menu filtering. Hiding a nav item while the page
   * underneath still renders is not access control — a CSR agent who typed
   * /admin/suppliers would otherwise read supplier financials. One route can
   * map to several sections (orders is both admin:orders and csr:orders), so
   * access is granted if any matching section is permitted.
   */
  const sectionsForPath = SECTIONS.filter(
    (s) => s.href && (s.href === "/" ? pathname === "/" : pathname.startsWith(s.href)),
  );
  const allowedHere =
    sectionsForPath.length === 0 || sectionsForPath.some((s) => canAccess(role, s.section));

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="flex items-center gap-3 px-3 py-3 sm:px-4">
          <Logo className="min-w-0 shrink" />
          <span className="hidden items-center gap-1.5 rounded-full border border-border bg-surface-inset px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-fg-muted sm:inline-flex">
            <ShieldCheck className="size-3.5" />
            Admin portal
          </span>

          <div className="ml-auto flex min-w-0 items-center gap-2">
            <label className="sr-only" htmlFor="role-switcher">
              Viewing as role
            </label>
            <select
              id="role-switcher"
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              className="focus-ring max-w-[9.5rem] truncate rounded-lg border border-border bg-surface px-2.5 py-2 text-sm font-medium text-foreground"
            >
              {PORTAL_ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
            <ThemeToggle className="hidden sm:grid" />
          </div>
        </div>

        {/* Mobile section nav — horizontal scroller, mirrors the sidebar */}
        <nav
          aria-label="Sections"
          className="flex min-w-0 gap-1 overflow-x-auto border-t border-border px-3 py-2 lg:hidden"
        >
          {Object.values(groups)
            .flat()
            .filter((s) => s.href)
            .map((s) => (
              <Link
                key={s.section}
                href={s.href as string}
                aria-current={isActive(s.href) ? "page" : undefined}
                className={cn(
                  "focus-ring flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium",
                  isActive(s.href)
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : "border-border text-fg-muted",
                )}
              >
                <s.Icon className="size-3.5" />
                {s.label}
              </Link>
            ))}
        </nav>
      </header>

      <div className="flex flex-1 flex-col lg:flex-row">
        {/* Sidebar */}
        <aside className="hidden w-60 shrink-0 border-r border-border px-3 py-5 lg:block">
          <div className="sticky top-28 flex flex-col gap-6">
            {Object.entries(groups).map(([group, items]) => (
              <div key={group}>
                <p className="px-2.5 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-fg-subtle">
                  {group}
                </p>
                <div className="flex flex-col gap-0.5">
                  {items.map((item) => (
                    <NavItem key={item.section} item={item} active={isActive(item.href)} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </aside>

        <main className="min-w-0 flex-1 px-3 py-6 sm:px-6 lg:px-8">
          {allowedHere ? children : <NoAccess role={role} />}
        </main>
      </div>
    </div>
  );
}
