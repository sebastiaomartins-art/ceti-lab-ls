import { createServerFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";
import { redirect } from "@tanstack/react-router";
import { createHash, timingSafeEqual } from "node:crypto";

import { currentWeekKey, type Booking, type WeekData } from "./agenda";

type GateSession = { unlocked?: boolean };

function sessionConfig() {
  return {
    password: process.env["SESSION_SECRET"]!,
    name: "ceti-lab-gate",
    maxAge: 60 * 60 * 24 * 30,
    cookie: { httpOnly: true, secure: true, sameSite: "lax" as const, path: "/" },
  };
}

function matches(input: string, expected: string): boolean {
  const a = createHash("sha256").update(input, "utf8").digest();
  const b = createHash("sha256").update(expected, "utf8").digest();
  return timingSafeEqual(a, b);
}

async function requireUnlocked() {
  const session = await useSession<GateSession>(sessionConfig());
  if (!session.data.unlocked) throw redirect({ to: "/entrar" });
}

async function db() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export const unlockSite = createServerFn({ method: "POST" })
  .inputValidator((data: { password: string }) => ({
    password: String(data?.password ?? "").slice(0, 200),
  }))
  .handler(async ({ data }) => {
    const expected = process.env["SITE_PASSWORD"];
    if (!expected) throw new Error("SITE_PASSWORD não configurada");
    if (!matches(data.password, expected)) return { ok: false as const };
    const session = await useSession<GateSession>(sessionConfig());
    await session.update({ unlocked: true });
    return { ok: true as const };
  });

export const lockSite = createServerFn({ method: "POST" }).handler(async () => {
  const session = await useSession<GateSession>(sessionConfig());
  await session.clear();
  return { ok: true as const };
});

export const getAgenda = createServerFn({ method: "GET" })
  .inputValidator((data?: { weekKey?: string }) => ({
    weekKey: data?.weekKey ? String(data.weekKey).slice(0, 10) : undefined,
  }))
  .handler(async ({ data }) => {
    await requireUnlocked();
    const supabase = await db();
    const weekKey = data.weekKey ?? currentWeekKey();

    const [rowsRes, weeksRes] = await Promise.all([
      supabase
        .from("agendamentos")
        .select("day_id, slot_id, turma, professor, disciplina, created_at")
        .eq("week_key", weekKey),
      supabase.from("agendamentos").select("week_key"),
    ]);
    if (rowsRes.error) throw new Error(rowsRes.error.message);
    if (weeksRes.error) throw new Error(weeksRes.error.message);

    const week: WeekData = {};
    for (const r of rowsRes.data ?? []) {
      week[`${r.day_id}|${r.slot_id}`] = {
        professor: r.professor,
        turma: r.turma,
        disciplina: r.disciplina ?? "",
        criadoEm: r.created_at,
      } satisfies Booking;
    }

    const weeks = [
      ...new Set([currentWeekKey(), ...(weeksRes.data ?? []).map((r) => r.week_key)]),
    ].sort().reverse();

    return { weekKey, week, weeks };
  });

export const createBooking = createServerFn({ method: "POST" })
  .inputValidator((data: {
    weekKey: string;
    dayId: string;
    slotId: string;
    turma: string;
    professor: string;
    disciplina?: string;
  }) => ({
    weekKey: String(data.weekKey).slice(0, 10),
    dayId: String(data.dayId).slice(0, 8),
    slotId: String(data.slotId).slice(0, 8),
    turma: String(data.turma).trim().slice(0, 80),
    professor: String(data.professor).trim().slice(0, 80),
    disciplina: String(data.disciplina ?? "").trim().slice(0, 80),
  }))
  .handler(async ({ data }) => {
    await requireUnlocked();
    if (!data.turma || !data.professor) throw new Error("Turma e professor são obrigatórios.");
    if (data.weekKey !== currentWeekKey()) {
      throw new Error("Só é possível agendar na semana atual.");
    }
    const supabase = await db();
    const { error } = await supabase.from("agendamentos").insert({
      week_key: data.weekKey,
      day_id: data.dayId,
      slot_id: data.slotId,
      turma: data.turma,
      professor: data.professor,
      disciplina: data.disciplina || null,
    });
    if (error) throw new Error("Este horário já está agendado.");
    return { ok: true as const };
  });

export const deleteBooking = createServerFn({ method: "POST" })
  .inputValidator((data: { weekKey: string; dayId: string; slotId: string; password: string }) => ({
    weekKey: String(data.weekKey).slice(0, 10),
    dayId: String(data.dayId).slice(0, 8),
    slotId: String(data.slotId).slice(0, 8),
    password: String(data.password ?? "").slice(0, 200),
  }))
  .handler(async ({ data }) => {
    await requireUnlocked();
    const expected = process.env["ADMIN_PASSWORD"];
    if (!expected) throw new Error("ADMIN_PASSWORD não configurada");
    if (!matches(data.password, expected)) return { ok: false as const };

    const supabase = await db();
    const { error } = await supabase
      .from("agendamentos")
      .delete()
      .eq("week_key", data.weekKey)
      .eq("day_id", data.dayId)
      .eq("slot_id", data.slotId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
