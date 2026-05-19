import { describe, expect, it, vi } from "vitest";
import { people } from "../../data/seed.js";
import { AppError } from "../../shared/errors/AppError.js";
import { errorHandler } from "../../shared/errors/errorHandler.js";
import { handleGetAvailability } from "./availability.controller.js";
import { availabilityRequestSchema } from "./availability.schemas.js";
import { getAvailability } from "./availability.service.js";

describe("getAvailability", () => {
  it("returns deterministic slots for Alice + Bob with defaults", () => {
    const result = getAvailability(
      availabilityRequestSchema.parse({
        date: "2026-05-18",
        personIds: ["alice", "bob"],
        durationMinutes: 30,
      }),
    );

    expect(result.durationMinutes).toBe(30);
    expect(result.stepMinutes).toBe(15);
    expect(result.attendees).toEqual(["alice", "bob"]);
    expect(result.commonWorkingWindow).toEqual({ start: "10:00", end: "17:00" });
    expect(result.slots).toEqual([
      { start: "10:30", end: "11:00" },
      { start: "13:00", end: "13:30" },
      { start: "13:15", end: "13:45" },
      { start: "13:30", end: "14:00" },
      { start: "16:00", end: "16:30" },
      { start: "16:15", end: "16:45" },
      { start: "16:30", end: "17:00" },
    ]);
    expect(result.warnings).toEqual(
      expect.arrayContaining([
        "Alice Johnson: skipped invalid event (missing/invalid time)",
        "Bob Smith: skipped invalid event (missing/invalid time)",
      ]),
    );
  });

  it("preserves requested attendee order in the response", () => {
    const result = getAvailability(
      availabilityRequestSchema.parse({
        date: "2026-05-18",
        personIds: ["bob", "alice"],
        durationMinutes: 30,
      }),
    );

    expect(result.attendees).toEqual(["bob", "alice"]);
  });

  it("returns exactly one 60-minute slot when everyone is selected", () => {
    const result = getAvailability(
      availabilityRequestSchema.parse({
        date: "2026-05-18",
        personIds: ["alice", "bob", "charlie", "diana", "edward", "fatima"],
        durationMinutes: 60,
      }),
    );

    expect(result.commonWorkingWindow).toEqual({ start: "11:00", end: "16:00" });
    expect(result.slots).toEqual([{ start: "13:00", end: "14:00" }]);
  });

  it("rejects unknown users instead of computing partial availability", () => {
    expect(() =>
      getAvailability(
        availabilityRequestSchema.parse({
          date: "2026-05-18",
          personIds: ["alice", "ghost-user"],
          durationMinutes: 30,
        }),
      ),
    ).toThrowError(
      new AppError("Unknown participant id: ghost-user", 400),
    );
  });

  it("returns no common working window when selected schedules do not overlap", () => {
    people.push(
      {
        id: "test-early",
        name: "Test Early",
        workingHours: { start: "06:00", end: "08:00" },
      },
      {
        id: "test-late",
        name: "Test Late",
        workingHours: { start: "18:00", end: "20:00" },
      },
    );

    try {
      const result = getAvailability(
        availabilityRequestSchema.parse({
          date: "2026-05-18",
          personIds: ["test-early", "test-late"],
          durationMinutes: 30,
        }),
      );

      expect(result.commonWorkingWindow).toBeNull();
      expect(result.slots).toEqual([]);
      expect(result.warnings).toEqual(["No common working window"]);
    } finally {
      people.splice(
        people.findIndex((p) => p.id === "test-early"),
        1,
      );
      people.splice(
        people.findIndex((p) => p.id === "test-late"),
        1,
      );
    }
  });

  it("uses the schema default for step minutes before calling the service", () => {
    const input = availabilityRequestSchema.parse({
      date: "2026-05-18",
      personIds: ["alice", "bob"],
      durationMinutes: 30,
    });

    expect(input.stepMinutes).toBe(15);
    expect(getAvailability(input).stepMinutes).toBe(15);
  });

  it("uses an explicit step value from parsed input", () => {
    const input = availabilityRequestSchema.parse({
      date: "2026-05-18",
      personIds: ["alice", "bob"],
      durationMinutes: 30,
      stepMinutes: 20,
    });

    expect(getAvailability(input).stepMinutes).toBe(20);
  });

  it("rejects duplicate participant ids at the validation boundary", () => {
    expect(() =>
      availabilityRequestSchema.parse({
        date: "2026-05-18",
        personIds: ["alice", "alice"],
        durationMinutes: 30,
      }),
    ).toThrowError();
  });

  it("rejects whitespace-only participant ids at the validation boundary", () => {
    expect(() =>
      availabilityRequestSchema.parse({
        date: "2026-05-18",
        personIds: ["   "],
        durationMinutes: 30,
      }),
    ).toThrowError();
  });

  it("rejects invalid step minutes at the validation boundary", () => {
    expect(() =>
      availabilityRequestSchema.parse({
        date: "2026-05-18",
        personIds: ["alice"],
        durationMinutes: 30,
        stepMinutes: 0,
      }),
    ).toThrowError();
  });

  it("rejects invalid duration at the validation boundary", () => {
    expect(() =>
      availabilityRequestSchema.parse({
        date: "2026-05-18",
        personIds: ["alice"],
        durationMinutes: 0,
      }),
    ).toThrowError();
  });

  it("uses only events from the requested date", () => {
    const result = getAvailability(
      availabilityRequestSchema.parse({
        date: "2026-05-19",
        personIds: ["alice", "bob"],
        durationMinutes: 30,
      }),
    );

    expect(result.commonWorkingWindow).toEqual({ start: "10:00", end: "17:00" });
    expect(result.slots).toEqual([
      { start: "11:00", end: "11:30" },
      { start: "11:15", end: "11:45" },
      { start: "11:30", end: "12:00" },
      { start: "11:45", end: "12:15" },
      { start: "12:00", end: "12:30" },
      { start: "12:15", end: "12:45" },
      { start: "12:30", end: "13:00" },
      { start: "14:00", end: "14:30" },
      { start: "15:30", end: "16:00" },
      { start: "15:45", end: "16:15" },
      { start: "16:00", end: "16:30" },
      { start: "16:15", end: "16:45" },
      { start: "16:30", end: "17:00" },
    ]);
    expect(result.warnings).toEqual([
      "Alice Johnson: skipped invalid event (missing/invalid time)",
    ]);
  });

  it("rejects unsupported planning dates", () => {
    expect(() =>
      getAvailability(
        availabilityRequestSchema.parse({
          date: "2026-05-30",
          personIds: ["alice"],
          durationMinutes: 30,
        }),
      ),
    ).toThrowError(new AppError("Unknown planning date: 2026-05-30", 400));
  });
});

describe("availability controller", () => {
  it("returns 200 with a valid request payload", () => {
    const req = {
      body: {
        date: "2026-05-18",
        personIds: ["alice", "bob"],
        durationMinutes: 30,
      },
    } as any;
    let statusCode = 0;
    let jsonBody: unknown;
    const res = {
      status(code: number) {
        statusCode = code;
        return this;
      },
      json(payload: unknown) {
        jsonBody = payload;
        return this;
      },
    } as any;

    handleGetAvailability(req, res, vi.fn());

    expect(statusCode).toBe(200);
    expect(jsonBody).toEqual(
      expect.objectContaining({
        durationMinutes: 30,
        stepMinutes: 15,
        attendees: ["alice", "bob"],
        commonWorkingWindow: expect.any(Object),
        slots: expect.any(Array),
        warnings: expect.any(Array),
      }),
    );
  });

  it("passes validation errors to next", () => {
    const req = {
      body: {
        date: "2026-05-18",
        personIds: [],
        durationMinutes: 0,
      },
    } as any;
    const res = {} as any;
    const next = vi.fn();

    handleGetAvailability(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });
});

describe("error handler", () => {
  it("returns 400 for validation errors", () => {
    let statusCode = 0;
    let jsonBody: unknown;
    const res = {
      status(code: number) {
        statusCode = code;
        return this;
      },
      json(payload: unknown) {
        jsonBody = payload;
        return this;
      },
    } as any;

    handleGetAvailability(
      {
        body: {
          date: "2026-05-18",
          personIds: [],
          durationMinutes: 0,
        },
      } as any,
      res,
      (error: unknown) => errorHandler(error as any, {} as any, res, vi.fn()),
    );

    expect(statusCode).toBe(400);
    expect(jsonBody).toEqual(
      expect.objectContaining({
        message: "Invalid request",
        error: expect.any(String),
      }),
    );
  });

  it("returns 400 when no people are selected", () => {
    let statusCode = 0;
    let jsonBody: unknown;
    const res = {
      status(code: number) {
        statusCode = code;
        return this;
      },
      json(payload: unknown) {
        jsonBody = payload;
        return this;
      },
    } as any;

    handleGetAvailability(
      {
        body: {
          date: "2026-05-18",
          personIds: [],
          durationMinutes: 30,
        },
      } as any,
      res,
      (error: unknown) => errorHandler(error as any, {} as any, res, vi.fn()),
    );

    expect(statusCode).toBe(400);
    expect(jsonBody).toEqual(
      expect.objectContaining({
        message: "Invalid request",
        error: "At least one person must be selected",
      }),
    );
  });

  it("returns 400 for unknown participant ids", () => {
    let statusCode = 0;
    let jsonBody: unknown;
    const res = {
      status(code: number) {
        statusCode = code;
        return this;
      },
      json(payload: unknown) {
        jsonBody = payload;
        return this;
      },
    } as any;

    handleGetAvailability(
      {
        body: {
          date: "2026-05-18",
          personIds: ["alice", "ghost-user"],
          durationMinutes: 30,
        },
      } as any,
      res,
      (error: unknown) => errorHandler(error as any, {} as any, res, vi.fn()),
    );

    expect(statusCode).toBe(400);
    expect(jsonBody).toEqual({
      message: "Unknown participant id: ghost-user",
    });
  });

  it("returns 400 for duplicate participant ids", () => {
    let statusCode = 0;
    let jsonBody: unknown;
    const res = {
      status(code: number) {
        statusCode = code;
        return this;
      },
      json(payload: unknown) {
        jsonBody = payload;
        return this;
      },
    } as any;

    handleGetAvailability(
      {
        body: {
          date: "2026-05-18",
          personIds: ["alice", "alice"],
          durationMinutes: 30,
        },
      } as any,
      res,
      (error: unknown) => errorHandler(error as any, {} as any, res, vi.fn()),
    );

    expect(statusCode).toBe(400);
    expect(jsonBody).toEqual(
      expect.objectContaining({
        message: "Invalid request",
        error: "Duplicate participant id not allowed: alice",
      }),
    );
  });

  it("returns 400 for whitespace-only participant ids", () => {
    let statusCode = 0;
    let jsonBody: unknown;
    const res = {
      status(code: number) {
        statusCode = code;
        return this;
      },
      json(payload: unknown) {
        jsonBody = payload;
        return this;
      },
    } as any;

    handleGetAvailability(
      {
        body: {
          date: "2026-05-18",
          personIds: ["   "],
          durationMinutes: 30,
        },
      } as any,
      res,
      (error: unknown) => errorHandler(error as any, {} as any, res, vi.fn()),
    );

    expect(statusCode).toBe(400);
    expect(jsonBody).toEqual(
      expect.objectContaining({
        message: "Invalid request",
        error: "Person id cannot be empty",
      }),
    );
  });

  it("returns 400 for invalid duration", () => {
    let statusCode = 0;
    let jsonBody: unknown;
    const res = {
      status(code: number) {
        statusCode = code;
        return this;
      },
      json(payload: unknown) {
        jsonBody = payload;
        return this;
      },
    } as any;

    handleGetAvailability(
      {
        body: {
          date: "2026-05-18",
          personIds: ["alice"],
          durationMinutes: 0,
        },
      } as any,
      res,
      (error: unknown) => errorHandler(error as any, {} as any, res, vi.fn()),
    );

    expect(statusCode).toBe(400);
    expect(jsonBody).toEqual(
      expect.objectContaining({
        message: "Invalid request",
        error: "Meeting duration must be greater than zero",
      }),
    );
  });

  it("returns 400 for invalid step minutes", () => {
    let statusCode = 0;
    let jsonBody: unknown;
    const res = {
      status(code: number) {
        statusCode = code;
        return this;
      },
      json(payload: unknown) {
        jsonBody = payload;
        return this;
      },
    } as any;

    handleGetAvailability(
      {
        body: {
          date: "2026-05-18",
          personIds: ["alice"],
          durationMinutes: 30,
          stepMinutes: 0,
        },
      } as any,
      res,
      (error: unknown) => errorHandler(error as any, {} as any, res, vi.fn()),
    );

    expect(statusCode).toBe(400);
    expect(jsonBody).toEqual(
      expect.objectContaining({
        message: "Invalid request",
        error: "Step must be greater than zero",
      }),
    );
  });

  it("returns 500 for unexpected internal errors", () => {
    let statusCode = 0;
    let jsonBody: unknown;
    const res = {
      status(code: number) {
        statusCode = code;
        return this;
      },
      json(payload: unknown) {
        jsonBody = payload;
        return this;
      },
    } as any;

    errorHandler(new Error("boom"), {} as any, res, vi.fn());

    expect(statusCode).toBe(500);
    expect(jsonBody).toEqual({
      message: "Internal server error",
    });
  });
});
