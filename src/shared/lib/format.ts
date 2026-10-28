/** Formatting helpers. All money is handled in pence to avoid float drift. */

const GBP = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  minimumFractionDigits: 2,
});

export function formatPrice(pence: number | null | undefined): string {
  if (pence == null || Number.isNaN(pence)) return '—';
  return GBP.format(pence / 100);
}

/** Parses "1,299.99" or "£1299.99" into pence. Returns null when unparseable. */
export function parsePriceToPence(input: string): number | null {
  const cleaned = input.replace(/[^0-9.]/g, '');
  if (!cleaned) return null;
  const value = Number(cleaned);
  if (Number.isNaN(value)) return null;
  return Math.round(value * 100);
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  // Timezone is pinned: the server renders in UTC and the browser in local
  // time, which can land on different calendar days and trip hydration.
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Europe/London',
  });
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/London',
  });
}

export function formatRelative(iso: string | null | undefined): string {
  if (!iso) return '—';
  const diffMs = new Date(iso).getTime() - Date.now();
  const rtf = new Intl.RelativeTimeFormat('en-GB', { numeric: 'auto' });
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ['day', 86_400_000],
    ['hour', 3_600_000],
    ['minute', 60_000],
  ];
  for (const [unit, ms] of units) {
    if (Math.abs(diffMs) >= ms) return rtf.format(Math.round(diffMs / ms), unit);
  }
  return 'just now';
}

/** Countdown text for SLA deadlines, e.g. "4h 12m left" or "Overdue by 2h". */
export function formatCountdown(deadlineIso: string | null | undefined): {
  text: string;
  overdue: boolean;
  urgent: boolean;
} {
  if (!deadlineIso) return { text: '—', overdue: false, urgent: false };
  const diffMs = new Date(deadlineIso).getTime() - Date.now();
  const abs = Math.abs(diffMs);
  const hours = Math.floor(abs / 3_600_000);
  const minutes = Math.floor((abs % 3_600_000) / 60_000);
  const parts = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  return {
    text: diffMs < 0 ? `Overdue by ${parts}` : `${parts} left`,
    overdue: diffMs < 0,
    urgent: diffMs >= 0 && diffMs < 4 * 3_600_000,
  };
}

/** UK postcode display normalisation: "gu29tg" -> "GU2 9TG". */
export function formatPostcode(postcode: string): string {
  const raw = postcode.toUpperCase().replace(/\s+/g, '');
  if (raw.length < 5) return raw;
  return `${raw.slice(0, raw.length - 3)} ${raw.slice(-3)}`;
}

export function initials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export function pluralise(count: number, singular: string, plural?: string): string {
  return count === 1 ? singular : plural ?? `${singular}s`;
}

export function truncate(value: string, max: number): string {
  return value.length <= max ? value : `${value.slice(0, max - 1)}…`;
}
