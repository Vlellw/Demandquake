// Startup banner images. Server-only.
// Generates one topic-related banner per startup with the fastest Gemini image model,
// stores it in the private "startup-banners" bucket and remembers it on the startup row.
// The image is decorative artwork, never a claim - when generation fails the startup
// keeps its plain brand-colored banner (no invented placeholder content).
import { generateImage, GatewayError } from "@lovable.dev/ai-gateway";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { BANNER_VERSION } from "./banner-version";

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
export const bannerUrl = (startupId: string) => `/api/public/banner/${startupId}?v=${BANNER_VERSION}`;

function bannerPrompt(s: BannerSubject): string {
  const hue = Math.max(0, Math.min(359, Math.round(Number(s.brand?.hue ?? 40))));
  const variant = Array.from(s.id).reduce((total, character) => total + character.charCodeAt(0), 0);
  return [
    `Create a panoramic still-life of tangible objects chosen specifically for this startup concept: ${s.tagline}.`,
    s.industry ? `Industry: ${s.industry}.` : "",
    `Only objects, absolutely no people, faces, bodies, hands, silhouettes, portraits or crowds. Pick 3–5 recognizable props that communicate this specific idea: finance can use plain coins, a balance scale or an abacus; healthcare can use a stethoscope, medical instruments or a diagnostic kit; cybersecurity can use a hardware key, padlock and network cables; machinery can use gears and precision measuring tools; legal compliance can use scales, an unmarked stamp and shipping containers; AI infrastructure can use circuit boards, processor chips and server parts. Choose props relevant to the actual concept, not an identical set for every startup.`,
    `Visual direction: ${["photographic overhead flat-lay on a clean surface", "playful tactile clay-rendered still-life", "crisp miniature studio diorama", "editorial close-up of polished materials", "sculptural still-life with soft daylight", "precise cutaway arrangement of mechanical parts"][variant % 6]}. Composition: ${["diagonal arrangement with generous negative space", "several small clusters across the width", "asymmetric arrangement at different depths", "loose scattered arrangement with varied scale"][Math.floor(variant / 6) % 4]}. This is illustrative concept artwork, not a picture of an existing company.`,
    `Mood: ${["airy and serene", "energetic and luminous", "quiet and atmospheric", "crisp and rhythmic", "dreamlike and fluid"][hue % 5]}. Allow complementary accent colors and varied tonal depth.`,
    `Balanced panoramic composition with several related details spread across the scene, no single oversized object. No generic mosaics, polygon meshes, abstract waves or decorative geometric patterns.`,
    `Use natural colors with subtle accents around hue ${hue}. Keep the scene clearly visible and recognizable, not dark or blurred.`,
    `STRICT: zero typography anywhere, including faint background writing. No text, letters, words, numbers, slogans, captions, labels, logos, watermarks, signs, printed documents or pseudo-lettering. Screens must be blank, papers and packaging unmarked. Do not render the company name or any written language.`,
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
  const path = `${startup.id}-${BANNER_VERSION}.png`;
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
export async function readStartupBanner(startupId: string, version?: string | null): Promise<Uint8Array | null> {
  const path = version === BANNER_VERSION ? `${startupId}-${BANNER_VERSION}.png` : `${startupId}.png`;
  const { data, error } = await supabaseAdmin.storage.from(BUCKET).download(path);
  if (error || !data) return null;
  return new Uint8Array(await data.arrayBuffer());
}
