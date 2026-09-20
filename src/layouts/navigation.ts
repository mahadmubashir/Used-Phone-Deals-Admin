import type { PortalSection, Role } from '@/shared';
import { ROLE_SECTIONS } from '@/shared';

export interface NavItem {
  section: PortalSection;
  to: string;
  label: string;
  /** Heroicons-style path data. */
  icon: string;
  group: 'Supplier' | 'Customer Service' | 'Administration';
  end?: boolean;
}

const ICONS = {
  home: 'M2.25 12l8.954-8.955a1.5 1.5 0 012.122 0L22.28 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75',
  plus: 'M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z',
  box: 'M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z',
  truck: 'M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12',
  bell: 'M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0',
  money: 'M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  cog: 'M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.077-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z',
  inbox: 'M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.013 1.244h3.218a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.013-1.244h3.859m-19.5.338V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 00-2.15-1.588H6.911a2.25 2.25 0 00-2.15 1.588L2.35 13.177a2.25 2.25 0 00-.1.661z',
  ticket: 'M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 010 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 010-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375z',
  catalogue: 'M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25',
  users: 'M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z',
  buyers: 'M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z',
  report: 'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z',
} as const;

const ALL_NAV: NavItem[] = [
  // ---- Supplier ----
  { section: 'supplier:home', to: '/supplier', label: 'Dashboard', icon: ICONS.home, group: 'Supplier', end: true },
  { section: 'supplier:submit-stock', to: '/supplier/submit-stock', label: 'Submit stock', icon: ICONS.plus, group: 'Supplier' },
  { section: 'supplier:stock', to: '/supplier/stock', label: 'My stock', icon: ICONS.box, group: 'Supplier' },
  { section: 'supplier:orders', to: '/supplier/orders', label: 'Orders', icon: ICONS.truck, group: 'Supplier' },
  { section: 'supplier:csr-notifications', to: '/supplier/csr-notifications', label: 'Support requests', icon: ICONS.bell, group: 'Supplier' },
  { section: 'supplier:earnings', to: '/supplier/earnings', label: 'Earnings', icon: ICONS.money, group: 'Supplier' },
  { section: 'supplier:settings', to: '/supplier/settings', label: 'Account settings', icon: ICONS.cog, group: 'Supplier' },

  // ---- CSR ----
  { section: 'csr:home', to: '/csr', label: 'CSR dashboard', icon: ICONS.home, group: 'Customer Service', end: true },
  { section: 'csr:queue', to: '/csr/cases', label: 'Case queue', icon: ICONS.ticket, group: 'Customer Service' },
  { section: 'csr:orders', to: '/csr/orders', label: 'Orders', icon: ICONS.inbox, group: 'Customer Service' },

  // ---- Super Admin ----
  { section: 'admin:home', to: '/admin', label: 'Overview', icon: ICONS.home, group: 'Administration', end: true },
  { section: 'admin:catalogue', to: '/admin/catalogue', label: 'Catalogue', icon: ICONS.catalogue, group: 'Administration' },
  { section: 'admin:suppliers', to: '/admin/suppliers', label: 'Suppliers', icon: ICONS.users, group: 'Administration' },
  { section: 'admin:orders', to: '/admin/orders', label: 'All orders', icon: ICONS.truck, group: 'Administration' },
  { section: 'admin:buyers', to: '/admin/buyers', label: 'Buyers', icon: ICONS.buyers, group: 'Administration' },
  { section: 'admin:reports', to: '/admin/reports', label: 'Reports', icon: ICONS.report, group: 'Administration' },
  { section: 'admin:settings', to: '/admin/settings', label: 'Platform settings', icon: ICONS.cog, group: 'Administration' },
];

/**
 * Navigation is derived from the same ROLE_SECTIONS map the route guards use,
 * so a link can never appear for a section the guard would refuse.
 */
export function navigationForRole(role: Role | undefined | null): NavItem[] {
  if (!role) return [];
  const allowed = new Set(ROLE_SECTIONS[role] ?? []);
  return ALL_NAV.filter((item) => allowed.has(item.section));
}

/** Where each role lands after signing in. */
export function landingPathForRole(role: Role | undefined | null): string {
  switch (role) {
    case 'SUPER_ADMIN':
      return '/admin';
    case 'CSR':
      return '/csr';
    case 'SUPPLIER':
      return '/supplier';
    default:
      return '/login';
  }
}
