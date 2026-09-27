/**
 * Base for expected business failures. `code` is stable and maps to an RFC 9457 problem type
 * (`${SITE_URL}/problems/${code}`) at the HTTP boundary.
 */
export abstract class DomainError extends Error {
  abstract readonly code: string;

  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}
