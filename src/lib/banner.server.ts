// Startup banner images. Server-only.
// Generates one abstract banner per startup with the fastest Gemini image model,
// stores it in the private "startup-banners" bucket and remembers it on the startup row.
// The image is decorative artwork, never a claim — when generation fails the startup
// keeps its plain brand-colored banner (no invented placeholder content).
import { generateImage, GatewayError } from "@lovable.dev/ai-gateway";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const BUCKET = "startup-banners";
const MODEL = "google/gemini-3.1-flash-lite-image" as const;

export interface BannerSubject {
  id: string;
  name: string;
  tagline: string;
  industry: string | null;
  brand: { hue?: number } | null;
}

/** The app route that streams a startup's banner from private storage. */
export const bannerUrl = (startupId: string) => `/api/public/banner/${startupId}`;

function bannerPrompt(s: BannerSubject): string {
  const hue = Math.max(0, Math.min(359, Math.round(Number(s.brand?.hue ?? 40))));
  return [
    `Create purely abstract, nonverbal background artwork evoking this topic: ${s.industry ?? "business innovation"}.`,
    s.industry ? `Industry: ${s.industry}.` : "",
    `Style: premium editorial illustration, soft gradients and subtle geometric shapes evoking the industry,`,
    `dominant color around HSL hue ${hue}, darker toward the edges so white text stays readable on top.`,
    `STRICT: zero typography anywhere. No text, letters, words, numbers, slogans, captions, labels, logos, watermarks, UI screens, signs, documents or pseudo-lettering. Do not render a company name or any written language. Use only abstract shapes and color.`,
  ]
    .filter(Boolean)
    .join(" ");
}

/**
 * Generates and stores the banner for one startup, then points its row at it.
 * Returns the banner URL, or null when generation failed (caller keeps the plain banner).
 */
export async function generateStartupBanner(startup: BannerSubject): Promise<string | null> {
  let b64: string | undefined;
  try {
    const res = await generateImage({
      model: MODEL,
      prompt: bannerPrompt(startup),
      image_config: { aspect_ratio: "21:9", image_size: "1K" },
    });
    b64 = res.data?.[0]?.b64_json;
  } catch (err) {
    if (err instanceof GatewayError) {
      console.error(`Banner generation failed for ${startup.id} [${err.code}]: ${err.message}`);
    } else {
      console.error(`Banner generation failed for ${startup.id}:`, err);
    }
    return null;
  }
  if (!b64) return null;

  const bytes = Buffer.from(b64, "base64");
  const path = `${startup.id}.png`;
  const { error: upErr } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType: "image/png", upsert: true });
  if (upErr) {
    console.error(`Banner upload failed for ${startup.id}:`, upErr.message);
    return null;
  }

  const url = bannerUrl(startup.id);
  const { error: rowErr } = await supabaseAdmin.from("startups").update({ banner_image_url: url }).eq("id", startup.id);
  if (rowErr) {
    console.error(`Banner row update failed for ${startup.id}:`, rowErr.message);
    return null;
  }
  return url;
}

/** Reads a stored banner image; null when the startup has none. */
export async function readStartupBanner(startupId: string): Promise<Uint8Array | null> {
  const { data, error } = await supabaseAdmin.storage.from(BUCKET).download(`${startupId}.png`);
  if (error || !data) return null;
  return new Uint8Array(await data.arrayBuffer());
}
