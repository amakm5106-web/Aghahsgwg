import type { NextRequest } from 'next/server';
import { getSessionUser, sessionTokenFromRequest, type AuthenticatedUser } from './core';

export async function getAdminSessionUser(request: NextRequest): Promise<AuthenticatedUser | null> {
  const user = await getSessionUser(sessionTokenFromRequest(request));
  return user?.role === 'admin' ? user : null;
}
