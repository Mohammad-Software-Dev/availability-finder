import type { AvailabilityResponse, InvalidReason, PersonWithEvents } from "@/types";

export type TimelineDomain = {
  start: number;
  end: number;
};

export type TimelineIntervalKind =
  | "working"
  | "free"
  | "busy"
  | "invalid"
  | "slot"
  | "shared";

export type TimelineInterval = {
  id: string;
  kind: TimelineIntervalKind;
  start: number;
  end: number;
  label: string;
  ariaLabel: string;
  participantId?: string;
  participantName?: string;
  invalidReason?: InvalidReason | null;
};

export type TimelineMarker = {
  id: string;
  label: string;
  ariaLabel: string;
  participantId: string;
  participantName: string;
  invalidReason: InvalidReason | null;
};

export type TimelineRow = {
  participantId: string;
  participantName: string;
  workingHours: TimelineInterval | null;
  freeIntervals: TimelineInterval[];
  busyIntervals: TimelineInterval[];
  invalidIntervals: TimelineInterval[];
  invalidMarkers: TimelineMarker[];
};

export type TimelineDensityBucket = {
  id: string;
  start: number;
  end: number;
  availableCount: number;
  totalCount: number;
};

export type TimelineTooltipData = {
  id: string;
  text: string;
  x: number;
  y: number;
};

export type TimelineStrongestOverlap = {
  start: number;
  end: number;
  availableCount: number;
};

export type ScheduleVisualizationModel = {
  domain: TimelineDomain;
  rows: TimelineRow[];
  sharedWindow: TimelineInterval | null;
  slots: TimelineInterval[];
  density: TimelineDensityBucket[];
  strongestOverlap: TimelineStrongestOverlap | null;
  srSummary: string;
  hasFreshResults: boolean;
};

export type ScheduleVisualizationProps = {
  people: PersonWithEvents[];
  availability: AvailabilityResponse | null;
  isStale: boolean;
};
