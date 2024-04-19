import { AdType } from "@/typescript/models/ads";
import { z } from "zod";

export const adsRequestSchema = z.object({
  type: z.nativeEnum(AdType).optional(),
});
