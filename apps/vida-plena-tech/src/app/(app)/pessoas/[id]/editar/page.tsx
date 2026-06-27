import { notFound } from "next/navigation";
import {
  requireContext,
  assertPermission,
  canViewPerson,
  can,
} from "@/server/context";
import { prisma } from "@/server/db";
import { PageHeader } from "@/components/ui/misc";
import { PersonForm } from "../../person-form";
import { ContactType } from "@prisma/client";

export default async function EditPersonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await requireContext();
  assertPermission(ctx, "people.person.edit");
  const { id } = await params;
  if (!(await canViewPerson(ctx, id))) notFound();

  const person = await prisma.person.findFirst({
    where: { id, tenantId: ctx.tenantId },
    include: {
      contacts: true,
      addresses: { orderBy: { createdAt: "asc" }, take: 1 },
    },
  });
  if (!person) notFound();

  const contact = (t: ContactType) =>
    person.contacts.find((c) => c.type === t)?.value ?? "";
  const addr = person.addresses[0];

  const toDateInput = (d: Date | null) =>
    d ? d.toISOString().slice(0, 10) : "";

  // CPF (P1.2):
  //  • view_full → vê e edita.
  //  • capture   → só pode preencher quando a pessoa AINDA NÃO tem CPF.
  // Não vaza o número para quem não tem view_full (campo só recebe o valor real
  // quando o usuário pode vê-lo).
  const canFullCpf = can(ctx, "people.cpf.view_full");
  const canCaptureEmpty = can(ctx, "people.cpf.capture") && !person.cpf;
  const cpfEditable = canFullCpf || canCaptureEmpty;
  const cpfLockedHint = person.cpf
    ? "Esta pessoa já tem CPF. Apenas administradores podem alterá-lo."
    : "Você não tem permissão para informar o CPF.";

  return (
    <div>
      <PageHeader title={`Editar — ${person.fullName}`} />
      <PersonForm
        mode="edit"
        personId={person.id}
        cpfEditable={cpfEditable}
        cpfLockedHint={cpfLockedHint}
        campuses={await prisma.campus.findMany({
          where: { tenantId: ctx.tenantId, archivedAt: null },
          orderBy: { name: "asc" },
        })}
        initial={{
          fullName: person.fullName,
          socialName: person.socialName ?? "",
          cpf: canFullCpf ? (person.cpf ?? "") : "",
          birthDate: toDateInput(person.birthDate),
          sex: person.sex ?? "",
          maritalStatus: person.maritalStatus ?? "",
          campusId: person.campusId ?? "",
          email: contact("EMAIL"),
          phone: contact("PHONE"),
          whatsapp: contact("WHATSAPP"),
          isBaptized: person.isBaptized,
          baptismDate: toDateInput(person.baptismDate),
          hasTD: person.hasTD,
          tdDate: toDateInput(person.tdDate),
          operationalNotes: person.operationalNotes ?? "",
          street: addr?.street ?? "",
          number: addr?.number ?? "",
          complement: addr?.complement ?? "",
          district: addr?.district ?? "",
          city: addr?.city ?? "",
          state: addr?.state ?? "",
          zipCode: addr?.zipCode ?? "",
        }}
      />
    </div>
  );
}
