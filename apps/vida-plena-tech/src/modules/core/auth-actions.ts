"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/server/db";
import { verifyPassword, createSession, destroySession } from "@/server/auth";

export interface LoginResult {
  ok: boolean;
  error?: string;
}

export async function login(
  _prev: LoginResult | undefined,
  formData: FormData,
): Promise<LoginResult> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { ok: false, error: "Informe e-mail e senha." };
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return { ok: false, error: "Credenciais inválidas." };
  }

  await prisma.tenantMembership.updateMany({
    where: { userId: user.id },
    data: { lastAccessedAt: new Date() },
  });

  await createSession(user.id);
  redirect("/");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}
