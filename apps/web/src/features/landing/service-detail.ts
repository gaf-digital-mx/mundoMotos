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
