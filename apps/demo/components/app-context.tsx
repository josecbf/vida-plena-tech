"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { MATRICULAS } from "@videira/types";

export type Persona = "equipe" | "membro";

// Sem auth real: a persona "membro" simula o login do Felipe Oliveira.
export const MEMBRO_ID = "p6";

export const MEUS_CURSO_IDS = MATRICULAS.filter((m) => m.pessoaId === MEMBRO_ID).map((m) => m.cursoId);

function seedConcluidas(): Record<string, string[]> {
  const r: Record<string, string[]> = {};
  for (const m of MATRICULAS.filter((m) => m.pessoaId === MEMBRO_ID)) {
    r[m.cursoId] = [...m.aulasConcluidas];
  }
  return r;
}

interface AppCtx {
  persona: Persona;
  setPersona: (p: Persona) => void;
  estaConcluida: (cursoId: string, aulaId: string) => boolean;
  alternar: (cursoId: string, aulaId: string) => void;
  concluidasDe: (cursoId: string) => string[];
}

const Ctx = createContext<AppCtx | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [persona, setPersona] = useState<Persona>("equipe");
  const [concluidas, setConcluidas] = useState<Record<string, string[]>>(seedConcluidas);

  const concluidasDe = (cursoId: string) => concluidas[cursoId] ?? [];
  const estaConcluida = (cursoId: string, aulaId: string) => concluidasDe(cursoId).includes(aulaId);

  const alternar = (cursoId: string, aulaId: string) => {
    setConcluidas((prev) => {
      const atuais = prev[cursoId] ?? [];
      const novas = atuais.includes(aulaId)
        ? atuais.filter((a) => a !== aulaId)
        : [...atuais, aulaId];
      return { ...prev, [cursoId]: novas };
    });
  };

  return (
    <Ctx.Provider value={{ persona, setPersona, estaConcluida, alternar, concluidasDe }}>
      {children}
    </Ctx.Provider>
  );
}

export function useApp(): AppCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useApp deve ser usado dentro de AppProvider");
  return ctx;
}
