import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { initials } from "@/lib/format";

// ── Badge ──────────────────────────────────────────────────────────────
const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        default: "border-transparent bg-ink text-paper",
        outline: "border-ink/20 text-ink",
        muted: "border-transparent bg-ink/5 text-mist",
        success: "border-transparent bg-success/10 text-success",
        warning: "border-transparent bg-warning/10 text-warning",
        danger: "border-transparent bg-danger/10 text-danger",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export function Badge({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

// ── Avatar (iniciais; P&B) ─────────────────────────────────────────────
export function Avatar({ name, className }: { name: string; className?: string }) {
  return (
    <div
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-full bg-ink text-xs font-semibold text-paper",
        className,
      )}
    >
      {initials(name)}
    </div>
  );
}

// ── Table ──────────────────────────────────────────────────────────────
export function Table({ className, ...props }: React.HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-x-auto">
      <table className={cn("w-full caption-bottom text-sm", className)} {...props} />
    </div>
  );
}
export function THead({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn("border-b border-line", className)} {...props} />;
}
export function TBody(props: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody {...props} />;
}
export function TR({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cn("border-b border-line last:border-0 hover:bg-ink/[0.02]", className)} {...props} />;
}
export function TH({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return <th className={cn("h-10 px-3 text-left align-middle text-xs font-medium uppercase tracking-wide text-mist", className)} {...props} />;
}
export function TD({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn("px-3 py-2.5 align-middle", className)} {...props} />;
}

// ── Empty state ────────────────────────────────────────────────────────
export function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-line p-8 text-center text-sm text-mist">
      {children}
    </div>
  );
}

// ── Page header ────────────────────────────────────────────────────────
export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description ? <p className="mt-1 text-sm text-mist">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}
