import { useMemo } from "react";
import { cn } from "@/lib/utils";

function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function wavePath(width: number, mid: number, seed: number, spikes: number[]): string {
  const rnd = seeded(seed);
  const pts: string[] = [`M0 ${mid}`];
  const step = 6;
  for (let x = step; x <= width; x += step) {
    let amp = (rnd() - 0.5) * 3;
    for (const sx of spikes) {
      const d = Math.abs(x - sx);
      if (d < 60) amp += (rnd() - 0.5) * (60 - d) * 0.9;
    }
    pts.push(`L${x} ${(mid + amp).toFixed(1)}`);
  }
  return pts.join(" ");
}

/** Decorative seismograph traces. Deterministic so server and client render the same paths. */
export function SeismicField({ className, intensity = 1 }: { className?: string; intensity?: number }) {
  const width = 1600;
  const lines = useMemo(
    () => [
      { mid: 60, seed: 7, spikes: [380, 1180], opacity: 0.18 },
      { mid: 120, seed: 21, spikes: [820], opacity: 0.32 },
      { mid: 180, seed: 42, spikes: [240, 1320], opacity: 0.14 },
    ].map((l) => ({ ...l, d: wavePath(width, l.mid, l.seed, intensity > 0 ? l.spikes : []) })),
    [intensity],
  );
  return (
    <svg viewBox={`0 0 ${width} 240`} preserveAspectRatio="none" className={cn("pointer-events-none", className)} aria-hidden="true">
      <defs>
        <linearGradient id="seismo-fade" x1="0" x2="1">
          <stop offset="0%" stopColor="var(--primary)" stopOpacity="0" />
          <stop offset="30%" stopColor="var(--primary)" stopOpacity="1" />
          <stop offset="70%" stopColor="var(--primary-glow)" stopOpacity="1" />
          <stop offset="100%" stopColor="var(--primary-glow)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {lines.map((l, i) => (
        <path
          key={i}
          d={l.d}
          fill="none"
          stroke="url(#seismo-fade)"
          strokeOpacity={l.opacity}
          strokeWidth={i === 1 ? 1.6 : 1}
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  );
}
