// Pure logic for the quest book editor: validation and export. Mirrors kurukuru-honbu/tools/seed_quests.py,
// so anything this accepts is something the seeder will load (and anything it skips, we flag here first).

export const CATEGORIES = ['food', 'culture', 'nature', 'adventure', 'games'];
export const CATEGORY_LABELS = { food: 'Food & drink', culture: 'Culture & arts', nature: 'Nature', adventure: 'Adventure', games: 'Games & play' };
const BIG_PLACES = ['park', 'lake', 'garden', 'ground', 'stadium', 'playground', 'forest', 'reserve', 'beach'];
const SLUG = /^[a-z0-9][a-z0-9-]*$/;
const CSV_COLUMNS = ['external_id', 'name', 'category', 'subcategory', 'hook', 'lat', 'lng', 'area', 'radius_m'];

export function defaultRadius(category, subcategory) {
  const sub = (subcategory || '').toLowerCase();
  return category === 'nature' || BIG_PLACES.some((w) => sub.includes(w)) ? 150 : 50;
}

/** Ray casting; ring points are [lng, lat]. */
export function inRing(lat, lng, ring) {
  let inside = false;
  for (let i = 0; i < ring.length; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[(i + 1) % ring.length];
    if (y1 > lat !== y2 > lat && lng < ((x2 - x1) * (lat - y1)) / (y2 - y1) + x1) inside = !inside;
  }
  return inside;
}

export const slugify = (s) => s.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

export function newExternalId(name, taken) {
  const base = slugify(name) || 'place';
  for (;;) {
    const id = `${base}-${Math.random().toString(36).slice(2, 6).padEnd(4, '0')}`;
    if (!taken.has(id)) return id;
  }
}

const metersBetween = (a, b) => {
  const dLat = (a.lat - b.lat) * 111320;
  const dLng = (a.lng - b.lng) * 111320 * Math.cos((a.lat * Math.PI) / 180);
  return Math.hypot(dLat, dLng);
};

/** Returns [{id?, message}]; empty means the files will seed cleanly. `id` is the place's editor id. */
export function validate(book, places) {
  const errs = [];
  if (!SLUG.test(book.slug || '')) errs.push({ message: 'Book slug must be lowercase letters, digits and dashes.' });
  if (!(book.name || '').trim()) errs.push({ message: 'Book needs a name.' });
  const ringOk = (book.ring || []).length >= 3;
  if (!ringOk) errs.push({ message: 'Draw the book region: at least 3 points.' });
  const seenAt = [];
  for (const p of places) {
    const bad = (message) => errs.push({ id: p.id, message: `${p.name || 'Unnamed place'}: ${message}` });
    if (!(p.name || '').trim()) bad('needs a name');
    if (!(p.area || '').trim()) bad('needs an area (its chapter)');
    if (!CATEGORIES.includes(p.category)) bad('pick a category');
    if (!Number.isFinite(p.lat) || !Number.isFinite(p.lng)) bad('has no position');
    if (p.radius_m != null && !(Number.isInteger(p.radius_m) && p.radius_m >= 10 && p.radius_m <= 500)) bad('radius must be a whole number 10 to 500 m');
    if (ringOk && Number.isFinite(p.lat) && Number.isFinite(p.lng) && !inRing(p.lat, p.lng, book.ring)) bad('is outside the book region');
    const name = (p.name || '').trim().toLowerCase();
    if (name && seenAt.some((q) => q.name === name && metersBetween(q, p) < 15)) bad('same name and spot as another place');
    seenAt.push({ name, lat: p.lat, lng: p.lng });
  }
  return errs;
}

export function toBookJson(book) {
  const ring = book.ring.map(([lng, lat]) => [lng, lat]);
  const [fl, fa] = ring[0];
  const [ll, la] = ring[ring.length - 1];
  if (fl !== ll || fa !== la) ring.push([fl, fa]);
  const out = { slug: book.slug, name: book.name };
  if ((book.college_domain || '').trim()) out.college_domain = book.college_domain.trim().toLowerCase();
  const head = JSON.stringify(out, null, 2).replace(/\n}$/, '');
  return `${head},\n  "region": {"polygon": ${JSON.stringify(ring)}}\n}\n`;
}

const cell = (v) => {
  const s = v == null ? '' : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function toCsv(places) {
  const rows = places.map((p) =>
    [p.id, p.name, p.category, p.subcategory, p.hook, +p.lat.toFixed(6), +p.lng.toFixed(6), p.area, p.radius_m].map(cell).join(','),
  );
  return `${CSV_COLUMNS.join(',')}\n${rows.join('\n')}${rows.length ? '\n' : ''}`;
}
