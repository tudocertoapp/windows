/**
 * Native: re-export expo-contacts.
 */
import * as Contacts from 'expo-contacts';
export const hasContacts = true;
export const requestContactsPermissions = () => Contacts.requestPermissionsAsync();
export const getContactsAsync = (opts) => Contacts.getContactsAsync(opts);
export const Fields = Contacts.Fields;
