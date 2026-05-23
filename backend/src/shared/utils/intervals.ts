import { Interval } from "../types/common.js";

export function clipInterval(
  interval: Interval,
  boundary: Interval,
): Interval | null {
  const start = Math.max(interval.start, boundary.start);
  const end = Math.min(interval.end, boundary.end);

  if (start >= end) return null;

  return { start, end };
}

export function mergeIntervals(intervals: Interval[]): Interval[] {
  if (intervals.length === 0) return [];

  const sorted = [...intervals].sort((a, b) => a.start - b.start);

  const merged: Interval[] = [];

  for (const current of sorted) {
    const last = merged[merged.length - 1];

    if (!last) {
      merged.push({ ...current });
      continue;
    }
    if (current.start <= last.end) {
      last.end = Math.max(last.end, current.end);
    } else {
      merged.push({ ...current });
    }
  }
  return merged;
}

export function findFreeWindows(
  busyIntervals: Interval[], // already sorted and merged
  workingWindow: Interval,
): Interval[] {
  const freeWindows: Interval[] = [];

  let cursor = workingWindow.start;

  for (const busy of busyIntervals) {
    if (cursor < busy.start) {
      freeWindows.push({ start: cursor, end: busy.start });
    }
    cursor = Math.max(cursor, busy.end);
  }
  if (cursor < workingWindow.end) {
    freeWindows.push({ start: cursor, end: workingWindow.end });
  }
  return freeWindows;
}

export function generateSlots(
  freeWindows: Interval[],
  durationMinutes: number,
  stepMinutes: number,
): Interval[] {
  const slots: Interval[] = [];

  for (const window of freeWindows) {
    for (
      let start = window.start;
      start + durationMinutes <= window.end;
      start += stepMinutes
    ) {
      slots.push({
        start,
        end: start + durationMinutes,
      });
    }
  }

  return slots;
}
