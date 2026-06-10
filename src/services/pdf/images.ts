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

// --- browser-only glue below (not unit-testable in jsdom; see render preview) ---

const imgCache = new Map<string, Promise<string>>();

/**
 * Fetch a remote image and return a JPEG data URI center-cropped to exactly
 * the boxW:boxH aspect ratio at `scale`x resolution. Returns '' on any
 * failure (CORS, network, decode) — callers decide placeholder behavior.
 */
export async function imageToCoverDataURI(
  url: string,
  boxW: number,
  boxH: number,
  scale: number
): Promise<string> {
  if (!url) return '';
  const key = `${url}@${boxW}x${boxH}@${scale}`;
  const hit = imgCache.get(key);
  if (hit !== undefined) return hit;

  const job = (async () => {
    try {
      const resp = await fetch(url, { mode: 'cors' });
      if (!resp.ok) throw new Error('Image fetch failed');
      const blob = await resp.blob();
      return (await drawCover(blob, boxW, boxH, scale)) ?? '';
    } catch {
      return '';
    }
  })();

  imgCache.set(key, job);
  return job;
}

function loadImage(blob: Blob): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(blob);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(null);
    };
    img.src = objectUrl;
  });
}

async function drawCover(
  blob: Blob,
  boxW: number,
  boxH: number,
  scale: number
): Promise<string | null> {
  const img = await loadImage(blob);
  if (!img?.width || !img?.height) return null;
  try {
    const crop = computeCoverCrop(img.width, img.height, boxW, boxH);
    const { w, h } = computeOutputSize(crop, boxW, boxH, scale);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    // White underlay so PNG transparency doesn't go black in the JPEG.
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, w, h);
    return canvas.toDataURL('image/jpeg', 0.85);
  } catch {
    return null; // tainted canvas (CORS) or draw failure
  }
}
