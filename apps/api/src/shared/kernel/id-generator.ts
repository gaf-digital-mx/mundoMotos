/** Port: identifier generation is injected so tests can use predictable ids. */
export interface IdGenerator {
  next(): string;
}

export const cryptoIdGenerator: IdGenerator = { next: () => crypto.randomUUID() };
