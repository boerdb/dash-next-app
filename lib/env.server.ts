import "server-only";
import { z } from "zod";
import {
  buildBatteryEndpoints,
  parseBatteryLabels,
  parseBatteryTokens,
  parseBatteryUrls,
  p1BatteriesUrl,
} from "@/lib/homewizard/battery";

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
  /** Komma-gescheiden batterij-hosts of -URLs (v2 /api/measurement); leeg = uit */
  ENERGIE_BATTERY_URLS: z.string().optional(),
  /** Bearer-tokens per batterij (zelfde volgorde als URLs; één token mag voor alle) */
  ENERGIE_BATTERY_TOKENS: z.string().optional(),
  /** Bearer-token P1-meter voor /api/batteries (gecombineerd vermogen) */
  ENERGIE_P1_TOKEN: z.string().optional(),
  /** Optionele namen per batterij (zelfde volgorde als URLs) */
  ENERGIE_BATTERY_LABELS: z.string().optional(),
  /** Optioneel — voorspelling & aanvullende metingen op het weer-tabblad */
  OPENWEATHER_API_KEY: z.string().min(1).optional(),
  /** KNMI Data Platform — officiële waarschuwingen (waarschuwingen_nederland_48h) */
  KNMI_API_KEY: z.string().min(1).optional(),
  /** Provinciecode voor KNMI-waarschuwingen (standaard FR = Friesland / Harlingen) */
  KNMI_PROVINCE: z.string().min(2).max(4).optional(),
});

export const env = envSchema.parse({
  WEER_API_BASE: process.env.WEER_API_BASE || undefined,
  DATABASE_URL: process.env.DATABASE_URL || undefined,
  ENERGIE_P1_URL: process.env.ENERGIE_P1_URL || undefined,
  ENERGIE_WATER_URL: process.env.ENERGIE_WATER_URL || undefined,
  ENERGIE_BATTERY_URLS: process.env.ENERGIE_BATTERY_URLS,
  ENERGIE_BATTERY_TOKENS: process.env.ENERGIE_BATTERY_TOKENS,
  ENERGIE_P1_TOKEN: process.env.ENERGIE_P1_TOKEN,
  ENERGIE_BATTERY_LABELS: process.env.ENERGIE_BATTERY_LABELS,
  OPENWEATHER_API_KEY: process.env.OPENWEATHER_API_KEY || undefined,
  KNMI_API_KEY: process.env.KNMI_API_KEY || undefined,
  KNMI_PROVINCE: process.env.KNMI_PROVINCE || undefined,
});

export const energieBatteryEndpoints = buildBatteryEndpoints(
  parseBatteryUrls(env.ENERGIE_BATTERY_URLS),
  parseBatteryTokens(env.ENERGIE_BATTERY_TOKENS),
  parseBatteryLabels(env.ENERGIE_BATTERY_LABELS)
);
export const energieP1BatteriesUrl = p1BatteriesUrl(env.ENERGIE_P1_URL);
export const energieP1Token = env.ENERGIE_P1_TOKEN;
