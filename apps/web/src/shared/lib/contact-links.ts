/**
 * Builders for contact deeplinks. Pure functions: callers pass the configured values, so the
 * same helpers work on the server and inside client islands (which receive values as props).
 */

/** `https://wa.me/<digits>?text=<message>`; `number` is E.164 without `+` (e.g. 525500000000). */
export const whatsappUrl = (number: string, message?: string): string => {
  const url = new URL(`https://wa.me/${number}`);
  if (message?.trim()) url.searchParams.set('text', message.trim());
  return url.toString();
};

/** `tel:+<digits>` */
export const telUrl = (number: string): string => `tel:+${number}`;

/** Human-readable Mexican number: `525541234567` → `55 4123 4567`. Falls back to the input. */
export const formatPhoneMx = (number: string): string => {
  const local = number.replace(/^52/, '');
  return /^\d{10}$/.test(local)
    ? `${local.slice(0, 2)} ${local.slice(2, 6)} ${local.slice(6)}`
    : number;
};

type Destination = { name: string; street: string; locality: string; postalCode: string };

/** Google Maps directions to the store, labelled with the business name instead of raw coordinates. */
export const directionsUrl = ({ name, street, locality, postalCode }: Destination): string => {
  const url = new URL('https://www.google.com/maps/dir/');
  url.searchParams.set('api', '1');
  url.searchParams.set('destination', `${name}, ${street}, ${postalCode} ${locality}`);
  return url.toString();
};
