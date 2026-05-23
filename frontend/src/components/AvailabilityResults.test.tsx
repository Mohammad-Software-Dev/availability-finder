import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { AvailabilityResponse, ApiError } from "@/types";
import { AvailabilityResults } from "./AvailabilityResults";

const error: ApiError = { message: "Request failed" };

const successData: AvailabilityResponse = {
  durationMinutes: 60,
  stepMinutes: 15,
  attendees: ["alice"],
  commonWorkingWindow: { start: "10:00", end: "17:00" },
  slots: [{ start: "13:00", end: "14:00" }],
  warnings: ["Alice Johnson: skipped invalid event (missing/invalid time)"],
};

describe("AvailabilityResults", () => {
  it("renders idle state instructions inside the card", () => {
    render(
      <AvailabilityResults
        data={null}
        status="idle"
        error={null}
        isStale={false}
        selectedDate="2026-05-18"
        submittedDate={null}
        onClear={() => {}}
        onViewAnalysis={() => {}}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Available Time Slots" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Select participants and a planning date to view matching slots."),
    ).toBeInTheDocument();
  });

  it("renders the loading state inside the card", () => {
    render(
      <AvailabilityResults
        data={null}
        status="loading"
        error={null}
        isStale={false}
        selectedDate="2026-05-18"
        submittedDate={null}
        onClear={() => {}}
        onViewAnalysis={() => {}}
      />,
    );

    expect(
      screen.getByText(
        "Calculating overlapping availability for Mon, May 18, 2026.",
      ),
    ).toBeInTheDocument();
  });

  it("renders the error state inside the card", () => {
    render(
      <AvailabilityResults
        data={null}
        status="error"
        error={error}
        isStale={false}
        selectedDate="2026-05-18"
        submittedDate={null}
        onClear={() => {}}
        onViewAnalysis={() => {}}
      />,
    );

    expect(screen.getByText("Request failed")).toBeInTheDocument();
  });

  it("renders no-slots guidance when there are no matches", () => {
    render(
      <AvailabilityResults
        data={{ ...successData, slots: [] }}
        status="success"
        error={null}
        isStale={false}
        selectedDate="2026-05-18"
        submittedDate="2026-05-18"
        onClear={() => {}}
        onViewAnalysis={() => {}}
      />,
    );

    expect(
      screen.getByText("No matching slots found for Mon, May 18, 2026."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Try a shorter duration or fewer participants."),
    ).toBeInTheDocument();
  });

  it("renders success content with slot summary and warnings", () => {
    render(
      <AvailabilityResults
        data={successData}
        status="success"
        error={null}
        isStale={false}
        selectedDate="2026-05-18"
        submittedDate="2026-05-18"
        onClear={() => {}}
        onViewAnalysis={() => {}}
      />,
    );

    expect(screen.getByText("1 matching slot found")).toBeInTheDocument();
    expect(screen.getByText("Mon, May 18, 2026")).toBeInTheDocument();
    expect(
      screen.getByText("All selected participants are working during this time."),
    ).toBeInTheDocument();
    expect(screen.getByText("Data issues detected")).toBeInTheDocument();
  });

  it("shows a refresh prompt when results are stale", () => {
    render(
      <AvailabilityResults
        data={successData}
        status="success"
        error={null}
        isStale={true}
        selectedDate="2026-05-19"
        submittedDate="2026-05-18"
        onClear={() => {}}
        onViewAnalysis={() => {}}
      />,
    );

    expect(
      screen.getByText(
        "Showing results for Mon, May 18, 2026. Click Find Slots to refresh Tue, May 19, 2026.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Results are out of date.")).toBeInTheDocument();
  });

  it("calls clear when the header action is clicked", async () => {
    const user = userEvent.setup();
    const onClear = vi.fn();

    render(
      <AvailabilityResults
        data={successData}
        status="success"
        error={null}
        isStale={false}
        selectedDate="2026-05-18"
        submittedDate="2026-05-18"
        onClear={onClear}
        onViewAnalysis={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Clear results" }));

    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it("shows an analysis CTA only when results are available", () => {
    const { rerender } = render(
      <AvailabilityResults
        data={null}
        status="idle"
        error={null}
        isStale={false}
        selectedDate="2026-05-18"
        submittedDate={null}
        onClear={() => {}}
        onViewAnalysis={() => {}}
      />,
    );

    expect(
      screen.queryByRole("button", { name: "View Scheduling Analysis" }),
    ).not.toBeInTheDocument();

    rerender(
      <AvailabilityResults
        data={successData}
        status="success"
        error={null}
        isStale={false}
        selectedDate="2026-05-18"
        submittedDate="2026-05-18"
        onClear={() => {}}
        onViewAnalysis={() => {}}
      />,
    );

    expect(
      screen.getByRole("button", { name: "View Scheduling Analysis" }),
    ).toBeInTheDocument();
  });
});
