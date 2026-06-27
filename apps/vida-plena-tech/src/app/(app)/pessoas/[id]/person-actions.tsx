"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EclesiasticalStatus, FamilyRelationship } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Select, Textarea, Input, Field } from "@/components/ui/input";
import { changeStatus, linkFamily, addPastoralNote } from "@/modules/people/actions";
import { changePersonGc } from "@/modules/groups/actions";
import { STATUS_LABEL, STATUS_ORDER, RELATIONSHIP_LABEL } from "@/lib/labels";

function useAction() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  async function run(fn: () => Promise<unknown>) {
    setError(null);
    setPending(true);
    try {
      await fn();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro.");
    } finally {
      setPending(false);
    }
  }
  return { error, pending, run };
}

export function StatusPanel({
  personId,
  current,
}: {
  personId: string;
  current: EclesiasticalStatus;
}) {
  const { error, pending, run } = useAction();
  const [status, setStatus] = useState<EclesiasticalStatus>(current);
  const [reason, setReason] = useState("");
  return (
    <div className="space-y-3">
      <Field label="Status eclesiástico" hint="Membro oficial exige GC principal + CPF.">
        <Select value={status} onChange={(e) => setStatus(e.target.value as EclesiasticalStatus)}>
          {STATUS_ORDER.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Justificativa (opcional)">
        <Input value={reason} onChange={(e) => setReason(e.target.value)} />
      </Field>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <Button
        size="sm"
        disabled={pending || status === current}
        onClick={() => run(() => changeStatus(personId, status, reason || undefined))}
      >
        Atualizar status
      </Button>
    </div>
  );
}

export function GcPanel({
  personId,
  currentGcId,
  gcs,
}: {
  personId: string;
  currentGcId: string | null;
  gcs: { id: string; name: string }[];
}) {
  const { error, pending, run } = useAction();
  const [gcId, setGcId] = useState(currentGcId ?? "");
  const [reason, setReason] = useState("");
  return (
    <div className="space-y-3">
      <Field label="GC principal">
        <Select value={gcId} onChange={(e) => setGcId(e.target.value)}>
          <option value="">— sem GC —</option>
          {gcs.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Motivo (opcional)">
        <Input value={reason} onChange={(e) => setReason(e.target.value)} />
      </Field>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <Button
        size="sm"
        disabled={pending || !gcId || gcId === currentGcId}
        onClick={() => run(() => changePersonGc({ personId, gcId, reason: reason || undefined }))}
      >
        Transferir / definir GC
      </Button>
      <p className="text-xs text-mist">
        Ao transferir, o líder do GC anterior deixa de ver esta pessoa (histórico preservado).
      </p>
    </div>
  );
}

export function FamilyPanel({
  personId,
  people,
}: {
  personId: string;
  people: { id: string; fullName: string }[];
}) {
  const { error, pending, run } = useAction();
  const [relativeId, setRelativeId] = useState("");
  const [relationship, setRelationship] = useState<FamilyRelationship>("CHILD");
  return (
    <div className="space-y-3">
      <Field label="Vincular pessoa">
        <Select value={relativeId} onChange={(e) => setRelativeId(e.target.value)}>
          <option value="">— escolher —</option>
          {people
            .filter((p) => p.id !== personId)
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.fullName}
              </option>
            ))}
        </Select>
      </Field>
      <Field label="Relacionamento">
        <Select
          value={relationship}
          onChange={(e) => setRelationship(e.target.value as FamilyRelationship)}
        >
          {Object.entries(RELATIONSHIP_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </Select>
      </Field>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <Button
        size="sm"
        disabled={pending || !relativeId}
        onClick={() =>
          run(() => linkFamily({ personId, relativeId, relationship }))
        }
      >
        Vincular
      </Button>
    </div>
  );
}

export function PastoralNotePanel({ personId }: { personId: string }) {
  const { error, pending, run } = useAction();
  const [body, setBody] = useState("");
  return (
    <div className="space-y-3">
      <Field label="Nova observação pastoral" hint="Confidencial — visível só a pastores.">
        <Textarea value={body} onChange={(e) => setBody(e.target.value)} />
      </Field>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <Button
        size="sm"
        disabled={pending || !body.trim()}
        onClick={() => run(async () => {
          await addPastoralNote(personId, body);
          setBody("");
        })}
      >
        Registrar observação
      </Button>
    </div>
  );
}
