import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ApiError, fetchState, markDone, openEvents, removePlace, saveBook, savePlace, setPresence } from './api';
import { connect } from './events';
import { newExternalId } from './format';
import { Saver } from './saver';
import { applyEvent, emptyDraft, mergeState } from './sync';

const ringOf = (r) => [[r.west, r.north], [r.east, r.north], [r.east, r.south], [r.west, r.south]];

/**
 * The shared draft. Edits apply locally at once and are saved to Honbu in the background; other editors' changes
 * arrive over the live stream. Returns everything the editor screen needs plus the actions that change it.
 */
export function useDraft({ token, region, onAuthLost }) {
  const [draft, setDraftState] = useState(() => ({
    ...emptyDraft(),
    book: { slug: 'kiit', name: 'KIIT Campus', college_domain: 'kiit.ac.in', ring: ringOf(region), version: 0 },
  }));
  const [status, setStatus] = useState('connecting');
  const [ready, setReady] = useState(false);
  const [notices, setNotices] = useState([]);
  const ref = useRef(draft);
  const savers = useRef({});
  const presenceTimer = useRef(null);
  const authLost = useRef(onAuthLost);
  useEffect(() => { authLost.current = onAuthLost; });

  // every change goes through here so event handlers and saves always see the latest state
  const update = useCallback((fn) => { ref.current = fn(ref.current); setDraftState(ref.current); }, []);
  const notify = useCallback((text) => {
    setNotices((n) => [...n, { id: Math.random(), text }]);
    setTimeout(() => setNotices((n) => n.slice(1)), 6000);
  }, []);

  useEffect(() => {
    const fail = (e) => { if (e instanceof ApiError && e.status === 401) authLost.current(); else notify(`Couldn't save: ${e.message}`); };
    const places = new Saver({
      send: (id, place, base) => savePlace(token, id, place, base),
      onSaved: (id, saved) => update((d) => (d.places[id] ? { ...d, places: { ...d.places, [id]: { ...d.places[id], version: saved.version, updated_by: saved.updated_by } } } : d)),
      onConflict: (id, cur) => {
        if (cur) {
          update((d) => ({ ...d, places: { ...d.places, [id]: cur } }));
          notify(`${cur.updated_by} changed "${cur.name || 'a place'}" at the same time, so you're seeing their version.`);
        } else {
          update((d) => { const { [id]: _g, ...rest } = d.places; return { ...d, places: rest }; });
          notify('Someone deleted a place you were editing.');
        }
      },
      onError: (_k, e) => fail(e),
    });
    const book = new Saver({
      send: (_k, b, base) => saveBook(token, b, base),
      onSaved: (_k, saved) => update((d) => ({ ...d, book: { ...d.book, version: saved.version, updated_by: saved.updated_by } })),
      onConflict: (_k, cur) => { if (cur) { update((d) => ({ ...d, book: cur })); notify(`${cur.updated_by} changed the book details at the same time, so you're seeing theirs.`); } },
      onError: (_k, e) => fail(e),
    });
    savers.current = { places, book };
    const busy = (id) => places.busy(id);

    const load = async () => {
      try {
        const s = await fetchState(token);
        for (const p of s.places) places.setVersion(p.id, p.version);
        update((d) => mergeState(d, s, busy));
        setReady(true);
        if (!s.book || s.book.version === 0) book.edit('book', ref.current.book); // first editor creates the shared book
        else book.setVersion('book', s.book.version);
      } catch (e) { fail(e); }
    };

    const stop = connect({
      open: (signal) => openEvents(token, signal),
      onStatus: (st) => { if (st === 'unauthorized') authLost.current(); else setStatus(st); },
      onEvent: (e) => {
        if (e.type === 'hello') { update((d) => applyEvent(d, e)); load(); return; }
        if (e.from && e.from === ref.current.you?.id) return; // our own change; we already have it
        if (e.type === 'place') places.setVersion(e.place.id, e.place.version);
        if (e.type === 'book') book.setVersion('book', e.book.version);
        update((d) => applyEvent(d, e, busy));
      },
    });
    return () => { stop(); clearTimeout(presenceTimer.current); };
  }, [token, update, notify]);

  const editPlace = useCallback((id, patch) => {
    update((d) => (d.places[id] ? { ...d, places: { ...d.places, [id]: { ...d.places[id], ...patch } } } : d));
    const p = ref.current.places[id];
    if (p) savers.current.places.edit(id, p);
  }, [update]);

  const addPlace = useCallback((fields) => {
    const id = newExternalId(fields.name || 'place', new Set(Object.keys(ref.current.places)));
    const place = { name: '', category: '', subcategory: '', hook: '', area: '', radius_m: null, ...fields, id, version: 0, updated_by: '' };
    update((d) => ({ ...d, places: { ...d.places, [id]: place } }));
    savers.current.places.edit(id, place);
    return id;
  }, [update]);

  const deletePlace = useCallback(async (id) => {
    const p = ref.current.places[id];
    if (!p) return;
    const s = savers.current.places;
    update((d) => { const { [id]: _g, ...rest } = d.places; return { ...d, places: rest }; });
    if (s.busy(id)) await new Promise((r) => { const t = setInterval(() => { if (!s.busy(id)) { clearInterval(t); r(); } }, 50); }); // let an unsaved create land first
    const version = s.version(id);
    s.cancel(id);
    if (version === 0) return; // never reached the server
    try {
      const r = await removePlace(token, id, version);
      if (r.conflict) {
        if (r.conflict.current) { update((d) => ({ ...d, places: { ...d.places, [id]: r.conflict.current } })); notify('Someone edited that place just now, so it was kept.'); }
      }
    } catch (e) { if (e instanceof ApiError && e.status === 401) authLost.current(); else { update((d) => ({ ...d, places: { ...d.places, [id]: p } })); notify(`Couldn't delete: ${e.message}`); } }
  }, [token, update, notify]);

  const editBook = useCallback((patch) => {
    update((d) => ({ ...d, book: { ...d.book, ...patch } }));
    savers.current.book.edit('book', ref.current.book);
  }, [update]);

  const finishSuggestions = useCallback((ids) => {
    update((d) => applyEvent(d, { type: 'done', done: ids }));
    markDone(token, ids).catch((e) => notify(`Couldn't sync that choice: ${e.message}`));
  }, [token, update, notify]);

  const announceSelection = useCallback((id) => {
    clearTimeout(presenceTimer.current);
    presenceTimer.current = setTimeout(() => setPresence(token, id || '').catch(() => {}), 150);
  }, [token]);

  const placeList = useMemo(() => Object.values(draft.places), [draft.places]);
  const others = useMemo(() => draft.peers.filter((p) => p.id !== draft.you?.id), [draft.peers, draft.you]);
  const peerSelections = useMemo(() => Object.fromEntries(others.filter((p) => p.selected).map((p) => [p.selected, { color: p.color, name: p.name }])), [others]);

  return {
    book: draft.book, places: placeList, done: draft.done, you: draft.you, peers: draft.peers, others, peerSelections,
    status, ready, notices, editPlace, addPlace, deletePlace, editBook, finishSuggestions, announceSelection,
  };
}
