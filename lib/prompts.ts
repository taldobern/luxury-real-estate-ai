// Style definitions — each entry maps a UI label to prompt modifiers
export const STYLE_CONFIGS: Record<string, { label: string; prompt: string }> = {
  aerial: {
    label: "Aerial / Drone View",
    prompt:
      "photorealistic aerial drone-style image from a slightly elevated bird's-eye perspective (approx. 20 feet above ground level), maintaining accurate architectural proportions, bright natural daylight, balanced exposure, luxury real estate drone photography",
  },
  "luxury-modern": {
    label: "Luxury Modern",
    prompt:
      "ultra-modern luxury architecture, clean lines, floor-to-ceiling glass, infinity pool, immaculate landscaping, blue-sky daytime, professional architectural photography, crisp shadows, premium materials — marble, steel, glass",
  },
  sunset: {
    label: "Golden Hour / Sunset",
    prompt:
      "golden hour sunset lighting, warm amber and rose tones, dramatic sky, glowing interior lights, professional twilight real estate photography, long shadows, romantic atmosphere, magazine-quality color grading",
  },
  cinematic: {
    label: "Cinematic",
    prompt:
      "cinematic wide-angle composition, anamorphic lens flare, deep color grading, dramatic contrast, moody atmosphere, Hollywood-level production quality, sharp foreground with subtle depth-of-field background blur",
  },
  "night-luxury": {
    label: "Night Luxury",
    prompt:
      "luxury property at night, dramatic architectural lighting, illuminated pool and landscape, deep blue sky, interior warm glow through windows, high-end hospitality photography style, 8k quality",
  },
  "bright-clean": {
    label: "Bright & Clean",
    prompt:
      "bright overcast daylight, perfectly balanced exposure, no harsh shadows, clean whites, vivid greenery, fresh and airy feel, real estate photography optimized for MLS listings, sharp throughout",
  },
};

export type StyleKey = keyof typeof STYLE_CONFIGS;

/**
 * Builds the full image generation prompt from address + style.
 * The prompt is modular — the style block slots in cleanly.
 */
export function buildPrompt(address: string, style: StyleKey): string {
  const styleConfig = STYLE_CONFIGS[style] ?? STYLE_CONFIGS["aerial"];

  return (
    `Create a high-resolution photorealistic image of a luxury residential property located at ${address}. ` +
    `Style: ${styleConfig.prompt}. ` +
    `Remove any location pins, address overlays, text, watermarks, and vehicles in the driveway. ` +
    `Enhance clarity, contrast, and color accuracy for luxury real estate marketing. ` +
    `The result must look like a professional architectural photograph taken on a premium camera. ` +
    `Do NOT include any street signs, house numbers, or identifying text in the image. ` +
    `8K resolution quality, highly detailed, magazine cover quality, sharp focus, realistic textures, photorealistic.`
  );
}
