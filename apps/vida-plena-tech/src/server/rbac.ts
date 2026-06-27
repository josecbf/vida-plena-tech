import { RoleKey } from "@prisma/client";

// ─────────────────────────────────────────────────────────────────────────
// RBAC — permissões no padrão `modulo.recurso.acao`, deny-by-default.
//
// Regra de ouro: a UI nunca decide sozinha. Toda action/route valida no
// backend (ver can() e os guards em server/context.ts). Escopo (quem vê
// quais pessoas/GCs) é resolvido à parte, pela cadeia de liderança do GC.
// ─────────────────────────────────────────────────────────────────────────

export type Permission =
  | "people.person.view"
  | "people.person.create"
  | "people.person.edit"
  | "people.cpf.view_full"
  | "people.status.promote"
  | "people.family.manage"
  | "people.timeline_sensitive.view" // notas pastorais — só pastores
  | "people.pastoral_note.manage"
  | "groups.gc.view"
  | "groups.gc.manage"
  | "groups.meeting.create"
  | "groups.attendance.record"
  | "groups.invite.create"
  | "events.event.view"
  | "events.event.create"
  | "events.registration.create"
  | "events.registration.view_all"
  | "audit.log.view"
  | "admin.users.manage"
  | "admin.modules.view"
  | "prover.import.manage";

const ALL: Permission[] = [
  "people.person.view",
  "people.person.create",
  "people.person.edit",
  "people.cpf.view_full",
  "people.status.promote",
  "people.family.manage",
  "people.timeline_sensitive.view",
  "people.pastoral_note.manage",
  "groups.gc.view",
  "groups.gc.manage",
  "groups.meeting.create",
  "groups.attendance.record",
  "groups.invite.create",
  "events.event.view",
  "events.event.create",
  "events.registration.create",
  "events.registration.view_all",
  "audit.log.view",
  "admin.users.manage",
  "admin.modules.view",
  "prover.import.manage",
];

// Permissões por papel.
//
// NOTA (decisão do dono, complemento item 10): notas pastorais sensíveis são
// vistas APENAS por AREA_PASTOR e SENIOR_PASTOR — exceção deliberada ao
// "admin vê tudo" (segregação de função; admin é técnico). Por isso ADMIN
// abaixo recebe quase tudo MENOS people.timeline_sensitive.view /
// people.pastoral_note.manage.
const ROLE_PERMISSIONS: Record<RoleKey, Permission[]> = {
  MEMBER: ["events.event.view", "events.registration.create"],

  GC_LEADER: [
    "people.person.view",
    "people.person.create",
    "people.person.edit", // complemento item 7: edita pessoas do seu GC
    "people.status.promote", // pode promover visitante→membro
    "people.family.manage",
    "groups.gc.view",
    "groups.meeting.create",
    "groups.attendance.record",
    "groups.invite.create",
    "events.event.view",
    "events.registration.create",
  ],

  SUPERVISOR: [
    "people.person.view",
    "people.person.edit",
    "people.status.promote",
    "people.family.manage",
    "groups.gc.view",
    "groups.gc.manage",
    "groups.meeting.create",
    "groups.attendance.record",
    "groups.invite.create",
    "events.event.view",
    "events.registration.create",
  ],

  COORDINATOR: [
    "people.person.view",
    "people.person.edit",
    "people.status.promote",
    "people.family.manage",
    "groups.gc.view",
    "groups.gc.manage",
    "groups.meeting.create",
    "groups.attendance.record",
    "groups.invite.create",
    "events.event.view",
    "events.registration.create",
  ],

  AREA_PASTOR: [
    "people.person.view",
    "people.person.edit",
    "people.status.promote",
    "people.family.manage",
    "people.timeline_sensitive.view", // ← vê nota pastoral (no escopo)
    "people.pastoral_note.manage",
    "groups.gc.view",
    "groups.gc.manage",
    "groups.meeting.create",
    "groups.attendance.record",
    "groups.invite.create",
    "events.event.view",
    "events.registration.create",
  ],

  SENIOR_PASTOR: [
    "people.person.view",
    "people.person.create",
    "people.person.edit",
    "people.status.promote",
    "people.family.manage",
    "people.timeline_sensitive.view", // ← vê nota pastoral (tenant)
    "people.pastoral_note.manage",
    "groups.gc.view",
    "groups.gc.manage",
    "groups.meeting.create",
    "groups.attendance.record",
    "groups.invite.create",
    "events.event.view",
    "events.event.create",
    "events.registration.create",
    "events.registration.view_all",
  ],

  // Admin: tudo MENOS leitura de nota pastoral sensível (ver nota acima).
  ADMIN: ALL.filter(
    (p) =>
      p !== "people.timeline_sensitive.view" &&
      p !== "people.pastoral_note.manage",
  ),
};

export function permissionsForRoles(roles: RoleKey[]): Set<Permission> {
  const set = new Set<Permission>();
  for (const role of roles) {
    for (const p of ROLE_PERMISSIONS[role] ?? []) set.add(p);
  }
  return set;
}

// Papel "mais alto" para fins de UI/escopo (maior = mais amplo).
const ROLE_RANK: Record<RoleKey, number> = {
  MEMBER: 0,
  GC_LEADER: 1,
  SUPERVISOR: 2,
  COORDINATOR: 3,
  AREA_PASTOR: 4,
  SENIOR_PASTOR: 5,
  ADMIN: 6,
};

export function highestRole(roles: RoleKey[]): RoleKey {
  if (roles.length === 0) return "MEMBER";
  return roles.reduce((a, b) => (ROLE_RANK[b] > ROLE_RANK[a] ? b : a));
}

export const ROLE_LABEL: Record<RoleKey, string> = {
  MEMBER: "Membro",
  GC_LEADER: "Líder de GC",
  SUPERVISOR: "Supervisor",
  COORDINATOR: "Coordenador",
  AREA_PASTOR: "Pastor de Área",
  SENIOR_PASTOR: "Pastor Sênior",
  ADMIN: "Administrativo",
};
