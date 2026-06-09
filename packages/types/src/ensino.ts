// Módulo 02 — Ensino. Tipos + dados mock.
// Foco: trilhas de discipulado com próximo passo pastoral (não virar LMS genérico).

export interface Aula {
  id: string;
  titulo: string;
  duracaoMin: number;
}

export interface Curso {
  id: string;
  nome: string;
  descricao: string;
  aulas: Aula[];
}

export interface Trilha {
  id: string;
  nome: string;
  descricao: string;
  cor: "indigo" | "ambar" | "salvia";
  proximoPasso: string;
  cursos: Curso[];
}

export interface Matricula {
  pessoaId: string;
  cursoId: string;
  aulasConcluidas: string[]; // ids de aula
}

export const TRILHAS: Trilha[] = [
  {
    id: "tr_novo",
    nome: "Novo Convertido",
    descricao: "Primeiros passos na fé para quem tomou uma decisão recente.",
    cor: "salvia",
    proximoPasso: "Encaminhar para um Grupo de Crescimento.",
    cursos: [
      {
        id: "c_primeiros_passos",
        nome: "Primeiros Passos",
        descricao: "Fundamentos da nova vida em Cristo.",
        aulas: [
          { id: "a1", titulo: "Quem é Jesus", duracaoMin: 25 },
          { id: "a2", titulo: "Salvação e graça", duracaoMin: 30 },
          { id: "a3", titulo: "Oração e leitura bíblica", duracaoMin: 20 },
          { id: "a4", titulo: "A vida na igreja", duracaoMin: 25 },
        ],
      },
      {
        id: "c_batismo",
        nome: "Preparação para o Batismo",
        descricao: "Entendendo o sentido do batismo nas águas.",
        aulas: [
          { id: "a1", titulo: "O que é o batismo", duracaoMin: 20 },
          { id: "a2", titulo: "Decisão e testemunho", duracaoMin: 25 },
        ],
      },
    ],
  },
  {
    id: "tr_discipulado",
    nome: "Discipulado",
    descricao: "Crescimento e maturidade cristã, passo a passo.",
    cor: "indigo",
    proximoPasso: "Iniciar a Trilha de Liderança ou servir em um ministério.",
    cursos: [
      {
        id: "c_fundamentos",
        nome: "Fundamentos da Fé",
        descricao: "Doutrinas centrais e vida cristã prática.",
        aulas: [
          { id: "a1", titulo: "A Bíblia", duracaoMin: 30 },
          { id: "a2", titulo: "Trindade", duracaoMin: 35 },
          { id: "a3", titulo: "Igreja e comunhão", duracaoMin: 30 },
          { id: "a4", titulo: "Dons e serviço", duracaoMin: 30 },
          { id: "a5", titulo: "Mordomia e generosidade", duracaoMin: 25 },
        ],
      },
      {
        id: "c_carater",
        nome: "Caráter Cristão",
        descricao: "Formação do caráter à luz do fruto do Espírito.",
        aulas: [
          { id: "a1", titulo: "Identidade em Cristo", duracaoMin: 30 },
          { id: "a2", titulo: "Relacionamentos", duracaoMin: 30 },
          { id: "a3", titulo: "Perdão e reconciliação", duracaoMin: 30 },
        ],
      },
    ],
  },
  {
    id: "tr_lideranca",
    nome: "Liderança",
    descricao: "Capacitação para liderar GCs, ministérios e discipular.",
    cor: "ambar",
    proximoPasso: "Assumir liderança de GC ou coordenação de ministério.",
    cursos: [
      {
        id: "c_lider_gc",
        nome: "Líder de GC",
        descricao: "Como conduzir um Grupo de Crescimento saudável.",
        aulas: [
          { id: "a1", titulo: "O coração do líder", duracaoMin: 30 },
          { id: "a2", titulo: "Conduzindo reuniões", duracaoMin: 35 },
          { id: "a3", titulo: "Cuidado pastoral no GC", duracaoMin: 30 },
          { id: "a4", titulo: "Multiplicação", duracaoMin: 25 },
        ],
      },
    ],
  },
];

// Matrículas mock — ligam Pessoas ao Ensino (progresso)
export const MATRICULAS: Matricula[] = [
  { pessoaId: "p6", cursoId: "c_primeiros_passos", aulasConcluidas: ["a1", "a2"] },
  { pessoaId: "p10", cursoId: "c_primeiros_passos", aulasConcluidas: ["a1"] },
  { pessoaId: "p5", cursoId: "c_fundamentos", aulasConcluidas: ["a1", "a2", "a3", "a4", "a5"] },
  { pessoaId: "p5", cursoId: "c_lider_gc", aulasConcluidas: ["a1", "a2"] },
  { pessoaId: "p1", cursoId: "c_lider_gc", aulasConcluidas: ["a1", "a2", "a3", "a4"] },
  { pessoaId: "p8", cursoId: "c_fundamentos", aulasConcluidas: ["a1", "a2"] },
];

export function getTrilha(id: string): Trilha | undefined {
  return TRILHAS.find((t) => t.id === id);
}

export function getCurso(id: string): { curso: Curso; trilha: Trilha } | undefined {
  for (const trilha of TRILHAS) {
    const curso = trilha.cursos.find((c) => c.id === id);
    if (curso) return { curso, trilha };
  }
  return undefined;
}

export function progressoCurso(curso: Curso, m?: Matricula): number {
  if (!m || curso.aulas.length === 0) return 0;
  return Math.round((m.aulasConcluidas.length / curso.aulas.length) * 100);
}

export function matriculasDaPessoa(pessoaId: string): Matricula[] {
  return MATRICULAS.filter((m) => m.pessoaId === pessoaId);
}

export function totalAlunos(cursoId: string): number {
  return MATRICULAS.filter((m) => m.cursoId === cursoId).length;
}
