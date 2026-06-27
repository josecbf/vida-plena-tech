import { requireContext, assertPermission } from "@/server/context";
import { prisma } from "@/server/db";
import { PageHeader } from "@/components/ui/misc";
import { EventForm } from "./event-form";

export default async function NewEventPage() {
  const ctx = await requireContext();
  assertPermission(ctx, "events.event.create");
  const campuses = await prisma.campus.findMany({
    where: { tenantId: ctx.tenantId, archivedAt: null },
    orderBy: { name: "asc" },
  });
  return (
    <div>
      <PageHeader title="Novo evento" />
      <EventForm campuses={campuses} />
    </div>
  );
}
