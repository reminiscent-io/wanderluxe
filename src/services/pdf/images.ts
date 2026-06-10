/**
 * Image pipeline for the PDF export.
 * Geometry is pure (unit-tested); the canvas/fetch glue is browser-only and
 * verified via the Stage 3 render preview + manual QA.
 */

export type CropRect = { sx: number; sy: number; sw: number; sh: number };

/**
 * Centered source rect with the target box's aspect ratio
 * (CSS `object-fit: cover`). Guarantees zero distortion when the
 * crop is drawn into the box.
 */
export function computeCoverCrop(
  srcW: number,
  srcH: number,
  targetW: number,
  targetH: number
): CropRect {
  const srcRatio = srcW / srcH;
  const targetRatio = targetW / targetH;
  if (srcRatio > targetRatio) {
    const sw = Math.round(srcH * targetRatio);
    return { sx: Math.round((srcW - sw) / 2), sy: 0, sw, sh: srcH };
  }
  const sh = Math.round(srcW / targetRatio);
  return { sx: 0, sy: Math.round((srcH - sh) / 2), sw: srcW, sh };
}

/**
 * Output bitmap size: `scale`x the PDF point box (print sharpness),
 * capped at the source crop width so we never upscale.
 */
export function computeOutputSize(
  crop: CropRect,
  boxW: number,
  boxH: number,
  scale: number
): { w: number; h: number } {
  const w = Math.min(crop.sw, Math.round(boxW * scale));
  const h = Math.round(w * (boxH / boxW));
  return { w: Math.max(1, w), h: Math.max(1, h) };
}
