"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import useSWR from "swr";
import {
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
} from "lucide-react";
import L, { type Map as LeafletMap, type TileLayer } from "leaflet";
import type { WeerRadarResponse } from "@/lib/api/types";
import { HARLINGEN } from "@/lib/location";
import { radarTileUrlTemplate } from "@/lib/radar/rainviewer";
import { jsonFetcher } from "@/lib/fetcher";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const MAP_ZOOM = 7;
const FRAME_MS = 600;

export function PrecipitationRadar() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<LeafletMap | null>(null);
  const radarLayer = useRef<TileLayer | null>(null);
  const playTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const [frameIndex, setFrameIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  const { data, error, isLoading } = useSWR<WeerRadarResponse>(
    "/api/weer/radar",
    jsonFetcher,
    { refreshInterval: 300_000, revalidateOnFocus: true }
  );

  const frames = data?.frames ?? [];
  const hasFrames = frames.length > 0;
  const lastIndex = Math.max(0, frames.length - 1);
  const safeIndex = hasFrames ? Math.min(frameIndex, lastIndex) : 0;
  const currentFrame = frames[safeIndex];

  const stopPlay = useCallback(() => {
    if (playTimer.current) {
      clearInterval(playTimer.current);
      playTimer.current = null;
    }
    setPlaying(false);
  }, []);

  const startPlay = useCallback(() => {
    if (frames.length < 2) return;
    stopPlay();
    setPlaying(true);
    playTimer.current = setInterval(() => {
      setFrameIndex((i) => (i >= lastIndex ? 0 : i + 1));
    }, FRAME_MS);
  }, [frames.length, lastIndex, stopPlay]);

  useEffect(() => {
    if (!hasFrames || !mapRef.current || mapInstance.current) return;

    const map = L.map(mapRef.current, {
      center: [HARLINGEN.latitude, HARLINGEN.longitude],
      zoom: MAP_ZOOM,
      zoomControl: false,
      attributionControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    L.control.zoom({ position: "topright" }).addTo(map);

    mapInstance.current = map;
    setMapReady(true);

    requestAnimationFrame(() => {
      map.invalidateSize();
    });

    return () => {
      stopPlay();
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
        radarLayer.current = null;
      }
      setMapReady(false);
    };
  }, [hasFrames, stopPlay]);

  useEffect(() => {
    if (!mapReady || !data?.host || !currentFrame || !mapInstance.current) {
      return;
    }

    const map = mapInstance.current;

    if (radarLayer.current) {
      map.removeLayer(radarLayer.current);
      radarLayer.current = null;
    }

    const layer = L.tileLayer(
      radarTileUrlTemplate(data.host, currentFrame.tilePath),
      {
        maxZoom: 7,
        opacity: 0.75,
        attribution: '<a href="https://www.rainviewer.com/">RainViewer</a>',
      }
    );
    layer.addTo(map);
    radarLayer.current = layer;
  }, [mapReady, data?.host, currentFrame, safeIndex]);

  useEffect(() => {
    if (hasFrames) {
      setFrameIndex(lastIndex);
    }
  }, [hasFrames, lastIndex, data?.updatedAt]);

  useEffect(() => () => stopPlay(), [stopPlay]);

  if (error && !data) {
    return (
      <Card variant="weather">
        <CardContent>
          <p className="text-sm text-zinc-400">Neerslagradar niet beschikbaar.</p>
        </CardContent>
      </Card>
    );
  }

  if (!isLoading && (!data || !hasFrames)) {
    return (
      <Card variant="weather">
        <CardContent>
          <p className="text-sm text-zinc-400">Geen radarframes beschikbaar.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="weather" className="border-sky-500/20">
      <CardContent>
        <p className="mb-1 border-l-2 border-sky-500/50 pl-2 text-xs uppercase tracking-wide text-zinc-400">
          Neerslagradar
        </p>
        <p className="mb-3 pl-2 text-[10px] text-zinc-500">
          Laatste 2 uur · regio Harlingen
        </p>

        {hasFrames ? (
          <div
            ref={mapRef}
            className="h-[220px] w-full overflow-hidden rounded-xl border border-white/10 [&_.leaflet-control-attribution]:!bg-black/60 [&_.leaflet-control-attribution]:!text-[9px] [&_.leaflet-control-attribution]:!text-zinc-400"
          />
        ) : (
          <Skeleton className="h-[220px] w-full rounded-xl" />
        )}

        <div className="mt-3 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => {
              stopPlay();
              setFrameIndex((i) => Math.max(0, i - 1));
            }}
            disabled={!hasFrames || safeIndex <= 0}
            className="rounded-lg p-2 text-zinc-400 hover:bg-white/10 disabled:opacity-30"
            aria-label="Vorig frame"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => (playing ? stopPlay() : startPlay())}
            disabled={frames.length < 2}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium",
              "bg-sky-500/20 text-sky-200 hover:bg-sky-500/30 disabled:opacity-40"
            )}
          >
            {playing ? (
              <>
                <Pause className="h-3.5 w-3.5" /> Pauze
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5" /> Afspelen
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              stopPlay();
              setFrameIndex((i) => Math.min(lastIndex, i + 1));
            }}
            disabled={!hasFrames || safeIndex >= lastIndex}
            className="rounded-lg p-2 text-zinc-400 hover:bg-white/10 disabled:opacity-30"
            aria-label="Volgend frame"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <p className="mt-2 text-center text-xs text-zinc-400">
          {currentFrame?.label ?? "Laden…"}
          {hasFrames && safeIndex === lastIndex ? (
            <span className="text-sky-300/90"> · nu</span>
          ) : null}
        </p>
      </CardContent>
    </Card>
  );
}
