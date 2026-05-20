import {
  calendarEvents,
  type SeedCalendarEvent,
  type SeedPerson,
} from "../../data/seed.js";
import type { Interval } from "../types/common.js";
import { clipInterval } from "./intervals.js";
import {
  formatMinutesToTime,
  isValidInterval,
  parseTimeToMinutes,
} from "./time.js";

export type InvalidReason =
  | "missing_time"
  | "invalid_interval"
  | "outside_working_hours";

export type NormalizedCalendarEvent = {
  id: string;
  title: string | null;
  start: string | null;
  end: string | null;
  sourceIndex: number;
  startMinutes: number | null;
  isValid: boolean;
  invalidReason: InvalidReason | null;
  clippedInterval: Interval | null;
};

export type NormalizedPersonCalendar = {
  workingHours: Interval;
  events: NormalizedCalendarEvent[];
};

export function getWorkingHoursInterval(person: SeedPerson): Interval {
  const start = parseTimeToMinutes(person.workingHours.start);
  const end = parseTimeToMinutes(person.workingHours.end);

  if (start === null || end === null || !isValidInterval(start, end)) {
    throw new Error(`Invalid working hours for ${person.id}`);
  }

  return { start, end };
}

export function normalizePersonCalendar(
  person: SeedPerson,
  date: string,
): NormalizedPersonCalendar {
  const workingHours = getWorkingHoursInterval(person);
  const events = getDateScopedEvents(person.id, date).map(({ event, sourceIndex }) =>
    normalizeCalendarEvent(event, sourceIndex, workingHours),
  );

  return { workingHours, events };
}

function getDateScopedEvents(personId: string, date: string) {
  return calendarEvents
    .map((event, sourceIndex) => ({ event, sourceIndex }))
    .filter(({ event }) => event.personId === personId && event.date === date);
}

function normalizeCalendarEvent(
  event: SeedCalendarEvent,
  sourceIndex: number,
  workingHours: Interval,
): NormalizedCalendarEvent {
  const startMinutes = parseTimeToMinutes(event.start);
  const endMinutes = parseTimeToMinutes(event.end);

  const base = {
    id: event.id,
    title: event.title ?? null,
    start: event.start ?? null,
    end: event.end ?? null,
    sourceIndex,
    startMinutes,
  };

  if (startMinutes === null || endMinutes === null) {
    return {
      ...base,
      isValid: false,
      invalidReason: "missing_time",
      clippedInterval: null,
    };
  }

  if (!isValidInterval(startMinutes, endMinutes)) {
    return {
      ...base,
      isValid: false,
      invalidReason: "invalid_interval",
      clippedInterval: null,
    };
  }

  const clippedInterval = clipInterval(
    { start: startMinutes, end: endMinutes },
    workingHours,
  );

  if (!clippedInterval) {
    return {
      ...base,
      isValid: false,
      invalidReason: "outside_working_hours",
      clippedInterval: null,
    };
  }

  return {
    ...base,
    start: formatMinutesToTime(clippedInterval.start),
    end: formatMinutesToTime(clippedInterval.end),
    isValid: true,
    invalidReason: null,
    clippedInterval,
  };
}
