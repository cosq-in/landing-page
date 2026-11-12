import { describe, expect, it } from 'vitest';
import { actorLabel, ageDays, ageLabel, allowedActions, confirmText, errorMessage, forwardBody, formatBytes, photoBadge, placeLabel, rejectBody, statusBody, statusLabel, typeLabel } from './rwLogic';

const NOW = Date.parse('2026-11-13T12:00:00Z');

describe('age', () => {
  it('counts whole days and never goes negative', () => {
    expect(ageDays('2026-11-13T01:00:00Z', NOW)).toBe(0);
    expect(ageDays('2026-11-10T11:00:00Z', NOW)).toBe(3);
    expect(ageDays('2027-01-01T00:00:00Z', NOW)).toBe(0);
    expect(ageDays('garbage', NOW)).toBe(0);
  });
  it('reads naturally', () => {
    expect(ageLabel('2026-11-13T01:00:00Z', NOW)).toBe('today');
    expect(ageLabel('2026-11-12T01:00:00Z', NOW)).toBe('1 day');
    expect(ageLabel('2026-11-01T01:00:00Z', NOW)).toBe('12 days');
  });
});

describe('labels', () => {
  it('maps known values and passes unknown ones through', () => {
    expect(statusLabel('reported')).toBe('Passed on');
    expect(statusLabel('weird')).toBe('weird');
    expect(typeLabel('pothole')).toBe('Pothole');
    expect(typeLabel('new_kind')).toBe('new_kind');
    expect(actorLabel('staff')).toBe('Staff');
  });
  it('formats place and size', () => {
    expect(placeLabel({ location_label: 'Gate 2', area: 'Patia' })).toBe('Gate 2, Patia');
    expect(placeLabel({ location_label: '', area: '' })).toBe('Unlabelled spot');
    expect(formatBytes(900)).toBe('900 B');
    expect(formatBytes(150 * 1024)).toBe('150 KB');
    expect(formatBytes(2.5 * 1024 * 1024)).toBe('2.5 MB');
    expect(formatBytes(-1)).toBe('—');
  });
  it('caps the photo badge at the server limit', () => {
    expect(photoBadge(3)).toBe('3');
    expect(photoBadge(50)).toBe('50+');
  });
});

describe('allowedActions', () => {
  it('follows the server transition table', () => {
    expect(allowedActions('open')).toEqual({ forward: true, acknowledged: false, fixed: true });
    expect(allowedActions('reported')).toEqual({ forward: false, acknowledged: true, fixed: true });
    expect(allowedActions('acknowledged')).toEqual({ forward: false, acknowledged: false, fixed: true });
    expect(allowedActions('reopened')).toEqual({ forward: true, acknowledged: true, fixed: true });
    expect(allowedActions('fixed')).toEqual({ forward: false, acknowledged: false, fixed: false });
    expect(allowedActions('verified')).toEqual({ forward: false, acknowledged: false, fixed: false });
  });
});

describe('request bodies', () => {
  it('builds the forward body and refuses invalid input', () => {
    expect(forwardBody('  KIIT Estate Office ', 'kiit', false)).toEqual({ office: 'KIIT Estate Office', owner: 'kiit', owner_confirmed: false });
    expect(forwardBody('BMC', 'bmc', true).owner_confirmed).toBe(true);
    expect(forwardBody('   ', 'kiit')).toBeNull();
    expect(forwardBody('x'.repeat(81), 'kiit')).toBeNull();
    expect(forwardBody('x'.repeat(80), 'kiit')).not.toBeNull();
    expect(forwardBody('BMC', 'nobody')).toBeNull();
  });
  it('builds the status body', () => {
    expect(statusBody('fixed')).toEqual({ status: 'fixed' });
  });
  it('sends a reason only when there is one', () => {
    expect(rejectBody('')).toEqual({});
    expect(rejectBody('   ')).toEqual({});
    expect(rejectBody(' shows a face ')).toEqual({ reason: 'shows a face' });
    expect(rejectBody('x'.repeat(201))).toBeNull();
  });
});

describe('wording', () => {
  it('forward confirm tells riders it was passed on and does not claim the office acknowledged', () => {
    const t = confirmText.forward('BMC');
    expect(t).toMatch(/Riders .* told it was passed on/);
    expect(t).toMatch(/does not mean the office has seen it/);
    expect(t).not.toMatch(/acknowledged/i);
  });
  it('never says photos are blurred', () => {
    expect(Object.values(confirmText).map((f) => f('x')).join(' ')).not.toMatch(/blur/i);
  });
  it('explains server error codes', () => {
    expect(errorMessage(409)).toMatch(/not allowed/);
    expect(errorMessage(404)).toMatch(/no longer exists/);
    expect(errorMessage(400)).toMatch(/bad request/);
    expect(errorMessage(503)).toMatch(/error 503/);
    expect(errorMessage(0, "Can't reach Honbu")).toBe("Can't reach Honbu");
  });
});
