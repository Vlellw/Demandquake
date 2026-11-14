import type { CSSProperties } from "react";
import trellivoArtwork from "@/assets/trellivo-text-free.png";
import { isCurrentBanner } from "@/lib/banner-version";
import type { Brand, Glyph } from "@/lib/types";
import { cn } from "@/lib/utils";

function GlyphPath({ glyph }: { glyph: Glyph }) {
  const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 2.2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (glyph) {
    case "orbit":
      return (
        <>
          <circle cx="20" cy="20" r="5" fill="currentColor" />
          <ellipse cx="20" cy="20" rx="13" ry="6" {...stroke} transform="rotate(-25 20 20)" />
        </>
      );
    case "stack":
      return (
        <>
          <path d="M8 15l12-6 12 6-12 6z" fill="currentColor" fillOpacity="0.9" />
          <path d="M8 21l12 6 12-6" {...stroke} />
          <path d="M8 27l12 6 12-6" {...stroke} strokeOpacity="0.6" />
        </>
      );
    case "wave":
      return <path d="M6 22c4-9 8-9 11 0s7 9 10 0 5-6 7-3" {...stroke} strokeWidth={3} />;
    case "prism":
      return (
        <>
          <path d="M20 7l12 23H8z" {...stroke} />
          <path d="M20 7v23" {...stroke} strokeOpacity="0.55" />
          <path d="M20 16l6 14" {...stroke} strokeOpacity="0.35" />
        </>
      );
    case "knot":
      return (
        <>
          <circle cx="15" cy="20" r="7" {...stroke} />
          <circle cx="25" cy="20" r="7" {...stroke} />
        </>
      );
    case "spark":
      return <path d="M20 6l3 11 11 3-11 3-3 11-3-11-11-3 11-3z" fill="currentColor" />;
    case "grid":
      return (
        <>
          {[0, 1, 2].map((r) =>
            [0, 1, 2].map((c) => (
              <rect
                key={`${r}-${c}`}
                x={9 + c * 8}
                y={9 + r * 8}
                width="6"
                height="6"
                rx="1.5"
                fill="currentColor"
                fillOpacity={(r + c) % 2 === 0 ? 1 : 0.4}
              />
            )),
          )}
        </>
      );
    case "arc":
    default:
      return (
        <>
          <path d="M8 28a12 12 0 0124 0" {...stroke} strokeWidth={3} />
          <path d="M13 28a7 7 0 0114 0" {...stroke} strokeOpacity="0.6" />
          <circle cx="20" cy="28" r="2.2" fill="currentColor" />
        </>
      );
  }
}

export function StartupMark({
  brand,
  size = "md",
  className,
}: {
  brand: Brand | null | undefined;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  const hue = brand?.hue ?? 40;
  const dims = { sm: "size-8 rounded-lg", md: "size-11 rounded-xl", lg: "size-14 rounded-2xl", xl: "size-20 rounded-3xl" }[size];
  return (
    <span
      className={cn("brand-surface brand-text brand-border relative inline-grid shrink-0 place-items-center border", dims, className)}
      style={{ "--brand-h": hue } as CSSProperties}
    >
      <svg viewBox="0 0 40 40" className="size-[68%]" aria-hidden="true">
        <GlyphPath glyph={(brand?.glyph ?? "orbit") as Glyph} />
      </svg>
    </span>
  );
}

export function brandStyle(brand: Brand | null | undefined): CSSProperties {
  return { "--brand-h": brand?.hue ?? 40 } as CSSProperties;
}

/**
 * Background for a `.brand-banner` block: the generated banner artwork under a brand-colored
 * wash so white text and the mark stay readable. Without an image, the plain brand gradient stays.
 */
export function bannerBackground(brand: Brand | null | undefined, imageUrl: string | null | undefined): CSSProperties {
  if (!imageUrl) return {};
  const artwork = !isCurrentBanner(imageUrl) && imageUrl.split("?")[0] === "/api/public/banner/aacad4d4-eec3-43a2-a2ad-088818262211" ? trellivoArtwork : imageUrl;
  const hue = brand?.hue ?? 40;
  return {
    backgroundImage: `linear-gradient(hsla(${hue}, 45%, 22%, 0.42), hsla(${hue}, 50%, 30%, 0.3)), url(${artwork})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
  };
}
