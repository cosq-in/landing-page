import { describe, expect, it } from 'vitest';
import { applyEvent, emptyDraft, mergeState } from './sync';

const place = (id, version, extra = {}) => ({ id, name: id, version, lat: 1, lng: 2, ...extra });

describe('applyEvent', () => {
  it('adds a new place and takes a newer version, but ignores an older or equal one', () => {
    let d = applyEvent(emptyDraft(), { type: 'place', place: place('a', 1, { name: 'first' }) });
    expect(d.places.a.name).toBe('first');
    d = applyEvent(d, { type: 'place', place: place('a', 3, { name: 'third' }) });
    d = applyEvent(d, { type: 'place', place: place('a', 2, { name: 'late second' }) });
    expect(d.places.a).toMatchObject({ name: 'third', version: 3 });
  });
  it('skips places the caller says are mid-save', () => {
    const d0 = applyEvent(emptyDraft(), { type: 'place', place: place('a', 1, { name: 'mine' }) });
    const d = applyEvent(d0, { type: 'place', place: place('a', 2, { name: 'theirs' }) }, (id) => id === 'a');
    expect(d.places.a.name).toBe('mine');
  });
  it('removes on a newer delete, ignores a stale one, and a re-add with a higher version wins', () => {
    let d = applyEvent(emptyDraft(), { type: 'place', place: place('a', 2) });
    d = applyEvent(d, { type: 'place_delete', id: 'a', version: 2 });
    expect(d.places.a).toBeDefined();
    d = applyEvent(d, { type: 'place_delete', id: 'a', version: 3 });
    expect(d.places.a).toBeUndefined();
  });
  it('takes a newer book only', () => {
    let d = applyEvent(emptyDraft(), { type: 'book', book: { slug: 'kiit', version: 2 } });
    d = applyEvent(d, { type: 'book', book: { slug: 'old', version: 1 } });
    expect(d.book.slug).toBe('kiit');
  });
  it('unions finished suggestions, records hello and presence', () => {
    let d = applyEvent(emptyDraft(), { type: 'done', done: ['c1'] });
    d = applyEvent(d, { type: 'done', done: ['c1', 'c2'] });
    expect(d.done.sort()).toEqual(['c1', 'c2']);
    d = applyEvent(d, { type: 'hello', you: { id: 'me', name: 'Asha' }, peers: [{ id: 'me' }] });
    expect(d.you.name).toBe('Asha');
    d = applyEvent(d, { type: 'presence', peers: [{ id: 'me' }, { id: 'x' }] });
    expect(d.peers).toHaveLength(2);
  });
});

describe('mergeState (full reload after connecting or reconnecting)', () => {
  it('is authoritative: drops saved places the server no longer has, keeps brand-new unsaved ones', () => {
    const d0 = { ...emptyDraft(), places: { gone: place('gone', 2), fresh: place('fresh', 0), kept: place('kept', 1) } };
    const d = mergeState(d0, { book: { slug: 'kiit', version: 1 }, places: [place('kept', 1)], done: ['c1'] });
    expect(Object.keys(d.places).sort()).toEqual(['fresh', 'kept']);
    expect(d.done).toEqual(['c1']);
    expect(d.book.slug).toBe('kiit');
  });
  it('does not roll a place back to an older server version', () => {
    const d0 = { ...emptyDraft(), places: { a: place('a', 5, { name: 'newer' }) } };
    expect(mergeState(d0, { book: null, places: [place('a', 4, { name: 'older' })], done: [] }).places.a.name).toBe('newer');
  });
  it('keeps a local default book when the server has none yet (version 0)', () => {
    const d0 = { ...emptyDraft(), book: { slug: 'kiit', version: 0 } };
    expect(mergeState(d0, { book: { slug: '', version: 0 }, places: [], done: [] }).book.slug).toBe('kiit');
  });
});
