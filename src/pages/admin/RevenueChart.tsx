import * as React from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { cn, formatPrice } from '@/shared';

type Granularity = 'daily' | 'weekly' | 'monthly';

interface Point {
  date: string;
  grossPence: number;
  commissionPence: number;
}

const GRANULARITY_LABELS: Record<Granularity, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
};

export function RevenueChart({ series }: { series: Point[] }) {
  const [granularity, setGranularity] = React.useState<Granularity>('daily');

  const data = React.useMemo(() => aggregate(series, granularity), [series, granularity]);

  return (
    <div>
      <div className="mb-4 flex gap-1">
        {(Object.keys(GRANULARITY_LABELS) as Granularity[]).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setGranularity(value)}
            aria-pressed={granularity === value}
            className={cn(
              'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
              granularity === value
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-100',
            )}
          >
            {GRANULARITY_LABELS[value]}
          </button>
        ))}
      </div>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: '#64748b' }}
              axisLine={{ stroke: '#e2e8f0' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#64748b' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value: number) => `£${Math.round(value / 100)}`}
            />
            <Tooltip
              formatter={(value, name) => [formatPrice(Number(value ?? 0)), String(name ?? '')]}
              contentStyle={{
                borderRadius: '0.5rem',
                border: '1px solid #e2e8f0',
                fontSize: '0.8125rem',
              }}
            />
            <Legend wrapperStyle={{ fontSize: '0.75rem', paddingTop: '0.5rem' }} />
            <Line
              type="monotone"
              dataKey="grossPence"
              name="Gross revenue"
              stroke="#0e5a8a"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="commissionPence"
              name="Commission"
              stroke="#10b981"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/** Rolls the daily series up into weekly or monthly buckets. */
function aggregate(series: Point[], granularity: Granularity) {
  if (granularity === 'daily') {
    return series.map((point) => ({
      ...point,
      label: new Date(point.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
    }));
  }

  const buckets = new Map<string, { grossPence: number; commissionPence: number; label: string }>();

  for (const point of series) {
    const date = new Date(point.date);
    let key: string;
    let label: string;

    if (granularity === 'weekly') {
      const monday = new Date(date);
      monday.setDate(date.getDate() - ((date.getDay() + 6) % 7));
      key = monday.toISOString().slice(0, 10);
      label = `w/c ${monday.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`;
    } else {
      key = point.date.slice(0, 7);
      label = date.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
    }

    const existing = buckets.get(key) ?? { grossPence: 0, commissionPence: 0, label };
    existing.grossPence += point.grossPence;
    existing.commissionPence += point.commissionPence;
    buckets.set(key, existing);
  }

  return Array.from(buckets.entries()).map(([date, value]) => ({ date, ...value }));
}
