// Helpers de formatação e mascaramento de dados.
// O mascaramento de CPF é uma regra de produto (dado sensível): ver
// docs/Técnico/Seguranca Privacidade e LGPD.md.

const WEEKDAYS = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
];

export function weekdayLabel(weekday: number | null | undefined): string {
  if (weekday == null) return "—";
  return WEEKDAYS[weekday] ?? "—";
}

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

/** Formata CPF completo: 12345678901 → 123.456.789-01 */
export function formatCpf(cpf: string | null | undefined): string {
  if (!cpf) return "—";
  const d = onlyDigits(cpf).padStart(11, "0").slice(0, 11);
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9, 11)}`;
}

/**
 * CPF mascarado para quem NÃO pode ver o documento completo.
 * Mostra apenas os 2 últimos dígitos: ***.***.***-01
 */
export function maskCpf(cpf: string | null | undefined): string {
  if (!cpf) return "—";
  const d = onlyDigits(cpf).padStart(11, "0").slice(0, 11);
  return `***.***.***-${d.slice(9, 11)}`;
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("pt-BR");
}

export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

/** Validação estrutural de CPF (dígitos verificadores). */
export function isValidCpf(cpf: string): boolean {
  const d = onlyDigits(cpf);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const calc = (slice: number) => {
    let sum = 0;
    for (let i = 0; i < slice; i++) sum += parseInt(d[i]) * (slice + 1 - i);
    const r = (sum * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return calc(9) === parseInt(d[9]) && calc(10) === parseInt(d[10]);
}
