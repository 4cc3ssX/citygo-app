import { z } from "zod";

export const suggestionRequestSchema = z.object({
  region: z.string().optional(),
});
