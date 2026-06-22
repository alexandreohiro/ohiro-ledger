"use client";

import { OhiroScore } from "@/lib/calculations";

interface OhiroScoreCardProps {
  score: OhiroScore;
}

const LABEL_COLOR: Record<OhiroScore["label"], string> = {
  "Crítico": "hsl(var(--risk-critical))",
  "Atenção": "hsl(var(--risk-medium))",
  "Saudável": "hsl(var(--risk-low))",
  "Excelente": "hsl(var(--accent))",
};

/** Anel de progresso (gauge) construído com SVG puro — sem dependência extra. */
function ScoreRing({ value, color }: { value: number; color: string }) {
  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="relative size-[120px] shrink-0">
      <svg viewBox="0 0 120 120" className="size-full -rotate-90">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="hsl(var(--border) / 0.4)" strokeWidth="10" />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-mono font-bold text-foreground tabular-nums">{value}</span>
        <span className="text-[9px] font-mono text-muted-foreground tracking-widest uppercase">/ 100</span>
      </div>
    </div>
  );
}

export function OhiroScoreCard({ score }: OhiroScoreCardProps) {
  const color = LABEL_COLOR[score.label];

  return (
    <div
      className="rounded-lg border bg-card/60 p-5 flex flex-col sm:flex-row items-center gap-5"
      style={{ borderColor: `color-mix(in oklch, ${color} 25%, transparent)` }}
    >
      <ScoreRing value={score.value} color={color} />
      <div className="flex flex-col gap-1.5 text-center sm:text-left min-w-0">
        <div className="flex items-center gap-2 justify-center sm:justify-start">
          <span className="text-[11px] font-mono text-muted-foreground/60 tracking-widest uppercase">
            Ohiro Score
          </span>
          <span
            className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full"
            style={{ color, background: `color-mix(in oklch, ${color} 15%, transparent)` }}
          >
            {score.label}
          </span>
        </div>
        <p className="text-sm font-mono text-foreground leading-relaxed">{score.insight}</p>
      </div>
    </div>
  );
}
