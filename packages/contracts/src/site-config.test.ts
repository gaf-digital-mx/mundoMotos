import { describe, expect, it } from 'vitest';

import { parseSiteConfig } from './site-config';

const validEnv = {
  SITE_URL: 'https://mundomotos.example.workers.dev/',
  SITE_INDEXABLE: 'false',
  BUSINESS_WHATSAPP_NUMBER: '525500000000',
  BUSINESS_FACEBOOK_URL: 'https://www.facebook.com/',
};

describe('parseSiteConfig', () => {
  it('normalizes a valid environment', () => {
    expect(parseSiteConfig(validEnv)).toEqual({
      siteUrl: 'https://mundomotos.example.workers.dev',
      indexable: false,
      whatsappNumber: '525500000000',
      phoneNumber: '525500000000',
      facebookUrl: 'https://www.facebook.com/',
    });
  });

  it('accepts only an https Facebook URL (it is a redirect target)', () => {
    expect(() =>
      parseSiteConfig({ ...validEnv, BUSINESS_FACEBOOK_URL: 'javascript:alert(1)' }),
    ).toThrow(/BUSINESS_FACEBOOK_URL/);
    expect(() =>
      parseSiteConfig({ ...validEnv, BUSINESS_FACEBOOK_URL: 'http://www.facebook.com/' }),
    ).toThrow(/BUSINESS_FACEBOOK_URL/);
  });

  it('uses a dedicated phone number when provided', () => {
    const config = parseSiteConfig({ ...validEnv, BUSINESS_PHONE_NUMBER: '525511111111' });
    expect(config.phoneNumber).toBe('525511111111');
  });

  it('parses SITE_INDEXABLE strictly', () => {
    expect(parseSiteConfig({ ...validEnv, SITE_INDEXABLE: 'true' }).indexable).toBe(true);
    expect(() => parseSiteConfig({ ...validEnv, SITE_INDEXABLE: 'yes' })).toThrow(/SITE_INDEXABLE/);
  });

  it.each(['+525500000000', '55 0000 0000', '5500', 'abc'])(
    'rejects a malformed WhatsApp number: %s',
    (number) => {
      expect(() => parseSiteConfig({ ...validEnv, BUSINESS_WHATSAPP_NUMBER: number })).toThrow(
        /BUSINESS_WHATSAPP_NUMBER/,
      );
    },
  );

  it('lists every invalid key at once', () => {
    expect(() => parseSiteConfig({})).toThrow(
      /SITE_URL.*SITE_INDEXABLE.*BUSINESS_WHATSAPP_NUMBER.*BUSINESS_FACEBOOK_URL/,
    );
  });
});
