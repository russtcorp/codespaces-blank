/**
 * Hours Matrix Logic
 *
 * Determines if a diner is currently open/closed based on the "Truth Hierarchy":
 * 1. Emergency Close Reason (highest priority - overrides everything)
 * 2. Special Dates (holidays, events)
 * 3. Weekly Operating Hours (split-shift support)
 *
 * Usage:
 *   const status = await getOpenStatus(safeDb, timezone);
 */

import type { SafeDatabase } from "./safe-query";

export interface OpenStatus {
  isOpen: boolean;
  status: "open" | "closed" | "emergency_closed";
  currentTime: string;
  timeZone: string;
  reason?: string;
  nextOpenTime?: string;
  nextCloseTime?: string;

  // Debug info
  appliedRule?: "emergency" | "special_date" | "weekly_hours";
}

/**
 * Determine if the diner is currently open
 *
 * Truth Hierarchy:
 * 1. Check emergency_close_reason in business_settings
 *    If set and emergencyReopenTime not passed -> CLOSED
 * 2. Check special_dates for today
 *    If status = "closed" -> CLOSED
 *    If status = "limited" -> use custom times
 * 3. Check operating_hours for today's day of week
 *    Support split shifts (multiple entries per day)
 */
export async function getOpenStatus(
  db: SafeDatabase,
  timeZone: string
): Promise<OpenStatus> {
  try {
    // Get current time in diner's timezone
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });

    const formatted = formatter.format(now);
    const [month, day, year, hours, minutes, seconds] = formatted.replace(
      /(\d+),/g,
      "$1"
    ).split(/\/|\/|\s|:/);

    const localDate = new Date(
      parseInt(year),
      parseInt(month) - 1,
      parseInt(day),
      parseInt(hours),
      parseInt(minutes),
      parseInt(seconds)
    );

    const dateISO = localDate.toISOString().split("T")[0]; // YYYY-MM-DD
    const timeHHMM = `${String(parseInt(hours)).padStart(2, "0")}:${String(parseInt(minutes)).padStart(2, "0")}`;
    const dayOfWeek = localDate.getDay(); // 0 = Sunday, 6 = Saturday

    // ============================================================
    // RULE 1: Check Emergency Close
    // ============================================================
    const settings = await db.businessSettings().findOne();
    if (
      settings?.emergencyCloseReason &&
      settings.emergencyCloseReason.trim().length > 0
    ) {
      // Check if emergency reopen time has passed
      if (
        settings.emergencyReopenTime &&
        new Date(settings.emergencyReopenTime) <= localDate
      ) {
        // Emergency time has expired, clear it (would update DB in real implementation)
        console.log(
          `[Hours] Emergency close expired, resuming normal hours`
        );
      } else {
        // Still in emergency close
        return {
          isOpen: false,
          status: "emergency_closed",
          currentTime: timeHHMM,
          timeZone,
          reason: settings.emergencyCloseReason,
          appliedRule: "emergency",
        };
      }
    }

    // ============================================================
    // RULE 2: Check Special Dates (Holidays, Events)
    // ============================================================
    const specialDate = await db.specialDates().findByDate(dateISO);
    if (specialDate) {
      if (specialDate.status === "closed") {
        return {
          isOpen: false,
          status: "closed",
          currentTime: timeHHMM,
          timeZone,
          reason: specialDate.reason || "Closed for special event",
          appliedRule: "special_date",
        };
      } else if (specialDate.status === "limited" && specialDate.customStartTime && specialDate.customEndTime) {
        // Use custom hours for this special date
        const isCurrentlyOpen = isTimeInRange(
          timeHHMM,
          specialDate.customStartTime,
          specialDate.customEndTime
        );
        return {
          isOpen: isCurrentlyOpen,
          status: "open",
          currentTime: timeHHMM,
          timeZone,
          reason: specialDate.reason,
          nextOpenTime: specialDate.customStartTime,
          nextCloseTime: specialDate.customEndTime,
          appliedRule: "special_date",
        };
      }
      // If status = "open", fall through to weekly hours
    }

    // ============================================================
    // RULE 3: Check Weekly Operating Hours
    // ============================================================
    const todaysHours = await db.operatingHours().findByDay(dayOfWeek);

    if (!todaysHours || todaysHours.length === 0) {
      // No hours defined for today
      return {
        isOpen: false,
        status: "closed",
        currentTime: timeHHMM,
        timeZone,
        reason: "No operating hours defined for this day",
        appliedRule: "weekly_hours",
      };
    }

    // Check if current time falls within any of today's shifts (split shift support)
    let isOpen = false;
    let nextOpenTime: string | undefined;
    let nextCloseTime: string | undefined;

    for (const hours of todaysHours) {
      if (isTimeInRange(timeHHMM, hours.startTime, hours.endTime)) {
        isOpen = true;
        nextCloseTime = hours.endTime;
        break;
      }

      // Track next opening time
      if (hours.startTime > timeHHMM) {
        if (!nextOpenTime || hours.startTime < nextOpenTime) {
          nextOpenTime = hours.startTime;
        }
      }
    }

    // If not currently open, find next open time
    if (!isOpen && todaysHours.length > 0) {
      const firstShift = todaysHours[0];
      if (firstShift.startTime > timeHHMM) {
        nextOpenTime = firstShift.startTime;
      } else {
        // All shifts for today have passed
        // Would need to check tomorrow's first shift
        nextOpenTime = "Tomorrow at " + firstShift.startTime;
      }
    }

    return {
      isOpen,
      status: isOpen ? "open" : "closed",
      currentTime: timeHHMM,
      timeZone,
      nextOpenTime,
      nextCloseTime,
      appliedRule: "weekly_hours",
    };
  } catch (error) {
    console.error(`Error determining open status:`, error);
    return {
      isOpen: false,
      status: "closed",
      currentTime: new Date().toISOString(),
      timeZone,
      reason: "Unable to determine status",
    };
  }
}

/**
 * Check if a given time falls within a time range
 * Times are in "HH:MM" format
 */
function isTimeInRange(
  currentTime: string,
  startTime: string,
  endTime: string
): boolean {
  const [currentHours, currentMinutes] = currentTime.split(":").map(Number);
  const [startHours, startMinutes] = startTime.split(":").map(Number);
  const [endHours, endMinutes] = endTime.split(":").map(Number);

  const currentTotalMinutes = currentHours * 60 + currentMinutes;
  const startTotalMinutes = startHours * 60 + startMinutes;
  const endTotalMinutes = endHours * 60 + endMinutes;

  // Handle cases like 23:00 to 02:00 (overnight)
  if (endTotalMinutes < startTotalMinutes) {
    // Overnight shift
    return (
      currentTotalMinutes >= startTotalMinutes ||
      currentTotalMinutes < endTotalMinutes
    );
  }

  // Normal case
  return (
    currentTotalMinutes >= startTotalMinutes &&
    currentTotalMinutes < endTotalMinutes
  );
}

/**
 * Get hours for a specific day
 * Returns all shifts for that day
 */
export async function getHoursForDay(
  db: SafeDatabase,
  dayOfWeek: number
): Promise<Array<{ startTime: string; endTime: string }>> {
  try {
    const hours = await db.operatingHours().findByDay(dayOfWeek);
    return hours.map((h) => ({
      startTime: h.startTime,
      endTime: h.endTime,
    }));
  } catch (error) {
    console.error(`Error fetching hours for day ${dayOfWeek}:`, error);
    return [];
  }
}

/**
 * Format open status for display
 * Example: "Open until 10:00 PM"
 */
export function formatOpenStatus(status: OpenStatus): string {
  if (status.status === "emergency_closed") {
    return `Closed: ${status.reason || "Emergency closure"}`;
  }

  if (!status.isOpen) {
    if (status.nextOpenTime) {
      return `Closed. Opens at ${formatTime(status.nextOpenTime)}`;
    }
    return "Closed";
  }

  if (status.nextCloseTime) {
    return `Open until ${formatTime(status.nextCloseTime)}`;
  }

  return "Open";
}

/**
 * Convert HH:MM time to readable format
 */
function formatTime(time: string): string {
  const [hours, minutes] = time.split(":").map(Number);
  const ampm = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  const displayMinutes = String(minutes).padStart(2, "0");
  return `${displayHours}:${displayMinutes} ${ampm}`;
}

/**
 * Validates that end time is after start time
 */
export function validateTimeRange(startTime: string, endTime: string): {
  valid: boolean;
  error?: string;
} {
  const [startHours, startMinutes] = startTime.split(":").map(Number);
  const [endHours, endMinutes] = endTime.split(":").map(Number);

  const startTotalMinutes = startHours * 60 + startMinutes;
  const endTotalMinutes = endHours * 60 + endMinutes;

  if (endTotalMinutes <= startTotalMinutes) {
    // Could be valid overnight shift, but worth warning about
    return {
      valid: false,
      error: "End time must be after start time (or indicate an overnight shift)",
    };
  }

  return { valid: true };
}

/**
 * Check for overlapping time ranges
 * Used to prevent duplicate shifts on the same day
 */
export function hasOverlappingRanges(
  ranges: Array<{ startTime: string; endTime: string }>
): boolean {
  for (let i = 0; i < ranges.length; i++) {
    for (let j = i + 1; j < ranges.length; j++) {
      const range1 = ranges[i];
      const range2 = ranges[j];

      if (
        isTimeInRange(range2.startTime, range1.startTime, range1.endTime) ||
        isTimeInRange(range1.startTime, range2.startTime, range2.endTime)
      ) {
        return true;
      }
    }
  }

  return false;
}
