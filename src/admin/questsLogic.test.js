import { describe, expect, it } from 'vitest';
import { QUEST_VIEWS, canPublish, draftSummary, issueCountLabel, publishBlockReason, publishErrorMessage, publishResultText, viewLabel } from './questsLogic';

const NOW = Date.parse('2026-11-14T12:00:00Z');
const draft = { version: 7, updated_by: 'Asha', updated_at: '2026-11-13T09:00:00Z', places: 120, errors: [], warnings: [] };

describe('views', () => {
  it('lists both books with plain labels', () => {
    expect(QUEST_VIEWS.map(([v]) => v)).toEqual(['kiit', 'bangalore']);
    expect(viewLabel('kiit')).toBe('KIIT');
    expect(viewLabel('bangalore')).toBe('Bangalore');
    expect(viewLabel('x')).toBe('x');
  });
});

describe('draftSummary', () => {
  it('reads version, editor, place count and age', () => {
    expect(draftSummary(draft, NOW)).toEqual({ version: 'v7', editor: 'Asha', places: '120 places', saved: '1 day ago' });
  });
  it('handles singular, missing editor and bad dates', () => {
    const s = draftSummary({ ...draft, places: 1, updated_by: '', updated_at: 'junk' }, NOW);
    expect(s.places).toBe('1 place');
    expect(s.editor).toBe('nobody yet');
    expect(s.saved).toBe('today');
  });
});

describe('canPublish', () => {
  it('needs places and no errors', () => {
    expect(canPublish(draft)).toBe(true);
    expect(canPublish({ ...draft, places: 0 })).toBe(false);
    expect(canPublish({ ...draft, errors: [{ id: 'a', message: 'bad' }] })).toBe(false);
    expect(canPublish({ ...draft, warnings: [{ id: 'a', message: 'meh' }] })).toBe(true);
    expect(canPublish(null)).toBe(false);
  });
  it('explains why not', () => {
    expect(publishBlockReason(draft)).toBe('');
    expect(publishBlockReason({ ...draft, places: 0 })).toMatch(/no places/i);
    expect(publishBlockReason({ ...draft, errors: [{ id: 'a', message: 'x' }, { id: 'b', message: 'y' }] })).toMatch(/2 errors/);
    expect(publishBlockReason({ ...draft, errors: [{ id: 'a', message: 'x' }] })).toMatch(/1 error\b/);
  });
});

describe('issueCountLabel', () => {
  it('pluralises', () => {
    expect(issueCountLabel('error', 0)).toBe('No errors');
    expect(issueCountLabel('warning', 1)).toBe('1 warning');
    expect(issueCountLabel('warning', 3)).toBe('3 warnings');
  });
});

describe('publishResultText', () => {
  it('gives counts and the skipped breakdown', () => {
    expect(publishResultText({ places: 120, chapters: 9, skipped: { bad: 0, outside: 0, duplicate: 0 } })).toBe('Published 120 places in 9 chapters. Nothing skipped.');
    expect(publishResultText({ places: 118, chapters: 9, skipped: { bad: 1, outside: 2, duplicate: 0 } })).toBe('Published 118 places in 9 chapters. Skipped 3: 1 bad, 2 outside the book area.');
    expect(publishResultText({ places: 1, chapters: 1, skipped: { bad: 0, outside: 0, duplicate: 4 } })).toBe('Published 1 place in 1 chapter. Skipped 4: 4 duplicate.');
  });
  it('tolerates a missing skipped block', () => {
    expect(publishResultText({ places: 2, chapters: 1 })).toBe('Published 2 places in 1 chapter. Nothing skipped.');
  });
});

describe('publishErrorMessage', () => {
  it('maps statuses to plain words', () => {
    expect(publishErrorMessage(409, { error: 'invalid_draft' })).toMatch(/errors/);
    expect(publishErrorMessage(409, null)).toMatch(/changed/);
    expect(publishErrorMessage(404)).toMatch(/not found/i);
    expect(publishErrorMessage(429)).toMatch(/too many/i);
    expect(publishErrorMessage(503)).toMatch(/error 503/);
    expect(publishErrorMessage(0, null, "Can't reach Honbu")).toBe("Can't reach Honbu");
  });
});
