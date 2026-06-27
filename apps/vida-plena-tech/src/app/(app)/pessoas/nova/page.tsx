import { requireContext, assertPermission, can } from "@/server/context";
import { prisma } from "@/server/db";
import { PageHeader } from "@/components/ui/misc";
import { PersonForm } from "../person-form";

export default async function NewPersonPage() {
  const ctx = await requireContext();
  assertPermission(ctx, "people.person.create");

  const campuses = await prisma.campus.findMany({
    where: { tenantId: ctx.tenantId, archivedAt: null },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <PageHeader
        title="Nova pessoa"
        description="Toda pessoa entra como Visitante. A promoção a Membro exige GC + CPF."
      />
      <PersonForm
        mode="create"
        campuses={campuses}
        cpfEditable={can(ctx, "people.cpf.view_full") || can(ctx, "people.cpf.capture")}
      />
    </div>
  );
}
