// Módulo 01 — Pessoas (núcleo). Tipos + dados mock.

export type StatusRelacionamento =
  | "membro"
  | "congregante"
  | "visitante"
  | "em-acompanhamento";

export type Papel =
  | "Líder de GC"
  | "Voluntário"
  | "Diácono"
  | "Pastor"
  | "Professor"
  | "Discipulador"
  | "Membro";

export type TipoEventoTimeline =
  | "cadastro"
  | "batismo"
  | "gc"
  | "ensino"
  | "evento"
  | "pastoral"
  | "voluntariado";

export interface EventoTimeline {
  id: string;
  data: string; // ISO
  tipo: TipoEventoTimeline;
  titulo: string;
  descricao?: string;
}

export interface Pessoa {
  id: string;
  nome: string;
  status: StatusRelacionamento;
  papeis: Papel[];
  email?: string;
  telefone?: string;
  nascimento?: string; // ISO
  membroDesde?: string; // ISO
  campusId: string;
  familiaId?: string;
  tags: string[];
  timeline: EventoTimeline[];
}

export interface Familia {
  id: string;
  sobrenome: string;
  membrosIds: string[];
}

export const FAMILIAS: Familia[] = [
  { id: "f_souza", sobrenome: "Souza", membrosIds: ["p1", "p2", "p3"] },
  { id: "f_lima", sobrenome: "Lima", membrosIds: ["p4", "p5"] },
  { id: "f_oliveira", sobrenome: "Oliveira", membrosIds: ["p6", "p7"] },
];

export const PESSOAS: Pessoa[] = [
  {
    id: "p1",
    nome: "Ana Souza",
    status: "membro",
    papeis: ["Líder de GC", "Professor"],
    email: "ana.souza@email.com",
    telefone: "(11) 98888-1001",
    nascimento: "1988-03-12",
    membroDesde: "2015-06-01",
    campusId: "c_sede",
    familiaId: "f_souza",
    tags: ["GC Centro", "Ensino"],
    timeline: [
      { id: "t1", data: "2015-06-01", tipo: "cadastro", titulo: "Entrou para a igreja" },
      { id: "t2", data: "2016-04-10", tipo: "batismo", titulo: "Batismo nas águas" },
      { id: "t3", data: "2019-02-01", tipo: "gc", titulo: "Tornou-se líder de GC", descricao: "GC Centro" },
      { id: "t4", data: "2023-08-15", tipo: "ensino", titulo: "Concluiu Trilha de Liderança" },
    ],
  },
  {
    id: "p2",
    nome: "Carlos Souza",
    status: "membro",
    papeis: ["Diácono", "Voluntário"],
    email: "carlos.souza@email.com",
    telefone: "(11) 98888-1002",
    nascimento: "1985-11-02",
    membroDesde: "2015-06-01",
    campusId: "c_sede",
    familiaId: "f_souza",
    tags: ["Diaconia", "Som"],
    timeline: [
      { id: "t1", data: "2015-06-01", tipo: "cadastro", titulo: "Entrou para a igreja" },
      { id: "t2", data: "2020-01-20", tipo: "voluntariado", titulo: "Entrou na equipe de Som" },
    ],
  },
  {
    id: "p3",
    nome: "Beatriz Souza",
    status: "congregante",
    papeis: ["Membro"],
    nascimento: "2012-07-22",
    campusId: "c_sede",
    familiaId: "f_souza",
    tags: ["Infantil"],
    timeline: [
      { id: "t1", data: "2015-06-01", tipo: "cadastro", titulo: "Cadastrada com a família" },
    ],
  },
  {
    id: "p4",
    nome: "Daniel Lima",
    status: "membro",
    papeis: ["Pastor"],
    email: "daniel.lima@email.com",
    telefone: "(11) 98888-1004",
    nascimento: "1979-05-30",
    membroDesde: "2008-03-01",
    campusId: "c_sede",
    familiaId: "f_lima",
    tags: ["Pastoral", "Ensino"],
    timeline: [
      { id: "t1", data: "2008-03-01", tipo: "cadastro", titulo: "Entrou para a igreja" },
      { id: "t2", data: "2010-09-01", tipo: "pastoral", titulo: "Ordenado pastor" },
    ],
  },
  {
    id: "p5",
    nome: "Eduarda Lima",
    status: "membro",
    papeis: ["Discipulador", "Voluntário"],
    email: "eduarda.lima@email.com",
    telefone: "(11) 98888-1005",
    nascimento: "1982-09-14",
    membroDesde: "2008-03-01",
    campusId: "c_sede",
    familiaId: "f_lima",
    tags: ["Discipulado", "Recepção"],
    timeline: [
      { id: "t1", data: "2008-03-01", tipo: "cadastro", titulo: "Entrou para a igreja" },
      { id: "t2", data: "2021-03-10", tipo: "ensino", titulo: "Começou a discipular novos membros" },
    ],
  },
  {
    id: "p6",
    nome: "Felipe Oliveira",
    status: "em-acompanhamento",
    papeis: ["Membro"],
    email: "felipe.oliveira@email.com",
    telefone: "(11) 98888-1006",
    nascimento: "1995-12-01",
    membroDesde: "2024-02-11",
    campusId: "c_zona_sul",
    familiaId: "f_oliveira",
    tags: ["Novo convertido", "GC Zona Sul"],
    timeline: [
      { id: "t1", data: "2024-02-11", tipo: "cadastro", titulo: "Primeira visita" },
      { id: "t2", data: "2024-03-03", tipo: "pastoral", titulo: "Acompanhamento pastoral iniciado" },
      { id: "t3", data: "2024-04-07", tipo: "ensino", titulo: "Iniciou Trilha do Novo Convertido" },
    ],
  },
  {
    id: "p7",
    nome: "Gabriela Oliveira",
    status: "visitante",
    papeis: ["Membro"],
    telefone: "(11) 98888-1007",
    campusId: "c_zona_sul",
    familiaId: "f_oliveira",
    tags: ["Visitante"],
    timeline: [
      { id: "t1", data: "2025-05-18", tipo: "cadastro", titulo: "Primeira visita", descricao: "Convidada por Felipe" },
    ],
  },
  {
    id: "p8",
    nome: "Henrique Costa",
    status: "membro",
    papeis: ["Voluntário", "Professor"],
    email: "henrique.costa@email.com",
    telefone: "(11) 98888-1008",
    nascimento: "1990-01-25",
    membroDesde: "2017-08-01",
    campusId: "c_sede",
    tags: ["Mídia", "Ensino"],
    timeline: [
      { id: "t1", data: "2017-08-01", tipo: "cadastro", titulo: "Entrou para a igreja" },
      { id: "t2", data: "2022-02-01", tipo: "voluntariado", titulo: "Coordenador de Mídia" },
    ],
  },
  {
    id: "p9",
    nome: "Isabela Martins",
    status: "congregante",
    papeis: ["Voluntário"],
    email: "isabela.martins@email.com",
    telefone: "(11) 98888-1009",
    nascimento: "1998-06-09",
    campusId: "c_zona_sul",
    tags: ["Infantil", "GC Zona Sul"],
    timeline: [
      { id: "t1", data: "2023-01-15", tipo: "cadastro", titulo: "Entrou para a igreja" },
      { id: "t2", data: "2023-06-01", tipo: "voluntariado", titulo: "Voluntária no Ministério Infantil" },
    ],
  },
  {
    id: "p10",
    nome: "João Pereira",
    status: "em-acompanhamento",
    papeis: ["Membro"],
    telefone: "(11) 98888-1010",
    membroDesde: "2025-01-05",
    campusId: "c_sede",
    tags: ["Novo convertido"],
    timeline: [
      { id: "t1", data: "2025-01-05", tipo: "cadastro", titulo: "Decisão de fé no culto" },
      { id: "t2", data: "2025-01-20", tipo: "pastoral", titulo: "Encaminhado para discipulado" },
    ],
  },
];

export const STATUS_LABEL: Record<StatusRelacionamento, string> = {
  membro: "Membro",
  congregante: "Congregante",
  visitante: "Visitante",
  "em-acompanhamento": "Em acompanhamento",
};

export function getPessoa(id: string): Pessoa | undefined {
  return PESSOAS.find((p) => p.id === id);
}

export function getFamilia(id?: string): Familia | undefined {
  return id ? FAMILIAS.find((f) => f.id === id) : undefined;
}

export function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/);
  return ((partes[0]?.[0] ?? "") + (partes[partes.length - 1]?.[0] ?? "")).toUpperCase();
}
