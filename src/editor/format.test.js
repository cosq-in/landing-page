import { describe, expect, it } from 'vitest';
import { defaultRadius, inRing, toBookJson, toCsv, validate, slugify, newExternalId } from './format';

const ring = [[85.80, 20.33], [85.84, 20.33], [85.84, 20.38], [85.80, 20.38]];
const place = (o = {}) => ({ id: 'p1', name: 'Chai Point', category: 'food', subcategory: 'tea stall', hook: '', area: 'Campus 6', lat: 20.35, lng: 85.82, radius_m: null, ...o });

describe('defaultRadius (mirrors seed_quests.py)', () => {
  it('is 150 for nature and big places, 50 otherwise', () => {
    expect(defaultRadius('nature', '')).toBe(150);
    expect(defaultRadius('food', 'City Park')).toBe(150);
    expect(defaultRadius('food', 'tea stall')).toBe(50);
  });
});

describe('inRing', () => {
  it('uses [lng, lat] points', () => {
    expect(inRing(20.35, 85.82, ring)).toBe(true);
    expect(inRing(20.35, 85.9, ring)).toBe(false);
  });
});

describe('validate', () => {
  it('accepts a good place', () => {
    expect(validate({ slug: 'kiit', name: 'KIIT', ring }, [place()])).toEqual([]);
  });
  it('flags what seed_quests.py would silently skip', () => {
    const errs = validate({ slug: 'kiit', name: 'KIIT', ring }, [
      place({ id: 'a', name: '' }),
      place({ id: 'b', name: 'B', lat: 20.351, area: '' }),
      place({ id: 'c', name: 'C', lat: 20.352, category: 'shopping' }),
      place({ id: 'd', name: 'D', lat: 20.353, radius_m: 5 }),
      place({ id: 'e', name: 'E', lat: 20.354, lng: 86.5 }),
      place({ id: 'f', name: 'dup', lat: 20.36 }),
      place({ id: 'g', name: 'dup', lat: 20.36 }),
    ]);
    const byId = Object.fromEntries(errs.filter((e) => e.id).map((e) => [e.id, e.message]));
    expect(byId.a).toMatch(/name/);
    expect(byId.b).toMatch(/area/i);
    expect(byId.c).toMatch(/category/);
    expect(byId.d).toMatch(/radius/);
    expect(byId.e).toMatch(/outside/);
    expect(byId.g).toMatch(/same name and spot|duplicate/i);
  });
  it('flags a bad slug and a region under 3 points', () => {
    const errs = validate({ slug: 'KIIT Bhubaneswar', name: 'KIIT', ring: ring.slice(0, 2) }, [place()]);
    expect(errs.map((e) => e.message).join('|')).toMatch(/slug/);
    expect(errs.map((e) => e.message).join('|')).toMatch(/region/);
  });
});

describe('exports', () => {
  it('writes the book file seed_quests.py reads, closing the ring', () => {
    const b = JSON.parse(toBookJson({ slug: 'kiit', name: 'KIIT', college_domain: 'kiit.ac.in', ring }));
    expect(b.slug).toBe('kiit');
    expect(b.college_domain).toBe('kiit.ac.in');
    const poly = b.region.polygon;
    expect(poly[0]).toEqual(poly[poly.length - 1]);
    expect(poly).toHaveLength(5);
  });
  it('omits college_domain when blank', () => {
    expect(JSON.parse(toBookJson({ slug: 'kiit', name: 'KIIT', college_domain: '', ring })).college_domain).toBeUndefined();
  });
  it('writes the CSV columns in seed order and quotes awkward text', () => {
    const csv = toCsv([place({ id: 'x1', name: 'Mama, "the" Chai', hook: 'line1\nline2', radius_m: 60 })]);
    const [head, ...rest] = csv.trim().split('\n');
    expect(head).toBe('external_id,name,category,subcategory,hook,lat,lng,area,radius_m');
    expect(csv).toContain('"Mama, ""the"" Chai"');
    expect(csv).toContain('"line1\nline2"');
    expect(rest.join('\n')).toContain(',60');
  });
  it('leaves radius_m blank when unset so the seeder default applies', () => {
    const line = toCsv([place({ id: 'x1' })]).trim().split('\n')[1];
    expect(line.endsWith(',')).toBe(true);
  });
});

describe('ids and slugs', () => {
  it('slugifies', () => expect(slugify(' KIIT  Bhubaneswar! ')).toBe('kiit-bhubaneswar'));
  it('makes unique stable-looking ids', () => {
    const a = newExternalId('Chai Point', new Set());
    expect(a).toMatch(/^chai-point-[a-z0-9]{4}$/);
    expect(newExternalId('Chai Point', new Set([a]))).not.toBe(a);
  });
});
