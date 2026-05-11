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
 * Translated from SD-style schema into OpenAI-compatible instructional language.
 */
export function buildPrompt(address: string, style: StyleKey): string {
  const styleConfig = STYLE_CONFIGS[style] ?? STYLE_CONFIGS["luxury-modern"];

  return (
    `You are a professional photo editor retouching a real estate street-level photograph for a luxury marketing brochure. ` +
    `Your task is photo retouching only — do NOT generate a new image, do NOT redesign the building, do NOT use CGI or 3D modeling. ` +

    `STYLE TO APPLY: ${styleConfig.prompt} ` +

    `QUALITY TARGET: ` +
    `Ultra-realistic architectural photography, 8K resolution, crisp focus, wide-angle professional lens. ` +
    `Apply physically-based realistic textures to existing surfaces — enhance material definition without changing shapes. ` +
    `High dynamic range, clean glass reflections, soft realistic shadows. ` +
    `Professional real estate magazine quality — this is the real property at ${address}. ` +

    `WHAT TO REMOVE: ` +
    `Remove all cars, vehicles, and license plates. Remove power lines and utility poles. ` +
    `Remove trash, street signs, and people. Remove any text, watermarks, or overlays. ` +

    `WHAT YOU MUST NEVER CHANGE: ` +
    `Do NOT alter, move, add, or remove any windows, doors, or roof lines. ` +
    `Do NOT change the building structure, layout, proportions, or facade. ` +
    `Do NOT add architectural elements that are not in the original photo. ` +
    `Do NOT produce warped lines, distorted proportions, or hallucinatory architecture. ` +
    `Every window, door, wall, and structural detail must be identical to the original photograph.`
  );
}

/**
 * Builds the aerial drone prompt for satellite source images.
 * Translated from SD-style schema into OpenAI-compatible instructional language.
 */
export function buildAerialDronePrompt(_address: string): string {
  return (
    `You are a professional photo editor retouching an aerial real estate photograph for a luxury marketing brochure. ` +
    `Your task is photo retouching only — do NOT generate a new image, do NOT create a rendering, do NOT use CGI or 3D modeling. ` +

    `WHAT TO ENHANCE: ` +
    `Apply natural daylight with balanced exposure and perfect global illumination. ` +
    `Enhance the sky to vivid blue with soft clouds. Make the grass vibrant and green. ` +
    `Boost clarity, contrast, sharpness, and color accuracy to 8K ultra-realistic aerial photography quality. ` +
    `Improve roof texture detail, terrain textures, and crisp edges. ` +
    `The result must look like a professional drone photograph taken on a bright clear day — ` +
    `high-end real estate magazine quality, photorealistic, sharp focus throughout. ` +

    `WHAT TO REMOVE: ` +
    `Remove all cars and vehicles. Remove all map markers, pins, labels, text, watermarks, and overlays. ` +

    `WHAT YOU MUST NEVER CHANGE: ` +
    `Do NOT alter the roof lines, shape, or footprint of any building. ` +
    `Do NOT change, add, or remove any windows, garage doors, columns, solar panels, or any architectural element. ` +
    `Do NOT modify the layout, proportions, or topography of the property. ` +
    `Do NOT add foliage, trees, or objects that are not in the original. ` +
    `Do NOT produce blurred edges, melted textures, distorted shapes, or hallucinatory structures. ` +
    `The building structure must be pixel-perfect identical to the original photograph.`
  );
}
