import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { parse as parseCookieHeader } from "cookie";
import { SignJWT, jwtVerify } from "jose";
import type { Request } from "express";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { ForbiddenError } from "@shared/_core/errors";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
import { ENV } from "./env";

const SESSION_ALG = "HS256";

export type AuthUser = Omit<User, "passwordHash">;

function getSessionSecret() {
  if (!ENV.cookieSecret) {
    throw new Error("JWT_SECRET is not configured");
  }
  return new TextEncoder().encode(ENV.cookieSecret);
}

export function sanitizeUser(user: User): AuthUser {
  const { passwordHash: _passwordHash, ...safeUser } = user;
  return safeUser;
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = scryptSync(password, salt, 64);
  return `${salt}:${derivedKey.toString("hex")}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, key] = storedHash.split(":");
  if (!salt || !key) return false;
  const derivedKey = scryptSync(password, salt, 64);
  const storedKey = Buffer.from(key, "hex");
  if (storedKey.length !== derivedKey.length) return false;
  return timingSafeEqual(storedKey, derivedKey);
}

export async function createSessionToken(userId: number): Promise<string> {
  const issuedAt = Date.now();
  const expirationSeconds = Math.floor((issuedAt + ONE_YEAR_MS) / 1000);
  const secretKey = getSessionSecret();

  return new SignJWT({ userId })
    .setProtectedHeader({ alg: SESSION_ALG, typ: "JWT" })
    .setExpirationTime(expirationSeconds)
    .sign(secretKey);
}

export async function verifySessionToken(token: string): Promise<number | null> {
  try {
    const secretKey = getSessionSecret();
    const { payload } = await jwtVerify(token, secretKey, {
      algorithms: [SESSION_ALG],
    });
    const rawUserId = (payload as Record<string, unknown>)?.userId;
    if (typeof rawUserId === "number") return rawUserId;
    if (typeof rawUserId === "string" && rawUserId.trim() !== "") {
      const parsed = Number(rawUserId);
      return Number.isNaN(parsed) ? null : parsed;
    }
    return null;
  } catch (error) {
    console.warn("[Auth] Session verification failed", String(error));
    return null;
  }
}

export async function authenticateRequest(req: Request): Promise<AuthUser> {
  const cookies = parseCookieHeader(req.headers.cookie ?? "");
  const sessionCookie = cookies[COOKIE_NAME];

  if (!sessionCookie) {
    throw ForbiddenError("Missing session cookie");
  }

  const userId = await verifySessionToken(sessionCookie);
  if (!userId) {
    throw ForbiddenError("Invalid session cookie");
  }

  const user = await db.getUserById(userId);
  if (!user) {
    throw ForbiddenError("User not found");
  }

  return sanitizeUser(user);
}
