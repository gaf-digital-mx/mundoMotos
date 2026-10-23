import { describe, expect, it } from 'vitest';

import { buildQuoteMessage, LIMITS, validateQuote } from './quote-message';

const TEMPLATES = {
  brand: 'Marca: {brand}.',
  model: 'Modelo: {model}.',
  displacement: 'Cilindraje: {displacement}.',
};

const BASE = 'Hola, Mundo Motos. Quiero cotizar: Afinación.';

describe('validateQuote', () => {
  it('accepts an answer with the brand alone', () => {
    expect(validateQuote({ brand: 'Italika', model: '', displacement: '' })).toEqual({});
  });

  it('requires the brand, ignoring surrounding whitespace', () => {
    expect(validateQuote({ brand: '   ', model: 'FT 150', displacement: '150 cc' })).toEqual({
      brand: 'required',
    });
  });

  it('rejects overly long values', () => {
    expect(
      validateQuote({
        brand: 'a'.repeat(LIMITS.brand.max + 1),
        model: 'b'.repeat(LIMITS.model.max + 1),
        displacement: '',
      }),
    ).toEqual({ brand: 'tooLong', model: 'tooLong' });
  });
});

describe('buildQuoteMessage', () => {
  it('says the service, then one sentence per answered field', () => {
    expect(
      buildQuoteMessage(BASE, TEMPLATES, {
        brand: '  Italika ',
        model: 'Vort-X   200',
        displacement: '200 cc',
      }),
    ).toBe(`${BASE} Marca: Italika. Modelo: Vort-X 200. Cilindraje: 200 cc.`);
  });

  it('drops the sentence of a field left empty', () => {
    expect(
      buildQuoteMessage(BASE, TEMPLATES, { brand: 'Honda', model: '', displacement: '' }),
    ).toBe(`${BASE} Marca: Honda.`);
  });

  it('does not interpret replacement patterns typed by the visitor', () => {
    expect(
      buildQuoteMessage('', TEMPLATES, { brand: 'Otra $& $1', model: '', displacement: '' }),
    ).toBe('Marca: Otra $& $1.');
  });
});
