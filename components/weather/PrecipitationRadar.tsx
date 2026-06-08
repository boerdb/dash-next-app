"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import useSWR from "swr";
import {
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
} from "lucide-react";
import L, { type Map as LeafletMap, type TileLayer } from "leaflet";
import type { WeerRadarResponse } from "@/lib/api/types";
import {
  BASE_TILE_ATTRIBUTION,
  BASE_TILE_URL,
  HARLINGEN_MARKER,
  LABELS_TILE_URL,
  NL_MAP_CENTER,
  NL_MAP_MAX_ZOOM,
  NL_MAP_MIN_ZOOM,
  NL_MAP_ZOOM,
  RADAR_LAYER_OPACITY,
} from "@/lib/radar/map-config";
import { radarTileUrlTemplate } from "@/lib/radar/rainviewer";
import { jsonFetcher } from "@/lib/fetcher";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import "leaflet/dist/leaflet.css";

const FRAME_MS = 600;
const MAP_HEIGHT = 280;
/** RainViewer ververst elke ~10 min; poll elke minuut voor nieuwste frame. */
const RADAR_POLL_MS = 60_000;

export function PrecipitationRadar() {
  const mapInstance = useRef<LeafletMap | null>(null);
  const radarLayer = useRef<TileLayer | null>(null);
  const playTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const mapContainer = useRef<HTMLDivElement | null>(null);

  const [frameIndex, setFrameIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [followLive, setFollowLive] = useState(true);
  const [mapReady, setMapReady] = useState(false);

  const { data, error, isLoading, mutate } = useSWR<WeerRadarResponse>(
    "/api/weer/radar",
    jsonFetcher,
    {
      refreshInterval: RADAR_POLL_MS,
      refreshWhenHidden: true,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    }
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
    setFollowLive(false);
    setPlaying(true);
    playTimer.current = setInterval(() => {
      setFrameIndex((i) => (i >= lastIndex ? 0 : i + 1));
    }, FRAME_MS);
  }, [frames.length, lastIndex, stopPlay]);

  const destroyMap = useCallback(() => {
    if (mapInstance.current) {
      mapInstance.current.remove();
      mapInstance.current = null;
      radarLayer.current = null;
      setMapReady(false);
    }
  }, []);

  const initMap = useCallback(
    (container: HTMLDivElement) => {
      if (mapInstance.current) return;

      const map = L.map(container, {
        center: [NL_MAP_CENTER.lat, NL_MAP_CENTER.lng],
        zoom: NL_MAP_ZOOM,
        minZoom: NL_MAP_MIN_ZOOM,
        maxZoom: NL_MAP_MAX_ZOOM,
        zoomControl: true,
        attributionControl: true,
      });

      map.createPane("radarPane");
      const radarPane = map.getPane("radarPane");
      if (radarPane) radarPane.style.zIndex = "350";

      map.createPane("labelsPane");
      const labelsPane = map.getPane("labelsPane");
      if (labelsPane) labelsPane.style.zIndex = "450";

      L.tileLayer(BASE_TILE_URL, {
        maxZoom: NL_MAP_MAX_ZOOM,
        attribution: BASE_TILE_ATTRIBUTION,
      }).addTo(map);

      L.tileLayer(LABELS_TILE_URL, {
        maxZoom: NL_MAP_MAX_ZOOM,
        pane: "labelsPane",
      }).addTo(map);

      L.circleMarker(
        [HARLINGEN_MARKER.latitude, HARLINGEN_MARKER.longitude],
        {
          radius: 7,
          color: "#1e293b",
          weight: 2,
          fillColor: "#fbbf24",
          fillOpacity: 1,
        }
      )
        .addTo(map)
        .bindTooltip("Harlingen", { permanent: false, direction: "top" });

      mapInstance.current = map;
      setMapReady(true);

      requestAnimationFrame(() => {
        map.invalidateSize();
      });
    },
    []
  );

  const setMapContainerRef = useCallback(
    (node: HTMLDivElement | null) => {
      mapContainer.current = node;
      if (!node) {
        destroyMap();
        return;
      }
      initMap(node);
    },
    [destroyMap, initMap]
  );

  useLayoutEffect(() => {
    const map = mapInstance.current;
    const el = mapContainer.current;
    if (!map || !el) return;

    map.invalidateSize();

    const ro = new ResizeObserver(() => {
      map.invalidateSize();
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [mapReady]);

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
        pane: "radarPane",
        minZoom: NL_MAP_MIN_ZOOM,
        maxZoom: NL_MAP_MAX_ZOOM,
        opacity: RADAR_LAYER_OPACITY,
        attribution:
          '<a href="https://www.rainviewer.com/">RainViewer</a>',
      }
    );
    layer.addTo(map);
    radarLayer.current = layer;
  }, [mapReady, data?.host, currentFrame, safeIndex]);

  useEffect(() => {
    if (playing || !followLive || !hasFrames) return;
    setFrameIndex(lastIndex);
  }, [playing, followLive, hasFrames, lastIndex, data?.generated]);

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
          Nederland · kustlijnen door neerslag · gele stip = Harlingen
        </p>

        <div
          ref={setMapContainerRef}
          className="radar-map z-0 w-full overflow-hidden rounded-xl border border-white/10"
          style={{ height: MAP_HEIGHT }}
        />

        <div className="mt-3 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => {
              stopPlay();
              setFollowLive(false);
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
              setFrameIndex((i) => {
                const next = Math.min(lastIndex, i + 1);
                if (next >= lastIndex) setFollowLive(true);
                else setFollowLive(false);
                return next;
              });
            }}
            disabled={!hasFrames || safeIndex >= lastIndex}
            className="rounded-lg p-2 text-zinc-400 hover:bg-white/10 disabled:opacity-30"
            aria-label="Volgend frame"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-2 flex items-center justify-center gap-2 text-xs text-zinc-400">
          <span>
            {currentFrame?.label ?? "Laden…"}
            {followLive && safeIndex === lastIndex ? (
              <span className="text-sky-300/90"> · live</span>
            ) : null}
          </span>
          {!followLive ? (
            <button
              type="button"
              onClick={() => {
                stopPlay();
                setFollowLive(true);
                setFrameIndex(lastIndex);
                void mutate();
              }}
              className="rounded-md bg-sky-500/20 px-2 py-0.5 text-sky-200 hover:bg-sky-500/30"
            >
              Nu
            </button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
