// Draws Bangalore's tiled voxel map under the editor map: only the tiles in view, at the detail level that suits the zoom.
import { fetchTile } from './api';
import { regionCorners, regionToCanvas } from './voxel';

const MAX_IN_VIEW = 60; // beyond this (zoomed far out) the satellite base is enough
const KEEP = 160; // tiles kept in memory before the ones out of view are dropped
const FINE_FROM_ZOOM = 14.5;

/** manifests = { coarse, fine } (bake_city manifests). onHint gets a message when too far out, '' otherwise. */
export function createTileLayer(map, { token, manifests, beforeId, onHint = () => {} }) {
  const loaded = new Map(); // "level/r/c" -> { level, id }
  const pending = new Set();
  let style = { visible: true, opacity: 1 };
  let alive = true;
  let seq = 0;

  const level = () => (map.getZoom() >= FINE_FROM_ZOOM ? 'fine' : 'coarse');

  function tilesInView(m) {
    const b = map.getBounds();
    const r0 = Math.max(0, Math.floor((b.getSouth() - m.south) / m.tile_lat));
    const r1 = Math.min(m.rows - 1, Math.floor((b.getNorth() - m.south) / m.tile_lat));
    const c0 = Math.max(0, Math.floor((b.getWest() - m.west) / m.tile_lng));
    const c1 = Math.min(m.cols - 1, Math.floor((b.getEast() - m.west) / m.tile_lng));
    const have = new Set(m.tiles.map(([r, c]) => `${r},${c}`));
    const out = [];
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) if (have.has(`${r},${c}`)) out.push([r, c]);
    return out;
  }

  const apply = (id) => {
    map.setLayoutProperty(id, 'visibility', style.visible ? 'visible' : 'none');
    map.setPaintProperty(id, 'raster-opacity', style.opacity);
  };

  function drop(key) {
    const t = loaded.get(key);
    if (!t) return;
    if (map.getLayer(t.id)) map.removeLayer(t.id);
    if (map.getSource(t.id)) map.removeSource(t.id);
    loaded.delete(key);
  }

  async function refresh() {
    if (!alive) return;
    const lv = level();
    const m = manifests[lv];
    const want = tilesInView(m);
    if (want.length > MAX_IN_VIEW) { onHint('Zoom in to see the Bengaluru voxel map.'); return; }
    onHint('');
    for (const [key, t] of loaded) if (t.level !== lv) drop(key); // the other detail level
    const run = ++seq;
    await Promise.all(want.map(async ([r, c]) => {
      const key = `${lv}/${r}/${c}`;
      if (loaded.has(key) || pending.has(key)) return;
      pending.add(key);
      try {
        const tile = await fetchTile(token, m.id, `r${r}c${c}`);
        if (!alive || !tile || run !== seq && level() !== lv) return;
        const id = `vt-${key.replace(/\//g, '-')}`;
        map.addSource(id, { type: 'image', url: regionToCanvas(tile).toDataURL(), coordinates: regionCorners(tile) });
        map.addLayer({ id, type: 'raster', source: id, paint: { 'raster-resampling': 'nearest' } }, beforeId);
        loaded.set(key, { level: lv, id });
        apply(id);
      } catch { /* a failed tile just stays open ground; the next move retries it */ } finally {
        pending.delete(key);
      }
    }));
    if (loaded.size > KEEP) {
      const keep = new Set(want.map(([r, c]) => `${lv}/${r}/${c}`));
      for (const key of [...loaded.keys()]) if (!keep.has(key)) drop(key);
    }
  }

  return {
    refresh,
    setStyle(next) {
      style = next;
      for (const t of loaded.values()) apply(t.id);
    },
    destroy() {
      alive = false;
      for (const key of [...loaded.keys()]) drop(key);
    },
  };
}
