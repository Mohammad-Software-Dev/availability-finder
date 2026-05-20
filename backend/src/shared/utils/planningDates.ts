import { availableDates } from "../../data/seed.js";
import { AppError } from "../errors/AppError.js";

export function assertAvailableDate(date: string): void {
  if (!availableDates.includes(date as (typeof availableDates)[number])) {
    throw new AppError(`Unknown planning date: ${date}`, 400);
  }
}
