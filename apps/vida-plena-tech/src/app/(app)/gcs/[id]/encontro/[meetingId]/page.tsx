import { notFound } from "next/navigation";
import {
  requireContext,
  assertPermission,
  visibleGcIds,
} from "@/server/context";
import { prisma } from "@/server/db";
import { PageHeader } from "@/components/ui/misc";
import { formatDate } from "@/lib/format";
import { AttendanceStatus } from "@prisma/client";
import { AttendanceForm } from "./attendance-form";

export default async function AttendancePage({
  params,
}: {
  params: Promise<{ id: string; meetingId: string }>;
}) {
  const ctx = await requireContext();
  assertPermission(ctx, "groups.attendance.record");
  const { id, meetingId } = await params;
  const scope = await visibleGcIds(ctx);
  if (scope !== "ALL" && !scope.has(id)) notFound();

  const meeting = await prisma.growthGroupMeeting.findFirst({
    where: { id: meetingId, gcId: id, tenantId: ctx.tenantId },
    include: { attendances: true, gc: true },
  });
  if (!meeting) notFound();

  const members = await prisma.growthGroupMembership.findMany({
    where: { tenantId: ctx.tenantId, gcId: id, leftAt: null },
    include: { person: true },
    orderBy: { person: { fullName: "asc" } },
  });

  const initial: Record<string, AttendanceStatus> = {};
  for (const a of meeting.attendances) {
    if (a.personId) initial[a.personId] = a.status;
  }

  return (
    <div>
      <PageHeader
        title={`Presença — ${formatDate(meeting.date)}`}
        description={meeting.gc.name}
      />
      <AttendanceForm
        meetingId={meetingId}
        gcId={id}
        members={members.map((m) => ({ id: m.personId, fullName: m.person.fullName }))}
        initial={initial}
      />
    </div>
  );
}
