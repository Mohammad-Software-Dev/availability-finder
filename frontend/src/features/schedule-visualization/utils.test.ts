import { describe, expect, it } from "vitest";
import type { AvailabilityResponse, PersonWithEvents } from "@/types";
import {
  buildVisualizationModel,
  computeDensityBuckets,
  getIntervalAriaLabel,
  getScaleX,
  normalizeDomain,
  parseTimeString,
} from "./utils";

const people: PersonWithEvents[] = [
  {
    id: "alice",
    name: "Alice Johnson",
    workingHours: { start: "09:00", end: "17:00" },
    events: [
      {
        id: "a1",
        title: "Standup",
        start: "10:00",
        end: "10:30",
        isValid: true,
        invalidReason: null,
      },
      {
        id: "m1",
        title: "Follow-up",
        start: "15:00",
        end: null,
        isValid: false,
        invalidReason: "missing_time",
      },
    ],
  },
  {
    id: "bob",
    name: "Bob Smith",
    workingHours: { start: "10:00", end: "18:00" },
    events: [
      {
        id: "b1",
        title: "Planning",
        start: "11:00",
        end: "12:00",
        isValid: true,
        invalidReason: null,
      },
    ],
  },
];

const availability: AvailabilityResponse = {
  durationMinutes: 60,
  stepMinutes: 15,
  attendees: ["alice", "bob"],
  commonWorkingWindow: { start: "10:00", end: "17:00" },
  slots: [{ start: "13:00", end: "14:00" }],
  warnings: [],
};

describe("schedule visualization utilities", () => {
  it("parses time strings into minutes", () => {
    expect(parseTimeString("10:15")).toBe(615);
    expect(parseTimeString("25:00")).toBeNull();
  });

  it("derives the visible domain from working hours and results", () => {
    expect(normalizeDomain(people, availability)).toEqual({
      start: 9 * 60,
      end: 18 * 60,
    });
  });

  it("maps minutes to normalized x coordinates", () => {
    const x = getScaleX(12 * 60, { start: 9 * 60, end: 18 * 60 }, 900);
    expect(x).toBe(300);
  });

  it("builds rows with busy intervals, marker-only invalid events, and fresh result overlays", () => {
    const model = buildVisualizationModel(people, availability, false);

    expect(model.rows).toHaveLength(2);
    expect(model.rows[0].busyIntervals[0]?.label).toBe("Standup");
    expect(model.rows[0].invalidMarkers[0]?.label).toBe("Follow-up");
    expect(model.sharedWindow).not.toBeNull();
    expect(model.slots).toHaveLength(1);
  });

  it("suppresses shared window and slot overlays when results are stale", () => {
    const model = buildVisualizationModel(people, availability, true);

    expect(model.sharedWindow).toBeNull();
    expect(model.slots).toEqual([]);
  });

  it("computes density buckets and accessible labels", () => {
    const model = buildVisualizationModel(people, availability, false);
    const buckets = computeDensityBuckets(model.rows, model.domain);

    expect(buckets.length).toBeGreaterThan(0);
    expect(model.strongestOverlap?.availableCount).toBeGreaterThan(0);
    expect(getIntervalAriaLabel(model.rows[0].busyIntervals[0]!)).toBe(
      "Alice Johnson busy from 10:00 to 10:30",
    );
  });
});
