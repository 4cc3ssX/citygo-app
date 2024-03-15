import { ResponseFormat } from "@/typescript/response";
import { z } from "zod";

export const routesRequestSchema = z.object({
  id: z.string().regex(/\w{1}/, "Invalid route ID").optional(),
  format: z.nativeEnum(ResponseFormat).optional(),
});

export const findRoutesRequestSchema = z.object({
  from: z.object({
    position: z
      .object({
        lat: z.number({ required_error: '"from.position.lat" is required' }),
        lng: z.number({ required_error: '"from.position.lng" is required' }),
      })
      .optional(),
    name: z.string({ required_error: '"from.name" is required' }),
    road: z.string({ required_error: '"from.road" is required' }),
    township: z.string({ required_error: '"from.township" is required' }),
  }),
  to: z.object({
    position: z
      .object({
        lat: z.number({ required_error: '"to.position.lat" is required' }),
        lng: z.number({ required_error: '"to.position.lng" is required' }),
      })
      .optional(),
    name: z.string({ required_error: '"to.name" is required' }),
    road: z.string({ required_error: '"to.road" is required' }),
    township: z.string({ required_error: '"to.township" is required' }),
  }),
  count: z.number().min(5).max(10).optional(),
});

export const routeIdSchema = z.object({
  id: z.string({ invalid_type_error: '"id" must be a string' }),
  format: z.nativeEnum(ResponseFormat).optional(),
});
