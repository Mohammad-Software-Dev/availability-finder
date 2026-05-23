import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import type { AvailabilityResponse, PersonWithEvents } from "./types";
import {
  fetchAvailability,
  fetchAvailableDates,
  fetchPeople,
} from "./services/api";

vi.mock("./services/api", () => ({
  fetchAvailableDates: vi.fn(),
  fetchPeople: vi.fn(),
  fetchAvailability: vi.fn(),
}));

const mockFetchAvailableDates = vi.mocked(fetchAvailableDates);
const mockFetchPeople = vi.mocked(fetchPeople);
const mockFetchAvailability = vi.mocked(fetchAvailability);

const people: PersonWithEvents[] = [
  {
    id: "alice",
    name: "Alice Johnson",
    workingHours: { start: "09:00", end: "17:00" },
    events: [],
  },
];

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

const firstResult: AvailabilityResponse = {
  durationMinutes: 60,
  stepMinutes: 15,
  attendees: ["alice"],
  commonWorkingWindow: { start: "10:00", end: "17:00" },
  slots: [{ start: "13:00", end: "14:00" }],
  warnings: [],
};

const secondResult: AvailabilityResponse = {
  ...firstResult,
  slots: [{ start: "14:00", end: "15:00" }],
};

describe("App request lifecycle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchAvailableDates.mockResolvedValue(["2026-05-18", "2026-05-19"]);
    mockFetchPeople.mockResolvedValue(people);
  });

  it("keeps the panel cleared when a cleared request resolves late", async () => {
    const user = userEvent.setup();
    const pending = deferred<AvailabilityResponse>();
    mockFetchAvailability.mockReturnValue(pending.promise);

    render(<App />);

    await user.click(await screen.findByRole("checkbox", { name: /Alice Johnson/i }));
    await user.click(screen.getByRole("button", { name: "Find Slots" }));
    await user.click(screen.getByRole("button", { name: "Clear results" }));

    await act(async () => {
      pending.resolve(firstResult);
      await pending.promise;
    });

    expect(
      screen.getByText("Select participants and a planning date to view matching slots."),
    ).toBeInTheDocument();
    expect(screen.queryByText("13:00 → 14:00")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Scheduling Analysis" }),
    ).not.toBeInTheDocument();
  });

  it("only applies the latest successful submit", async () => {
    const user = userEvent.setup();
    const firstPending = deferred<AvailabilityResponse>();
    const secondPending = deferred<AvailabilityResponse>();

    mockFetchAvailability
      .mockReturnValueOnce(firstPending.promise)
      .mockReturnValueOnce(secondPending.promise);

    render(<App />);

    await user.click(await screen.findByRole("checkbox", { name: /Alice Johnson/i }));
    await user.click(screen.getByRole("button", { name: "Find Slots" }));
    await user.click(screen.getByRole("button", { name: "Clear results" }));
    await user.click(screen.getByRole("button", { name: "Find Slots" }));

    await act(async () => {
      secondPending.resolve(secondResult);
      await secondPending.promise;
    });

    expect(await screen.findByText("14:00 → 15:00")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Scheduling Analysis" })).toBeInTheDocument();

    await act(async () => {
      firstPending.resolve(firstResult);
      await firstPending.promise;
    });

    await waitFor(() => {
      expect(screen.queryByText("13:00 → 14:00")).not.toBeInTheDocument();
    });
  });

  it("marks previous results stale when the planning date changes and refreshes people for that date", async () => {
    const user = userEvent.setup();

    mockFetchPeople
      .mockResolvedValueOnce(people)
      .mockResolvedValueOnce([
        {
          ...people[0],
          events: [
            {
              id: "a2",
              title: "Workshop",
              start: "14:00",
              end: "15:00",
              isValid: true,
              invalidReason: null,
            },
          ],
        },
      ]);
    mockFetchAvailability.mockResolvedValue(firstResult);

    render(<App />);

    await user.click(await screen.findByRole("checkbox", { name: /Alice Johnson/i }));
    await user.click(screen.getByRole("button", { name: "Find Slots" }));
    expect(await screen.findByText("13:00 → 14:00")).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("Planning date"), "2026-05-19");

    expect(await screen.findByText("Workshop")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Showing results for Mon, May 18, 2026. Click Find Slots to refresh Tue, May 19, 2026.",
      ),
    ).toBeInTheDocument();
    expect(mockFetchPeople).toHaveBeenNthCalledWith(2, "2026-05-19", expect.any(Object));
  });
});
