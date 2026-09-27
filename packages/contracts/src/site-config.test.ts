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

  it('uses a dedicated phone number when provided', () => {
    const config = parseSiteConfig({ ...validEnv, BUSINESS_PHONE_NUMBER: '525511111111' });
    expect(config.phoneNumber).toBe('525511111111');
  });

  it('treats an empty optional variable as unset (GitHub renders unset vars as "")', () => {
    const config = parseSiteConfig({ ...validEnv, BUSINESS_PHONE_NUMBER: '' });
    expect(config.phoneNumber).toBe(validEnv.BUSINESS_WHATSAPP_NUMBER);
  });

  it('rejects a SITE_URL without scheme with a clear message', () => {
    expect(() => parseSiteConfig({ ...validEnv, SITE_URL: 'example.workers.dev' })).toThrow(
      /SITE_URL/,
    );
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
