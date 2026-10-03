/**
 * Validation and message building for the 2-field inquiry form. Pure and dependency-free (no
 * Zod) because it ships to the browser inside a client island.
 */
export const LIMITS = { name: { min: 2, max: 60 }, query: { min: 5, max: 500 } } as const;

export type ContactInput = { name: string; query: string };
export type ContactErrors = Partial<Record<keyof ContactInput, 'required' | 'tooLong'>>;

const normalize = (value: string) => value.replace(/\s+/g, ' ').trim();

export const validateContact = (input: ContactInput): ContactErrors => {
  const errors: ContactErrors = {};
  const name = normalize(input.name);
  const query = input.query.trim();

  if (name.length < LIMITS.name.min) errors.name = 'required';
  else if (name.length > LIMITS.name.max) errors.name = 'tooLong';

  if (query.length < LIMITS.query.min) errors.query = 'required';
  else if (query.length > LIMITS.query.max) errors.query = 'tooLong';

  return errors;
};

/**
 * Fills `{name}` / `{query}` placeholders of the translated template. Replacer functions are used
 * so `$&`, `$1`… typed by the visitor are inserted literally, not as replacement patterns.
 */
export const buildContactMessage = (template: string, input: ContactInput): string => {
  const values: Record<string, string> = { name: normalize(input.name), query: input.query.trim() };
  return template.replace(/\{(name|query)\}/g, (_match, key: string) => values[key] ?? '');
};
