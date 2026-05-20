import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPlanningDate } from "@/lib/date";
import type { AvailabilityRequest, PersonWithEvents, Status } from "@/types";
import { FieldHelp } from "./FieldHelp";
import { ParticipantRow } from "./ParticipantRow";

type Props = {
  availableDates: string[];
  people: PersonWithEvents[];
  selectedDate: string;
  status: Status;
  selectedIds: string[];
  onSelectedDateChange: (date: string) => void;
  onSelectedIdsChange: (ids: string[]) => void;
  lastSubmittedRequest: AvailabilityRequest | null;
  onDirtyChange: (isDirty: boolean) => void;
  onSubmit: (payload: AvailabilityRequest) => void;
};

type ControlHeaderProps = {
  htmlFor: string;
  label: string;
  helper?: string;
  details?: string;
  detailsClassName?: string;
};

function getPositiveWholeNumberError(
  value: string,
  label: "Duration" | "Step",
): string | null {
  if (!value.trim()) {
    return `${label} must be a positive whole number`;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return `${label} must be a positive whole number`;
  }

  return null;
}

function sortIds(ids: string[]): string[] {
  return [...ids].sort();
}

function areSameSelectedIds(left: string[], right: string[]): boolean {
  return JSON.stringify(sortIds(left)) === JSON.stringify(sortIds(right));
}

function areInputsDirty(
  lastSubmittedRequest: AvailabilityRequest | null,
  nextValues: {
    date: string;
    selectedIds: string[];
    duration: string;
    step: string;
  },
): boolean {
  if (!lastSubmittedRequest) {
    return false;
  }

  const normalizedStep = nextValues.step.trim() === "" ? "" : nextValues.step;

  return (
    lastSubmittedRequest.date !== nextValues.date ||
    !areSameSelectedIds(
      lastSubmittedRequest.personIds,
      nextValues.selectedIds,
    ) ||
    String(lastSubmittedRequest.durationMinutes) !== nextValues.duration ||
    String(lastSubmittedRequest.stepMinutes ?? 15) !== normalizedStep
  );
}

function ControlHeader({
  htmlFor,
  label,
  helper,
  details,
  detailsClassName,
}: ControlHeaderProps) {
  return (
    <div className="flex min-h-5 flex-wrap items-baseline gap-x-2 gap-y-1">
      <Label htmlFor={htmlFor}>{label}</Label>
      {(helper || details) && (
        <span className="inline-flex items-center gap-1.5 text-xs leading-none text-muted-foreground">
          {helper ? <span>{helper}</span> : null}
          {details ? (
            <FieldHelp
              details={details}
              className="text-slate-500"
              detailsClassName={detailsClassName}
            />
          ) : null}
        </span>
      )}
    </div>
  );
}

export function AvailabilityForm({
  availableDates,
  people,
  selectedDate,
  status,
  selectedIds,
  onSelectedDateChange,
  onSelectedIdsChange,
  lastSubmittedRequest,
  onDirtyChange,
  onSubmit,
}: Props) {
  const [duration, setDuration] = useState("60");
  const [step, setStep] = useState("15");

  function setPersonSelected(id: string, selected: boolean) {
    const hasPerson = selectedIds.includes(id);

    if (selected && hasPerson) return;
    if (!selected && !hasPerson) return;

    onSelectedIdsChange(
      selected
        ? [...selectedIds, id]
        : selectedIds.filter((personId) => personId !== id),
    );
  }

  function selectAllPeople() {
    onSelectedIdsChange(people.map((person) => person.id));
  }

  function clearAllPeople() {
    onSelectedIdsChange([]);
  }

  const durationError = getPositiveWholeNumberError(duration, "Duration");
  const stepError = getPositiveWholeNumberError(step, "Step");

  useEffect(() => {
    onDirtyChange(
      areInputsDirty(lastSubmittedRequest, {
        date: selectedDate,
        selectedIds,
        duration,
        step,
      }),
    );
  }, [
    duration,
    lastSubmittedRequest,
    onDirtyChange,
    selectedDate,
    selectedIds,
    step,
  ]);

  function validate(): boolean {
    if (selectedIds.length === 0) {
      return false;
    }
    if (durationError || stepError) {
      return false;
    }

    return true;
  }

  function submit() {
    if (!validate()) return;

    onSubmit({
      date: selectedDate,
      personIds: selectedIds,
      durationMinutes: Number(duration),
      stepMinutes: step ? Number(step) : undefined,
    });
  }

  const isDisabled =
    status === "loading" ||
    selectedIds.length === 0 ||
    durationError !== null ||
    stepError !== null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Find Availability</CardTitle>
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <CardDescription className="text-sm">
            Choose a planning date, select participants, then set duration and
            step.
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="space-y-6"
        >
          <div className="grid gap-4 xl:grid-cols-4">
            <div className="space-y-2">
              <ControlHeader
                htmlFor="planning-date"
                label="Planning date"
                helper="Choose a seeded scheduling day"
              />
              <div className="relative">
                <select
                  id="planning-date"
                  value={selectedDate}
                  onChange={(e) => onSelectedDateChange(e.target.value)}
                  className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 flex h-8 w-full appearance-none rounded-md border px-3 pr-10 text-sm shadow-xs focus-visible:ring-[3px] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {availableDates.map((date) => (
                    <option key={date} value={date}>
                      {formatPlanningDate(date)}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" />
              </div>
            </div>

            <div className="space-y-2">
              <ControlHeader
                htmlFor="duration"
                label="Duration (minutes)"
                helper="Meeting length"
              />
              <Input
                id="duration"
                type="number"
                min={1}
                step={1}
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="60"
              />
              {durationError && (
                <p className="text-sm text-red-500">{durationError}</p>
              )}
            </div>

            <div className="space-y-2">
              <ControlHeader
                htmlFor="step"
                label="Step (minutes)"
                helper="Start-time interval"
                details="Example: 15 checks 10:00, 10:15, 10:30 and so on."
                detailsClassName="-left-2 top-6 w-64 translate-x-0"
              />
              <Input
                id="step"
                type="number"
                min={1}
                step={1}
                value={step}
                onChange={(e) => setStep(e.target.value)}
                placeholder="15"
              />
              {stepError && <p className="text-sm text-red-500">{stepError}</p>}
            </div>

            <div className="hidden xl:block" aria-hidden="true" />
          </div>

          <div className="space-y-2">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <Label>Participants</Label>
              <div className="flex items-center gap-1 self-start sm:self-auto">
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={selectAllPeople}
                >
                  Select all
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={clearAllPeople}
                >
                  Clear all
                </Button>
              </div>
            </div>

            <div className="space-y-2.5">
              {people.map((person) => (
                <ParticipantRow
                  key={person.id}
                  person={person}
                  isSelected={selectedIds.includes(person.id)}
                  onSelectedChange={(selected) =>
                    setPersonSelected(person.id, selected)
                  }
                />
              ))}
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            {selectedIds.length} participant
            {selectedIds.length === 1 ? "" : "s"} selected
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={isDisabled}>
              {status === "loading" ? "Finding..." : "Find Slots"}
            </Button>

            {isDisabled && (
              <p className="text-sm text-muted-foreground">
                {selectedIds.length === 0
                  ? "Select at least one participant to continue"
                  : "Enter valid meeting settings"}
              </p>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
