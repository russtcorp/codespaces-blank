import { describe, expect, it } from 'vitest';
import type { OperatingHours, SpecialDate } from '@diner/db';
import { computeStatus } from './status';

const baseHours: OperatingHours[] = [
  { id: 1, tenantId: 'tenant-1', dayOfWeek: 1, startTime: '06:00', endTime: '14:00' },
];

describe('computeStatus', () => {
  it('returns closed with emergency reason when emergency flag is set', () => {
    const result = computeStatus({
      operatingHours: baseHours,
      specialDates: [],
      emergencyClosed: true,
      now: new Date('2024-01-01T12:00:00Z'),
    });

    expect(result).toEqual({ isOpen: false, reason: 'emergency' });
  });

  it('handles special-date overrides for closed and open', () => {
    const specials: SpecialDate[] = [
      { id: 1, tenantId: 'tenant-1', dateIso: '2024-01-01', status: 'closed', reason: 'Holiday' },
    ];

    const closed = computeStatus({ operatingHours: baseHours, specialDates: specials, now: new Date('2024-01-01T12:00:00Z') });
    expect(closed.isOpen).toBe(false);
    expect(closed.reason).toBe('special-date');

    const openSpecials: SpecialDate[] = [{ ...specials[0], status: 'open' }];
    const open = computeStatus({ operatingHours: baseHours, specialDates: openSpecials, now: new Date('2024-01-01T12:00:00Z') });
    expect(open.isOpen).toBe(true);
    expect(open.reason).toBe('special-date');
  });

  it('returns nextChange when before opening and switches to open inside a block', () => {
    const early = computeStatus({
      operatingHours: baseHours,
      specialDates: [],
      now: new Date('2024-01-01T04:30:00Z'),
    });

    expect(early.isOpen).toBe(false);
    expect(early.nextChange).toBeDefined();

    const duringHours = computeStatus({
      operatingHours: baseHours,
      specialDates: [],
      now: new Date('2024-01-01T12:00:00Z'),
    });

    expect(duringHours.isOpen).toBe(true);
    expect(duringHours.reason).toBe('scheduled');
    expect(duringHours.nextChange).toBeDefined();
  });

  it('respects tenant timezone when computing current status', () => {
    const result = computeStatus({
      operatingHours: baseHours,
      specialDates: [],
      timezone: 'America/New_York',
      now: new Date('2024-01-01T12:00:00Z'), // 07:00 local time, inside 06:00-14:00 window
    });

    expect(result.isOpen).toBe(true);
    expect(result.reason).toBe('scheduled');
  });
});