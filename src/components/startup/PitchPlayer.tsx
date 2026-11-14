import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw } from "lucide-react";
import type { Brand, PitchSlide } from "@/lib/types";
import { StartupMark, brandStyle } from "@/components/brand/StartupMark";
import { SourceFavicon } from "@/components/common/SourceFavicon";
import { SeismicField } from "@/components/common/SeismicField";
import { cn } from "@/lib/utils";
import { PitchDownload } from "@/components/startup/PitchDownload";

const SLIDE_MS = 8000;
const KIND_LABEL: Record<string, string> = {
  problem: "The problem",
  evidence: "The evidence",
  solution: "The solution",
  customer: "The customer",
  opportunity: "The opportunity",
};

export interface PitchContext {
  claimed?: boolean;
  name: string;
  tagline: string;
  brand: Brand;
  evidenceCount: number;
  domains: string[];
  sources?: { domain: string; url: string }[];
  features: string[];
  customers: string[];
  businessModel: string | null;
}

export function PitchPlayer({ slides, ctx, className, exportIndex }: { slides: PitchSlide[]; ctx: PitchContext; className?: string; exportIndex?: number }) {
  const exporting = exportIndex !== undefined;
  const [index, setIndex] = useState(exportIndex ?? 0);
  const [playing, setPlaying] = useState(!exporting);
  const [hovering, setHovering] = useState(false);
  const [progress, setProgress] = useState(0);
  const started = useRef<number>(Date.now());
  const elapsedBeforePause = useRef(0);
  const total = slides.length;
  const active = playing && !hovering;

  const go = useCallback(
    (i: number) => {
      setIndex(((i % total) + total) % total);
      setProgress(0);
      elapsedBeforePause.current = 0;
      started.current = Date.now();
    },
    [total],
  );

  useEffect(() => {
    if (!active || total === 0) {
      elapsedBeforePause.current += Date.now() - started.current;
      return;
    }
    started.current = Date.now();
    let raf = 0;
    const loop = () => {
      const elapsed = elapsedBeforePause.current + (Date.now() - started.current);
      const p = Math.min(1, elapsed / SLIDE_MS);
      setProgress(p);
      if (p >= 1) {
        if (index < total - 1) go(index + 1);
        else setPlaying(false);
        return;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [active, index, total, go]);

  const slide = slides[index] ?? slides[0];
  if (total === 0 || !slide) return null;
  const finished = !playing && index === total - 1 && progress >= 1;

  return (
    <div
      className={cn("brand-surface relative flex min-h-[420px] w-full flex-col overflow-hidden rounded-2xl border border-border-strong shadow-lift", className)}
      style={brandStyle(ctx.brand)}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      tabIndex={exporting ? -1 : 0}
      role="region"
      aria-roledescription="carousel"
      aria-label={`${ctx.name} pitch`}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") go(index + 1);
        if (e.key === "ArrowLeft") go(index - 1);
        if (e.key === " ") {
          e.preventDefault();
          setPlaying((p) => !p);
        }
      }}
    >
      <div className="bg-dots pointer-events-none absolute inset-0 opacity-40" />
      <SeismicField className="absolute inset-x-0 bottom-10 h-24 w-full opacity-40" intensity={slide.kind === "problem" || slide.kind === "evidence" ? 1 : 0} />

      {/* progress */}
      <div className="relative z-10 flex gap-1.5 px-5 pt-4">
        {slides.map((s, i) => (
          <button key={i} onClick={() => go(i)} className="h-1 flex-1 overflow-hidden rounded-full bg-foreground/15" aria-label={`Go to slide ${i + 1}: ${KIND_LABEL[s.kind]}`}>
            <span
              className="brand-fill block h-full rounded-full"
              style={{ width: i < index ? "100%" : i === index ? `${progress * 100}%` : "0%" }}
            />
          </button>
        ))}
      </div>
      <div className="relative z-10 flex items-center gap-2 px-5 pt-3">
        <StartupMark brand={ctx.brand} size="sm" />
        <span className="min-w-0 truncate font-display text-sm font-semibold text-foreground">{ctx.name}</span>
        <span className="ml-auto shrink-0 font-mono text-[10px] uppercase tracking-[0.16em] text-foreground/60">
          {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
          <span className="hidden sm:inline"> · {KIND_LABEL[slide.kind]}</span>
        </span>
      </div>

      <div className="relative z-10 flex flex-1 flex-col justify-center px-6 py-6 sm:px-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={exporting ? false : { opacity: 0, y: 18, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -14, filter: "blur(4px)" }}
            transition={{ duration: 0.55, ease: [0.2, 0.8, 0.2, 1] }}
          >
            <p className="brand-text font-mono text-[11px] uppercase tracking-[0.2em]">{KIND_LABEL[slide.kind]}</p>
            <h3 className="mt-3 max-w-xl font-display text-2xl font-semibold leading-[1.08] text-foreground sm:text-[2.1rem]">{slide.headline}</h3>
            <motion.p
              initial={exporting ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.35 }}
              className="mt-3 max-w-lg text-sm leading-relaxed text-foreground/75 sm:text-base"
            >
              {slide.body}
            </motion.p>
            <SlideVisual kind={slide.kind} ctx={ctx} exporting={exporting} />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* controls */}
      <div className="relative z-10 flex shrink-0 items-center gap-1 px-4 pb-3">
        {!exporting && <><button onClick={() => go(index - 1)} className="rounded-md p-1.5 text-foreground/70 hover:bg-foreground/10 hover:text-foreground" aria-label="Previous slide">
          <ChevronLeft className="size-4" />
        </button>
        <button
          onClick={() => {
            if (finished) {
              go(0);
              setPlaying(true);
            } else setPlaying((p) => !p);
          }}
          className="rounded-md p-1.5 text-foreground/70 hover:bg-foreground/10 hover:text-foreground"
          aria-label={finished ? "Replay pitch" : playing ? "Pause pitch" : "Play pitch"}
        >
          {finished ? <RotateCcw className="size-4" /> : playing ? <Pause className="size-4" /> : <Play className="size-4" />}
        </button>
        <button onClick={() => go(index + 1)} className="rounded-md p-1.5 text-foreground/70 hover:bg-foreground/10 hover:text-foreground" aria-label="Next slide">
          <ChevronRight className="size-4" />
        </button></>}
        <span className="ml-auto truncate font-mono text-[10px] text-foreground/50">AI-generated pitch{!exporting && ` · ~${Math.round((total * SLIDE_MS) / 1000)}s`}</span>
        {!exporting && <PitchDownload name={ctx.name} total={total}>
          {slides.map((_, i) => <PitchPlayer key={i} slides={slides} ctx={ctx} exportIndex={i} className="pitch-export-slide" />)}
        </PitchDownload>}
      </div>
    </div>
  );
}

function SlideVisual({ kind, ctx, exporting }: { kind: PitchSlide["kind"]; ctx: PitchContext; exporting: boolean }) {
  if (kind === "evidence") {
    return (
      <motion.div initial={exporting ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-5 flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-observed/40 bg-observed/15 px-3 py-1 font-mono text-xs text-observed">
          {ctx.evidenceCount} live sources
        </span>
        {ctx.domains.slice(0, 5).map((d, i) => (
          <motion.span
            key={d}
            initial={exporting ? false : { opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6 + i * 0.12 }}
            className="inline-flex items-center gap-1.5 rounded-full border border-foreground/15 bg-background/40 px-2.5 py-1 text-xs text-foreground/80 backdrop-blur"
          >
            {!exporting && <SourceFavicon domain={d} className="size-3.5" />}
            {ctx.sources?.find((s) => s.domain === d)?.url ? <a href={ctx.sources.find((s) => s.domain === d)?.url} target="_blank" rel="noreferrer">{d}</a> : d}
          </motion.span>
        ))}
      </motion.div>
    );
  }
  if (kind === "solution" && ctx.features.length) {
    return (
      <div className="mt-5 grid max-w-lg gap-1.5 sm:grid-cols-2">
        {ctx.features.slice(0, 4).map((f, i) => (
          <motion.div
            key={f}
            initial={exporting ? false : { opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 + i * 0.15 }}
            className="brand-border flex items-center gap-2 rounded-lg border bg-background/30 px-3 py-2 text-xs text-foreground/85 backdrop-blur"
          >
            <span className="brand-fill size-1.5 rounded-full" /> {f}
          </motion.div>
        ))}
      </div>
    );
  }
  if (kind === "customer" && ctx.customers.length) {
    return (
      <div className="mt-5 flex flex-wrap gap-2">
        {ctx.customers.slice(0, 3).map((c, i) => (
          <motion.span
            key={c}
            initial={exporting ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 + i * 0.15 }}
            className="brand-soft brand-text rounded-full px-3 py-1 text-xs font-medium"
          >
            {c}
          </motion.span>
        ))}
      </div>
    );
  }
  if (kind === "opportunity") {
    return (
      <motion.div initial={exporting ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-5 flex flex-wrap items-center gap-2">
        {ctx.businessModel && <span className="brand-soft brand-text rounded-full px-3 py-1 text-xs font-medium">{ctx.businessModel}</span>}
        {!ctx.claimed && <span className="rounded-full border border-dashed border-foreground/30 px-3 py-1 text-xs text-foreground/70">Unclaimed - founder wanted</span>}
      </motion.div>
    );
  }
  return null;
}
