import { test } from "node:test";
import assert from "node:assert/strict";
import { mapCycle } from "./map-status";

test("lopende katoen-was met resttijd en vergrendelde deur", () => {
  const cycle = mapCycle(
    {
      machine_status: "2",
      Current_program_phase: "3",
      Selected_program_ID: "7",
      Selected_program_remaining_time_in_minutes: "209",
      Door_status: "3",
      Spin_speed_rpm: "14",
      temperature: "4",
      error_code: "0",
      Child_lock: "0",
    },
    true,
  );
  assert.equal(cycle.state, "running");
  assert.equal(cycle.program, "Katoen");
  assert.equal(cycle.phase, "Wassen");
  assert.equal(cycle.mode, "wash");
  assert.equal(cycle.remainingMinutes, 209);
  assert.equal(cycle.door, "locked");
  assert.equal(cycle.spinRpm, 1400);
  assert.equal(cycle.temperature, "40 °C");
  assert.equal(cycle.errorCode, null);
  assert.equal(cycle.childLock, false);
});

test("uit: geen programma of resttijd, deur open", () => {
  const cycle = mapCycle(
    { machine_status: "0", Selected_program_ID: "9", Selected_program_remaining_time_in_minutes: "1", Door_status: "1" },
    true,
  );
  assert.equal(cycle.state, "off");
  assert.equal(cycle.program, null);
  assert.equal(cycle.remainingMinutes, null);
  assert.equal(cycle.door, "open");
});

test("klaar na drogen", () => {
  const cycle = mapCycle(
    { machine_status: "1", Current_program_phase: "10", Selected_program_ID: "22", Door_status: "3" },
    true,
  );
  assert.equal(cycle.state, "finished");
  assert.equal(cycle.phase, "Klaar");
  assert.equal(cycle.mode, "wash_dry");
  assert.equal(cycle.door, "closed");
});

test("storing wint van status; onbekende codes als nummer", () => {
  const cycle = mapCycle(
    { machine_status: "2", Current_program_phase: "6", Selected_program_ID: "99", error_code: "11" },
    true,
  );
  assert.equal(cycle.state, "error");
  assert.equal(cycle.errorCode, "11");
  assert.equal(cycle.program, "Programma 99");
  assert.equal(cycle.phase, "Fase 6");
});

test("offline: geen deurstand", () => {
  const cycle = mapCycle({ machine_status: "2", Door_status: "3" }, false);
  assert.equal(cycle.state, "offline");
  assert.equal(cycle.door, null);
  assert.equal(cycle.mode, null);
});
