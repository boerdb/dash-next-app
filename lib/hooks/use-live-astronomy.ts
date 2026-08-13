"use client";

import { useEffect, useMemo, useState } from "react";
import { getAstronomyInfo, toAstronomieApi } from "@/lib/astronomy/sun-moon";
import type { AstronomieApi } from "@/lib/api/types";

const defaultAstro: AstronomieApi = {
  period: "day",
  sunriseLabel: "—",
  sunsetLabel: "—",
  daylightHoursLabel: "—",
  sunProgress: 0.5,
  sunBelowHorizon: false,
  sunAltitudeDeg: 0,
  moon: {
    phase: 0.5,
    fraction: 0.5,
    label: "Maan",
    illuminationPct: 50,
    riseLabel: null,
    setLabel: null,
  },
};

function readAstro(at = new Date()): AstronomieApi {
  try {
    return toAstronomieApi(getAstronomyInfo(at));
  } catch {
    return defaultAstro;
  }
}

/** Zon/maan-periode altijd van de klok — niet van een gecachte API. */
export function useLiveAstronomy(): AstronomieApi {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const id = window.setInterval(tick, 60_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", tick);
    window.addEventListener("pageshow", tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", tick);
      window.removeEventListener("pageshow", tick);
    };
  }, []);

  return useMemo(() => readAstro(new Date(now)), [now]);
}
