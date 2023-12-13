import { ResponseFormat } from "@/typescript/response";
import { z } from "zod";

export const routesRequestSchema = z.object({
  id: z.string().regex(/\w{1}/, "Invalid route ID").optional(),
  format: z.nativeEnum(ResponseFormat).optional(),
});

export const findRoutesRequestSchema = z.object({
  from: z.string({ required_error: '"from" is required' }),
  to: z.string({ required_error: '"to" is required' }),
  format: z.nativeEnum(ResponseFormat).optional(),
});
