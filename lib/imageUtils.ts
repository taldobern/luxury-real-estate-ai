import sharp from "sharp";

/**
 * Enhances an aerial image using Sharp (pure photo processing, no AI).
 * Resizes to 1024x1024, boosts brightness, contrast, saturation and sharpness.
 * Safe: zero risk of structural changes.
 */
export async function enhanceAndResizeAerial(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer)
    .resize(1024, 1024, { fit: "cover", position: "center" })
    .modulate({ brightness: 1.15, saturation: 1.3 })
    .sharpen({ sigma: 0.9 })
    .normalise()
    .png()
    .toBuffer();
}

/**
 * Creates a mask for aerial gpt-image-1 inpainting.
 *
 * Transparent (alpha=0)  = AI CAN edit → dark vehicles, outer edges
 * Opaque    (alpha=255)  = AI CANNOT touch → house, roof, garage, structure
 *
 * This locks the entire house structure pixel-perfect while letting the AI
 * remove cars and clean up sky/neighbor edges.
 */
export async function createAerialMask(imageBuffer: Buffer): Promise<Buffer> {
  const { data, info } = await sharp(imageBuffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height } = info;
  const maskData = Buffer.alloc(width * height * 4);

  for (let i = 0; i < width * height; i++) {
    const src = i * 4;
    const r = data[src];
    const g = data[src + 1];
    const b = data[src + 2];

    const x = i % width;
    const y = Math.floor(i / width);

    // Very dark pixels = vehicles (cars, trucks, SUVs)
    // Using strict threshold to avoid catching shadows or dark architectural details
    const isVehicle = r < 55 && g < 55 && b < 55;

    // Outer 5% border = sky, neighboring properties, street edges
    const isEdge =
      x < width * 0.05 ||
      x > width * 0.95 ||
      y < height * 0.05 ||
      y > height * 0.95;

    const transparent = isVehicle || isEdge;

    const dst = i * 4;
    maskData[dst] = 0;
    maskData[dst + 1] = 0;
    maskData[dst + 2] = 0;
    maskData[dst + 3] = transparent ? 0 : 255;
  }

  return sharp(maskData, { raw: { width, height, channels: 4 } })
    .png()
    .toBuffer();
}
