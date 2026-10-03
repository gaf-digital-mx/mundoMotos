/** Formats a 24h `HH:mm` time for display in es-MX, e.g. `18:30` → `6:30 p.m.` */
export const formatTime = (time: string, locale = 'es-MX'): string => {
  const [hours = 0, minutes = 0] = time.split(':').map(Number);
  const date = new Date(Date.UTC(2000, 0, 1, hours, minutes));
  return new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'UTC',
  }).format(date);
};
