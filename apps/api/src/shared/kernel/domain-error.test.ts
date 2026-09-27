import { describe, expect, it } from 'vitest';

import { DomainError } from './domain-error';

class CouponExpired extends DomainError {
  readonly code = 'coupon-expired';
}

describe('DomainError', () => {
  it('exposes a stable code and the concrete class name', () => {
    const error = new CouponExpired('Coupon MM-TEST expired');

    expect(error).toBeInstanceOf(Error);
    expect(error.code).toBe('coupon-expired');
    expect(error.name).toBe('CouponExpired');
    expect(error.message).toBe('Coupon MM-TEST expired');
  });
});
