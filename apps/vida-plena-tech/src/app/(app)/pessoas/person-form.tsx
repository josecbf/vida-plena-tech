"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea, Field } from "@/components/ui/input";
import { createPerson, updatePerson, type PersonFormInput } from "@/modules/people/actions";

interface Props {
  mode: "create" | "edit";
  personId?: string;
  campuses: { id: string; name: string }[];
  initial?: Partial<PersonFormInput>;
  canSeeFullCpf: boolean;
}

export function PersonForm({ mode, personId, campuses, initial, canSeeFullCpf }: Props) {
  const router = useRouter();
  const [form, setForm] = useState<PersonFormInput>({
    fullName: initial?.fullName ?? "",
    socialName: initial?.socialName ?? "",
    cpf: initial?.cpf ?? "",
    birthDate: initial?.birthDate ?? "",
    sex: initial?.sex ?? "",
    maritalStatus: initial?.maritalStatus ?? "",
    campusId: initial?.campusId ?? "",
    email: initial?.email ?? "",
    phone: initial?.phone ?? "",
    whatsapp: initial?.whatsapp ?? "",
    isBaptized: initial?.isBaptized ?? false,
    baptismDate: initial?.baptismDate ?? "",
    hasTD: initial?.hasTD ?? false,
    tdDate: initial?.tdDate ?? "",
    operationalNotes: initial?.operationalNotes ?? "",
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function set<K extends keyof PersonFormInput>(key: K, value: PersonFormInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      if (form.isBaptized && !form.baptismDate) {
        throw new Error("Data de batismo é obrigatória quando batizado.");
      }
      if (mode === "create") {
        const r = await createPerson(form);
        router.push(`/pessoas/${r.id}`);
      } else {
        await updatePerson(personId!, form);
        router.push(`/pessoas/${personId}`);
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.");
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Nome completo">
          <Input value={form.fullName} onChange={(e) => set("fullName", e.target.value)} required />
        </Field>
        <Field label="Apelido / nome social">
          <Input value={form.socialName} onChange={(e) => set("socialName", e.target.value)} />
        </Field>
        <Field
          label="CPF"
          hint={
            canSeeFullCpf
              ? "Opcional para visitante; obrigatório para virar membro. Único por igreja."
              : "Apenas administradores veem o CPF completo."
          }
        >
          <Input
            value={form.cpf}
            onChange={(e) => set("cpf", e.target.value)}
            placeholder={canSeeFullCpf ? "000.000.000-00" : "(restrito)"}
            disabled={!canSeeFullCpf}
          />
        </Field>
        <Field label="Data de nascimento" hint="Menores de idade podem se cadastrar.">
          <Input type="date" value={form.birthDate} onChange={(e) => set("birthDate", e.target.value)} />
        </Field>
        <Field label="Sexo">
          <Select value={form.sex} onChange={(e) => set("sex", e.target.value as PersonFormInput["sex"])}>
            <option value="">—</option>
            <option value="FEMALE">Feminino</option>
            <option value="MALE">Masculino</option>
            <option value="UNDISCLOSED">Não informar</option>
          </Select>
        </Field>
        <Field label="Estado civil">
          <Select
            value={form.maritalStatus}
            onChange={(e) => set("maritalStatus", e.target.value as PersonFormInput["maritalStatus"])}
          >
            <option value="">—</option>
            <option value="SINGLE">Solteiro(a)</option>
            <option value="MARRIED">Casado(a)</option>
            <option value="DIVORCED">Divorciado(a)</option>
            <option value="WIDOWED">Viúvo(a)</option>
            <option value="STABLE_UNION">União estável</option>
            <option value="OTHER">Outro</option>
          </Select>
        </Field>
        <Field label="Campus / unidade">
          <Select value={form.campusId} onChange={(e) => set("campusId", e.target.value)}>
            <option value="">—</option>
            {campuses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Field label="E-mail">
          <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
        </Field>
        <Field label="Telefone">
          <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} />
        </Field>
        <Field label="WhatsApp">
          <Input value={form.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} />
        </Field>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-line p-4">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" checked={form.isBaptized} onChange={(e) => set("isBaptized", e.target.checked)} />
            Batizado
          </label>
          {form.isBaptized ? (
            <div className="mt-3">
              <Field label="Data do batismo">
                <Input type="date" value={form.baptismDate} onChange={(e) => set("baptismDate", e.target.value)} />
              </Field>
            </div>
          ) : null}
        </div>
        <div className="rounded-lg border border-line p-4">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" checked={form.hasTD} onChange={(e) => set("hasTD", e.target.checked)} />
            TD — Treinamento de Discípulos
          </label>
          {form.hasTD ? (
            <div className="mt-3">
              <Field label="Data do TD">
                <Input type="date" value={form.tdDate} onChange={(e) => set("tdDate", e.target.value)} />
              </Field>
            </div>
          ) : null}
        </div>
      </div>

      <Field label="Observações operacionais" hint="Não use este campo para conteúdo pastoral sensível.">
        <Textarea value={form.operationalNotes} onChange={(e) => set("operationalNotes", e.target.value)} />
      </Field>

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando…" : mode === "create" ? "Criar pessoa" : "Salvar alterações"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
