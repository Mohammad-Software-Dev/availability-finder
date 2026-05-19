import type {
  ApiError,
  AvailabilityRequest,
  AvailabilityResponse,
  PersonWithEvents,
} from "../types";

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";

async function safeParseJSON(res: Response) {
  try {
    return await res.json();
  } catch {
    throw { message: "Invalid server response" } satisfies ApiError;
  }
}

async function handleResponse(res: Response) {
  const data = await safeParseJSON(res);

  if (!res.ok) {
    throw {
      message: data?.message ?? "Request failed",
    } satisfies ApiError;
  }

  return data;
}

type RequestOptions = {
  signal?: AbortSignal;
};

type DatesResponse = {
  dates: string[];
};

export async function fetchAvailableDates(
  options: RequestOptions = {},
): Promise<string[]> {
  try {
    const res = await fetch(`${BASE_URL}/api/people/dates`, {
      signal: options.signal,
    });

    const data = (await handleResponse(res)) as DatesResponse;

    return data.dates;
  } catch (err) {
    if (typeof err === "object" && err !== null && "message" in err) {
      throw err as ApiError;
    }

    throw { message: "Network error. Please try again." } satisfies ApiError;
  }
}

export async function fetchPeople(
  date: string,
  options: RequestOptions = {},
): Promise<PersonWithEvents[]> {
  try {
    const url = new URL(`${BASE_URL}/api/people`);
    url.searchParams.set("date", date);

    const res = await fetch(url, {
      signal: options.signal,
    });

    const data = await handleResponse(res);

    return data;
  } catch (err) {
    if (typeof err === "object" && err !== null && "message" in err) {
      throw err as ApiError;
    }

    throw { message: "Network error. Please try again." } satisfies ApiError;
  }
}

export async function fetchAvailability(
  payload: AvailabilityRequest,
  options: RequestOptions = {},
): Promise<AvailabilityResponse> {
  try {
    const res = await fetch(`${BASE_URL}/api/availability`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: options.signal,
    });

    const data = await handleResponse(res);

    return data;
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw { message: "Request cancelled" } satisfies ApiError;
    }

    if (typeof err === "object" && err !== null && "message" in err) {
      throw err as ApiError;
    }

    throw { message: "Network error. Please try again." } satisfies ApiError;
  }
}
