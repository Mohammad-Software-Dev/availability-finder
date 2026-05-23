import { people, type SeedPerson } from "../../data/seed.js";
import { AppError } from "../../shared/errors/AppError.js";
import { Interval } from "../../shared/types/common.js";
import {
  mergeIntervals,
  findFreeWindows,
  generateSlots,
} from "../../shared/utils/intervals.js";
import { assertAvailableDate } from "../../shared/utils/planningDates.js";
import {
  normalizePersonCalendar,
  type NormalizedCalendarEvent,
} from "../../shared/utils/personSchedule.js";
import { formatMinutesToTime } from "../../shared/utils/time.js";
import type { AvailabilityRequestInput } from "./availability.schemas.js";
import { AvailabilityResponse } from "./availability.types.js";

type NormalizedPersonAvailability = {
  personId: string;
  name: string;
  workingHours: Interval;
  busyIntervals: Interval[];
  warnings: string[];
};

function normalizePersonAvailability(
  person: SeedPerson,
  date: string,
): NormalizedPersonAvailability {
  const { workingHours, events } = normalizePersonCalendar(person, date);
  const warnings = events
    .filter((event) => !event.isValid)
    .map((event) => toAvailabilityWarning(person.name, event));
  const mergedBusy = mergeIntervals(
    events.flatMap((event) =>
      event.isValid && event.clippedInterval ? [event.clippedInterval] : [],
    ),
  );

  return {
    personId: person.id,
    name: person.name,
    workingHours,
    busyIntervals: mergedBusy,
    warnings,
  };
}

function getCommonWorkingWindow(
  people: NormalizedPersonAvailability[],
): Interval | null {
  if (people.length === 0) return null;

  let start = people[0].workingHours.start;
  let end = people[0].workingHours.end;

  for (let i = 1; i < people.length; i++) {
    const current = people[i].workingHours;

    start = Math.max(start, current.start);
    end = Math.min(end, current.end);
  }

  if (start >= end) {
    return null;
  }

  return { start, end };
}

function collectBusyIntervals(
  people: NormalizedPersonAvailability[],
  commonWindow: Interval,
): Interval[] {
  const allBusy: Interval[] = [];

  for (const person of people) {
    for (const interval of person.busyIntervals) {
      const clipped = {
        start: Math.max(interval.start, commonWindow.start),
        end: Math.min(interval.end, commonWindow.end),
      };

      if (clipped.start < clipped.end) {
        allBusy.push(clipped);
      }
    }
  }
  return mergeIntervals(allBusy);
}

function resolveSelectedPeople(personIds: string[]): SeedPerson[] {
  const peopleById = new Map(people.map((person) => [person.id, person]));
  const selectedPeople: SeedPerson[] = [];
  const missingIds: string[] = [];

  for (const personId of personIds) {
    const person = peopleById.get(personId);

    if (!person) {
      missingIds.push(personId);
      continue;
    }

    selectedPeople.push(person);
  }

  if (missingIds.length > 0) {
    const label = missingIds.length === 1 ? "id" : "ids";

    throw new AppError(
      `Unknown participant ${label}: ${missingIds.join(", ")}`,
      400,
    );
  }

  return selectedPeople;
}

function normalizePeopleWithWarnings(
  selectedPeople: SeedPerson[],
  date: string,
): { normalizedPeople: NormalizedPersonAvailability[]; warnings: string[] } {
  const warningsSet = new Set<string>();
  const normalizedPeople = selectedPeople.map((person) => {
    const result = normalizePersonAvailability(person, date);

    for (const warning of result.warnings) {
      warningsSet.add(warning);
    }

    return result;
  });

  return {
    normalizedPeople,
    warnings: Array.from(warningsSet),
  };
}

function toAvailabilityWarning(
  personName: string,
  event: NormalizedCalendarEvent,
): string {
  switch (event.invalidReason) {
    case "missing_time":
      return `${personName}: skipped invalid event (missing/invalid time)`;
    case "invalid_interval":
      return `${personName}: skipped invalid interval (start >= end)`;
    case "outside_working_hours":
      return `${personName}: skipped event outside working hours`;
    default:
      return `${personName}: skipped invalid event`;
  }
}

export function getAvailability(
  input: AvailabilityRequestInput,
): AvailabilityResponse {
  const { date, durationMinutes, personIds, stepMinutes } = input;
  assertAvailableDate(date);
  const selectedPeople = resolveSelectedPeople(personIds);
  const { normalizedPeople, warnings } = normalizePeopleWithWarnings(
    selectedPeople,
    date,
  );

  const commonWindow = getCommonWorkingWindow(normalizedPeople);

  if (!commonWindow) {
    return {
      durationMinutes,
      stepMinutes,
      attendees: personIds,
      commonWorkingWindow: null,
      slots: [],
      warnings: [...warnings, "No common working window"],
    };
  }

  const globalBusy = collectBusyIntervals(normalizedPeople, commonWindow);

  const freeWindows = findFreeWindows(globalBusy, commonWindow);

  const slots = generateSlots(freeWindows, durationMinutes, stepMinutes);

  const formattedSlots = slots.map((slot) => ({
    start: formatMinutesToTime(slot.start),
    end: formatMinutesToTime(slot.end),
  }));

  return {
    durationMinutes,
    stepMinutes,
    attendees: personIds,
    commonWorkingWindow: {
      start: formatMinutesToTime(commonWindow.start),
      end: formatMinutesToTime(commonWindow.end),
    },
    slots: formattedSlots,
    warnings,
  };
}
