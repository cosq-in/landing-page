// Draws a baked voxel region (kurukuru-honbu/tools/bake_voxels.py, "v": 2) as a flat top-down image the
// editor map can pin to its coordinates. Colours follow the same palette the app uses, roughly.

const GROUND = {
  g: [214, 226, 176], t: [150, 200, 120], f: [70, 140, 80], c: [170, 200, 130], a: [225, 225, 150], m: [130, 190, 170],
  d: [230, 215, 170], u: [232, 226, 214], n: [222, 214, 224], v: [200, 200, 205], y: [140, 200, 140], w: [100, 160, 225],
  p: [250, 250, 250], l: [255, 255, 255], r: [255, 235, 160], R: [255, 200, 100], k: [190, 170, 150], x: [120, 120, 120],
};
const BUILDING = {
  h: [215, 140, 120], a: [200, 150, 170], c: [230, 170, 100], i: [120, 150, 215], r: [235, 200, 90],
  f: [150, 150, 160], s: [180, 170, 160], u: [190, 180, 175],
};
const TREE = [60, 120, 60];
const UNKNOWN = [255, 0, 255];

/** Run-length decode: each run is a character followed by an optional count (default 1). */
export function unrle(row) {
  let out = '';
  for (const [, ch, n] of row.matchAll(/(.)(\d*)/g)) out += ch.repeat(n ? parseInt(n, 10) : 1);
  return out;
}

/** RGBA bytes, row 0 = north. Buildings are shaded darker the taller they are. */
export function regionToPixels(region) {
  const { cols, rows } = region;
  const px = new Uint8ClampedArray(cols * rows * 4);
  for (let y = 0; y < rows; y++) {
    const g = unrle(region.ground[y]);
    const o = unrle(region.obj[y]);
    const h = unrle(region.hgt[y]);
    for (let x = 0; x < cols; x++) {
      let rgb = GROUND[g[x]] || UNKNOWN;
      if (BUILDING[o[x]]) {
        const k = 1 - Math.min(h.charCodeAt(x) - 97, 6) * 0.06;
        rgb = BUILDING[o[x]].map((v) => v * k);
      } else if (o[x] === 'T') rgb = TREE;
      const i = (y * cols + x) * 4;
      px[i] = rgb[0]; px[i + 1] = rgb[1]; px[i + 2] = rgb[2]; px[i + 3] = 255;
    }
  }
  return px;
}

/** Corners in MapLibre image-source order: top-left, top-right, bottom-right, bottom-left, as [lng, lat]. */
export function regionCorners({ north, west, south, east }) {
  return [[west, north], [east, north], [east, south], [west, south]];
}

/** A canvas holding the region image; call from the browser only. */
export function regionToCanvas(region) {
  const canvas = document.createElement('canvas');
  canvas.width = region.cols;
  canvas.height = region.rows;
  canvas.getContext('2d').putImageData(new ImageData(regionToPixels(region), region.cols, region.rows), 0, 0);
  return canvas;
}
