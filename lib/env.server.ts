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
  /**
   * Fysieke watermeterstand bij sensor-nul (= laatste opgave vóór/ bij plaatsing).
   * Meterstand in app = offset + total_liter_m3 (HomeWizard).
   */
  WATER_METER_OFFSET_M3: z.coerce.number().default(1404),
  /** Enphase IQ Gateway (HTTPS, JWT Bearer) */
  ENPHASE_GATEWAY_URL: z.string().url().optional(),
  ENPHASE_GATEWAY_SERIAL: z.string().min(8).optional(),
  /** JWT van Enlighten (1 jaar geldig); zie scripts/db-migration/enphase-fetch-token.py */
  ENPHASE_GATEWAY_TOKEN: z.string().min(20).optional(),
  /** Optioneel: auto JWT via Enlighten-login (MFA moet uit) */
  ENPHASE_ENLIGHTEN_USER: z.string().email().optional(),
  ENPHASE_ENLIGHTEN_PASSWORD: z.string().min(1).optional(),
});

export const env = envSchema.parse({
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
  WATER_METER_OFFSET_M3: process.env.WATER_METER_OFFSET_M3 || undefined,
  ENPHASE_GATEWAY_URL: process.env.ENPHASE_GATEWAY_URL || undefined,
  ENPHASE_GATEWAY_SERIAL: process.env.ENPHASE_GATEWAY_SERIAL || undefined,
  ENPHASE_GATEWAY_TOKEN: process.env.ENPHASE_GATEWAY_TOKEN || undefined,
  ENPHASE_ENLIGHTEN_USER: process.env.ENPHASE_ENLIGHTEN_USER || undefined,
  ENPHASE_ENLIGHTEN_PASSWORD: process.env.ENPHASE_ENLIGHTEN_PASSWORD || undefined,
});

export const enphaseConfigured = Boolean(
  env.ENPHASE_GATEWAY_URL && env.ENPHASE_GATEWAY_SERIAL
);

export const energieBatteryEndpoints = buildBatteryEndpoints(
  parseBatteryUrls(env.ENERGIE_BATTERY_URLS),
  parseBatteryTokens(env.ENERGIE_BATTERY_TOKENS),
  parseBatteryLabels(env.ENERGIE_BATTERY_LABELS)
);
export const energieP1BatteriesUrl = p1BatteriesUrl(env.ENERGIE_P1_URL);
export const energieP1Token = env.ENERGIE_P1_TOKEN;
