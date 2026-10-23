'use client';

import { useId, useState, type SubmitEvent } from 'react';
import { flushSync } from 'react-dom';

import { whatsappUrl } from '@/shared/lib/contact-links';
import { WhatsappIcon } from '@/shared/ui/whatsapp-icon';

import {
  buildQuoteMessage,
  LIMITS,
  validateQuote,
  type QuoteErrors,
  type QuoteInput,
  type QuoteTemplates,
} from './quote-message';

/** Picked in the brand list to type a brand that isn't in it. Never part of the message. */
const OTHER = 'other';

export type QuoteLabels = {
  title: string;
  brand: string;
  brandPlaceholder: string;
  brandOther: string;
  brandOtherLabel: string;
  model: string;
  displacement: string;
  displacementPlaceholder: string;
  submit: string;
  newTabHint: string;
  errors: { brandRequired: string; tooLong: string };
};

/** Everything the form needs that depends on the service or on site config. */
export type ServiceQuote = {
  whatsappNumber: string;
  /** Click report without the message (ADR-0013): what visitors type never reaches the site. */
  trackUrl: string;
  /** The service's own line, e.g. "Hola, Mundo Motos. Quiero cotizar: Afinación.". */
  baseMessage: string;
  brands: readonly string[];
  displacements: readonly string[];
  labels: QuoteLabels;
  templates: QuoteTemplates;
};

type Props = ServiceQuote & { closeLabel: string; onClose: () => void };

/**
 * The quote that closes the service dialog: three answers about the bike, then WhatsApp with the
 * message already written. Nothing is sent or stored by the site. Strings arrive as props (no
 * client-side i18n runtime), and the controls of the dialog live inside the form so that the
 * green button is its natural submit.
 */
export function QuoteForm({
  whatsappNumber,
  trackUrl,
  baseMessage,
  brands,
  displacements,
  labels,
  templates,
  closeLabel,
  onClose,
}: Props) {
  const id = useId();
  const [brand, setBrand] = useState('');
  const [errors, setErrors] = useState<QuoteErrors>({});

  const brandError =
    errors.brand === 'tooLong' ? labels.errors.tooLong : labels.errors.brandRequired;
  // Which control the brand error belongs to: the list, or the field it opens.
  const brandErrorId = brand === OTHER ? `${id}-brandOther-error` : `${id}-brand-error`;

  const onSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const field = (key: string) => {
      const value = data.get(key);
      return typeof value === 'string' ? value : '';
    };
    const picked = field('brand');
    const input: QuoteInput = {
      brand: picked === OTHER ? field('brandOther') : picked,
      model: field('model'),
      displacement: field('displacement'),
    };
    const found = validateQuote(input);
    // Painted before the focus moves: a screen reader builds a control's description when focus
    // lands on it, and an `aria-describedby` added afterwards is not announced again.
    flushSync(() => {
      setErrors(found);
    });

    if (Object.keys(found).length > 0) {
      const invalid = found.brand ? (picked === OTHER ? 'brandOther' : 'brand') : 'model';
      document.getElementById(`${id}-${invalid}`)?.focus();
      return;
    }

    // Opens wa.me directly (the message is the visitor's own words, so it never goes through our
    // redirect); the click is counted by a content-free beacon.
    try {
      navigator.sendBeacon(trackUrl);
    } catch {
      // Analytics must never block the lead: old WebViews may lack sendBeacon.
    }
    const url = whatsappUrl(whatsappNumber, buildQuoteMessage(baseMessage, templates, input));
    // No 'noopener' feature string: with it, window.open always returns null and we couldn't
    // detect a blocked pop-up. Detach the opener manually instead.
    const opened = window.open(url, '_blank');
    if (opened) opened.opener = null;
    else window.location.assign(url); // pop-up blocked: continue in this tab
  };

  const fieldClass =
    'min-h-11 w-full rounded-xl border border-ash-gray/60 bg-void px-12 py-6 text-body font-normal text-bone-white focus:border-ignition-gold focus:ring-0 aria-invalid:border-amber';
  const labelClass = 'text-nav-label font-semibold tracking-label uppercase';
  const errorClass = 'text-caption font-semibold text-bone-white';

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-18">
      <h3 className="text-nav-label font-semibold tracking-label uppercase">{labels.title}</h3>

      {/* The brand and the field it opens sit side by side, so picking "Otra" costs no height:
          it takes the cell beside the list and pushes the model into the row below. */}
      <div className="grid gap-18 sm:grid-cols-2">
        <div className="flex flex-col gap-6">
          <label htmlFor={`${id}-brand`} className={labelClass}>
            {labels.brand}
          </label>
          <select
            id={`${id}-brand`}
            name="brand"
            required
            value={brand}
            onChange={(event) => {
              setBrand(event.currentTarget.value);
              // The answer changed, so a rejection of the previous one would now contradict what
              // is on screen: "elige la marca" must not stay under a brand that is picked, nor
              // move onto the "Otra" field before anything has been typed into it.
              setErrors((current) => {
                if (!current.brand) return current;
                const next = { ...current };
                delete next.brand;
                return next;
              });
            }}
            aria-invalid={errors.brand && brand !== OTHER ? true : undefined}
            aria-describedby={errors.brand && brand !== OTHER ? brandErrorId : undefined}
            className={fieldClass}
          >
            <option value="">{labels.brandPlaceholder}</option>
            {brands.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
            <option value={OTHER}>{labels.brandOther}</option>
          </select>
          {errors.brand && brand !== OTHER ? (
            <p id={`${id}-brand-error`} className={errorClass}>
              {brandError}
            </p>
          ) : null}
        </div>

        {brand === OTHER ? (
          <div className="flex flex-col gap-6">
            <label htmlFor={`${id}-brandOther`} className={labelClass}>
              {labels.brandOtherLabel}
            </label>
            <input
              id={`${id}-brandOther`}
              name="brandOther"
              type="text"
              maxLength={LIMITS.brand.max}
              required
              aria-invalid={errors.brand ? true : undefined}
              aria-describedby={errors.brand ? brandErrorId : undefined}
              className={fieldClass}
            />
            {errors.brand ? (
              <p id={`${id}-brandOther-error`} className={errorClass}>
                {brandError}
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="flex flex-col gap-6">
          <label htmlFor={`${id}-model`} className={labelClass}>
            {labels.model}
          </label>
          <input
            id={`${id}-model`}
            name="model"
            type="text"
            maxLength={LIMITS.model.max}
            aria-invalid={errors.model ? true : undefined}
            aria-describedby={errors.model ? `${id}-model-error` : undefined}
            className={fieldClass}
          />
          {errors.model ? (
            <p id={`${id}-model-error`} className={errorClass}>
              {labels.errors.tooLong}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-6">
          <label htmlFor={`${id}-displacement`} className={labelClass}>
            {labels.displacement}
          </label>
          <select
            id={`${id}-displacement`}
            name="displacement"
            defaultValue=""
            className={fieldClass}
          >
            <option value="">{labels.displacementPlaceholder}</option>
            {displacements.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-18">
        <button
          type="submit"
          className="inline-flex min-h-11 items-center gap-12 rounded-3xl bg-whatsapp-fill px-24 py-12 text-nav-label font-semibold tracking-label text-bone-white uppercase transition-colors hover:bg-whatsapp-fill-hover"
        >
          <WhatsappIcon className="size-18" />
          {labels.submit}
          <span className="sr-only"> {labels.newTabHint}</span>
        </button>
        <button
          type="button"
          onClick={onClose}
          className="min-h-11 text-caption font-semibold tracking-label text-silver-mist uppercase hover:text-bone-white"
        >
          {closeLabel}
        </button>
      </div>
    </form>
  );
}
