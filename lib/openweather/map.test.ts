import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { OpenWeatherSupplement } from "@/lib/api/types";
import {
  normalizeDewPointC,
  normalizeHumidityPct,
  normalizeMetricTemp,
} from "./normalize-metrics";
import {
  mapOneCall3,
  mapOpenWeatherSupplement,
  normalizeOpenWeatherSupplement,
} from "./map";
import type { OwForecastResponse, OwOneCallResponse, OwWeatherResponse } from "./types";

const NOW_SEC = Math.floor(Date.now() / 1000);

const oneCallFixture: OwOneCallResponse = {
  current: {
    temp: 12.5,
    feels_like: 11.8,
    clouds: 25,
    visibility: 10_000,
    humidity: 72,
    dew_point: 8.4,
    pressure: 1015,
    uvi: 2.1,
    wind_speed: 4.2,
    wind_deg: 220,
    wind_gust: 6.5,
    weather: [{ id: 801, description: "enkele bewolking", icon: "02d" }],
    rain: { "1h": 0.4 },
  },
  minutely: Array.from({ length: 12 }, (_, i) => ({
    dt: NOW_SEC + i * 60,
    precipitation: i % 3 === 0 ? 0.2 : 0,
  })),
  hourly: Array.from({ length: 10 }, (_, i) => ({
    dt: NOW_SEC + (i + 1) * 3600,
    temp: 12 + i,
    feels_like: 11 + i,
    humidity: 80,
    dew_point: 9,
    pop: 0.2,
    wind_speed: 3.5,
    wind_deg: 180,
    weather: [{ id: 801, description: "bewolkt", icon: "03d" }],
  })),
  daily: Array.from({ length: 5 }, (_, i) => ({
    dt: NOW_SEC + (i + 1) * 86_400,
    sunrise: NOW_SEC + 6 * 3600,
    sunset: NOW_SEC + 20 * 3600,
    temp: { min: 5 + i, max: 14 + i },
    pop: 0.35,
    uvi: 3.2,
    wind_speed: 5.5,
    wind_deg: 250,
    weather: [{ id: 500, description: "lichte regen", icon: "10d" }],
    rain: 2.1,
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
  main: { humidity: 65, temp: 14, pressure: 1018 },
  wind: { speed: 3, deg: 90 },
};

const forecast25: OwForecastResponse = {
  list: Array.from({ length: 16 }, (_, i) => ({
    dt: NOW_SEC + (i + 1) * 10_800,
    main: { temp: 10 + i * 0.5, humidity: 70 },
    pop: 0.1,
    wind: { speed: 2.5, deg: 180 },
    weather: [{ id: 800, description: "helder", icon: "01d" }],
  })),
};

describe("normalize-metrics", () => {
  it("converts Kelvin dew point to Celsius", () => {
    assert.equal(normalizeDewPointC(293.28), 20.1);
  });

  it("rejects humidity below 5%", () => {
    assert.equal(normalizeHumidityPct(1), null);
  });

  it("scales fractional humidity", () => {
    assert.equal(normalizeHumidityPct(0.72), 72);
  });

  it("converts Kelvin temperature", () => {
    assert.equal(normalizeMetricTemp(293.15), 20);
  });
});

describe("mapOneCall3", () => {
  it("maps current, minutely, hourly, daily, alerts and dataSource", () => {
    const result = mapOneCall3(oneCallFixture);

    assert.equal(result.dataSource, "onecall-3");
    assert.equal(result.current.humidityPct, 72);
    assert.equal(result.current.dewPointC, 8.4);
    assert.equal(result.current.tempC, 12.5);
    assert.equal(result.current.pressureHpa, 1015);
    assert.equal(result.current.windSpeedKmh, 15.1);
    assert.equal(result.current.rainMm1h, 0.4);
    assert.equal(result.minutely.length, 12);
    assert.equal(result.hourly.length, 8);
    assert.equal(result.daily.length, 5);
    assert.equal(result.daily[0].uviMax, 3.2);
    assert.ok(result.daily[0].sunriseAt);
    assert.equal(result.alerts.length, 1);
  });

  it("falls back to hourly humidity when current is invalid", () => {
    const broken: OwOneCallResponse = {
      ...oneCallFixture,
      current: {
        ...oneCallFixture.current!,
        humidity: 1,
        dew_point: 234.5,
      },
    };
    const result = mapOneCall3(broken);
    assert.equal(result.current.humidityPct, 80);
    assert.ok(result.current.dewPointC != null && result.current.dewPointC > 0);
  });
});

describe("normalizeOpenWeatherSupplement", () => {
  it("fills missing alerts, minutely and arrays from legacy cached payloads", () => {
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
    assert.deepEqual(result!.minutely, []);
    assert.deepEqual(result!.hourly, []);
    assert.deepEqual(result!.daily, []);
    assert.equal(result!.dataSource, "2.5");
  });

  it("re-normalizes invalid cached humidity", () => {
    const legacy: Partial<OpenWeatherSupplement> = {
      current: {
        description: "regen",
        icon: "",
        weatherId: 500,
        tempC: 12,
        feelsLikeC: 11,
        cloudsPct: 100,
        visibilityKm: 10,
        humidityPct: 1,
        dewPointC: -38.7,
        pressureHpa: 1010,
        uvi: 0,
        windSpeedKmh: 10,
        windDeg: 180,
        windGustKmh: null,
        rainMm1h: null,
        snowMm1h: null,
      },
      minutely: [],
      hourly: [],
      daily: [],
      alerts: [],
      dataSource: "onecall-3",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };

    const result = normalizeOpenWeatherSupplement(legacy);
    assert.equal(result!.current.humidityPct, null);
    assert.equal(result!.current.dewPointC, null);
  });
});

describe("mapOpenWeatherSupplement", () => {
  it("maps 2.5 data with empty minutely and dataSource 2.5", () => {
    const result = mapOpenWeatherSupplement(weather25, forecast25);

    assert.equal(result.dataSource, "2.5");
    assert.deepEqual(result.minutely, []);
    assert.equal(result.current.humidityPct, 65);
    assert.equal(result.current.windSpeedKmh, 10.8);
    assert.ok(result.hourly.length > 0);
    assert.ok(result.daily.length > 0);
  });
});
