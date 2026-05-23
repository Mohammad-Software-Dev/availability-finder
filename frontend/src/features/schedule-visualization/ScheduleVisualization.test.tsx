import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { AvailabilityResponse, PersonWithEvents } from "@/types";
import { ScheduleVisualization } from "./ScheduleVisualization";

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

describe("ScheduleVisualization", () => {
  it("renders participant rows, busy intervals, density, and fresh-result overlays", () => {
    render(
      <ScheduleVisualization
        people={people}
        availability={availability}
        isStale={false}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Scheduling Analysis" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Alice Johnson")).toBeInTheDocument();
    expect(screen.getByText("Bob Smith")).toBeInTheDocument();
    expect(screen.getByTestId("busy-alice-a1")).toBeInTheDocument();
    expect(screen.getByTestId("shared-window")).toBeInTheDocument();
    expect(screen.getByTestId("slot-slot-0")).toBeInTheDocument();
    expect(
      screen.getByLabelText(
        "Availability overlap density band. Deeper blue means more selected participants are free. Green marks the strongest overlap.",
      ),
    ).toBeInTheDocument();
  });

  it("exposes tooltip content on focus for slots and busy intervals", async () => {
    const user = userEvent.setup();

    render(
      <ScheduleVisualization
        people={people}
        availability={availability}
        isStale={false}
      />,
    );

    const slotTarget = screen.getByLabelText("Available slot from 13:00 to 14:00");
    await user.tab();
    expect(slotTarget).toHaveFocus();

    await user.tab();
    const busyTarget = screen.getByLabelText(
      "Alice Johnson busy from 10:00 to 10:30",
    );
    expect(busyTarget).toHaveFocus();

    await user.tab();
    const bobBusyTarget = screen.getByLabelText("Bob Smith busy from 11:00 to 12:00");
    expect(bobBusyTarget).toHaveFocus();
  });

  it("hides fresh-result overlays and shows the stale hint when data is stale", () => {
    render(
      <ScheduleVisualization
        people={people}
        availability={availability}
        isStale={true}
      />,
    );

    expect(screen.queryByTestId("shared-window")).not.toBeInTheDocument();
    expect(screen.queryByTestId("slot-slot-0")).not.toBeInTheDocument();
    expect(
      screen.getByText("Result overlays are hidden until you refresh availability."),
    ).toBeInTheDocument();
  });
});
