import { useEffect, useRef, useState } from "react";
import type {
  ApiError,
  AvailabilityRequest,
  AvailabilityResponse,
  PersonWithEvents,
  Status,
} from "./types";
import {
  fetchAvailability,
  fetchAvailableDates,
  fetchPeople,
} from "./services/api";
import { AvailabilityForm } from "./components/AvailabilityForm";
import { AvailabilityResults } from "./components/AvailabilityResults";
import { ScheduleVisualization } from "./features/schedule-visualization/ScheduleVisualization";
import { formatPlanningDate } from "./lib/date";

function App() {
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [people, setPeople] = useState<PersonWithEvents[]>([]);
  const [peopleStatus, setPeopleStatus] = useState<Status>("idle");
  const [peopleError, setPeopleError] = useState<ApiError | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [availability, setAvailability] = useState<AvailabilityResponse | null>(
    null,
  );
  const [availabilityStatus, setAvailabilityStatus] = useState<Status>("idle");
  const [availabilityError, setAvailabilityError] = useState<ApiError | null>(
    null,
  );
  const [lastSubmittedRequest, setLastSubmittedRequest] =
    useState<AvailabilityRequest | null>(null);
  const [availabilityIsStale, setAvailabilityIsStale] = useState(false);
  const availabilityRequestIdRef = useRef(0);
  const availabilityAbortRef = useRef<AbortController | null>(null);
  const peopleAbortRef = useRef<AbortController | null>(null);
  const resultsWorkspaceRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    async function loadInitialData() {
      setPeopleStatus("loading");
      setPeopleError(null);

      try {
        const dates = await fetchAvailableDates();
        setAvailableDates(dates);

        if (dates.length === 0) {
          setPeople([]);
          setSelectedDate("");
          setPeopleStatus("success");
          return;
        }

        setSelectedDate(dates[0]);
      } catch (err) {
        setPeopleStatus("error");
        setPeopleError(err as ApiError);
      }
    }

    loadInitialData();
  }, []);

  useEffect(() => {
    return () => {
      peopleAbortRef.current?.abort();
      availabilityAbortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (!selectedDate) {
      return;
    }

    peopleAbortRef.current?.abort();
    const controller = new AbortController();
    peopleAbortRef.current = controller;

    async function loadPeopleForDate() {
      setPeopleStatus((current) => (current === "idle" ? "loading" : current));
      setPeopleError(null);

      try {
        const data = await fetchPeople(selectedDate, { signal: controller.signal });

        if (controller.signal.aborted) {
          return;
        }

        setPeople(data);
        setSelectedIds((current) =>
          current.filter((id) => data.some((person) => person.id === id)),
        );
        setPeopleStatus("success");
      } catch (err) {
        if (controller.signal.aborted) {
          return;
        }

        setPeopleStatus("error");
        setPeopleError(err as ApiError);
      } finally {
        if (peopleAbortRef.current === controller) {
          peopleAbortRef.current = null;
        }
      }
    }

    loadPeopleForDate();
  }, [selectedDate]);

  async function handleSubmit(payload: AvailabilityRequest) {
    availabilityAbortRef.current?.abort();
    const controller = new AbortController();
    availabilityAbortRef.current = controller;
    const requestId = availabilityRequestIdRef.current + 1;
    availabilityRequestIdRef.current = requestId;

    setAvailabilityStatus("loading");
    setAvailabilityError(null);
    setAvailabilityIsStale(false);
    setLastSubmittedRequest(payload);

    try {
      const data = await fetchAvailability(payload, {
        signal: controller.signal,
      });

      if (requestId !== availabilityRequestIdRef.current) {
        return;
      }

      setAvailability(data);
      setAvailabilityStatus("success");
      requestAnimationFrame(() => {
        resultsWorkspaceRef.current?.scrollIntoView({
          behavior:
            typeof window !== "undefined" &&
            window.matchMedia("(prefers-reduced-motion: reduce)").matches
              ? "auto"
              : "smooth",
          block: "start",
        });
      });
    } catch (err) {
      if (
        controller.signal.aborted ||
        requestId !== availabilityRequestIdRef.current
      ) {
        return;
      }

      setAvailabilityStatus("error");
      setAvailabilityError(err as ApiError);
    } finally {
      if (requestId === availabilityRequestIdRef.current) {
        availabilityAbortRef.current = null;
      }
    }
  }

  function handleClearResults() {
    availabilityAbortRef.current?.abort();
    availabilityAbortRef.current = null;
    availabilityRequestIdRef.current += 1;
    setAvailability(null);
    setAvailabilityStatus("idle");
    setAvailabilityError(null);
    setLastSubmittedRequest(null);
    setAvailabilityIsStale(false);
  }

  const selectedPeople = people.filter((person) => selectedIds.includes(person.id));
  const hasParticipants = people.length > 0 && selectedDate !== "";
  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      <h1 className="text-3xl leading-tight font-bold sm:text-4xl">
        Availability Finder{" "}
        <span className="mt-1 block text-base font-medium text-muted-foreground sm:mt-0 sm:inline sm:text-lg">
          (Date-aware planner)
        </span>
      </h1>

      {peopleStatus === "loading" && !hasParticipants && (
        <p>Loading planning dates and participants...</p>
      )}

      {peopleStatus === "error" && (
        <p className="text-red-500">
          {peopleError?.message ?? "Failed to load participants"}
        </p>
      )}

      {peopleStatus === "success" && availableDates.length === 0 && (
        <p>No planning dates available</p>
      )}

      {peopleStatus === "success" && availableDates.length > 0 && people.length === 0 && (
        <p>No participants available for {formatPlanningDate(selectedDate)}</p>
      )}

      {hasParticipants && (
        <div className="space-y-6">
          <AvailabilityForm
            availableDates={availableDates}
            people={people}
            selectedDate={selectedDate}
            status={availabilityStatus}
            selectedIds={selectedIds}
            onSelectedDateChange={setSelectedDate}
            onSelectedIdsChange={setSelectedIds}
            lastSubmittedRequest={lastSubmittedRequest}
            onDirtyChange={setAvailabilityIsStale}
            onSubmit={handleSubmit}
          />

          <div
            ref={resultsWorkspaceRef}
            className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.88fr)] xl:items-start"
          >
            <ScheduleVisualization
              people={selectedPeople}
              availability={availability}
              isStale={availabilityIsStale}
            />

            <div className="xl:sticky xl:top-6">
              <AvailabilityResults
                data={availability}
                status={availabilityStatus}
                error={availabilityError}
                isStale={availabilityIsStale}
                selectedDate={selectedDate}
                submittedDate={lastSubmittedRequest?.date ?? null}
                onClear={handleClearResults}
              />
            </div>
          </div>
        </div>
      )}

      {hasParticipants && peopleStatus === "loading" && (
        <p className="text-sm text-muted-foreground">
          Updating participants and events for {formatPlanningDate(selectedDate)}.
        </p>
      )}
    </div>
  );
}

export default App;
