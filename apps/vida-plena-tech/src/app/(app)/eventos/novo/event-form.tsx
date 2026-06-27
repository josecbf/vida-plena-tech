"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EventVisibility } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Select, Field } from "@/components/ui/input";
import { createEvent } from "@/modules/events/actions";

export function EventForm({ campuses }: { campuses: { id: string; name: string }[] }) {
  const router = useRouter();
  const [form, setForm] = useState({
    title: "",
    description: "",
    campusId: "",
    location: "",
    startsAt: "",
    endsAt: "",
    visibility: "MEMBERS" as EventVisibility,
    publish: true,
  });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const r = await createEvent({
        ...form,
        description: form.description || undefined,
        campusId: form.campusId || undefined,
        location: form.location || undefined,
        endsAt: form.endsAt || undefined,
      });
      router.push(`/eventos/${r.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro.");
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Título">
        <Input value={form.title} onChange={(e) => set("title", e.target.value)} required />
      </Field>
      <Field label="Descrição">
        <Textarea value={form.description} onChange={(e) => set("description", e.target.value)} />
      </Field>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Início">
          <Input type="datetime-local" value={form.startsAt} onChange={(e) => set("startsAt", e.target.value)} required />
        </Field>
        <Field label="Fim (opcional)">
          <Input type="datetime-local" value={form.endsAt} onChange={(e) => set("endsAt", e.target.value)} />
        </Field>
        <Field label="Local">
          <Input value={form.location} onChange={(e) => set("location", e.target.value)} />
        </Field>
        <Field label="Campus">
          <Select value={form.campusId} onChange={(e) => set("campusId", e.target.value)}>
            <option value="">—</option>
            {campuses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Visibilidade">
          <Select value={form.visibility} onChange={(e) => set("visibility", e.target.value as EventVisibility)}>
            <option value="PUBLIC">Pública</option>
            <option value="MEMBERS">Membros</option>
            <option value="INTERNAL">Interna</option>
          </Select>
        </Field>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={form.publish} onChange={(e) => set("publish", e.target.checked)} />
        Publicar imediatamente (abre inscrições)
      </label>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Criando…" : "Criar evento"}
      </Button>
    </form>
  );
}
