"use client";

import * as React from "react";
import { formatPrice } from "@/shared/lib/format";

export interface TrendPoint {
  date: string;
  value: number;
}

/**
 * 30-day trend, one series per chart.
 *
 * Revenue and commission differ by roughly an order of magnitude, so they are
 * deliberately two small multiples rather than one dual-axis chart — a second
 * y-scale would let the reader infer crossings that do not exist. Each chart
 * therefore needs no legend: its title names the series.
 *
 * Colours come from --chart-* tokens, which were checked with the palette
 * validator against both the light and dark chart surfaces.
 */
export function TrendChart({
  points,
  colorVar,
  label,
}: {
  points: TrendPoint[];
  colorVar: string;
  label: string;
}) {
  // Formatting lives here rather than arriving as a prop: a function cannot
  // cross the server/client boundary, and every series on this dashboard is
  // money in pence.
  const format = formatPrice;
  const [hover, setHover] = React.useState<number | null>(null);
  const uid = React.useId().replace(/:/g, "");

  const W = 640;
  const H = 168;
  const PAD = { top: 14, right: 12, bottom: 20, left: 12 };

  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  // Pad the domain so the line never sits on the frame.
  const lo = min - (max - min) * 0.25;
  const hi = max + (max - min) * 0.15;

  const x = (i: number) =>
    PAD.left + (i / (points.length - 1)) * (W - PAD.left - PAD.right);
  const y = (v: number) =>
    PAD.top + (1 - (v - lo) / (hi - lo)) * (H - PAD.top - PAD.bottom);

  const line = points.map((p, i) => `${i ? "L" : "M"}${x(i)},${y(p.value)}`).join(" ");
  const area = `${line} L${x(points.length - 1)},${H - PAD.bottom} L${x(0)},${H - PAD.bottom} Z`;

  const last = points[points.length - 1];
  const first = points[0];
  const delta = first.value ? ((last.value - first.value) / first.value) * 100 : 0;
  const active = hover === null ? null : points[hover];

  function onMove(e: React.PointerEvent<SVGSVGElement>) {
    const box = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - box.left) / box.width) * W;
    const ratio = (px - PAD.left) / (W - PAD.left - PAD.right);
    const i = Math.round(ratio * (points.length - 1));
    setHover(Math.min(points.length - 1, Math.max(0, i)));
  }

  return (
    <div className="relative">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-fg-subtle">
            {label}
          </p>
          <p className="tnum mt-1 font-display text-2xl font-bold tracking-tight">
            {format(active ? active.value : last.value)}
          </p>
        </div>
        <p className="tnum text-xs text-fg-muted">
          {active
            ? new Date(active.date).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
              })
            : `${delta >= 0 ? "+" : ""}${delta.toFixed(1)}% over 30 days`}
        </p>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="mt-2 w-full touch-none"
        style={{ height: 168 }}
        role="img"
        aria-label={`${label}: ${format(last.value)} on the most recent day, ${delta.toFixed(1)}% change over 30 days.`}
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id={`fill-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colorVar} stopOpacity="0.20" />
            <stop offset="100%" stopColor={colorVar} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Baseline only — a full grid would compete with a 30-point line. */}
        <line
          x1={PAD.left}
          x2={W - PAD.right}
          y1={H - PAD.bottom}
          y2={H - PAD.bottom}
          className="stroke-border"
          strokeWidth="1"
        />

        <path d={area} fill={`url(#fill-${uid})`} />
        <path
          d={line}
          fill="none"
          stroke={colorVar}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {active && hover !== null && (
          <>
            <line
              x1={x(hover)}
              x2={x(hover)}
              y1={PAD.top}
              y2={H - PAD.bottom}
              className="stroke-border-strong"
              strokeWidth="1"
              strokeDasharray="3 3"
            />
            {/* 2px surface ring keeps the marker legible over the fill. */}
            <circle
              cx={x(hover)}
              cy={y(active.value)}
              r="5"
              fill={colorVar}
              className="stroke-card"
              strokeWidth="2"
            />
          </>
        )}

        <text
          x={PAD.left}
          y={H - 6}
          className="fill-fg-subtle text-[10px]"
          style={{ fontSize: 10 }}
        >
          {new Date(first.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
        </text>
        <text
          x={W - PAD.right}
          y={H - 6}
          textAnchor="end"
          className="fill-fg-subtle text-[10px]"
          style={{ fontSize: 10 }}
        >
          {new Date(last.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
        </text>
      </svg>
    </div>
  );
}
