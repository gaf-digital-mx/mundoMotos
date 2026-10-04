import { describe, expect, it } from 'vitest';

import { analyticsEngineRecorder, isAutomated } from './recorder';

describe('analyticsEngineRecorder', () => {
  it('writes one anonymous data point per click', () => {
    const points: AnalyticsEngineDataPoint[] = [];
    analyticsEngineRecorder({ writeDataPoint: (point) => points.push(point ?? {}) }).record({
      target: 'whatsapp',
      source: 'hero',
      locale: 'es',
      country: 'MX',
    });
    expect(points).toEqual([
      { indexes: ['whatsapp'], blobs: ['whatsapp', 'hero', 'es', 'MX'], doubles: [1] },
    ]);
  });

  it('records nothing without a binding', () => {
    expect(() => {
      analyticsEngineRecorder(undefined).record({
        target: 'phone',
        source: 'footer',
        locale: 'es',
        country: 'XX',
      });
    }).not.toThrow();
  });
});

describe('isAutomated', () => {
  const browser =
    'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Mobile Safari/537.36';

  it('counts real browsers, including phone models that contain "bot"', () => {
    expect(isAutomated({ userAgent: browser, purpose: undefined })).toBe(false);
    const cubot = browser.replace('Android 14', 'Android 13; CUBOT P50');
    expect(isAutomated({ userAgent: cubot, purpose: undefined })).toBe(false);
  });

  it.each([
    'Googlebot/2.1 (+http://www.google.com/bot.html)',
    'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)',
    'Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)',
    'Twitterbot/1.0',
    'facebookexternalhit/1.1',
    'WhatsApp/2.23.20.0',
    'curl/8.4.0',
  ])('skips %s', (userAgent) => {
    expect(isAutomated({ userAgent, purpose: undefined })).toBe(true);
  });

  it('skips requests without a user agent and prefetches', () => {
    expect(isAutomated({ userAgent: undefined, purpose: undefined })).toBe(true);
    expect(isAutomated({ userAgent: browser, purpose: 'prefetch;prerender' })).toBe(true);
  });
});
