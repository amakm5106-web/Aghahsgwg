import { createHash, randomBytes } from 'node:crypto';
import { compare, hash } from 'bcryptjs';
import type { NextRequest, NextResponse } from 'next/server';
import type { PoolConnection, RowDataPacket } from 'mysql2/promise';
import { getAuthDb } from './db';
import type { IdentifierType } from './validation';
import { isAdminIdentifier } from './admin-access';

export {
  AuthInputError,
  normalizeIdentifier,
  passwordValidationError,
} from './validation';
export type { IdentifierType, NormalizedIdentifier } from './validation';

export const SESSION_COOKIE = 'azlottery_session';
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

export function isJsonRequest(request: NextRequest): boolean {
  return request.headers.get('content-type')?.split(';', 1)[0]?.trim().toLowerCase() === 'application/json';
}
export { isSameOriginRequest } from './origin';

export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export async function hashPassword(password: string): Promise<string> {
  return hash(password, 12);
}

export async function comparePassword(password: string, passwordHash: string): Promise<boolean> {
  return compare(password, passwordHash);
}

export function createSessionToken(): string {
  return randomBytes(32).toString('base64url');
}

export async function insertSession(connection: PoolConnection, userId: string | number | bigint, token: string) {
  await connection.execute(
    `INSERT INTO azlottery_sessions (user_id, token_hash, expires_at)
     VALUES (?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL ${SESSION_TTL_SECONDS} SECOND))`,
    [String(userId), sha256(token)],
  );
}

export type AuthenticatedUser = {
  id: string;
  identifier: string;
  identifierType: IdentifierType;
  role: 'user' | 'admin';
  createdAt: string;
};

export async function getSessionUser(token: string | undefined): Promise<AuthenticatedUser | null> {
  if (!token || token.length > 128) return null;
  const [rows] = await getAuthDb().execute<RowDataPacket[]>(
    `SELECT u.id, u.identifier, u.identifier_type, u.created_at,
            COALESCE(r.role, 'user') AS role
       FROM azlottery_sessions s
       JOIN azlottery_users u ON u.id = s.user_id
       LEFT JOIN azlottery_user_roles r ON r.user_id = u.id
      WHERE s.token_hash = ?
        AND s.expires_at > UTC_TIMESTAMP()
        AND u.status = 'active'
      LIMIT 1`,
    [sha256(token)],
  );

  const user = rows[0];
  if (!user) return null;
  return {
    id: String(user.id),
    identifier: String(user.identifier),
    identifierType: user.identifier_type as IdentifierType,
    role: isAdminIdentifier(String(user.identifier), user.identifier_type as IdentifierType) ? 'admin' : 'user',
    createdAt: new Date(user.created_at).toISOString(),
  };
}

function sessionCookieContext(request?: NextRequest) {
  if (!request) return { secure: true, sameSite: 'none' as const };
  const requestUrl = new URL(request.url);
  const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
  const forwardedProto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim();
  let origin: URL | undefined;
  try {
    const value = request.headers.get('origin');
    if (value) origin = new URL(value);
  } catch {
    origin = undefined;
  }
  const host = (forwardedHost || origin?.host || request.headers.get('host') || requestUrl.host).toLowerCase();
  const protocol = forwardedProto ? `${forwardedProto.replace(/:$/, '')}:` : origin?.protocol || requestUrl.protocol;
  const isLocalPlainHttp = protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(host.split(':')[0]);
  return { secure: !isLocalPlainHttp, sameSite: isLocalPlainHttp ? 'lax' as const : 'none' as const };
}

export function setSessionCookie(response: NextResponse, token: string, request?: NextRequest) {
  const context = sessionCookieContext(request);
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: context.secure,
    sameSite: context.sameSite,
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  });
}

export function clearSessionCookie(response: NextResponse, request?: NextRequest) {
  const context = sessionCookieContext(request);
  response.cookies.set(SESSION_COOKIE, '', {
    httpOnly: true,
    secure: context.secure,
    sameSite: context.sameSite,
    path: '/',
    maxAge: 0,
    expires: new Date(0),
  });
}

export function sessionTokenFromRequest(request: NextRequest): string | undefined {
  return request.cookies.get(SESSION_COOKIE)?.value;
}

export async function isLoginThrottled(identifier: string): Promise<boolean> {
  const key = sha256(identifier);
  const [rows] = await getAuthDb().execute<RowDataPacket[]>(
    `SELECT 1 AS blocked
       FROM azlottery_login_attempts
      WHERE identifier_hash = ? AND blocked_until > UTC_TIMESTAMP()
      LIMIT 1`,
    [key],
  );
  return rows.length > 0;
}

export async function recordFailedLogin(identifier: string) {
  const key = sha256(identifier);
  await getAuthDb().execute(
    `INSERT INTO azlottery_login_attempts
       (identifier_hash, window_started_at, failed_attempts, blocked_until)
     VALUES (?, UTC_TIMESTAMP(), 1, NULL)
     ON DUPLICATE KEY UPDATE
       blocked_until = IF(
         window_started_at < UTC_TIMESTAMP() - INTERVAL 15 MINUTE,
         NULL,
         IF(failed_attempts + 1 >= 10, DATE_ADD(UTC_TIMESTAMP(), INTERVAL 15 MINUTE), blocked_until)
       ),
       failed_attempts = IF(
         window_started_at < UTC_TIMESTAMP() - INTERVAL 15 MINUTE,
         1,
         failed_attempts + 1
       ),
       window_started_at = IF(
         window_started_at < UTC_TIMESTAMP() - INTERVAL 15 MINUTE,
         UTC_TIMESTAMP(),
         window_started_at
       )`,
    [key],
  );
}

export async function clearFailedLogins(identifier: string) {
  await getAuthDb().execute(
    'DELETE FROM azlottery_login_attempts WHERE identifier_hash = ?',
    [sha256(identifier)],
  );
}
