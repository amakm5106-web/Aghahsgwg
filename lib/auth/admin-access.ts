export const ADMIN_ALLOWLIST_EMAIL = 'primren685@gmail.com';

export function isAdminIdentifier(identifier: string, identifierType: 'email' | 'phone'): boolean {
  return identifierType === 'email'
    && identifier.trim().toLowerCase() === ADMIN_ALLOWLIST_EMAIL;
}
