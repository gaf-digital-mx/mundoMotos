type Level = 'debug' | 'info' | 'warn' | 'error';

/**
 * Structured JSON logs for Workers Logs. Never pass PII (emails, names, tokens): log ids only.
 */
export const log = (level: Level, msg: string, context: Record<string, unknown> = {}): void => {
  const line = JSON.stringify({ level, msg, ...context });
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
};
