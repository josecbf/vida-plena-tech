import {
  EclesiasticalStatus,
  AttendanceStatus,
  EventStatus,
  RegistrationSource,
  FamilyRelationship,
  TimelineEntryType,
} from "@prisma/client";

export const STATUS_LABEL: Record<EclesiasticalStatus, string> = {
  VISITOR: "Visitante",
  REGULAR_ATTENDER: "Frequentador",
  MEMBERSHIP_INTERESTED: "Interessado em membresia",
  MEMBER: "Membro",
  INACTIVE: "Inativo",
  AWAY: "Afastado",
  TRANSFERRED: "Transferido",
  ARCHIVED: "Arquivado",
};

export const STATUS_ORDER: EclesiasticalStatus[] = [
  "VISITOR",
  "REGULAR_ATTENDER",
  "MEMBERSHIP_INTERESTED",
  "MEMBER",
  "INACTIVE",
  "AWAY",
  "TRANSFERRED",
  "ARCHIVED",
];

export const ATTENDANCE_LABEL: Record<AttendanceStatus, string> = {
  PRESENT: "Presente",
  ABSENT: "Ausente",
  JUSTIFIED: "Justificado",
  VISITOR: "Visitante",
};

export const EVENT_STATUS_LABEL: Record<EventStatus, string> = {
  DRAFT: "Rascunho",
  PUBLISHED: "Publicado",
  CANCELLED: "Cancelado",
  FINISHED: "Encerrado",
};

export const SOURCE_LABEL: Record<RegistrationSource, string> = {
  PUBLIC_FORM: "Formulário público",
  GC_INVITE_LINK: "Link de GC",
  ADMIN_CREATED: "Cadastro interno",
  EVENT_PUBLIC: "Inscrição em evento",
  PROVER_IMPORT: "Importação Prover",
};

export const RELATIONSHIP_LABEL: Record<FamilyRelationship, string> = {
  SPOUSE: "Cônjuge",
  FATHER: "Pai",
  MOTHER: "Mãe",
  CHILD: "Filho(a)",
  SIBLING: "Irmão(ã)",
  GUARDIAN: "Responsável",
  DEPENDENT: "Dependente",
  OTHER: "Outro",
};

export const TIMELINE_LABEL: Record<TimelineEntryType, string> = {
  PERSON_CREATED: "Cadastro criado",
  STATUS_CHANGED: "Status alterado",
  GC_CHANGED: "GC alterado",
  FAMILY_LINKED: "Vínculo familiar",
  EVENT_REGISTRATION: "Inscrição em evento",
  EVENT_REGISTRATION_CANCELLED: "Inscrição cancelada",
  ATTENDANCE: "Presença em GC",
  PASTORAL_NOTE: "Observação pastoral",
  CONSENT: "Consentimento",
  COURSE_COMPLETION: "Curso concluído",
  IMPORTED_FROM_PROVER: "Importado do Prover",
};

export function statusBadgeVariant(
  status: EclesiasticalStatus,
): "default" | "outline" | "muted" | "success" | "warning" {
  switch (status) {
    case "MEMBER":
      return "success";
    case "VISITOR":
    case "REGULAR_ATTENDER":
    case "MEMBERSHIP_INTERESTED":
      return "outline";
    case "INACTIVE":
    case "AWAY":
    case "TRANSFERRED":
    case "ARCHIVED":
      return "muted";
    default:
      return "default";
  }
}
