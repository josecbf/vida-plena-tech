"use client";

import { useState } from "react";
import {
  registerPublicPerson,
  type PublicRegistrationInput,
} from "@/modules/people/public";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";

export function RegistrationForm({
  gcToken,
  gcName,
}: {
  gcToken?: string;
  gcName?: string;
}) {
  const [form, setForm] = useState<PublicRegistrationInput>({
    fullName: "",
    email: "",
    phone: "",
    whatsapp: "",
    birthDate: "",
    cpf: "",
    gcToken,
  });
  const [done, setDone] = useState<{ name?: string } | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function set<K extends keyof PublicRegistrationInput>(
    key: K,
    value: PublicRegistrationInput[K],
  ) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setWarning(null);
    setPending(true);
    try {
      const r = await registerPublicPerson(form);
      if (r.ok) {
        setDone({ name: r.gcName });
      } else if (r.reason === "DUPLICATE_CPF" || r.reason === "POSSIBLE_MATCH") {
        setWarning(r.message);
      } else {
        setError(r.message);
      }
    } catch {
      setError("Não foi possível enviar. Tente novamente.");
    } finally {
      setPending(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-lg border border-success/30 bg-success/5 p-6 text-center">
        <h2 className="text-lg font-semibold text-success">Cadastro recebido!</h2>
        <p className="mt-2 text-sm text-ink/80">
          Obrigado. {done.name ? `Você foi vinculado ao GC ${done.name}. ` : ""}
          Em breve alguém da igreja entrará em contato.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {gcName ? (
        <div className="rounded-md bg-ink/5 px-3 py-2 text-sm">
          Você está se cadastrando pelo GC <strong>{gcName}</strong>.
        </div>
      ) : null}
      <Field label="Nome completo">
        <Input value={form.fullName} onChange={(e) => set("fullName", e.target.value)} required />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Telefone">
          <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} />
        </Field>
        <Field label="WhatsApp">
          <Input value={form.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} />
        </Field>
      </div>
      <Field label="E-mail">
        <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Data de nascimento">
          <Input type="date" value={form.birthDate} onChange={(e) => set("birthDate", e.target.value)} />
        </Field>
        <Field label="CPF (opcional)" hint="Ajuda a evitar cadastro duplicado.">
          <Input value={form.cpf} onChange={(e) => set("cpf", e.target.value)} placeholder="000.000.000-00" />
        </Field>
      </div>

      {warning ? (
        <div className="rounded-md border border-warning/30 bg-warning/5 px-3 py-2 text-sm text-warning">
          {warning}
        </div>
      ) : null}
      {error ? <p className="text-sm text-danger">{error}</p> : null}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Enviando…" : "Enviar cadastro"}
      </Button>
    </form>
  );
}
