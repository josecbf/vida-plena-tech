"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AttendanceStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { recordAttendance } from "@/modules/groups/actions";
import { ATTENDANCE_LABEL } from "@/lib/labels";
import { cn } from "@/lib/utils";

const OPTIONS: AttendanceStatus[] = ["PRESENT", "ABSENT", "JUSTIFIED"];

export function AttendanceForm({
  meetingId,
  gcId,
  members,
  initial,
}: {
  meetingId: string;
  gcId: string;
  members: { id: string; fullName: string }[];
  initial: Record<string, AttendanceStatus>;
}) {
  const router = useRouter();
  const [marks, setMarks] = useState<Record<string, AttendanceStatus>>(initial);
  const [visitors, setVisitors] = useState<string[]>([""]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setError(null);
    setPending(true);
    try {
      const entries = [
        ...members.map((m) => ({
          personId: m.id,
          status: marks[m.id] ?? ("ABSENT" as AttendanceStatus),
        })),
        ...visitors
          .filter((v) => v.trim())
          .map((v) => ({ visitorName: v.trim(), status: "VISITOR" as AttendanceStatus })),
      ];
      await recordAttendance({ meetingId, entries });
      router.push(`/gcs/${gcId}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro.");
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="divide-y divide-line rounded-lg border border-line">
        {members.map((m) => (
          <div key={m.id} className="flex items-center justify-between gap-3 p-3">
            <span className="text-sm font-medium">{m.fullName}</span>
            <div className="flex gap-1">
              {OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setMarks((s) => ({ ...s, [m.id]: opt }))}
                  className={cn(
                    "rounded-md border px-2.5 py-1 text-xs",
                    (marks[m.id] ?? "ABSENT") === opt
                      ? "border-ink bg-ink text-paper"
                      : "border-line text-mist hover:bg-ink/5",
                  )}
                >
                  {ATTENDANCE_LABEL[opt]}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div>
        <p className="mb-2 text-sm font-medium">Visitantes</p>
        {visitors.map((v, i) => (
          <Input
            key={i}
            value={v}
            placeholder="Nome do visitante"
            className="mb-2"
            onChange={(e) =>
              setVisitors((s) => s.map((x, idx) => (idx === i ? e.target.value : x)))
            }
          />
        ))}
        <Button variant="outline" size="sm" onClick={() => setVisitors((s) => [...s, ""])}>
          + Adicionar visitante
        </Button>
      </div>

      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <div className="flex gap-2">
        <Button onClick={save} disabled={pending}>
          {pending ? "Salvando…" : "Salvar presença"}
        </Button>
        <Button variant="outline" onClick={() => router.back()}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}
