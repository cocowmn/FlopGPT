/* ------------------------------------------------------------------ *
 *  Rough drafts of an image, for "progressive" generation: each one is the image
 *  shrunk to a few pixels across and blown back up, with grain that fades as
 *  the drafts get sharper.
 * ------------------------------------------------------------------ */

const DRAFT_WIDTHS = [5, 10, 20, 44, 100]; // px across, smallest (blurriest) first
const OUT = 512; // the drafts' own width; they're shown blurred, so more would be wasted

/** Object URLs of the drafts, roughest first. Throws if the image can't be drawn (e.g. no CORS). */
export async function draftFrames(src: string): Promise<string[]> {
  const img = new Image();
  img.crossOrigin = 'anonymous'; // without it, a canvas holding another site's image can't be read
  img.src = src;
  await img.decode();
  const w = Math.min(OUT, img.naturalWidth || OUT);
  const h = Math.max(1, Math.round((w * (img.naturalHeight || OUT)) / (img.naturalWidth || OUT)));

  const urls: string[] = [];
  for (const [i, dw] of DRAFT_WIDTHS.entries()) {
    const small = document.createElement('canvas');
    small.width = dw;
    small.height = Math.max(1, Math.round((dw * h) / w));
    const sc = small.getContext('2d')!;
    sc.imageSmoothingQuality = 'high';
    sc.drawImage(img, 0, 0, small.width, small.height);

    const big = document.createElement('canvas');
    big.width = w;
    big.height = h;
    const bc = big.getContext('2d', { willReadFrequently: true })!;
    bc.imageSmoothingQuality = 'high';
    bc.drawImage(small, 0, 0, w, h);

    // Grain, strongest on the roughest draft.
    const grain = 36 * (1 - i / DRAFT_WIDTHS.length);
    const px = bc.getImageData(0, 0, w, h);
    const d = px.data;
    for (let p = 0; p < d.length; p += 4) {
      const g = (Math.random() - 0.5) * grain;
      d[p] += g;
      d[p + 1] += g;
      d[p + 2] += g;
    }
    bc.putImageData(px, 0, 0);

    const blob = await new Promise<Blob | null>(r => big.toBlob(r, 'image/jpeg', 0.4 + 0.1 * i));
    if (!blob) throw new Error("couldn't draw the drafts");
    urls.push(URL.createObjectURL(blob));
  }
  return urls;
}
