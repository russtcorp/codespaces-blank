import type { OperatingHours, SpecialDate } from '@diner/db';

type StatusResult = {
  isOpen: boolean;
  reason: 'emergency' | 'special-date' | 'scheduled' | 'closed';
  nextChange?: string; // ISO string
};

function isToday(dateIso: string, now: Date) {
  const [y, m, d] = dateIso.split('-').map(Number);
  return now.getFullYear() === y && now.getMonth() + 1 === m && now.getDate() === d;
}

function toMinutes(t: string) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

export function computeStatus(options: {
  now?: Date;
  operatingHours: OperatingHours[];
  specialDates: SpecialDate[];
  emergencyClosed?: boolean;
  timezone?: string;
}): StatusResult {
  const { operatingHours, specialDates, emergencyClosed = false, timezone } = options;
  const baseNow = options.now ?? new Date();
  const now = (() => {
    if (!timezone) return baseNow;
    try {
      // Convert to the tenant's timezone using Intl; fallback to base time on error
      return new Date(baseNow.toLocaleString('en-US', { timeZone: timezone }));
    } catch {
      return baseNow;
    }
  })();

  // 1) Emergency close wins
  if (emergencyClosed) {
    return { isOpen: false, reason: 'emergency' };
  }

  const todayIso = now.toISOString().slice(0, 10);
  const todaySpecial = specialDates.find((s) => isToday(s.dateIso, now));

  // 2) Special date handling
  if (todaySpecial) {
    if (todaySpecial.status === 'closed') return { isOpen: false, reason: 'special-date' };
    if (todaySpecial.status === 'open') return { isOpen: true, reason: 'special-date' };
    // limited -> fall through to hours if provided, else treat as closed
  }

  // 3) Weekly schedule (supports multiple intervals per day)
  const dayOfWeek = now.getDay(); // 0-6
  const todaysBlocks = operatingHours.filter((h) => h.dayOfWeek === dayOfWeek);
  if (!todaysBlocks.length) return { isOpen: false, reason: 'closed' };

  const minutesNow = now.getHours() * 60 + now.getMinutes();
  let open = false;
  let nextChange: string | undefined;

  for (const block of todaysBlocks) {
    const start = toMinutes(block.startTime);
    const end = toMinutes(block.endTime);
    if (minutesNow >= start && minutesNow < end) {
      open = true;
      nextChange = new Date(now.getTime() + (end - minutesNow) * 60 * 1000).toISOString();
      break;
    }
    if (!open && minutesNow < start) {
      const candidate = new Date(now.getTime() + (start - minutesNow) * 60 * 1000).toISOString();
      nextChange = nextChange ?? candidate;
    }
  }

  return {
    isOpen: open,
    reason: open ? 'scheduled' : todaySpecial ? 'special-date' : 'closed',
    nextChange,
  };
}