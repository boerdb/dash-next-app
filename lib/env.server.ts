import "server-only";
import { z } from "zod";

const envSchema = z.object({
  WEER_API_BASE: z
    .string()
    .url()
    .default("https://weer.benswebradio.nl"),
  /** Optioneel — voorspelling & aanvullende metingen op het weer-tabblad */
  OPENWEATHER_API_KEY: z.string().min(1).optional(),
});

export const env = envSchema.parse({
  WEER_API_BASE: process.env.WEER_API_BASE || undefined,
  OPENWEATHER_API_KEY: process.env.OPENWEATHER_API_KEY || undefined,
});
