import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { OpenWeatherSupplement } from "@/lib/api/types";
import {
  mapOneCall3,
  mapOpenWeatherSupplement,
  normalizeOpenWeatherSupplement,
} from "./map";
import type { OwForecastResponse, OwOneCallResponse, OwWeatherResponse } from "./types";

const NOW_SEC = Math.floor(Date.now() / 1000);

const oneCallFixture: OwOneCallResponse = {
  current: {
    clouds: 25,
    visibility: 10_000,
    humidity: 72,
    dew_point: 8.4,
    weather: [{ id: 801, description: "enkele bewolking", icon: "02d" }],
  },
  hourly: Array.from({ length: 10 }, (_, i) => ({
    dt: NOW_SEC + (i + 1) * 3600,
    temp: 12 + i,
    pop: 0.2,
    weather: [{ id: 801, description: "bewolkt", icon: "03d" }],
  })),
  daily: Array.from({ length: 5 }, (_, i) => ({
    dt: NOW_SEC + (i + 1) * 86_400,
    temp: { min: 5 + i, max: 14 + i },
    pop: 0.35,
    weather: [{ id: 500, description: "lichte regen", icon: "10d" }],
  })),
  alerts: [
    {
      sender_name: "KNMI",
      event: "Code geel wind",
      start: NOW_SEC,
      end: NOW_SEC + 7200,
      description: "Zuidwestelijke wind, windstoten 70-80 km/u.",
    },
  ],
};

const weather25: OwWeatherResponse = {
  weather: [{ id: 800, description: "helder", icon: "01d" }],
  visibility: 10_000,
  clouds: { all: 0 },
  main: { humidity: 65 },
};

const forecast25: OwForecastResponse = {
  list: Array.from({ length: 16 }, (_, i) => ({
    dt: NOW_SEC + (i + 1) * 10_800,
    main: { temp: 10 + i * 0.5 },
    pop: 0.1,
    weather: [{ id: 800, description: "helder", icon: "01d" }],
  })),
};

describe("mapOneCall3", () => {
  it("maps current, hourly, daily, alerts and dataSource", () => {
    const result = mapOneCall3(oneCallFixture);

    assert.equal(result.dataSource, "onecall-3");
    assert.equal(result.current.humidityPct, 72);
    assert.equal(result.current.dewPointC, 8.4);
    assert.equal(result.current.weatherId, 801);
    assert.equal(result.hourly.length, 8);
    assert.equal(result.daily.length, 5);
    assert.equal(result.alerts.length, 1);
    assert.equal(result.alerts[0].event, "Code geel wind");
    assert.equal(result.alerts[0].senderName, "KNMI");
    assert.match(result.alerts[0].startAt, /\d/);
  });
});

describe("normalizeOpenWeatherSupplement", () => {
  it("fills missing alerts and arrays from legacy cached payloads", () => {
    const legacy = {
      current: {
        description: "helder",
        icon: "",
        weatherId: 800,
        cloudsPct: 0,
        visibilityKm: 10,
        humidityPct: 50,
        dewPointC: null,
      },
      hourly: undefined,
      daily: undefined,
      updatedAt: "2026-01-01T00:00:00.000Z",
    } as unknown as Partial<OpenWeatherSupplement>;

    const result = normalizeOpenWeatherSupplement(legacy);
    assert.ok(result);
    assert.deepEqual(result!.alerts, []);
    assert.deepEqual(result!.hourly, []);
    assert.deepEqual(result!.daily, []);
    assert.equal(result!.dataSource, "2.5");
  });
});

describe("mapOpenWeatherSupplement", () => {
  it("maps 2.5 data with empty alerts and dataSource 2.5", () => {
    const result = mapOpenWeatherSupplement(weather25, forecast25);

    assert.equal(result.dataSource, "2.5");
    assert.deepEqual(result.alerts, []);
    assert.equal(result.current.humidityPct, 65);
    assert.equal(result.current.dewPointC, null);
    assert.ok(result.hourly.length > 0);
    assert.ok(result.daily.length > 0);
  });
});
