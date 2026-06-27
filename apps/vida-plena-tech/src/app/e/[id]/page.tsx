import { notFound } from "next/navigation";
import { prisma } from "@/server/db";
import { Logo } from "@/components/logo";
import { formatDateTime } from "@/lib/format";
import { EventPublicForm } from "./event-public-form";

// Página PÚBLICA de inscrição em evento (sem login).
export default async function PublicEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const event = await prisma.event.findUnique({ where: { id } });
  // Só evento publicado e não arquivado é acessível publicamente.
  if (!event || event.status !== "PUBLISHED" || event.archivedAt) notFound();

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink px-4 py-10">
      <div className="w-full max-w-md rounded-xl bg-paper p-8 shadow-lg">
        <div className="mb-6 flex flex-col items-center text-center">
          <Logo size={44} className="text-ink" />
          <div className="display mt-3 text-lg">{event.title}</div>
          <p className="mt-1 text-sm text-mist">{formatDateTime(event.startsAt)}</p>
          {event.location ? (
            <p className="text-sm text-mist">{event.location}</p>
          ) : null}
          {event.description ? (
            <p className="mt-3 text-sm text-ink/80">{event.description}</p>
          ) : null}
        </div>
        <EventPublicForm eventId={event.id} />
        <p className="mt-6 text-center text-xs text-mist">
          Inscrição gratuita. Não é necessário ter cadastro ou login.
        </p>
      </div>
    </div>
  );
}
