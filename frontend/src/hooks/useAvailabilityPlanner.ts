import {
  type Dispatch,
  type RefObject,
  type SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState,
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

function cloneVisualizationPeople(
  people: PersonWithEvents[],
  personIds: string[],
): PersonWithEvents[] {
  return people
    .filter((person) => personIds.includes(person.id))
    .map((person) => ({
      ...person,
      workingHours: { ...person.workingHours },
      events: person.events.map((event) => ({ ...event })),
    }));
}

function pruneSelectedIds(
  selectedIds: string[],
  people: PersonWithEvents[],
): string[] {
  return selectedIds.filter((id) => people.some((person) => person.id === id));
}

async function loadAvailablePlanningDates(
  controller: AbortController,
  actions: {
    setPeopleStatus: (status: Status) => void;
    setPeopleError: (error: ApiError | null) => void;
    setAvailableDates: (dates: string[]) => void;
    setSelectedDate: (date: string) => void;
    setPeople: (people: PersonWithEvents[]) => void;
    setSelectedIds: (ids: string[]) => void;
  },
) {
  const {
    setPeopleStatus,
    setPeopleError,
    setAvailableDates,
    setSelectedDate,
    setPeople,
    setSelectedIds,
  } = actions;

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
  }
}

async function loadPeopleForDate(
  selectedDate: string,
  controller: AbortController,
  actions: {
    setPeopleStatus: Dispatch<SetStateAction<Status>>;
    setPeopleError: (error: ApiError | null) => void;
    setPeople: (people: PersonWithEvents[]) => void;
    setSelectedIds: Dispatch<SetStateAction<string[]>>;
  },
) {
  const { setPeopleStatus, setPeopleError, setPeople, setSelectedIds } = actions;

  setPeopleStatus((current) => (current === "idle" ? "loading" : current));
  setPeopleError(null);

  try {
    const data = await fetchPeople(selectedDate, { signal: controller.signal });

    if (controller.signal.aborted) {
      return;
    }

    setPeople(data);
    setSelectedIds((current) => pruneSelectedIds(current, data));
    setPeopleStatus("success");
  } catch (err) {
    if (controller.signal.aborted) {
      return;
    }

    setPeopleStatus("error");
    setPeopleError(err as ApiError);
  }
}

async function submitAvailabilityRequest(
  payload: AvailabilityRequest,
  people: PersonWithEvents[],
  requestId: number,
  controller: AbortController,
  availabilityRequestIdRef: RefObject<number>,
  actions: {
    setAvailability: (availability: AvailabilityResponse | null) => void;
    setVisualizationPeople: (people: PersonWithEvents[]) => void;
    setAvailabilityStatus: (status: Status) => void;
    setAvailabilityError: (error: ApiError | null) => void;
  },
) {
  const {
    setAvailability,
    setVisualizationPeople,
    setAvailabilityStatus,
    setAvailabilityError,
  } = actions;

  try {
    const data = await fetchAvailability(payload, {
      signal: controller.signal,
    });

    if (requestId !== availabilityRequestIdRef.current) {
      return;
    }

    setAvailability(data);
    setVisualizationPeople(cloneVisualizationPeople(people, payload.personIds));
    setAvailabilityStatus("success");
  } catch (err) {
    if (
      controller.signal.aborted ||
      requestId !== availabilityRequestIdRef.current
    ) {
      return;
    }

    setAvailabilityStatus("error");
    setAvailabilityError(err as ApiError);
  }
}

type AvailabilityPlannerState = {
  availableDates: string[];
  selectedDate: string;
  people: PersonWithEvents[];
  peopleStatus: Status;
  peopleError: ApiError | null;
  selectedIds: string[];
  visualizationPeople: PersonWithEvents[];
  availability: AvailabilityResponse | null;
  availabilityStatus: Status;
  availabilityError: ApiError | null;
  lastSubmittedRequest: AvailabilityRequest | null;
  availabilityIsStale: boolean;
  hasParticipants: boolean;
  setSelectedDate: (date: string) => void;
  setSelectedIds: (ids: string[]) => void;
  handleDirtyChange: (isDirty: boolean) => void;
  handleSubmit: (payload: AvailabilityRequest) => Promise<void>;
  handleClearResults: () => void;
};

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

  useEffect(() => {
    const controller = new AbortController();
    datesAbortRef.current = controller;

    loadAvailablePlanningDates(controller, {
      setPeopleStatus,
      setPeopleError,
      setAvailableDates,
      setSelectedDate,
      setPeople,
      setSelectedIds,
    }).finally(() => {
      if (datesAbortRef.current === controller) {
        datesAbortRef.current = null;
      }
    });

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

    loadPeopleForDate(selectedDate, controller, {
      setPeopleStatus,
      setPeopleError,
      setPeople,
      setSelectedIds,
    }).finally(() => {
      if (peopleAbortRef.current === controller) {
        peopleAbortRef.current = null;
      }
    });
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
      await submitAvailabilityRequest(
        payload,
        people,
        requestId,
        controller,
        availabilityRequestIdRef,
        {
          setAvailability,
          setVisualizationPeople,
          setAvailabilityStatus,
          setAvailabilityError,
        },
      );
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

  const hasParticipants = people.length > 0 && selectedDate !== "";

  return {
    availableDates,
    selectedDate,
    people,
    peopleStatus,
    peopleError,
    selectedIds,
    visualizationPeople,
    availability,
    availabilityStatus,
    availabilityError,
    lastSubmittedRequest,
    availabilityIsStale,
    hasParticipants,
    setSelectedDate,
    setSelectedIds,
    handleDirtyChange,
    handleSubmit,
    handleClearResults,
  };
}
