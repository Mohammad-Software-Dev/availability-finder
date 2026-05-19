export type Status = "idle" | "loading" | "success" | "error";

export type ApiError = {
  message: string;
};

export type WorkingHours = {
  start: string;
  end: string;
};

export type InvalidReason =
  | "missing_time"
  | "invalid_interval"
  | "outside_working_hours";

export type PersonEvent = {
  id: string;
  title: string | null;
  start: string | null;
  end: string | null;
  isValid: boolean;
  invalidReason: InvalidReason | null;
};

export type PersonWithEvents = {
  id: string;
  name: string;
  workingHours: WorkingHours;
  events: PersonEvent[];
};

export type AvailabilityRequest = {
  date: string;
  personIds: string[];
  durationMinutes: number;
  stepMinutes?: number;
};

export type TimeSlot = {
  start: string;
  end: string;
};

export type AvailabilityResponse = {
  durationMinutes: number;
  stepMinutes: number;
  attendees: string[];
  commonWorkingWindow: TimeSlot | null;
  slots: TimeSlot[];
  warnings: string[];
};
