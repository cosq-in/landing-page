import { describe, expect, it } from 'vitest';
import { distanceM, nearby, viewAt } from './geo';

describe('distanceM', () => {
  it('is zero for the same point and about 111 km per degree of latitude', () => {
    expect(distanceM({ lat: 20, lng: 85 }, { lat: 20, lng: 85 })).toBe(0);
    expect(distanceM({ lat: 20, lng: 85 }, { lat: 21, lng: 85 })).toBeGreaterThan(111000);
    expect(distanceM({ lat: 20, lng: 85 }, { lat: 21, lng: 85 })).toBeLessThan(111400);
  });
  it('shrinks east-west distances with latitude', () => {
    const eq = distanceM({ lat: 0, lng: 0 }, { lat: 0, lng: 1 });
    const blr = distanceM({ lat: 13, lng: 77 }, { lat: 13, lng: 78 });
    expect(blr).toBeLessThan(eq * 0.98);
  });
});

describe('nearby', () => {
  const here = { lat: 20.35, lng: 85.82 };
  const items = [
    { id: 'far', name: 'Far', lat: 20.36, lng: 85.82 },
    { id: 'near', name: 'Near', lat: 20.3503, lng: 85.82 },
    { id: 'mid', name: 'Mid', lat: 20.3515, lng: 85.82 },
  ];
  it('keeps only items within the radius, closest first, with their distance', () => {
    const out = nearby(here, items, 300, 10);
    expect(out.map((o) => o.item.id)).toEqual(['near', 'mid']);
    expect(out[0].meters).toBeLessThan(out[1].meters);
  });
  it('respects the limit', () => expect(nearby(here, items, 5000, 1)).toHaveLength(1));
  it('returns nothing without a position', () => expect(nearby(null, items, 300, 5)).toEqual([]));
});

describe('viewAt', () => {
  const views = { kiit: { bounds: [20.335, 85.8, 20.375, 85.835] }, bangalore: { bounds: [12.75, 77.4, 13.2, 77.85] } };
  it('names the book whose area contains the point', () => {
    expect(viewAt(20.35, 85.82, views)).toBe('kiit');
    expect(viewAt(12.97, 77.59, views)).toBe('bangalore');
  });
  it('is null elsewhere', () => expect(viewAt(28.6, 77.2, views)).toBeNull());
});
