/**
 * Fallback web: API de contatos não disponível no navegador.
 */
export const hasContacts = false;
export async function requestContactsPermissions() {
  return { status: 'denied' };
}
export async function getContactsAsync() {
  return { data: [] };
}
export const Fields = { PhoneNumbers: 'phoneNumbers', Name: 'name' };
