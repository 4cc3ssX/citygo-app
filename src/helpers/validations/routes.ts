import { ResponseFormat } from "@/typescript/response";
import { z } from "zod";

export const routesRequestSchema = z.object({
  id: z.string().regex(/\w{0}/, "Invalid route ID"),
  format: z.nativeEnum(ResponseFormat).optional(),
});
