import { ResponseFormat } from "@/typescript/response";
import { z } from "zod";

export const routesRequestSchema = z.object({
  id: z.string().regex(/\w+/, "Invalid route ID").optional(),
  format: z.nativeEnum(ResponseFormat).optional(),
});
