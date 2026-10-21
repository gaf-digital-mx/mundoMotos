/** Where the live number goes in a readout template. */
export const RPM_SLOT = '{rpm}';

/**
 * The build's locales are bare languages (`es`), which formats 8000 as "8000". The copy is
 * Mexican, and so are its numbers: "8,000".
 */
const NUMBER_LOCALES: Record<string, string> = { es: 'es-MX' };
export const numberLocale = (locale: string) => NUMBER_LOCALES[locale] ?? locale;

/**
 * Everything the service dialog shows beyond the card's own copy. The server resolves every
 * string (there is no client-side i18n) and hands the dialog this finished shape.
 */
export type ServiceDetail = {
  /** Heading above the table, e.g. "La afinación incluye". */
  title: string;
  /** The fine print under it: what the price depends on. */
  note: string;
  table: TableLabels;
  works: readonly ServiceWorkRow[];
  /** Absent while a service has no figure of its own. */
  figure?: FigureLabels;
};

export type TableLabels = {
  work: string;
  bike: string;
  scooter: string;
  /** Read out in place of the check mark, which carries no meaning on its own. */
  yes: string;
  no: string;
};

export type ServiceWorkRow = { id: string; label: string; scooter: boolean };

/** The card around a figure: everything written on it, plus the locale its numbers are in. */
export type FigureLabels = {
  title: string;
  hint: string;
  caption: string;
  /** A template with one placeholder, so the unit can move with the language. */
  readout: string;
  /** The name of the one thing the visitor can move. */
  control: string;
  /** What the drawing is, for anyone who can't see it. */
  alt: string;
  keys: Record<string, string>;
  locale: string;
  /** The corner tag on the card, in place of the kit's "Fig n". */
  tag: string;
};
