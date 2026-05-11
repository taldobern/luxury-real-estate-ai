export const STYLE_CONFIGS: Record<string, { label: string; prompt: string }> = {
  aerial: {
    label: "Aerial / Drone View",
    prompt:
      "Enhance this real property photo to look like a professional luxury real estate drone photograph. " +
      "Keep the exact same house, architecture, layout, and surroundings — do NOT change the building structure. " +
      "Brighten the image with natural daylight, remove harsh shadows, balance the exposure, enhance the sky to a vivid blue with soft clouds. " +
      "Clean up the landscaping — greener grass, trimmed hedges. Remove all vehicles from the driveway. " +
      "Remove utility lines, street signs, and any visible address numbers. " +
      "The result should look like a bright clear-day professional drone photo used in a luxury real estate brochure.",
  },
  "luxury-modern": {
    label: "Luxury Modern",
    prompt:
      "Enhance this real property photo for a luxury real estate magazine cover. " +
      "Keep the exact same house structure and architecture — do NOT redesign or replace the building. " +
      "Improve the exterior finish to look premium — clean paint, sharp edges, polished surfaces. " +
      "Enhance landscaping with lush green lawn and manicured hedges. " +
      "Brighten to a perfect sunny day with vivid blue sky. Remove all vehicles, clutter, and utility wires. " +
      "The house must remain recognizable as the same property, just elevated to luxury magazine quality.",
  },
  sunset: {
    label: "Golden Hour / Sunset",
    prompt:
      "Enhance this real property photo into a photorealistic luxury real estate twilight image at blue hour. " +
      "Keep the exact same house, architecture, and layout — do NOT change or replace the building structure. " +
      "Naturally light the home with warm glowing interior lights visible through windows and soft exterior architectural lighting. " +
      "Enhance the sky with realistic blue hour twilight tones — deep blue, soft purple, muted pink, faint orange on the horizon — subtle and natural, not oversaturated. " +
      "Brighten shadows naturally without overexposing highlights. Increase clarity, contrast, and depth while keeping the result realistic and elegant. " +
      "Enhance the surrounding landscape with soft ambient lighting. Remove all vehicles, utility lines, and street clutter. " +
      "Style: luxury architectural photography, magazine-quality HDR, professional drone twilight real estate, cinematic but photorealistic. " +
      "The result must feel like a real photograph — emotionally captivating and elegant, like a Mansion Global or Architectural Digest feature.",
  },
  cinematic: {
    label: "Cinematic",
    prompt:
      "Enhance this real property photo with cinematic color grading for a luxury real estate presentation. " +
      "Keep the exact same house and architecture — do NOT redesign the building. " +
      "Apply rich contrast, deep shadows, and dramatic sky. Enhance landscaping and curb appeal. " +
      "Remove all vehicles, clutter, and utility lines. " +
      "The result should look like a high-end architectural photo of the same real property.",
  },
  "night-luxury": {
    label: "Night Luxury",
    prompt:
      "Enhance this real property photo into a luxury night photography image. " +
      "Keep the exact same house and architecture — do NOT change the building structure. " +
      "Add dramatic architectural lighting to the facade, illuminate landscape features and pathways. " +
      "Add warm interior glow through windows, deep blue night sky. Remove all vehicles. " +
      "The result must be the same real property, photographed at night with luxury real estate lighting.",
  },
  "bright-clean": {
    label: "Bright & Clean",
    prompt:
      "Enhance this real property photo to look clean, bright, and professional for a luxury real estate brochure. " +
      "Keep the exact same house and architecture — do NOT change the building. " +
      "Perfect balanced daylight exposure, no harsh shadows, clean whites, vivid green lawn. " +
      "Remove all vehicles from the driveway, remove utility lines and street signs. " +
      "The result should look like the same property on a perfect sunny day, ready for a magazine listing.",
  },
};

export type StyleKey = keyof typeof STYLE_CONFIGS;

/**
 * Builds the image edit prompt for street-level styles.
 * Always anchors to the real property — enhance, never replace.
 */
export function buildPrompt(address: string, style: StyleKey): string {
  const styleConfig = STYLE_CONFIGS[style] ?? STYLE_CONFIGS["aerial"];

  return (
    `${styleConfig.prompt} ` +
    `This is the real property at ${address}. ` +
    `The architectural structure must remain identical to the original photo. ` +
    `Photorealistic, 8K quality, sharp focus, magazine cover ready.`
  );
}

/**
 * Builds the aerial drone prompt for satellite source images.
 * Transforms a flat top-down satellite image into a luxury drone photo.
 */
export function buildAerialDronePrompt(address: string): string {
  return (
    `This image contains TWO views of the exact same property at ${address}. ` +
    `TOP HALF: aerial Google Earth screenshot showing the roof layout, footprint, driveway, and surrounding area from above. ` +
    `BOTTOM HALF: street-level photo showing the front facade with exact architectural details — garage doors, entry arch, columns, windows, and exterior finish. ` +
    `Using BOTH halves as reference, generate a single professional high-resolution aerial drone photograph of this exact property. ` +
    `Preserve the exact roof structure and property layout from the top half. ` +
    `Use the bottom half to correctly render architectural details that are difficult to see from above — especially the garage, entry roof, columns, and wall colors. ` +
    `Brighten with natural daylight, remove harsh shadows, enhance colors for luxury real estate marketing. ` +
    `Remove all cars from the driveway. Remove any Google Earth pins, address labels, or overlay text. ` +
    `Output: a single aerial drone photo of this property only — no split image, no street view in the output.`
  );
}
