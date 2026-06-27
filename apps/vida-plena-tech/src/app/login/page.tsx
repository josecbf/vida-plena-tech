import { redirect } from "next/navigation";
import { getContext } from "@/server/context";
import { Logo } from "@/components/logo";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const ctx = await getContext();
  if (ctx) redirect("/");

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink px-4">
      <div className="w-full max-w-sm rounded-xl bg-paper p-8 shadow-lg">
        <div className="mb-6 flex flex-col items-center text-center">
          <Logo size={48} className="text-ink" />
          <div className="display mt-3 text-xl">Vida Plena Tech</div>
          <div className="tagline mt-1 text-[10px] text-mist">
            uma igreja que se importa
          </div>
        </div>
        <LoginForm />
        <p className="mt-6 text-center text-xs text-mist">
          Autenticação de demonstração. Veja credenciais no README.
        </p>
      </div>
    </div>
  );
}
