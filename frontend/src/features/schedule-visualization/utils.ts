import type {
  AvailabilityResponse,
  InvalidReason,
  PersonEvent,
  PersonWithEvents,
} from "@/types";
import type {
  ScheduleVisualizationModel,
  TimelineDensityBucket,
  TimelineDomain,
  TimelineInterval,
  TimelineMarker,
  TimelineRow,
  TimelineStrongestOverlap,
} from "./types";

const DEFAULT_DOMAIN: TimelineDomain = {
  start: 8 * 60,
  end: 18 * 60,
};

const DENSITY_BUCKET_MINUTES = 15;

function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
}

export function parseTimeString(value: string | null | undefined): number | null {
  if (!value) return null;

  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }

  return hours * 60 + minutes;
}

export function normalizeDomain(
  people: PersonWithEvents[],
  availability: AvailabilityResponse | null,
): TimelineDomain {
  const starts: number[] = [];
  const ends: number[] = [];

  for (const person of people) {
    const start = parseTimeString(person.workingHours.start);
    const end = parseTimeString(person.workingHours.end);

    if (start !== null) starts.push(start);
    if (end !== null) ends.push(end);
  }

  const sharedStart = parseTimeString(availability?.commonWorkingWindow?.start);
  const sharedEnd = parseTimeString(availability?.commonWorkingWindow?.end);

  if (sharedStart !== null) starts.push(sharedStart);
  if (sharedEnd !== null) ends.push(sharedEnd);

  for (const slot of availability?.slots ?? []) {
    const start = parseTimeString(slot.start);
    const end = parseTimeString(slot.end);

    if (start !== null) starts.push(start);
    if (end !== null) ends.push(end);
  }

  if (starts.length === 0 || ends.length === 0) {
    return DEFAULT_DOMAIN;
  }

  const minStart = Math.min(...starts);
  const maxEnd = Math.max(...ends);
  const paddedStart = Math.max(0, Math.floor(minStart / 60) * 60);
  const paddedEnd = Math.min(24 * 60, Math.ceil(maxEnd / 60) * 60);

  if (paddedStart >= paddedEnd) {
    return DEFAULT_DOMAIN;
  }

  return {
    start: paddedStart,
    end: paddedEnd,
  };
}

function clipInterval(
  start: number,
  end: number,
  boundary: TimelineDomain,
): { start: number; end: number } | null {
  const clippedStart = Math.max(start, boundary.start);
  const clippedEnd = Math.min(end, boundary.end);

  if (clippedStart >= clippedEnd) return null;

  return {
    start: clippedStart,
    end: clippedEnd,
  };
}

function mergeIntervals(
  intervals: Array<{ start: number; end: number }>,
): Array<{ start: number; end: number }> {
  if (intervals.length === 0) return [];

  const sorted = [...intervals].sort((left, right) => left.start - right.start);
  const merged: Array<{ start: number; end: number }> = [];

  for (const current of sorted) {
    const last = merged[merged.length - 1];

    if (!last) {
      merged.push({ ...current });
      continue;
    }

    if (current.start <= last.end) {
      last.end = Math.max(last.end, current.end);
      continue;
    }

    merged.push({ ...current });
  }

  return merged;
}

export function getScaleX(
  minutes: number,
  domain: TimelineDomain,
  width: number,
): number {
  const duration = domain.end - domain.start;

  if (duration <= 0) return 0;

  return ((minutes - domain.start) / duration) * width;
}

function formatInvalidReason(reason: InvalidReason | null): string {
  switch (reason) {
    case "missing_time":
      return "missing time";
    case "invalid_interval":
      return "invalid interval";
    case "outside_working_hours":
      return "outside working hours";
    default:
      return "invalid event";
  }
}

export function getIntervalAriaLabel(interval: TimelineInterval): string {
  switch (interval.kind) {
    case "busy":
      return `${interval.participantName ?? "Participant"} busy from ${minutesToTime(interval.start)} to ${minutesToTime(interval.end)}`;
    case "slot":
      return `Available slot from ${minutesToTime(interval.start)} to ${minutesToTime(interval.end)}`;
    case "shared":
      return `Shared working window from ${minutesToTime(interval.start)} to ${minutesToTime(interval.end)}`;
    case "working":
      return `${interval.participantName ?? "Participant"} working hours from ${minutesToTime(interval.start)} to ${minutesToTime(interval.end)}`;
    case "invalid":
      return `${interval.participantName ?? "Participant"} invalid event, ${formatInvalidReason(interval.invalidReason ?? null)}, from ${minutesToTime(interval.start)} to ${minutesToTime(interval.end)}`;
    case "free":
      return `${interval.participantName ?? "Participant"} free from ${minutesToTime(interval.start)} to ${minutesToTime(interval.end)}`;
    default:
      return interval.label;
  }
}

function getMarkerAriaLabel(
  participantName: string,
  event: PersonEvent,
): string {
  return `${participantName} invalid event, ${formatInvalidReason(event.invalidReason)}, ${event.title ?? "Untitled event"}`;
}

function getEventLabel(event: PersonEvent): string {
  return event.title ?? "Untitled event";
}

function buildRow(
  person: PersonWithEvents,
  domain: TimelineDomain,
): TimelineRow {
  const workingStart = parseTimeString(person.workingHours.start);
  const workingEnd = parseTimeString(person.workingHours.end);
  const workingHours =
    workingStart !== null && workingEnd !== null
      ? clipInterval(workingStart, workingEnd, domain)
      : null;

  const busyIntervals: TimelineInterval[] = [];
  const invalidIntervals: TimelineInterval[] = [];
  const invalidMarkers: TimelineMarker[] = [];

  for (const event of person.events) {
    const start = parseTimeString(event.start);
    const end = parseTimeString(event.end);
    const label = getEventLabel(event);

    if (event.isValid && start !== null && end !== null) {
      const clipped = clipInterval(start, end, domain);

      if (!clipped) continue;

      const interval: TimelineInterval = {
        id: event.id,
        kind: "busy",
        start: clipped.start,
        end: clipped.end,
        label,
        participantId: person.id,
        participantName: person.name,
        ariaLabel: "",
      };

      interval.ariaLabel = getIntervalAriaLabel(interval);
      busyIntervals.push(interval);
      continue;
    }

    if (!event.isValid && start !== null && end !== null) {
      const normalizedStart = Math.min(start, end);
      const normalizedEnd = Math.max(start, end);
      const clipped = clipInterval(normalizedStart, normalizedEnd, domain);

      if (!clipped) {
        invalidMarkers.push({
          id: event.id,
          label,
          ariaLabel: getMarkerAriaLabel(person.name, event),
          participantId: person.id,
          participantName: person.name,
          invalidReason: event.invalidReason,
        });
        continue;
      }

      const interval: TimelineInterval = {
        id: event.id,
        kind: "invalid",
        start: clipped.start,
        end: clipped.end,
        label,
        participantId: person.id,
        participantName: person.name,
        invalidReason: event.invalidReason,
        ariaLabel: "",
      };

      interval.ariaLabel = getIntervalAriaLabel(interval);
      invalidIntervals.push(interval);
      continue;
    }

    invalidMarkers.push({
      id: event.id,
      label,
      ariaLabel: getMarkerAriaLabel(person.name, event),
      participantId: person.id,
      participantName: person.name,
      invalidReason: event.invalidReason,
    });
  }

  const workingInterval =
    workingHours !== null
      ? ({
          id: `${person.id}-working`,
          kind: "working",
          start: workingHours.start,
          end: workingHours.end,
          label: "Working hours",
          participantId: person.id,
          participantName: person.name,
          ariaLabel: "",
        } satisfies TimelineInterval)
      : null;

  if (workingInterval) {
    workingInterval.ariaLabel = getIntervalAriaLabel(workingInterval);
  }

  const mergedBusy = mergeIntervals(
    busyIntervals.map((interval) => ({
      start: interval.start,
      end: interval.end,
    })),
  );

  const freeIntervals: TimelineInterval[] = [];

  if (workingHours) {
    let cursor = workingHours.start;

    for (const interval of mergedBusy) {
      if (cursor < interval.start) {
        const freeInterval: TimelineInterval = {
          id: `${person.id}-free-${cursor}`,
          kind: "free",
          start: cursor,
          end: interval.start,
          label: "Free time",
          participantId: person.id,
          participantName: person.name,
          ariaLabel: "",
        };
        freeInterval.ariaLabel = getIntervalAriaLabel(freeInterval);
        freeIntervals.push(freeInterval);
      }

      cursor = Math.max(cursor, interval.end);
    }

    if (cursor < workingHours.end) {
      const freeInterval: TimelineInterval = {
        id: `${person.id}-free-${cursor}`,
        kind: "free",
        start: cursor,
        end: workingHours.end,
        label: "Free time",
        participantId: person.id,
        participantName: person.name,
        ariaLabel: "",
      };
      freeInterval.ariaLabel = getIntervalAriaLabel(freeInterval);
      freeIntervals.push(freeInterval);
    }
  }

  return {
    participantId: person.id,
    participantName: person.name,
    workingHours: workingInterval,
    freeIntervals,
    busyIntervals,
    invalidIntervals,
    invalidMarkers,
  };
}

export function computeDensityBuckets(
  rows: TimelineRow[],
  domain: TimelineDomain,
): TimelineDensityBucket[] {
  const buckets: TimelineDensityBucket[] = [];

  for (
    let start = domain.start;
    start < domain.end;
    start += DENSITY_BUCKET_MINUTES
  ) {
    const end = Math.min(start + DENSITY_BUCKET_MINUTES, domain.end);
    let availableCount = 0;

    for (const row of rows) {
      const isAvailable = row.freeIntervals.some(
        (interval) => interval.start < end && interval.end > start,
      );

      if (isAvailable) {
        availableCount += 1;
      }
    }

    buckets.push({
      id: `bucket-${start}`,
      start,
      end,
      availableCount,
      totalCount: rows.length,
    });
  }

  return buckets;
}

export function findStrongestOverlap(
  buckets: TimelineDensityBucket[],
): TimelineStrongestOverlap | null {
  if (buckets.length === 0) return null;

  let strongest: TimelineStrongestOverlap | null = null;
  let current: TimelineStrongestOverlap | null = null;

  for (const bucket of buckets) {
    if (!current || bucket.availableCount !== current.availableCount) {
      current = {
        start: bucket.start,
        end: bucket.end,
        availableCount: bucket.availableCount,
      };
    } else {
      current.end = bucket.end;
    }

    if (
      !strongest ||
      current.availableCount > strongest.availableCount ||
      (current.availableCount === strongest.availableCount &&
        current.end - current.start > strongest.end - strongest.start)
    ) {
      strongest = { ...current };
    }
  }

  return strongest && strongest.availableCount > 0 ? strongest : null;
}

export function buildScreenReaderSummary(
  rows: TimelineRow[],
  domain: TimelineDomain,
  sharedWindow: TimelineInterval | null,
  slots: TimelineInterval[],
  strongestOverlap: TimelineStrongestOverlap | null,
): string {
  const parts = [
    `${rows.length} participant${rows.length === 1 ? "" : "s"} selected`,
    `visible schedule from ${minutesToTime(domain.start)} to ${minutesToTime(domain.end)}`,
  ];

  if (sharedWindow) {
    parts.push(
      `shared working window from ${minutesToTime(sharedWindow.start)} to ${minutesToTime(sharedWindow.end)}`,
    );
  } else {
    parts.push("no shared working window");
  }

  parts.push(
    `${slots.length} available slot${slots.length === 1 ? "" : "s"} highlighted`,
  );

  if (strongestOverlap) {
    parts.push(
      `strongest overlap from ${minutesToTime(strongestOverlap.start)} to ${minutesToTime(strongestOverlap.end)} with ${strongestOverlap.availableCount} participant${strongestOverlap.availableCount === 1 ? "" : "s"} available`,
    );
  }

  return `${parts.join(". ")}.`;
}

export function buildVisualizationModel(
  people: PersonWithEvents[],
  availability: AvailabilityResponse | null,
  isStale: boolean,
): ScheduleVisualizationModel {
  const domain = normalizeDomain(people, availability);
  const rows = people.map((person) => buildRow(person, domain));
  const hasFreshResults = availability !== null && !isStale;

  const sharedWindow =
    hasFreshResults && availability?.commonWorkingWindow
      ? (() => {
          const start = parseTimeString(availability.commonWorkingWindow.start);
          const end = parseTimeString(availability.commonWorkingWindow.end);

          if (start === null || end === null) return null;

          const clipped = clipInterval(start, end, domain);
          if (!clipped) return null;

          const interval: TimelineInterval = {
            id: "shared-window",
            kind: "shared",
            start: clipped.start,
            end: clipped.end,
            label: "Shared working window",
            ariaLabel: "",
          };

          interval.ariaLabel = getIntervalAriaLabel(interval);
          return interval;
        })()
      : null;

  const slots =
    hasFreshResults && availability
      ? availability.slots
          .map((slot, index) => {
            const start = parseTimeString(slot.start);
            const end = parseTimeString(slot.end);

            if (start === null || end === null) return null;

            const clipped = clipInterval(start, end, domain);
            if (!clipped) return null;

            const interval: TimelineInterval = {
              id: `slot-${index}`,
              kind: "slot",
              start: clipped.start,
              end: clipped.end,
              label: "Available slot",
              ariaLabel: "",
            };

            interval.ariaLabel = getIntervalAriaLabel(interval);
            return interval;
          })
          .filter((slot): slot is TimelineInterval => slot !== null)
      : [];

  const density = computeDensityBuckets(rows, domain);
  const strongestOverlap = findStrongestOverlap(density);

  return {
    domain,
    rows,
    sharedWindow,
    slots,
    density,
    strongestOverlap,
    srSummary: buildScreenReaderSummary(
      rows,
      domain,
      sharedWindow,
      slots,
      strongestOverlap,
    ),
    hasFreshResults,
  };
}
