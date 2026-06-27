"use client";

import { useActionState } from "react";
import { login, type LoginResult } from "@/modules/core/auth-actions";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginResult | undefined, FormData>(
    login,
    undefined,
  );

  return (
    <form action={action} className="space-y-4">
      <Field label="E-mail" htmlFor="email">
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="voce@vidaplena.org"
          required
        />
      </Field>
      <Field label="Senha" htmlFor="password">
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          required
        />
      </Field>
      {state?.error ? (
        <p className="text-sm text-danger">{state.error}</p>
      ) : null}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Entrando…" : "Entrar"}
      </Button>
    </form>
  );
}
