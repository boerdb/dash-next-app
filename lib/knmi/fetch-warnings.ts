import {
  KNMI_CUTOVER_AT,
  KNMI_DEFAULT_PROVINCE,
  KNMI_LEGACY_DATASET,
  KNMI_LEGACY_MAX_AGE_MS,
  KNMI_LEGACY_DATASET_VERSION,
  KNMI_OPEN_DATA_BASE,
  KNMI_PUBLIC_DATASET,
  KNMI_PUBLIC_DATASET_VERSION,
  KNMI_WARNING_LOCATION,
} from "./constants";
import { parseKnmiWarningsXml } from "./parse-warnings";
import {
  parseKnmiPublicWarningsJson,
  type KnmiPublicWarningsSnapshot,
} from "./parse-public-warnings";
import type { KnmiWaarschuwingenApi } from "@/lib/api/types";

interface KnmiFileEntry {
  filename?: string;
  created?: string;
  lastModified?: string;
}

interface KnmiListFilesResponse {
  files?: KnmiFileEntry[];
  error?: string;
}

function pickLatestFile(
  files: KnmiFileEntry[],
  extension: string
): (KnmiFileEntry & { filename: string }) | null {
  const ext = extension.toLowerCase();
  for (const f of files) {
    const name = f.filename;
    if (name && name.toLowerCase().endsWith(ext)) return { ...f, filename: name };
  }
  return null;
}

async function knmiGet<T>(apiKey: string, path: string): Promise<T> {
  const res = await fetch(`${KNMI_OPEN_DATA_BASE}${path}`, {
    headers: { Authorization: apiKey },
    next: { revalidate: 600 },
  });
  if (!res.ok) {
    throw new Error(`KNMI Open Data ${res.status}: ${path}`);
  }
  return (await res.json()) as T;
}

async function downloadDatasetFile(
  apiKey: string,
  dataset: string,
  version: string,
  filename: string
): Promise<Response> {
  const urlMeta = await knmiGet<{ temporaryDownloadUrl?: string }>(
    apiKey,
    `/datasets/${dataset}/versions/${version}/files/${encodeURIComponent(filename)}/url`
  );
  const downloadUrl = urlMeta.temporaryDownloadUrl;
  if (!downloadUrl) {
    throw new Error("KNMI download-URL ontbreekt");
  }
  const res = await fetch(downloadUrl, { next: { revalidate: 600 } });
  if (!res.ok) {
    throw new Error(`KNMI download ${res.status}: ${filename}`);
  }
  return res;
}

async function fetchPublicSnapshot(
  apiKey: string
): Promise<{ snapshot: KnmiPublicWarningsSnapshot; filename: string } | null> {
  const list = await knmiGet<KnmiListFilesResponse>(
    apiKey,
    `/datasets/${KNMI_PUBLIC_DATASET}/versions/${KNMI_PUBLIC_DATASET_VERSION}/files?maxKeys=20&orderBy=lastModified&sorting=desc`
  );
  if (list.error) {
    throw new Error(`KNMI bestandslijst: ${list.error}`);
  }

  const filename = pickLatestFile(list.files ?? [], ".json")?.filename;
  if (!filename) return null;

  const res = await downloadDatasetFile(
    apiKey,
    KNMI_PUBLIC_DATASET,
    KNMI_PUBLIC_DATASET_VERSION,
    filename
  );
  const snapshot = (await res.json()) as KnmiPublicWarningsSnapshot;
  return { snapshot, filename };
}

async function fetchLegacyProvinceWarnings(
  apiKey: string,
  province: string,
  freshness?: { now: number; maxAgeMs: number }
): Promise<KnmiWaarschuwingenApi> {
  const list = await knmiGet<KnmiListFilesResponse>(
    apiKey,
    `/datasets/${KNMI_LEGACY_DATASET}/versions/${KNMI_LEGACY_DATASET_VERSION}/files?maxKeys=20&orderBy=lastModified&sorting=desc`
  );
  if (list.error) {
    throw new Error(`KNMI bestandslijst: ${list.error}`);
  }

  const latest = pickLatestFile(list.files ?? [], ".xml");
  if (!latest) {
    return emptyResponse();
  }
  const filename = latest.filename;
  if (freshness) {
    // Na de cutover blijft het laatste bestand staan; oude waarschuwingen niet tonen.
    const modified = Date.parse(latest.lastModified ?? latest.created ?? "");
    if (!Number.isFinite(modified) || freshness.now - modified > freshness.maxAgeMs) {
      throw new Error("KNMI provincie-dataset is niet meer actueel");
    }
  }

  const res = await downloadDatasetFile(
    apiKey,
    KNMI_LEGACY_DATASET,
    KNMI_LEGACY_DATASET_VERSION,
    filename
  );
  const xml = await res.text();
  const parsed = parseKnmiWarningsXml(xml, province);

  return {
    locationLabel: KNMI_WARNING_LOCATION.label,
    province: parsed.province,
    maxLevel: parsed.maxLevel,
    maxLevelLabel: parsed.maxLevelLabel,
    warnings: parsed.warnings,
    sourceFile: filename,
    source: "legacy-province",
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Haalt KNMI-waarschuwingen op voor Harlingen.
 *
 * Vóór de cutover (2 nov 2026) is de provincie-XML de bron: de nieuwe dataset
 * is tot dan alleen een test met dagelijkse heartbeats zonder waarschuwingen.
 * Daarna is de lokale polygon-dataset primair; de XML dient alleen nog als
 * vangnet zolang die recent is bijgewerkt (bv. als KNMI de overstap uitstelt).
 */
export async function fetchKnmiWaarschuwingen(
  apiKey: string,
  province: string = KNMI_DEFAULT_PROVINCE,
  now: number = Date.now()
): Promise<KnmiWaarschuwingenApi> {
  if (now < KNMI_CUTOVER_AT) {
    return fetchLegacyProvinceWarnings(apiKey, province);
  }

  let publicError: unknown = null;
  try {
    const publicFile = await fetchPublicSnapshot(apiKey);
    if (publicFile) {
      const parsed = parseKnmiPublicWarningsJson(publicFile.snapshot, {
        latitude: KNMI_WARNING_LOCATION.latitude,
        longitude: KNMI_WARNING_LOCATION.longitude,
        locationLabel: KNMI_WARNING_LOCATION.label,
        now,
      });

      if (!parsed.isTestPublication) {
        return {
          locationLabel: parsed.locationLabel,
          province: province.toUpperCase(),
          maxLevel: parsed.maxLevel,
          maxLevelLabel: parsed.maxLevelLabel,
          warnings: parsed.warnings,
          sourceFile: publicFile.filename,
          source: "public-local",
          updatedAt: new Date().toISOString(),
        };
      }
    }
  } catch (e) {
    publicError = e;
  }

  try {
    return await fetchLegacyProvinceWarnings(apiKey, province, {
      now,
      maxAgeMs: KNMI_LEGACY_MAX_AGE_MS,
    });
  } catch (legacyError) {
    // Liever een zichtbare fout dan stilletjes "geen waarschuwing".
    throw publicError ?? legacyError;
  }
}

function emptyResponse(): KnmiWaarschuwingenApi {
  return {
    locationLabel: KNMI_WARNING_LOCATION.label,
    province: KNMI_DEFAULT_PROVINCE,
    maxLevel: 0,
    maxLevelLabel: "Geen waarschuwing",
    warnings: [],
    sourceFile: null,
    source: "public-local",
    updatedAt: new Date().toISOString(),
  };
}
