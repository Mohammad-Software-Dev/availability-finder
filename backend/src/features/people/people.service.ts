import { availableDates, calendarEvents, people } from "../../data/seed.js";
import { AppError } from "../../shared/errors/AppError.js";
import { clipInterval } from "../../shared/utils/intervals.js";
import {
  formatMinutesToTime,
  isValidInterval,
  parseTimeToMinutes,
} from "../../shared/utils/time.js";

export type InvalidReason =
  | "missing_time"
  | "invalid_interval"
  | "outside_working_hours";

export type PersonEventView = {
  id: string;
  title: string | null;
  start: string | null;
  end: string | null;
  isValid: boolean;
  invalidReason: InvalidReason | null;
};

export type PersonWithEvents = {
  id: string;
  name: string;
  workingHours: {
    start: string;
    end: string;
  };
  events: PersonEventView[];
};

function assertAvailableDate(date: string) {
  if (!availableDates.includes(date as (typeof availableDates)[number])) {
    throw new AppError(`Unknown planning date: ${date}`, 400);
  }
}

type EventWithOrder = PersonEventView & {
  sourceIndex: number;
  startMinutes: number | null;
};

function classifyEvent(
  event: (typeof calendarEvents)[number],
  sourceIndex: number,
  workingStart: number,
  workingEnd: number,
): EventWithOrder {
  const startMinutes = parseTimeToMinutes(event.start);
  const endMinutes = parseTimeToMinutes(event.end);

  const base = {
    id: event.id,
    title: event.title ?? null,
    start: event.start ?? null,
    end: event.end ?? null,
    sourceIndex,
  };

  if (startMinutes === null || endMinutes === null) {
    return {
      ...base,
      startMinutes,
      isValid: false,
      invalidReason: "missing_time",
    };
  }

  if (!isValidInterval(startMinutes, endMinutes)) {
    return {
      ...base,
      startMinutes,
      isValid: false,
      invalidReason: "invalid_interval",
    };
  }

  const clipped = clipInterval(
    { start: startMinutes, end: endMinutes },
    { start: workingStart, end: workingEnd },
  );

  if (!clipped) {
    return {
      ...base,
      startMinutes,
      isValid: false,
      invalidReason: "outside_working_hours",
    };
  }

  return {
    ...base,
    start: formatMinutesToTime(clipped.start),
    end: formatMinutesToTime(clipped.end),
    startMinutes,
    isValid: true,
    invalidReason: null,
  };
}

export function getAvailableDates(): string[] {
  return [...availableDates];
}

export function getAllPeople(date: string): PersonWithEvents[] {
  assertAvailableDate(date);

  return people.map((person) => {
    const workingStart = parseTimeToMinutes(person.workingHours.start);
    const workingEnd = parseTimeToMinutes(person.workingHours.end);

    if (
      workingStart === null ||
      workingEnd === null ||
      !isValidInterval(workingStart, workingEnd)
    ) {
      throw new Error(`Invalid working hours for ${person.id}`);
    }

    const personEvents = calendarEvents
      .map((event, sourceIndex) => ({ event, sourceIndex }))
      .filter(
        ({ event }) => event.personId === person.id && event.date === date,
      )
      .map(({ event, sourceIndex }) =>
        classifyEvent(event, sourceIndex, workingStart, workingEnd),
      );

    const validEvents = personEvents
      .filter((event) => event.isValid)
      .sort((a, b) => {
        if (a.startMinutes === b.startMinutes) {
          return a.sourceIndex - b.sourceIndex;
        }
        return (a.startMinutes ?? 0) - (b.startMinutes ?? 0);
      });

    const invalidEvents = personEvents.filter((event) => !event.isValid);

    const events: PersonEventView[] = [...validEvents, ...invalidEvents].map(
      ({ sourceIndex: _sourceIndex, startMinutes: _startMinutes, ...event }) =>
        event,
    );

    return {
      id: person.id,
      name: person.name,
      workingHours: person.workingHours,
      events,
    };
  });
}
