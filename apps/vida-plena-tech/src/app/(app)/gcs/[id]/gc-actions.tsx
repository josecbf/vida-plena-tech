"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Field } from "@/components/ui/input";
import { generateInviteLink, createMeeting } from "@/modules/groups/actions";

export function InviteLinkBox({
  gcId,
  initialToken,
}: {
  gcId: string;
  initialToken: string | null;
}) {
  const [token, setToken] = useState<string | null>(initialToken);
  const [copied, setCopied] = useState(false);
  const [pending, setPending] = useState(false);

  const url = token
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/cadastro/gc/${token}`
    : null;

  async function generate() {
    setPending(true);
    try {
      const r = await generateInviteLink(gcId);
      setToken(r.token);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-3">
      {url ? (
        <>
          <div className="flex items-center gap-2">
            <Input readOnly value={url} className="font-mono text-xs" />
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                navigator.clipboard?.writeText(url);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
            >
              {copied ? "Copiado" : "Copiar"}
            </Button>
          </div>
          <p className="text-xs text-mist">
            Quem se cadastrar por este link entra como visitante já vinculado a este GC.
          </p>
        </>
      ) : (
        <Button size="sm" onClick={generate} disabled={pending}>
          {pending ? "Gerando…" : "Gerar link de cadastro do GC"}
        </Button>
      )}
    </div>
  );
}

export function NewMeetingForm({ gcId }: { gcId: string }) {
  const router = useRouter();
  const [date, setDate] = useState("");
  const [happened, setHappened] = useState(true);
  const [notes, setNotes] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      await createMeeting({ gcId, date, happened, notes: notes || undefined });
      setDate("");
      setNotes("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <Field label="Data do encontro">
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={happened} onChange={(e) => setHappened(e.target.checked)} />
        O encontro aconteceu
      </label>
      <Field label="Observação (opcional)">
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <Button type="submit" size="sm" disabled={pending || !date}>
        {pending ? "Criando…" : "Criar encontro"}
      </Button>
    </form>
  );
}
