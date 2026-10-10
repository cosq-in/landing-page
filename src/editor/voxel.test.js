import { describe, expect, it } from 'vitest';
import { unrle, regionToPixels, regionCorners } from './voxel';

describe('unrle', () => {
  it('expands char+count runs, count defaults to 1', () => {
    expect(unrle('g3lR2')).toBe('gggllR'.slice(0, 3) + 'l' + 'RR');
    expect(unrle('gl2g')).toBe('gllg');
  });
  it('handles multi-digit counts', () => expect(unrle('g12')).toHaveLength(12));
});

describe('regionToPixels', () => {
  const region = { cols: 3, rows: 2, ground: ['g3', 'wlR'], obj: ['.3', '.h.'], hgt: ['a3', 'aca'], north: 1, west: 0, south: 0, east: 3 };
  it('returns RGBA for every cell', () => {
    const px = regionToPixels(region);
    expect(px).toHaveLength(3 * 2 * 4);
    expect(px[3]).toBe(255);
  });
  it('paints a building cell differently from the ground under it', () => {
    const px = regionToPixels(region);
    const ground = [...px.slice(4 * 4, 4 * 5)]; // row 1 col 1 is 'l' with a house on it
    const noBuilding = regionToPixels({ ...region, obj: ['.3', '...'] });
    expect(ground).not.toEqual([...noBuilding.slice(4 * 4, 4 * 5)]);
  });
});

describe('regionCorners', () => {
  it('returns MapLibre image corners tl, tr, br, bl as [lng, lat]', () => {
    expect(regionCorners({ north: 20.375, west: 85.8, south: 20.335, east: 85.835 })).toEqual([[85.8, 20.375], [85.835, 20.375], [85.835, 20.335], [85.8, 20.335]]);
  });
});
