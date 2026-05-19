import { z } from "zod";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function getDuplicateIds(ids: string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const id of ids) {
    if (seen.has(id)) {
      duplicates.add(id);
      continue;
    }

    seen.add(id);
  }

  return Array.from(duplicates);
}

export const availabilityRequestSchema = z.object({
  date: z
    .string({ error: "Date is required" })
    .regex(DATE_PATTERN, "Date must be in YYYY-MM-DD format"),

  personIds: z
    .array(z.string().trim().min(1, "Person id cannot be empty"))
    .min(1, "At least one person must be selected")
    .superRefine((personIds, ctx) => {
      const duplicateIds = getDuplicateIds(personIds);

      if (duplicateIds.length > 0) {
        const label = duplicateIds.length === 1 ? "id" : "ids";

        ctx.addIssue({
          code: "custom",
          message: `Duplicate participant ${label} not allowed: ${duplicateIds.join(", ")}`,
        });
      }
    }),

  durationMinutes: z
    .number({ error: "Meeting duration is required" })
    .int("Meeting duration must be a whole number")
    .positive("Meeting duration must be greater than zero"),

  stepMinutes: z
    .number({ error: "Step must be a number" })
    .int("Step must be a whole number")
    .positive("Step must be greater than zero")
    .default(15),
});

export type AvailabilityRequestInput = z.infer<
  typeof availabilityRequestSchema
>;
