# UsedPhoneDeals.com — Supplier & Admin Portal

The staff-facing portal. One React SPA serving three roles from one login:
**Supplier**, **CSR** (customer service) and **Super Admin**.

> This is one of three repositories:
> **Used-Phone-Deals-Admin** (this repo) ·
> **Used-Phone-Deals-FE** (buyer portal) ·
> **Used-Phone-Deals-BK** (shared backend API).

---

## Quick start

```bash
npm install
cp .env.example .env.local
npm run dev            # http://localhost:5173
```

`VITE_USE_MOCKS=true` is the default, so the portal runs with no backend.

### Signing in with mocks

Any password works; the email decides the role:

| Email | Role | MFA |
| --- | --- | --- |
| `admin@usedphonedeals.com` | Super Admin | none |
| `sarah.bennett@usedphonedeals.com` | CSR | none |
| `supplier@example.co.uk` | Supplier | code `123456` |

`VITE_MOCK_ROLE` sets which role `/auth/me` resolves to on a page refresh, so
set it to match the role you are working on.

| Script | What it does |
| --- | --- |
| `npm run dev` | Dev server on :5173 |
| `npm run build` | Typecheck + production build |
| `npm run preview` | Serve the production build |
| `npm run typecheck` | `tsc --noEmit` |

---

## Stack

| Layer | Choice | Why |
| --- | --- | --- |
| Build | Vite 8 | SPA — no SEO requirement here, so no SSR |
| Framework | React 19 + React Router 7 | |
| Language | TypeScript (strict) | |
| Styling | Tailwind CSS v4 | Same tokens as the buyer portal |
| Server state | TanStack Query | |
| Charts | Recharts | Lazy-loaded — only Super Admin ever downloads it |

Desktop-first. Tablet is supported; phone layouts are out of scope for Phase 1.

---

## Role-based access

**This is the most important thing in the codebase.** `ROLE_SECTIONS` in
`src/shared/constants.ts` maps each role to the portal sections it may reach.
That one map drives:

1. **The router** — every route is wrapped in `<RouteGuard section="…">`
   (`src/components/RouteGuard.tsx`). A CSR agent who types `/admin/settings`
   into the address bar gets the Access Denied screen.
2. **The sidebar** — `navigationForRole()` filters the same map, so a link can
   never appear for a section the guard would refuse.

Because both derive from one source, the nav and the guards cannot drift apart.

| | Supplier | CSR | Super Admin |
| --- | :---: | :---: | :---: |
| Own dashboard, stock, orders, earnings | ✅ | — | ✅ |
| CSR queue & case detail | — | ✅ | ✅ |
| Order management | own only | all (read) | all (+ overrides) |
| Catalogue management | — | ❌ | ✅ |
| Supplier accounts | — | ❌ | ✅ |
| Financial reporting & commission | — | ❌ | ✅ |
| Platform settings | — | ❌ | ✅ |

The ❌ cells are the contractual CSR restrictions, enforced at the routing layer
rather than by hiding buttons. **The API enforces the same rules independently** —
the guard exists so the UI fails clearly, not as the security boundary.

Buyers are rejected outright: `src/stores/auth.tsx` checks the role against
`PORTAL_ROLES` and force-logs-out any buyer session presented on this domain.

---

## Authentication & MFA

Cookie-based session, same as the buyer portal. Supplier accounts have
**mandatory MFA**: `login()` returns `mfaRequired: true` and no session is
considered established until `verifyMfa()` succeeds. `RouteGuard` checks
`sessionEstablished`, not just `isAuthenticated`, so a half-authenticated
supplier cannot reach any page.

Super Admin has no MFA in Phase 1, per the Agreement.

---

## Project layout

```
src/
  pages/
    auth/       LoginPage (with MFA step), ForgotPasswordPage
    supplier/   Dashboard, SubmitStock, MyStock, Orders, OrderDetail,
                CsrNotifications, Earnings, Settings
    csr/        Dashboard, Queue, CaseDetail + ActionPanel, Orders
    admin/      Dashboard + RevenueChart, Catalogue, ListingEditor,
                Suppliers, SupplierDetail, Orders, OrderDetail,
                Buyers, BuyerDetail, Reports, Settings
  layouts/      PortalLayout (role-driven sidebar), navigation map
  components/   RouteGuard, StatCard, ErrorBoundary
  lib/          api client, env, react-query setup
  stores/       auth context
  shared/       ← VENDORED. Do not edit — see the buyer portal README.
```

---

## Workflows worth knowing

**Stock submission** (`supplier/SubmitStockPage`) is two steps: find an existing
Admin-created catalogue entry, then describe the unit. There is **no price field
and no photo upload** — both are Admin-only, and the catalogue-search endpoint
strips pricing before it reaches the supplier. IMEIs are validated with a Luhn
checksum client-side to save a round trip.

**Dispatch** (`supplier/SupplierOrderDetail`) requires a carrier chosen from the
approved list — a `<select>` populated from `APPROVED_CARRIERS`, validated again
with `isApprovedCarrier()` before submit. There is no free-text carrier path.
Suppliers see the **delivery postcode only**, never the full buyer address.

**CSR case handling** (`csr/CaseDetailPage` + `ActionPanel`) keeps the buyer and
the supplier strictly apart: "Reply to buyer" and "Notify supplier" are separate
channels that never cross. Every action writes to the case activity log with the
agent's name and a timestamp.

**Admin overrides** (`admin/AdminOrderDetailPage`) — force cancel, mark
delivered, manual refund, reassign supplier. Every one requires a written reason
and the destructive ones require typing a confirmation phrase.

---

## Environment variables

See `.env.example`.

| Variable | Notes |
| --- | --- |
| `VITE_API_BASE_URL` | Must be the **same API** as the buyer portal. |
| `VITE_USE_MOCKS` | `true` runs with fixtures. |
| `VITE_MOCK_ROLE` | `supplier` \| `csr` \| `admin`. Mock mode only. |
| `VITE_BUYER_PORTAL_URL` | For "view on site" links in catalogue management. |

---

## Deployment notes

- **Deploy to a different domain from the buyer portal.** Portal separation is a
  contractual requirement, and the `noindex, nofollow` meta tag assumes it.
- SPA routing needs a catch-all rewrite to `index.html` (Vercel/Netlify do this
  by default for SPAs; behind Nginx use `try_files $uri /index.html`).
- The API must allow **both** portal origins with `credentials: true`.
- `VITE_*` variables are inlined at build time — rebuild after changing them.

---

## Known gaps before go-live

- Multi-agent CSR management and CSR performance reporting are Phase 2
  (Section 2.2). Case assignment currently targets a single CSR account.
- Notifications poll on a 45s interval; swap `refetchInterval` in
  `src/hooks/useNotifications.ts` for a socket when the backend supports one.
- The rich-text editor for catalogue descriptions is a plain textarea. If the
  Client wants real rich text, that is a small addition — flag it and we'll pick
  an editor.
- `ErrorBoundary` logs to `console.error`; point it at a reporting service when
  one is chosen.
