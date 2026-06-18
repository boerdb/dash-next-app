import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  BATTERIJ_MODI,
  BATTERIJ_PERMISSIONS,
  updateBatterijGroep,
} from "@/lib/homewizard/battery";
import {
  energieP1BatteriesUrl,
  energieP1Token,
} from "@/lib/env.server";

const controlSchema = z
  .object({
    mode: z.enum(BATTERIJ_MODI).optional(),
    permissions: z.array(z.enum(BATTERIJ_PERMISSIONS)).optional(),
    charge_to_full: z.boolean().optional(),
  })
  .refine(
    (data) =>
      data.mode != null ||
      data.permissions != null ||
      data.charge_to_full != null,
    { message: "Minstens één instelling is vereist" }
  );

export async function POST(req: NextRequest) {
  if (!energieP1Token) {
    return NextResponse.json(
      { error: "ENERGIE_P1_TOKEN niet geconfigureerd" },
      { status: 503 }
    );
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige JSON" }, { status: 400 });
  }

  const parsed = controlSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Ongeldige aanvraag" },
      { status: 400 }
    );
  }

  const result = await updateBatterijGroep(
    energieP1BatteriesUrl,
    energieP1Token,
    parsed.data
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: result.status });
  }

  return NextResponse.json({ groep: result.groep });
}
