import {
  KNMI_DATASET,
  KNMI_DATASET_VERSION,
  KNMI_DEFAULT_PROVINCE,
  KNMI_OPEN_DATA_BASE,
} from "./constants";
import { parseKnmiWarningsXml } from "./parse-warnings";
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

/** Nieuwste XML (txt wordt vaker als laatste bestand geüpload). */
function pickLatestXmlFilename(files: KnmiFileEntry[]): string | null {
  for (const f of files) {
    const name = f.filename;
    if (name && name.toLowerCase().endsWith(".xml")) return name;
  }
  return null;
}

async function knmiGet<T>(
  apiKey: string,
  path: string
): Promise<T> {
  const res = await fetch(`${KNMI_OPEN_DATA_BASE}${path}`, {
    headers: { Authorization: apiKey },
    next: { revalidate: 600 },
  });
  if (!res.ok) {
    throw new Error(`KNMI Open Data ${res.status}: ${path}`);
  }
  return (await res.json()) as T;
}

export async function fetchKnmiWaarschuwingen(
  apiKey: string,
  province: string = KNMI_DEFAULT_PROVINCE
): Promise<KnmiWaarschuwingenApi> {
  const list = await knmiGet<KnmiListFilesResponse>(
    apiKey,
    `/datasets/${KNMI_DATASET}/versions/${KNMI_DATASET_VERSION}/files?maxKeys=20&orderBy=lastModified&sorting=desc`
  );

  if (list.error) {
    throw new Error(`KNMI bestandslijst: ${list.error}`);
  }

  const filename = pickLatestXmlFilename(list.files ?? []);
  if (!filename) {
    return emptyResponse(province);
  }

  const urlMeta = await knmiGet<{ temporaryDownloadUrl?: string }>(
    apiKey,
    `/datasets/${KNMI_DATASET}/versions/${KNMI_DATASET_VERSION}/files/${encodeURIComponent(filename)}/url`
  );

  const downloadUrl = urlMeta.temporaryDownloadUrl;
  if (!downloadUrl) {
    throw new Error("KNMI download-URL ontbreekt");
  }

  const xmlRes = await fetch(downloadUrl, { next: { revalidate: 600 } });
  if (!xmlRes.ok) {
    throw new Error(`KNMI XML download: ${xmlRes.status}`);
  }

  const xml = await xmlRes.text();
  const parsed = parseKnmiWarningsXml(xml, province);

  return {
    province: parsed.province,
    maxLevel: parsed.maxLevel,
    maxLevelLabel: parsed.maxLevelLabel,
    warnings: parsed.warnings,
    sourceFile: filename,
    updatedAt: new Date().toISOString(),
  };
}

function emptyResponse(province: string): KnmiWaarschuwingenApi {
  return {
    province: province.toUpperCase(),
    maxLevel: 0,
    maxLevelLabel: "Geen waarschuwing",
    warnings: [],
    sourceFile: null,
    updatedAt: new Date().toISOString(),
  };
}
