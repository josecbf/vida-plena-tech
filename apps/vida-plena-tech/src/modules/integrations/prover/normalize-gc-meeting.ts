// ─────────────────────────────────────────────────────────────────────────
// NORMALIZAÇÃO de encontros/presenças de GC (Fase 4A) — FUNÇÕES PURAS.
//
// grupos_encontros.json: encontro_id, grupo_id, data_inicio, tema, local,
//   status (agendado|realizado|cancelado).
// grupos_encontros_participantes|visitantes.json: encontro_id, grupo_id,
//   pessoa_uuid, pessoa_nome, presenca ("1"|"0"|null), data_inicio.
// NUNCA escreve nada.
// ─────────────────────────────────────────────────────────────────────────

import type { ProverGcMeeting, ProverGcMeetingAttendance } from "./types";

function clean(v?: string | null): string | null {
  const t = (v ?? "").toString().trim();
  return t.length > 0 ? t : null;
}

/** Aceita "yyyy-mm-dd hh:mm:ss", "yyyy-mm-dd" ou ISO. Retorna Date ou null. */
export function parseProverDateTime(s?: string | null): Date | null {
  const t = clean(s);
  if (!t) return null;
  const m = t.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/);
  if (!m) return null;
  const [, y, mo, d, hh = "00", mi = "00", ss = "00"] = m;
  const date = new Date(`${y}-${mo}-${d}T${hh}:${mi}:${ss}.000Z`);
  return isNaN(date.getTime()) ? null : date;
}

export interface NormalizedGcMeeting {
  encontroId: string;
  grupoId: string;
  date: Date | null;
  dateDay: string | null; // yyyy-mm-dd p/ deduplicação por GC/dia
  tema: string | null;
  local: string | null;
  status: string | null; // agendado | realizado | cancelado
  happened: boolean; // status === realizado
  cancelled: boolean; // status === cancelado
}

export function normalizeGcMeeting(raw: ProverGcMeeting): NormalizedGcMeeting {
  const date = parseProverDateTime(raw.data_inicio);
  const status = (clean(raw.status) ?? "").toLowerCase() || null;
  return {
    encontroId: clean(raw.encontro_id) ?? "",
    grupoId: clean(raw.grupo_id) ?? "",
    date,
    dateDay: date ? date.toISOString().slice(0, 10) : null,
    tema: clean(raw.tema),
    local: clean(raw.local),
    status,
    happened: status === "realizado",
    cancelled: status === "cancelado",
  };
}

export type AttendanceMark = "PRESENT" | "ABSENT" | "NONE";
export type AttendanceSource = "PARTICIPANT" | "VISITOR";

export interface NormalizedGcAttendance {
  encontroId: string;
  grupoId: string;
  personUuid: string | null;
  personName: string | null;
  date: Date | null;
  mark: AttendanceMark; // "1"→PRESENT, "0"→ABSENT, null→NONE (não registrado)
  source: AttendanceSource;
}

export function normalizeGcAttendance(raw: ProverGcMeetingAttendance, source: AttendanceSource): NormalizedGcAttendance {
  const p = clean(raw.presenca);
  const mark: AttendanceMark = p === "1" ? "PRESENT" : p === "0" ? "ABSENT" : "NONE";
  return {
    encontroId: clean(raw.encontro_id) ?? "",
    grupoId: clean(raw.grupo_id) ?? "",
    personUuid: clean(raw.pessoa_uuid),
    personName: clean(raw.pessoa_nome),
    date: parseProverDateTime(raw.data_inicio),
    mark,
    source,
  };
}
