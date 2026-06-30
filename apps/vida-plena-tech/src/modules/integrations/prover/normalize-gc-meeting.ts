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

export type MeetingStatusEnum = "SCHEDULED" | "HELD" | "CANCELED" | "UNKNOWN";

export interface NormalizedGcMeeting {
  encontroId: string;
  grupoId: string;
  date: Date | null;
  endAt: Date | null;
  dateDay: string | null; // yyyy-mm-dd p/ deduplicação por GC/dia
  tema: string | null;
  local: string | null;
  notes: string | null; // observacao || resumo || pauta
  sourceStatus: string | null; // status cru do Prover
  statusEnum: MeetingStatusEnum;
  happened: boolean; // status === realizado
  cancelled: boolean; // status === cancelado
  unknownStatus: boolean;
  meta: { oferta: string | null; numCriancas: string | null; quilosDoados: string | null };
}

/** agendado→SCHEDULED, realizado→HELD, cancelado→CANCELED, outro→UNKNOWN. */
export function meetingStatusEnum(rawStatus?: string | null): { statusEnum: MeetingStatusEnum; happened: boolean; cancelled: boolean; unknown: boolean } {
  const s = (clean(rawStatus) ?? "").toLowerCase();
  if (s === "realizado") return { statusEnum: "HELD", happened: true, cancelled: false, unknown: false };
  if (s === "agendado") return { statusEnum: "SCHEDULED", happened: false, cancelled: false, unknown: false };
  if (s === "cancelado") return { statusEnum: "CANCELED", happened: false, cancelled: true, unknown: false };
  return { statusEnum: "UNKNOWN", happened: false, cancelled: false, unknown: true };
}

export function normalizeGcMeeting(raw: ProverGcMeeting): NormalizedGcMeeting {
  const date = parseProverDateTime(raw.data_inicio);
  const sourceStatus = clean(raw.status);
  const m = meetingStatusEnum(sourceStatus);
  return {
    encontroId: clean(raw.encontro_id) ?? "",
    grupoId: clean(raw.grupo_id) ?? "",
    date,
    endAt: parseProverDateTime(raw.data_fim),
    dateDay: date ? date.toISOString().slice(0, 10) : null,
    tema: clean(raw.tema),
    local: clean(raw.local),
    notes: clean(raw.observacao) ?? clean(raw.resumo) ?? clean(raw.pauta),
    sourceStatus: sourceStatus ? sourceStatus.toLowerCase() : null,
    statusEnum: m.statusEnum,
    happened: m.happened,
    cancelled: m.cancelled,
    unknownStatus: m.unknown,
    meta: { oferta: clean(raw.oferta), numCriancas: clean(raw.num_criancas), quilosDoados: clean(raw.quilos_doados) },
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
