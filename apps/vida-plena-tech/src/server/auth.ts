import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";

// ─────────────────────────────────────────────────────────────────────────
// AUTENTICAÇÃO DE DEMONSTRAÇÃO
//
// Sessão por cookie httpOnly assinado (JWT via `jose`) + senha com bcrypt.
// Estruturado de forma próxima a produção (segredo em env, cookie httpOnly,
// validação no backend), mas é IMPLEMENTAÇÃO DE DEMO — sem refresh tokens,
// rate-limit, MFA, e-mail de verificação, etc. Ver README.
// ─────────────────────────────────────────────────────────────────────────

const COOKIE_NAME = "vp_session";
const SESSION_MAX_AGE = 60 * 60 * 8; // 8h

function secretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "AUTH_SECRET ausente ou muito curto. Defina em .env.local (ver .env.example).",
    );
  }
  return new TextEncoder().encode(secret);
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(
  plain: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export interface SessionPayload {
  userId: string;
}

export async function createSession(userId: string): Promise<void> {
  const token = await new SignJWT({ userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(secretKey());

  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function readSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (typeof payload.userId !== "string") return null;
    return { userId: payload.userId };
  } catch {
    return null;
  }
}
