import "server-only";
import { z } from "zod";

const envSchema = z.object({
  WEER_API_BASE: z
    .string()
    .url()
    .default("https://weer.benswebradio.nl"),
  /**
   * Fase 1+: direct MariaDB (weerdata op .14).
   * mysql://dash_app:...@192.168.1.14:3306/weerdata
   */
  DATABASE_URL: z.string().min(1).optional(),
  ENERGIE_P1_URL: z.string().url().default("http://192.168.1.178/api/v1/data"),
  ENERGIE_WATER_URL: z
    .string()
    .url()
    .default("http://192.168.1.169/api/v1/data"),
  /** Optioneel — voorspelling & aanvullende metingen op het weer-tabblad */
  OPENWEATHER_API_KEY: z.string().min(1).optional(),
});

export const env = envSchema.parse({
  WEER_API_BASE: process.env.WEER_API_BASE || undefined,
  DATABASE_URL: process.env.DATABASE_URL || undefined,
  ENERGIE_P1_URL: process.env.ENERGIE_P1_URL || undefined,
  ENERGIE_WATER_URL: process.env.ENERGIE_WATER_URL || undefined,
  OPENWEATHER_API_KEY: process.env.OPENWEATHER_API_KEY || undefined,
});
