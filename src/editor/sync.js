// How the shared draft changes when Honbu tells us something. Every place and the book carry a version that
// only goes up, so "apply only if newer" makes events and full reloads safe to receive in any order.

export const emptyDraft = () => ({ book: null, places: {}, done: [], peers: [], you: null });

const newer = (incoming, local) => !local || incoming.version > local.version;

/** `isBusy(id)` is true while we have an unsaved edit to that place; their copy must not trample ours. */
export function applyEvent(d, e, isBusy = () => false) {
  switch (e.type) {
    case 'hello':
      return { ...d, you: e.you, peers: e.peers || [] };
    case 'presence':
      return { ...d, peers: e.peers || [] };
    case 'place':
      if (isBusy(e.place.id) || !newer(e.place, d.places[e.place.id])) return d;
      return { ...d, places: { ...d.places, [e.place.id]: e.place } };
    case 'place_delete': {
      const local = d.places[e.id];
      if (!local || isBusy(e.id) || e.version <= local.version) return d;
      const { [e.id]: _gone, ...rest } = d.places;
      return { ...d, places: rest };
    }
    case 'book':
      return newer(e.book, d.book) ? { ...d, book: e.book } : d;
    case 'done':
      return { ...d, done: [...new Set([...d.done, ...(e.done || [])])] };
    default:
      return d;
  }
}

/** A full state from Honbu after (re)connecting: the server is authoritative for anything already saved. */
export function mergeState(d, s, isBusy = () => false) {
  const remote = Object.fromEntries(s.places.map((p) => [p.id, p]));
  const places = {};
  for (const [id, local] of Object.entries(d.places)) {
    if (local.version === 0 || isBusy(id)) places[id] = local; // a new place we have not saved yet
  }
  for (const p of s.places) if (!isBusy(p.id) && newer(p, d.places[p.id])) places[p.id] = p;
  for (const [id, local] of Object.entries(d.places)) if (!places[id] && remote[id]) places[id] = local; // we are ahead of the server copy
  const book = s.book && s.book.version > 0 && newer(s.book, d.book) ? s.book : d.book;
  return { ...d, places, book, done: [...new Set([...d.done, ...(s.done || [])])] };
}
