import { availableDates, people } from "../../data/seed.js";
import { assertAvailableDate } from "../../shared/utils/planningDates.js";
import {
  type InvalidReason,
  normalizePersonCalendar,
} from "../../shared/utils/personSchedule.js";

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

export function getAvailableDates(): string[] {
  return [...availableDates];
}

export function getAllPeople(date: string): PersonWithEvents[] {
  assertAvailableDate(date);

  return people.map((person) => {
    const { events: personEvents } = normalizePersonCalendar(person, date);

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
      ({
        clippedInterval: _clippedInterval,
        sourceIndex: _sourceIndex,
        startMinutes: _startMinutes,
        ...event
      }) => event,
    );

    return {
      id: person.id,
      name: person.name,
      workingHours: person.workingHours,
      events,
    };
  });
}
