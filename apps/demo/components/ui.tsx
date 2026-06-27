import { cn } from "@videira/ui";
import type { ReactNode } from "react";

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-xl border border-slate-200 bg-white shadow-sm", className)}>
      {children}
    </div>
  );
}

export function CardBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("p-5", className)}>{children}</div>;
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

const TONES: Record<string, string> = {
  brand: "bg-brand-50 text-brand",
  accent: "bg-accent-50 text-[#9a6a14]",
  salvia: "bg-salvia-50 text-salvia",
  slate: "bg-slate-100 text-slate-600",
};

export function Badge({ children, tone = "slate" }: { children: ReactNode; tone?: keyof typeof TONES }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", TONES[tone])}>
      {children}
    </span>
  );
}

export function Avatar({ initials, tone = "brand" }: { initials: string; tone?: "brand" | "salvia" | "accent" }) {
  const tones = {
    brand: "bg-brand text-white",
    salvia: "bg-salvia text-white",
    accent: "bg-accent text-white",
  };
  return (
    <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold", tones[tone])}>
      {initials}
    </span>
  );
}

export function Progress({ value }: { value: number }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
      <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${value}%` }} />
    </div>
  );
}

export function Stat({ label, value, tone = "brand" }: { label: string; value: string | number; tone?: "brand" | "salvia" | "accent" }) {
  const tones = { brand: "text-brand", salvia: "text-salvia", accent: "text-[#9a6a14]" };
  return (
    <Card>
      <CardBody>
        <p className="text-sm text-muted">{label}</p>
        <p className={cn("mt-1 font-display text-3xl font-semibold", tones[tone])}>{value}</p>
      </CardBody>
    </Card>
  );
}
