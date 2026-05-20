import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import type {
  ApiError,
  AvailabilityRequest,
  AvailabilityResponse,
  PersonWithEvents,
  Status,
} from "@/types";
import {
  fetchAvailability,
  fetchAvailableDates,
  fetchPeople,
} from "@/services/api";

type AvailabilityPlannerState = {
  availableDates: string[];
  selectedDate: string;
  people: PersonWithEvents[];
  peopleStatus: Status;
  peopleError: ApiError | null;
  selectedIds: string[];
  selectedPeople: PersonWithEvents[];
  visualizationPeople: PersonWithEvents[];
  availability: AvailabilityResponse | null;
  availabilityStatus: Status;
  availabilityError: ApiError | null;
  lastSubmittedRequest: AvailabilityRequest | null;
  availabilityIsStale: boolean;
  hasParticipants: boolean;
  resultsWorkspaceRef: RefObject<HTMLDivElement | null>;
  setSelectedDate: (date: string) => void;
  setSelectedIds: (ids: string[]) => void;
  handleDirtyChange: (isDirty: boolean) => void;
  handleSubmit: (payload: AvailabilityRequest) => Promise<void>;
  handleClearResults: () => void;
};

const AUTO_SCROLL_BLOCK: ScrollLogicalPosition = "start";

function scrollResultsWorkspaceIntoView(element: HTMLDivElement | null) {
  if (!element) {
    return;
  }

  const prefersReducedMotion =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  element.scrollIntoView({
    behavior: prefersReducedMotion ? "auto" : "smooth",
    block: AUTO_SCROLL_BLOCK,
  });
}

export function useAvailabilityPlanner(): AvailabilityPlannerState {
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [people, setPeople] = useState<PersonWithEvents[]>([]);
  const [peopleStatus, setPeopleStatus] = useState<Status>("idle");
  const [peopleError, setPeopleError] = useState<ApiError | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [availability, setAvailability] = useState<AvailabilityResponse | null>(
    null,
  );
  const [visualizationPeople, setVisualizationPeople] = useState<
    PersonWithEvents[]
  >([]);
  const [availabilityStatus, setAvailabilityStatus] = useState<Status>("idle");
  const [availabilityError, setAvailabilityError] = useState<ApiError | null>(
    null,
  );
  const [lastSubmittedRequest, setLastSubmittedRequest] =
    useState<AvailabilityRequest | null>(null);
  const [availabilityIsStale, setAvailabilityIsStale] = useState(false);

  const datesAbortRef = useRef<AbortController | null>(null);
  const peopleAbortRef = useRef<AbortController | null>(null);
  const availabilityAbortRef = useRef<AbortController | null>(null);
  const availabilityRequestIdRef = useRef(0);
  const resultsWorkspaceRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    datesAbortRef.current = controller;

    async function loadAvailablePlanningDates() {
      setPeopleStatus("loading");
      setPeopleError(null);

      try {
        const dates = await fetchAvailableDates({ signal: controller.signal });

        if (controller.signal.aborted) {
          return;
        }

        setAvailableDates(dates);

        if (dates.length === 0) {
          setSelectedDate("");
          setPeople([]);
          setSelectedIds([]);
          setPeopleStatus("success");
          return;
        }

        setSelectedDate(dates[0]);
      } catch (err) {
        if (controller.signal.aborted) {
          return;
        }

        setPeopleStatus("error");
        setPeopleError(err as ApiError);
      } finally {
        if (datesAbortRef.current === controller) {
          datesAbortRef.current = null;
        }
      }
    }

    loadAvailablePlanningDates();

    return () => controller.abort();
  }, []);

  useEffect(() => {
    return () => {
      datesAbortRef.current?.abort();
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

  const handleDirtyChange = useCallback((isDirty: boolean) => {
    setAvailabilityIsStale(isDirty);
  }, []);

  const handleSubmit = useCallback(async (payload: AvailabilityRequest) => {
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
      setVisualizationPeople(
        people
          .filter((person) => payload.personIds.includes(person.id))
          .map((person) => ({
            ...person,
            workingHours: { ...person.workingHours },
            events: person.events.map((event) => ({ ...event })),
          })),
      );
      setAvailabilityStatus("success");

      requestAnimationFrame(() => {
        scrollResultsWorkspaceIntoView(resultsWorkspaceRef.current);
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
  }, [people]);

  const handleClearResults = useCallback(() => {
    availabilityAbortRef.current?.abort();
    availabilityAbortRef.current = null;
    availabilityRequestIdRef.current += 1;
    setAvailability(null);
    setVisualizationPeople([]);
    setAvailabilityStatus("idle");
    setAvailabilityError(null);
    setLastSubmittedRequest(null);
    setAvailabilityIsStale(false);
  }, []);

  const selectedPeople = useMemo(
    () => people.filter((person) => selectedIds.includes(person.id)),
    [people, selectedIds],
  );
  const hasParticipants = people.length > 0 && selectedDate !== "";

  return {
    availableDates,
    selectedDate,
    people,
    peopleStatus,
    peopleError,
    selectedIds,
    selectedPeople,
    visualizationPeople,
    availability,
    availabilityStatus,
    availabilityError,
    lastSubmittedRequest,
    availabilityIsStale,
    hasParticipants,
    resultsWorkspaceRef,
    setSelectedDate,
    setSelectedIds,
    handleDirtyChange,
    handleSubmit,
    handleClearResults,
  };
}
