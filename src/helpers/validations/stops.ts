import { ResponseFormat } from "@/typescript/response";
import { z } from "zod";
import { lngRegex, latRegex, DistanceUnits } from ".";

export const stopsRequestSchema = z.object({
  name: z.string().optional(),
  road: z.string().optional(),
  township: z.string().optional(),
  region: z
    .string()
    .regex(/[A-Za-z]+/, { message: "Invalid region" })
    .optional(),
  country: z
    .string()
    .regex(/[A-Za-z]+/, { message: "Invalid country" })
    .optional(),
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

export const stopIdSchema = z.object({
  id: z
    .number({ invalid_type_error: '"id" must be a number' })
    .min(1, { message: '"id" must be greater than or equal to 1' }),
  format: z.nativeEnum(ResponseFormat).optional(),
});

export const nearestRequestSchema = z.object({
  lng: z.string().regex(lngRegex, "Invalid longitude"),
  lat: z.string().regex(latRegex, "Invalid latitude"),
  region: z
    .string()
    .regex(/[A-Za-z]+/, { message: "Invalid region" })
    .optional(),
  country: z
    .string()
    .regex(/[A-Za-z]+/, { message: "Invalid country" })
    .optional(),

  count: z
    .number({ invalid_type_error: '"count" must be a number' })
    .min(1, { message: '"count" must be greater than or equal to 1' })
    .max(100, { message: '"count" must be less than or equal to 100' })
    .optional(),
  distance_unit: z.nativeEnum(DistanceUnits).optional(),
  format: z.nativeEnum(ResponseFormat).optional(),
});
