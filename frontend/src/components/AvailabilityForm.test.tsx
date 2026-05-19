import type { ComponentProps } from "react";
import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { PersonWithEvents } from "@/types";
import { AvailabilityForm } from "./AvailabilityForm";

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
    ],
  },
];

function ControlledAvailabilityForm(
  props: Omit<
    ComponentProps<typeof AvailabilityForm>,
    | "availableDates"
    | "selectedDate"
    | "onSelectedDateChange"
    | "selectedIds"
    | "onSelectedIdsChange"
  >,
) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  return (
    <AvailabilityForm
      {...props}
      availableDates={["2026-05-18", "2026-05-19"]}
      selectedDate="2026-05-18"
      onSelectedDateChange={vi.fn()}
      selectedIds={selectedIds}
      onSelectedIdsChange={setSelectedIds}
    />
  );
}

describe("AvailabilityForm", () => {
  it("shows the compact form guidance and helper text", () => {
    render(
      <ControlledAvailabilityForm
        people={people}
        status="idle"
        lastSubmittedRequest={null}
        onDirtyChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    expect(
      screen.queryByText("Select participants, then set duration and step."),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(
        "Choose a planning date, select participants, then set duration and step.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Planning date")).toBeInTheDocument();
    expect(screen.getByText("Meeting length")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Show field help" })).toBeInTheDocument();
  });

  it("supports select all and clear all participant actions", async () => {
    const user = userEvent.setup();

    render(
      <ControlledAvailabilityForm
        people={[
          ...people,
          {
            id: "bob",
            name: "Bob Smith",
            workingHours: { start: "10:00", end: "18:00" },
            events: [],
          },
        ]}
        status="idle"
        lastSubmittedRequest={null}
        onDirtyChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Select all" }));
    expect(screen.getByText("2 participants selected")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Clear all" }));
    expect(screen.getByText("0 participants selected")).toBeInTheDocument();
  });

  it("blocks submit when step is invalid", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(
      <ControlledAvailabilityForm
        people={people}
        status="idle"
        lastSubmittedRequest={null}
        onDirtyChange={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    await user.click(screen.getByRole("checkbox", { name: /Alice Johnson/i }));
    const stepInput = screen.getByLabelText("Step (minutes)");
    await user.clear(stepInput);
    await user.type(stepInput, "0");

    expect(
      screen.getByText("Step must be a positive whole number"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Find Slots" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Find Slots" }));

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits the expected payload when values are valid", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(
      <ControlledAvailabilityForm
        people={people}
        status="idle"
        lastSubmittedRequest={null}
        onDirtyChange={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    await user.click(screen.getByRole("checkbox", { name: /Alice Johnson/i }));
    await user.click(screen.getByRole("button", { name: "Find Slots" }));

    expect(onSubmit).toHaveBeenCalledWith({
      date: "2026-05-18",
      personIds: ["alice"],
      durationMinutes: 60,
      stepMinutes: 15,
    });
  });

  it("marks results stale when the current selection differs from the last submitted request", async () => {
    const user = userEvent.setup();
    const onDirtyChange = vi.fn();

    render(
      <ControlledAvailabilityForm
        people={people}
        status="success"
        lastSubmittedRequest={{
          date: "2026-05-18",
          personIds: ["alice"],
          durationMinutes: 60,
          stepMinutes: 15,
        }}
        onDirtyChange={onDirtyChange}
        onSubmit={vi.fn()}
      />,
    );

    expect(onDirtyChange).toHaveBeenLastCalledWith(true);

    await user.click(screen.getByRole("checkbox", { name: /Alice Johnson/i }));

    expect(onDirtyChange).toHaveBeenLastCalledWith(false);
  });

  it("keeps results stale when a valid submitted field becomes invalid", async () => {
    const user = userEvent.setup();
    const onDirtyChange = vi.fn();

    render(
      <AvailabilityForm
        availableDates={["2026-05-18", "2026-05-19"]}
        people={people}
        selectedDate="2026-05-18"
        status="success"
        selectedIds={["alice"]}
        onSelectedDateChange={vi.fn()}
        onSelectedIdsChange={vi.fn()}
        lastSubmittedRequest={{
          date: "2026-05-18",
          personIds: ["alice"],
          durationMinutes: 60,
          stepMinutes: 15,
        }}
        onDirtyChange={onDirtyChange}
        onSubmit={vi.fn()}
      />,
    );

    const durationInput = screen.getByLabelText("Duration (minutes)");
    await user.clear(durationInput);

    expect(onDirtyChange).toHaveBeenLastCalledWith(true);
    expect(
      screen.getByText("Duration must be a positive whole number"),
    ).toBeInTheDocument();
  });

  it("renders field help as an accessible button trigger", () => {
    render(
      <ControlledAvailabilityForm
        people={people}
        status="idle"
        lastSubmittedRequest={null}
        onDirtyChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Show field help" })).toBeInTheDocument();
  });

  it("marks results stale when the planning date changes", async () => {
    const user = userEvent.setup();
    const onDirtyChange = vi.fn();
    const onSelectedDateChange = vi.fn();

    render(
      <AvailabilityForm
        availableDates={["2026-05-18", "2026-05-19"]}
        people={people}
        selectedDate="2026-05-19"
        status="success"
        selectedIds={["alice"]}
        onSelectedDateChange={onSelectedDateChange}
        onSelectedIdsChange={vi.fn()}
        lastSubmittedRequest={{
          date: "2026-05-18",
          personIds: ["alice"],
          durationMinutes: 60,
          stepMinutes: 15,
        }}
        onDirtyChange={onDirtyChange}
        onSubmit={vi.fn()}
      />,
    );

    expect(onDirtyChange).toHaveBeenLastCalledWith(true);

    await user.selectOptions(screen.getByLabelText("Planning date"), "2026-05-18");

    expect(onSelectedDateChange).toHaveBeenCalledWith("2026-05-18");
  });

});
