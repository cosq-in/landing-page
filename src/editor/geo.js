// Small location helpers for using the editor on a phone.

const R = 6371000;
const rad = (d) => (d * Math.PI) / 180;

/** Great-circle distance in metres between two {lat, lng} points. */
export function distanceM(a, b) {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** The closest items to `here` within `radiusM`, nearest first, as [{item, meters}]. */
export function nearby(here, items, radiusM, limit) {
  if (!here) return [];
  return items
    .map((item) => ({ item, meters: distanceM(here, item) }))
    .filter((x) => x.meters <= radiusM)
    .sort((a, b) => a.meters - b.meters)
    .slice(0, limit);
}

/** Which view's area (views[id].bounds = [south, west, north, east]) contains the point, or null. */
export function viewAt(lat, lng, views) {
  for (const [id, v] of Object.entries(views)) {
    const [s, w, n, e] = v.bounds;
    if (lat >= s && lat <= n && lng >= w && lng <= e) return id;
  }
  return null;
}
