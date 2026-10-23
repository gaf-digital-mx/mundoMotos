/**
 * Validation and message building for the quote form in the service dialog. Pure and
 * dependency-free (no Zod) because it ships to the browser inside a client island.
 */
export const LIMITS = { brand: { max: 40 }, model: { max: 40 } } as const;

/** An answered form: `brand` is what was picked or typed, never the "other" sentinel. */
export type QuoteInput = { brand: string; model: string; displacement: string };

export type QuoteErrors = Partial<Record<'brand' | 'model', 'required' | 'tooLong'>>;

/** One sentence per field, e.g. `Marca: {brand}.`. A field left empty drops its sentence. */
export type QuoteTemplates = Record<keyof QuoteInput, string>;

/** In the order they are said. */
const FIELDS = ['brand', 'model', 'displacement'] as const;

const normalize = (value: string) => value.replace(/\s+/g, ' ').trim();

export const validateQuote = (input: QuoteInput): QuoteErrors => {
  const errors: QuoteErrors = {};
  const brand = normalize(input.brand);
  const model = normalize(input.model);

  // The brand is the one answer the price depends on that a visitor always knows; the model and
  // the displacement are asked for, not required, because an unanswered field is a lost lead.
  if (brand.length === 0) errors.brand = 'required';
  else if (brand.length > LIMITS.brand.max) errors.brand = 'tooLong';

  if (model.length > LIMITS.model.max) errors.model = 'tooLong';

  return errors;
};

/**
 * Fills `{brand}` / `{model}` / `{displacement}` placeholders of the translated templates.
 * Replacer functions are used so `$&`, `$1`… typed by the visitor are inserted literally, not as
 * replacement patterns.
 */
export const buildQuoteMessage = (
  base: string,
  templates: QuoteTemplates,
  input: QuoteInput,
): string => {
  const values: QuoteInput = {
    brand: normalize(input.brand),
    model: normalize(input.model),
    displacement: normalize(input.displacement),
  };
  const sentences = FIELDS.filter((field) => values[field].length > 0).map((field) =>
    templates[field].replace(
      /\{(brand|model|displacement)\}/g,
      (_match, key: string) => values[key as keyof QuoteInput],
    ),
  );
  return [normalize(base), ...sentences].filter((part) => part.length > 0).join(' ');
};
