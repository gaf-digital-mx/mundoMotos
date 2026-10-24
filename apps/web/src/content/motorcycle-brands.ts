/**
 * What the quote form offers for "my bike". Proper nouns and numbers, the same in any language,
 * so they live here rather than in the message catalogs: only the wrapper copy ("Otra", "No sé",
 * the `cc` suffix) is translated. The list is the one the workshop sees most; a bike outside it
 * is typed into the "Otra" field, so the list never has to be exhaustive.
 */
export const MOTORCYCLE_BRANDS = [
  'Italika',
  'Honda',
  'Yamaha',
  'Suzuki',
  'Vento',
  'Dinamo',
] as const;

/** Engine displacements in cc, in the order they are offered. */
export const DISPLACEMENTS_CC = [110, 125, 150, 175, 200, 250] as const;
