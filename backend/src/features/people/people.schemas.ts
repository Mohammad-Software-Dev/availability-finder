import { z } from "zod";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const peopleQuerySchema = z.object({
  date: z
    .string({ error: "Date is required" })
    .regex(DATE_PATTERN, "Date must be in YYYY-MM-DD format"),
});

export type PeopleQueryInput = z.infer<typeof peopleQuerySchema>;
