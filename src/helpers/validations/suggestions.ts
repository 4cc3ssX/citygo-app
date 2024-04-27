import { z } from "zod";

export const suggestionRequestSchema = z.object({
  region: z
    .string()
    .regex(/[A-Za-z]+/, { message: "Invalid region" })
    .optional(),
  country: z
    .string()
    .regex(/[A-Za-z]+/, { message: "Invalid country" })
    .optional(),
});
