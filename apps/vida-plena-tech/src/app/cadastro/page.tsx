import { Logo } from "@/components/logo";
import { RegistrationForm } from "./registration-form";

export default function PublicRegistrationPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ink px-4 py-10">
      <div className="w-full max-w-md rounded-xl bg-paper p-8 shadow-lg">
        <div className="mb-6 flex flex-col items-center text-center">
          <Logo size={44} className="text-ink" />
          <div className="display mt-3 text-lg">Vida Plena</div>
          <p className="mt-2 text-sm text-mist">
            Queremos te conhecer. Preencha seus dados — leva 1 minuto.
          </p>
        </div>
        <RegistrationForm />
      </div>
    </div>
  );
}
