import {
  availableDates,
  calendarEvents,
  people,
  SeedPerson,
} from "../../data/seed.js";
import { AppError } from "../../shared/errors/AppError.js";
import { Interval } from "../../shared/types/common.js";
import {
  clipInterval,
  mergeIntervals,
  findFreeWindows,
  generateSlots,
} from "../../shared/utils/intervals.js";
import {
  formatMinutesToTime,
  isValidInterval,
  parseTimeToMinutes,
} from "../../shared/utils/time.js";
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
  const warnings: string[] = [];

  // Parse working hours
  const start = parseTimeToMinutes(person.workingHours.start);
  const end = parseTimeToMinutes(person.workingHours.end);

  if (start === null || end === null || !isValidInterval(start, end)) {
    throw new Error(`Invalid working hours for ${person.id}`);
  }

  const workingHours: Interval = { start, end };

  // Get events for this person
  const events = calendarEvents.filter(
    (event) => event.personId === person.id && event.date === date,
  );

  const busyIntervals: Interval[] = [];

  for (const event of events) {
    const start = parseTimeToMinutes(event.start);
    const end = parseTimeToMinutes(event.end);

    // Skip invalid time format
    if (start === null || end === null) {
      warnings.push(
        `${person.name}: skipped invalid event (missing/invalid time)`,
      );
      continue;
    }

    // Skip invalid intervals
    if (!isValidInterval(start, end)) {
      warnings.push(`${person.name}: skipped invalid interval (start >= end)`);
      continue;
    }

    const clipped = clipInterval({ start, end }, workingHours);

    // Skip if outside working hours
    if (!clipped) {
      warnings.push(`${person.name}: skipped event outside working hours`);
      continue;
    }

    busyIntervals.push(clipped);
  }

  // Merge intervals
  const mergedBusy = mergeIntervals(busyIntervals);

  return {
    personId: person.id,
    name: person.name,
    workingHours,
    busyIntervals: mergedBusy,
    warnings,
  };
}

function assertAvailableDate(date: string) {
  if (!availableDates.includes(date as (typeof availableDates)[number])) {
    throw new AppError(`Unknown planning date: ${date}`, 400);
  }
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
    return null; // no overlap
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
      const clipped = clipInterval(interval, commonWindow);

      if (clipped) {
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

export function getAvailability(
  input: AvailabilityRequestInput,
): AvailabilityResponse {
  const { date, durationMinutes, personIds } = input;
  const { stepMinutes } = input;
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
