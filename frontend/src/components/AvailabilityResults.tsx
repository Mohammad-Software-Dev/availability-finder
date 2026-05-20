import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatPlanningDate } from "@/lib/date";
import type { AvailabilityResponse, ApiError, Status } from "@/types";

type Props = {
  data: AvailabilityResponse | null;
  status: Status;
  error: ApiError | null;
  isStale: boolean;
  selectedDate: string;
  submittedDate: string | null;
  onClear: () => void;
};

export function AvailabilityResults({
  data,
  status,
  error,
  isStale,
  selectedDate,
  submittedDate,
  onClear,
}: Props) {
  let content: ReactNode = null;
  const canClear = status !== "idle" || data !== null || error !== null || isStale;
  const displayedDate = isStale && submittedDate ? submittedDate : selectedDate;
  const formattedDisplayedDate = displayedDate
    ? formatPlanningDate(displayedDate)
    : "the selected date";
  const formattedSelectedDate = selectedDate
    ? formatPlanningDate(selectedDate)
    : "the selected date";

  if (status === "loading") {
    content = (
      <p className="text-muted-foreground">
        Calculating overlapping availability for {formattedSelectedDate}.
      </p>
    );
  } else if (status === "error") {
    content = (
      <p className="text-red-500">
        {error?.message ?? "Failed to fetch availability"}
      </p>
    );
  } else if (status === "idle") {
    content = (
      <p className="text-muted-foreground">
        Select participants and a planning date to view matching slots.
      </p>
    );
  } else if (data) {
    content = (
      <CardContent className="space-y-6">
        {isStale && (
          <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            <p className="font-medium">Results are out of date.</p>
            <p className="mt-1">
              {submittedDate && submittedDate !== selectedDate
                ? `Showing results for ${formattedDisplayedDate}. Click Find Slots to refresh ${formattedSelectedDate}.`
                : "Inputs changed. Click Find Slots to refresh availability."}
            </p>
          </div>
        )}

        <div>
          <h3 className="font-semibold text-base">Planning Date</h3>
          <p className="text-sm text-muted-foreground">
            Availability context for this request.
          </p>
          <p>{formattedDisplayedDate}</p>
        </div>

        <div>
          <h3 className="font-semibold text-base">Common Working Window</h3>
          <p className="text-sm text-muted-foreground">
            All selected participants are working during this time.
          </p>
          {data.commonWorkingWindow ? (
            <p>
              {data.commonWorkingWindow.start} → {data.commonWorkingWindow.end}
            </p>
          ) : (
            <p>No common working window</p>
          )}
        </div>

        <div>
          <h3 className="font-semibold text-base">Slots</h3>
          {data.slots.length > 0 && (
            <p className="text-sm text-muted-foreground">
              {data.slots.length} matching slot
              {data.slots.length === 1 ? "" : "s"} found
            </p>
          )}

          {data.slots.length === 0 ? (
            <div className="text-muted-foreground border-muted-foreground bg-muted-background rounded-md border px-3 py-2 text-sm">
              <p>No matching slots found for {formattedDisplayedDate}.</p>
              <p className="mt-1">Try a shorter duration or fewer participants.</p>
            </div>
          ) : (
            <div className="grid gap-2">
              {data.slots.map((slot, i) => (
                <div
                  key={i}
                  className="border rounded-md px-3 py-2 text-sm border-blue-300 bg-blue-50"
                >
                  {slot.start} → {slot.end}
                </div>
              ))}
            </div>
          )}
        </div>

        {data.warnings.length > 0 && (
          <div className="border border-yellow-300 bg-yellow-50 rounded-md p-3 text-sm">
            <h3 className="font-semibold text-yellow-700">
              Data issues detected
            </h3>
            <p className="mb-2 text-yellow-800">
              Some calendar events were ignored because their data was
              incomplete or invalid.
            </p>
            <ul className="list-disc ml-5 text-yellow-800">
              {data.warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    );
  }

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-xl">Available Time Slots</CardTitle>
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={onClear}
            disabled={!canClear}
          >
            Clear results
          </Button>
        </div>
        <CardDescription className="text-sm">
          Review the quick answer for the current selection, including the
          active planning date, shared working window, matching slots, and any
          data-quality warnings.
        </CardDescription>
      </CardHeader>
      {status === "success" && data ? (
        content
      ) : (
        <CardContent>{content}</CardContent>
      )}
    </Card>
  );
}
