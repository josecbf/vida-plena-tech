// ─────────────────────────────────────────────────────────────────────────
// NORMALIZAÇÃO Prover → Vida Plena Tech (Pessoas) — FUNÇÕES PURAS
//
// Sem dependências externas (testável isoladamente). Ver mapeamento e regras
// em docs/modules/prover-import-plan.md. NUNCA escreve em lugar nenhum.
//
// IMPORTANTE: ambiguidades viram WARNING/PENDÊNCIA, não invenção de regra.
// ─────────────────────────────────────────────────────────────────────────

import type { ProverPerson } from "./types";

export type CpfClass = "VALID" | "MISSING" | "INVALID" | "PLACEHOLDER";

export type EclStatus =
  | "VISITOR"
  | "REGULAR_ATTENDER"
  | "MEMBERSHIP_INTERESTED"
  | "MEMBER"
  | "INACTIVE"
  | "AWAY"
  | "TRANSFERRED"
  | "ARCHIVED";

export type IntendedRole =
  | "GC_LEADER"
  | "SUPERVISOR"
  | "COORDINATOR"
  | "AREA_PASTOR"
  | "SENIOR_PASTOR";

export type PendencyCode =
  | "MEMBER_REQUIRES_GC_CONFIRMATION"
  | "MEMBER_MISSING_VALID_CPF"
  | "STATUS_UNMAPPED"
  | "ROLE_UNMAPPED";

export interface NormalizedProverPerson {
  externalId: string;
  fullName: string;
  /** chave normalizada (minúscula, sem acento) p/ dedup por nome */
  nameKey: string;
  cpf: { raw: string | null; clean: string | null; class: CpfClass };
  birthDate: string | null; // ISO yyyy-mm-dd
  sex: "MALE" | "FEMALE" | "UNDISCLOSED" | null;
  maritalStatus:
    | "SINGLE"
    | "MARRIED"
    | "DIVORCED"
    | "WIDOWED"
    | "STABLE_UNION"
    | "OTHER"
    | null;
  email: string | null;
  phone: string | null; // pessoa_celular → WHATSAPP
  candidateStatus: EclStatus;
  /** false nesta fase: GC ainda não é importado, então não dá p/ confirmar membro */
  canBecomeMemberNow: boolean;
  intendedRoles: IntendedRole[];
  pendencies: PendencyCode[];
  warnings: string[];
}

// ── helpers de string ───────────────────────────────────────────────────

export function onlyDigits(s?: string | null): string {
  return (s ?? "").replace(/\D/g, "");
}

function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/** Normaliza um rótulo Prover: MAIÚSCULAS, sem acento, espaços colapsados. */
export function labelKey(s?: string | null): string {
  return stripAccents((s ?? "").trim().toUpperCase()).replace(/\s+/g, " ");
}

/**
 * Remove o marcador de gênero entre parênteses dos cargos do Prover, ex.:
 * "COORDENADOR (A)" → "COORDENADOR", "PASTOR(A) DE AREA" → "PASTOR DE AREA".
 */
export function stripGenderMark(label: string): string {
  return label
    .replace(/\s*\([AO]S?\)\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Chave de nome para deduplicação por similaridade simples. */
export function normalizeNameKey(name: string): string {
  return stripAccents(name.trim().toLowerCase()).replace(/\s+/g, " ");
}

// ── CPF ───────────────────────────────────────────────────────────────────

/** Dígitos verificadores de CPF. */
export function isValidCpf(digits: string): boolean {
  const d = onlyDigits(digits);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const calc = (slice: number) => {
    let sum = 0;
    for (let i = 0; i < slice; i++) sum += parseInt(d[i]) * (slice + 1 - i);
    const r = (sum * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return calc(9) === parseInt(d[9]) && calc(10) === parseInt(d[10]);
}

// Placeholders óbvios além de sequências repetidas.
const KNOWN_PLACEHOLDERS = new Set(["12345678900", "12345678909", "00000000000"]);

/**
 * Classifica o CPF: VALID | MISSING | INVALID | PLACEHOLDER.
 * Vazio→MISSING; máscara é limpa; sequência repetida/placeholder→PLACEHOLDER;
 * dígitos errados→INVALID. Só VALID é chave forte de deduplicação.
 */
export function classifyCpf(raw?: string | null): {
  raw: string | null;
  clean: string | null;
  class: CpfClass;
} {
  const original = raw ?? null;
  if (!raw || !raw.trim()) return { raw: original, clean: null, class: "MISSING" };
  const d = onlyDigits(raw);
  if (d.length === 0) return { raw: original, clean: null, class: "MISSING" };
  if (/^(\d)\1{10}$/.test(d) || KNOWN_PLACEHOLDERS.has(d)) {
    return { raw: original, clean: null, class: "PLACEHOLDER" };
  }
  if (d.length !== 11) return { raw: original, clean: null, class: "INVALID" };
  if (!isValidCpf(d)) return { raw: original, clean: null, class: "INVALID" };
  return { raw: original, clean: d, class: "VALID" };
}

// ── sexo / estado civil ─────────────────────────────────────────────────

function mapSex(raw?: string | null): NormalizedProverPerson["sex"] {
  const k = labelKey(raw);
  if (!k) return null;
  if (k === "M" || k === "MASCULINO" || k === "HOMEM") return "MALE";
  if (k === "F" || k === "FEMININO" || k === "MULHER") return "FEMALE";
  return "UNDISCLOSED";
}

function mapMarital(raw?: string | null): NormalizedProverPerson["maritalStatus"] {
  const k = labelKey(raw);
  if (!k) return null;
  if (k.startsWith("SOLTEIR")) return "SINGLE";
  if (k.startsWith("CASAD")) return "MARRIED";
  if (k.startsWith("DIVORCIAD") || k.startsWith("SEPARAD")) return "DIVORCED";
  if (k.startsWith("VIUV")) return "WIDOWED";
  if (k.includes("UNIAO")) return "STABLE_UNION";
  return "OTHER";
}

// ── data de nascimento ──────────────────────────────────────────────────

/** Aceita yyyy-mm-dd, dd/mm/yyyy ou ISO. Retorna ISO (yyyy-mm-dd) ou null. */
function parseBirthDate(raw?: string | null): string | null {
  if (!raw || !raw.trim()) return null;
  const s = raw.trim();
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const br = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  return null; // formato desconhecido → não inventar
}

// ── status × cargo ───────────────────────────────────────────────────────

// Situação (NÃO inclui cargos).
const STATUS_MAP: Record<string, EclStatus> = {
  VISITANTE: "VISITOR",
  MEMBRO: "MEMBER",
  TRANSFERIDO: "TRANSFERRED",
  EXCLUIDO: "ARCHIVED",
  INATIVO: "INACTIVE",
};

// Cargo → papel pretendido (NUNCA vira status).
const ROLE_MAP: Record<string, IntendedRole> = {
  "LIDER GC": "GC_LEADER",
  "LIDER DE GC": "GC_LEADER",
  SUPERVISOR: "SUPERVISOR",
  SUPERVISORA: "SUPERVISOR",
  COORDENADOR: "COORDINATOR",
  COORDENADORA: "COORDINATOR",
  "PASTOR DE AREA": "AREA_PASTOR",
  "PASTORA DE AREA": "AREA_PASTOR",
  "PASTOR SENIOR": "SENIOR_PASTOR",
  "PASTORA SENIOR": "SENIOR_PASTOR",
};

// ── função principal ──────────────────────────────────────────────────────

export function normalizeProverPerson(raw: ProverPerson): NormalizedProverPerson {
  const warnings: string[] = [];
  const pendencies: PendencyCode[] = [];

  const fullName = (raw.pessoa_nome ?? "").trim();
  const cpf = classifyCpf(raw.pessoa_cpf);
  const intendedRoles: IntendedRole[] = [];

  // --- status eclesiástico (a partir de tipo/subtipo/status) ---
  const tipoK = labelKey(raw.pessoa_tipo);
  const subtipoK = labelKey(raw.pessoa_subtipo);
  const statusK = labelKey(raw.pessoa_status);

  let candidateStatus: EclStatus = "VISITOR"; // default conservador

  // subtipo pode ser SITUAÇÃO (ex.: MEMBRO) ou CARGO (ex.: "LIDER GC",
  // "COORDENADOR (A)"). Trata o marcador de gênero antes de procurar o cargo.
  const subtipoRoleK = stripGenderMark(subtipoK);
  const mappedRole = ROLE_MAP[subtipoRoleK] ?? ROLE_MAP[subtipoK];
  if (subtipoK && mappedRole) {
    intendedRoles.push(mappedRole);
    // Cargo implica vínculo de membresia; assumimos MEMBER como candidato,
    // mas registramos o pressuposto (ambiguidade documentada).
    candidateStatus = "MEMBER";
    warnings.push(
      `subtipo "${raw.pessoa_subtipo}" é CARGO → papel ${mappedRole}; status assumido MEMBER (revisar).`,
    );
  } else if (subtipoK && STATUS_MAP[subtipoK]) {
    candidateStatus = STATUS_MAP[subtipoK];
  } else if (tipoK && STATUS_MAP[tipoK]) {
    candidateStatus = STATUS_MAP[tipoK];
  } else if (tipoK || subtipoK) {
    pendencies.push("STATUS_UNMAPPED");
    warnings.push(
      `tipo/subtipo não mapeado (tipo="${raw.pessoa_tipo ?? ""}", subtipo="${raw.pessoa_subtipo ?? ""}") → VISITOR provisório.`,
    );
  }

  // pessoa_status = INATIVO tem precedência sobre o candidato (com aviso)
  if (statusK === "INATIVO") {
    if (candidateStatus === "MEMBER") {
      warnings.push("pessoa_status=INATIVO sobrepôs candidato MEMBER → INACTIVE.");
    }
    candidateStatus = "INACTIVE";
  }

  // --- regra de membresia (GC não importado nesta fase) ---
  let canBecomeMemberNow = true;
  if (candidateStatus === "MEMBER") {
    canBecomeMemberNow = false; // Pessoas-only: sem GC não dá p/ confirmar
    pendencies.push("MEMBER_REQUIRES_GC_CONFIRMATION");
    if (cpf.class !== "VALID") {
      pendencies.push("MEMBER_MISSING_VALID_CPF");
    }
  }

  return {
    externalId: raw.pessoa_uuid,
    fullName,
    nameKey: normalizeNameKey(fullName),
    cpf,
    birthDate: parseBirthDate(raw.pessoa_nascimento),
    sex: mapSex(raw.pessoa_sexo),
    maritalStatus: mapMarital(raw.estadocivil),
    email: raw.pessoa_email?.trim() || null,
    phone: raw.pessoa_celular?.trim() || null,
    candidateStatus,
    canBecomeMemberNow,
    intendedRoles,
    pendencies,
    warnings,
  };
}
