const start = "2026-05-16T00:00:00.000Z";
const end = "2026-05-17T23:59:59.999Z";

const attempts = [
  { locationCodes: "Harlingen(HARLGN)", tz: "E. Europe Standard Time" },
  { locationCodes: "HARLGN", tz: "E. Europe Standard Time" },
  { locationCodes: "Harlingen (HARLGN)", tz: "W. Europe Standard Time" },
  { locationCode: "Harlingen(HARLGN)", tz: "W. Europe Standard Time" },
];

for (const a of attempts) {
  const params = new URLSearchParams({
    mapType: "astronomische-getij",
    getijReference: "NAP",
    timeZone: a.tz,
    startDate: start,
    endDate: end,
  });
  if (a.locationCodes) params.set("locationCodes", a.locationCodes);
  if (a.locationCode) params.set("locationCode", a.locationCode);

  const url = `https://waterinfo.rws.nl/api/chart/get?${params}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  const text = await res.text();
  console.log("\n", a, "->", res.status, text.slice(0, 300));
}
