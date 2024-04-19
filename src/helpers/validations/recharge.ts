import { ResponseFormat } from "@/typescript/response";
import { z } from "zod";

export const rechargeRequestSchema = z.object({
  name: z.string().optional(),
  road: z.string().optional(),
  township: z.string().optional(),
  page: z
    .number({ invalid_type_error: '"page" must be a number' })
    .positive()
    .optional(),
  size: z
    .number({ invalid_type_error: '"size" must be a number' })
    .positive()
    .optional(),
  format: z.nativeEnum(ResponseFormat).optional(),
});
