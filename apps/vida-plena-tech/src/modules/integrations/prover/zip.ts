import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import AdmZip from "adm-zip";
import type {
  ProverPerson,
  ProverGroup,
  ProverGroupFunction,
  ProverGcParticipant,
  ProverGcVisitor,
  ProverGcMeeting,
  ProverGcMeetingAttendance,
  ProverGcMeetingVisit,
  ProverEvent,
  ProverEventSession,
  ProverEventRegistration,
  ProverEventAttendance,
  ProverTeaching,
  ProverTeachingModule,
  ProverTeachingLesson,
  ProverTeachingSession,
  ProverTeachingRegistration,
  ProverTeachingAttendance,
} from "./types";

// ─────────────────────────────────────────────────────────────────────────
// LEITURA DO EXPORT Prover (LOCAL, SOMENTE LEITURA)
//
// Lê um ZIP exportado do Prover e extrai um JSON (pessoas.json/grupos.json).
// Para conveniência de teste, também aceita um caminho direto para um `.json`.
// NUNCA escreve no Prover nem em lugar nenhum.
// ─────────────────────────────────────────────────────────────────────────

export interface LoadedJson<T> {
  fileName: string;
  sourceFileHash: string; // sha256 do conteúdo (rastreabilidade/idempotência)
  records: T[];
}

/**
 * Lê `entryName` (ex.: "pessoas.json"/"grupos.json") de um .zip, ou um .json
 * direto. Aceita array no topo OU { <key>: [...] } / { data: [...] }.
 */
function loadEntry<T>(filePath: string, entryName: string): LoadedJson<T> {
  const fileName = path.basename(filePath);
  let jsonText: string;

  if (filePath.toLowerCase().endsWith(".zip")) {
    let zip: AdmZip;
    try {
      zip = new AdmZip(filePath);
    } catch {
      throw new Error(`Não foi possível abrir o ZIP: ${filePath}`);
    }
    const entry =
      zip.getEntries().find((e) => e.entryName.toLowerCase().endsWith(entryName)) ?? null;
    if (!entry) throw new Error(`Arquivo \`${entryName}\` não encontrado dentro do ZIP.`);
    jsonText = zip.readAsText(entry);
  } else if (filePath.toLowerCase().endsWith(".json")) {
    try {
      jsonText = readFileSync(filePath, "utf8");
    } catch {
      throw new Error(`Não foi possível ler o arquivo JSON: ${filePath}`);
    }
  } else {
    throw new Error(`Informe um .zip do Prover (ou um .json de teste para ${entryName}).`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error(`\`${entryName}\` não é um JSON válido.`);
  }

  const records = Array.isArray(parsed)
    ? parsed
    : (parsed as Record<string, unknown>)?.[entryName.replace(/\.json$/, "")] ??
      (parsed as { data?: unknown })?.data;

  if (!Array.isArray(records)) {
    throw new Error(`\`${entryName}\` deve conter um array (ou { ...: [...] }).`);
  }

  const sourceFileHash = createHash("sha256").update(jsonText).digest("hex");
  return { fileName, sourceFileHash, records: records as T[] };
}

export interface LoadedPessoas {
  fileName: string;
  sourceFileHash: string;
  pessoas: ProverPerson[];
}

export function loadProverPessoas(filePath: string): LoadedPessoas {
  const { fileName, sourceFileHash, records } = loadEntry<ProverPerson>(filePath, "pessoas.json");
  return { fileName, sourceFileHash, pessoas: records };
}

export interface LoadedGrupos {
  fileName: string;
  sourceFileHash: string;
  grupos: ProverGroup[];
}

export function loadProverGroups(filePath: string): LoadedGrupos {
  const { fileName, sourceFileHash, records } = loadEntry<ProverGroup>(filePath, "grupos.json");
  return { fileName, sourceFileHash, grupos: records };
}

export interface LoadedGroupFunctions {
  fileName: string;
  sourceFileHash: string;
  funcoes: ProverGroupFunction[];
}

export function loadProverGroupFunctions(filePath: string): LoadedGroupFunctions {
  const { fileName, sourceFileHash, records } = loadEntry<ProverGroupFunction>(
    filePath,
    "hierarquia_grupo_funcao.json",
  );
  return { fileName, sourceFileHash, funcoes: records };
}

export function loadProverGcParticipants(filePath: string): { sourceFileHash: string; participantes: ProverGcParticipant[] } {
  const { sourceFileHash, records } = loadEntry<ProverGcParticipant>(filePath, "grupos_participantes.json");
  return { sourceFileHash, participantes: records };
}

export function loadProverGcVisitors(filePath: string): { sourceFileHash: string; visitantes: ProverGcVisitor[] } {
  const { sourceFileHash, records } = loadEntry<ProverGcVisitor>(filePath, "grupos_visitantes.json");
  return { sourceFileHash, visitantes: records };
}

// ── Encontros e presenças de GC (Fase 4A) ──────────────────────────────────
export function loadProverGcMeetings(filePath: string): { sourceFileHash: string; meetings: ProverGcMeeting[] } {
  const { sourceFileHash, records } = loadEntry<ProverGcMeeting>(filePath, "grupos_encontros.json");
  return { sourceFileHash, meetings: records };
}

export function loadProverGcMeetingParticipants(filePath: string): { participants: ProverGcMeetingAttendance[] } {
  const { records } = loadEntry<ProverGcMeetingAttendance>(filePath, "grupos_encontros_participantes.json");
  return { participants: records };
}

export function loadProverGcMeetingVisitors(filePath: string): { visitors: ProverGcMeetingAttendance[] } {
  const { records } = loadEntry<ProverGcMeetingAttendance>(filePath, "grupos_encontros_visitantes.json");
  return { visitors: records };
}

/** `grupos_encontros_visitas.json` — vazio neste export ([]); retorna []. */
export function loadProverGcMeetingVisits(filePath: string): { visits: ProverGcMeetingVisit[] } {
  const { records } = loadEntry<ProverGcMeetingVisit>(filePath, "grupos_encontros_visitas.json");
  return { visits: records };
}

// ── Eventos (Fase 5A) ──────────────────────────────────────────────────────
export function loadProverEvents(filePath: string): { sourceFileHash: string; events: ProverEvent[] } {
  const { sourceFileHash, records } = loadEntry<ProverEvent>(filePath, "evento_eventos.json");
  return { sourceFileHash, events: records };
}
export function loadProverEventSessions(filePath: string): { sessions: ProverEventSession[] } {
  const { records } = loadEntry<ProverEventSession>(filePath, "evento_encontros_eventos.json");
  return { sessions: records };
}
export function loadProverEventRegistrations(filePath: string): { registrations: ProverEventRegistration[] } {
  const { records } = loadEntry<ProverEventRegistration>(filePath, "evento_inscritos_eventos.json");
  return { registrations: records };
}
export function loadProverEventAttendances(filePath: string): { attendances: ProverEventAttendance[] } {
  const { records } = loadEntry<ProverEventAttendance>(filePath, "evento_presenca_eventos.json");
  return { attendances: records };
}
// ── Ensino / TD (Fase 6A) ──────────────────────────────────────────────────
export function loadProverTeachings(filePath: string): { sourceFileHash: string; teachings: ProverTeaching[] } {
  const { sourceFileHash, records } = loadEntry<ProverTeaching>(filePath, "ensino_ensinos.json");
  return { sourceFileHash, teachings: records };
}
export function loadProverTeachingModules(filePath: string): { modules: ProverTeachingModule[] } {
  return { modules: loadEntry<ProverTeachingModule>(filePath, "ensino_modulos.json").records };
}
export function loadProverTeachingLessons(filePath: string): { lessons: ProverTeachingLesson[] } {
  return { lessons: loadEntry<ProverTeachingLesson>(filePath, "ensino_aulas.json").records };
}
export function loadProverTeachingSessions(filePath: string): { sessions: ProverTeachingSession[] } {
  return { sessions: loadEntry<ProverTeachingSession>(filePath, "ensino_encontros_ensinos.json").records };
}
export function loadProverTeachingRegistrations(filePath: string): { registrations: ProverTeachingRegistration[] } {
  return { registrations: loadEntry<ProverTeachingRegistration>(filePath, "ensino_inscritos_ensinos.json").records };
}
export function loadProverTeachingAttendances(filePath: string): { attendances: ProverTeachingAttendance[] } {
  return { attendances: loadEntry<ProverTeachingAttendance>(filePath, "ensino_presenca_ensinos.json").records };
}

/** Conta linhas de um arquivo auxiliar (documentação; retorna 0 se ausente). */
export function countProverEntry(filePath: string, entryName: string): number {
  try {
    return loadEntry<unknown>(filePath, entryName).records.length;
  } catch {
    return 0;
  }
}
