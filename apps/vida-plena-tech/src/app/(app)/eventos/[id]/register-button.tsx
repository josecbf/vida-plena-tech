"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { registerForEvent, cancelRegistration } from "@/modules/events/actions";

export function RegisterButton({
  eventId,
  personId,
  registered,
}: {
  eventId: string;
  personId: string;
  registered: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    setError(null);
    setPending(true);
    try {
      if (registered) {
        await cancelRegistration({ eventId, personId });
      } else {
        await registerForEvent({ eventId, personId });
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <Button variant={registered ? "outline" : "default"} onClick={toggle} disabled={pending}>
        {pending ? "…" : registered ? "Cancelar inscrição" : "Inscrever-me"}
      </Button>
      {error ? <p className="mt-1 text-sm text-danger">{error}</p> : null}
    </div>
  );
}
