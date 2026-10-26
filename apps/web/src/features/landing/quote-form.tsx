'use client';

import { useId, useState, type SubmitEvent } from 'react';
import { flushSync } from 'react-dom';

import { whatsappUrl } from '@/shared/lib/contact-links';
import { ChevronDownIcon } from '@/shared/ui/icons';
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
  brandOther: string;
  brandOtherLabel: string;
  model: string;
  displacement: string;
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

type FieldName = 'brand' | 'brandOther' | 'model' | 'displacement';

const EMPTY: Record<FieldName, string> = { brand: '', brandOther: '', model: '', displacement: '' };

const FIELD =
  'min-h-11 w-full rounded-xl border border-ash-gray/60 bg-void px-12 py-6 text-body font-normal text-bone-white focus:border-ignition-gold focus:outline-none aria-invalid:border-amber';
/** The arrow is ours, so it can sit clear of the border; `pr` keeps a long answer out from under it. */
const SELECT = `${FIELD} appearance-none pr-36`;
// Only what moves. `transition-all` animates every property, and an animating `font-size`
// is enough layout thrash to be worth not asking for.
const MOVE =
  'transition-[top,left,font-size,color,background-color] duration-150 ease-out motion-reduce:transition-none';

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
  const [answers, setAnswers] = useState(EMPTY);
  const [focused, setFocused] = useState('');
  const [errors, setErrors] = useState<QuoteErrors>({});
  const brand = answers.brand;

  const brandError =
    errors.brand === 'tooLong' ? labels.errors.tooLong : labels.errors.brandRequired;
  // Which control the brand error belongs to: the list, or the field it opens.
  const brandErrorId = brand === OTHER ? `${id}-brandOther-error` : `${id}-brand-error`;

  const answer = (name: FieldName, value: string) => {
    setAnswers((current) => ({ ...current, [name]: value }));
  };

  /**
   * The label starts inside the field, as its placeholder, and climbs onto the border once the
   * field is focused or answered — the border is cut behind it by a patch of the dialog's own
   * black. Two finished class strings rather than `peer-*` variants: those land at equal
   * specificity, so which one won would depend on the order Tailwind happened to emit them in.
   */
  const labelClass = (name: FieldName, invalid = false) => {
    const up = focused === name || answers[name].length > 0;
    if (!up) {
      return `pointer-events-none absolute top-1/2 left-12 -translate-y-1/2 text-body font-normal text-silver-mist ${MOVE}`;
    }
    const tone = invalid
      ? 'text-amber'
      : focused === name
        ? 'text-ignition-gold'
        : 'text-silver-mist';
    return `pointer-events-none absolute top-0 left-9 -translate-y-1/2 bg-void px-3 text-caption font-semibold tracking-label ${tone} ${MOVE}`;
  };

  const watch = (name: FieldName) => ({
    onFocus: () => {
      setFocused(name);
    },
    onBlur: () => {
      setFocused((current) => (current === name ? '' : current));
    },
  });

  const onSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const input: QuoteInput = {
      brand: brand === OTHER ? answers.brandOther : brand,
      model: answers.model,
      displacement: answers.displacement,
    };
    const found = validateQuote(input);
    // Painted before the focus moves: a screen reader builds a control's description when focus
    // lands on it, and an `aria-describedby` added afterwards is not announced again.
    flushSync(() => {
      setErrors(found);
    });

    if (Object.keys(found).length > 0) {
      const invalid = found.brand ? (brand === OTHER ? 'brandOther' : 'brand') : 'model';
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

  const errorClass = 'mt-6 text-caption font-semibold text-bone-white';
  const arrow = 'pointer-events-none absolute top-1/2 right-12 size-18 -translate-y-1/2';

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-18">
      <h3 className="pt-10 text-nav-label font-semibold tracking-label text-ignition-gold uppercase">
        {labels.title}
      </h3>

      <div className="grid gap-18">
        <div>
          <div className="relative">
            <select
              id={`${id}-brand`}
              name="brand"
              required
              value={brand}
              {...watch('brand')}
              onChange={(event) => {
                answer('brand', event.currentTarget.value);
                // The answer changed, so a rejection of the previous one would now contradict
                // what is on screen: "elige la marca" must not stay under a brand that is
                // picked, nor move onto the "Otra" field before anything has been typed into it.
                setErrors((current) => {
                  if (!current.brand) return current;
                  const next = { ...current };
                  delete next.brand;
                  return next;
                });
              }}
              aria-invalid={errors.brand && brand !== OTHER ? true : undefined}
              aria-describedby={errors.brand && brand !== OTHER ? brandErrorId : undefined}
              className={SELECT}
            >
              {/* The empty answer, with nothing to read: the label is the placeholder, and
                  `hidden` keeps a blank row out of the open list. Without it the field would
                  start on a brand nobody picked. */}
              <option value="" disabled hidden />
              {brands.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
              <option value={OTHER}>{labels.brandOther}</option>
            </select>
            <ChevronDownIcon className={`${arrow} text-silver-mist`} />
            <label
              htmlFor={`${id}-brand`}
              className={labelClass('brand', Boolean(errors.brand) && brand !== OTHER)}
            >
              {labels.brand}
            </label>
          </div>
          {errors.brand && brand !== OTHER ? (
            <p id={`${id}-brand-error`} className={errorClass}>
              {brandError}
            </p>
          ) : null}
        </div>

        {brand === OTHER ? (
          <div>
            <div className="relative">
              <input
                id={`${id}-brandOther`}
                name="brandOther"
                type="text"
                maxLength={LIMITS.brand.max}
                required
                value={answers.brandOther}
                {...watch('brandOther')}
                onChange={(event) => {
                  answer('brandOther', event.currentTarget.value);
                }}
                aria-invalid={errors.brand ? true : undefined}
                aria-describedby={errors.brand ? brandErrorId : undefined}
                className={FIELD}
              />
              <label
                htmlFor={`${id}-brandOther`}
                className={labelClass('brandOther', Boolean(errors.brand))}
              >
                {labels.brandOtherLabel}
              </label>
            </div>
            {errors.brand ? (
              <p id={`${id}-brandOther-error`} className={errorClass}>
                {brandError}
              </p>
            ) : null}
          </div>
        ) : null}

        <div>
          <div className="relative">
            <input
              id={`${id}-model`}
              name="model"
              type="text"
              maxLength={LIMITS.model.max}
              value={answers.model}
              {...watch('model')}
              onChange={(event) => {
                answer('model', event.currentTarget.value);
              }}
              aria-invalid={errors.model ? true : undefined}
              aria-describedby={errors.model ? `${id}-model-error` : undefined}
              className={FIELD}
            />
            <label htmlFor={`${id}-model`} className={labelClass('model', Boolean(errors.model))}>
              {labels.model}
            </label>
          </div>
          {errors.model ? (
            <p id={`${id}-model-error`} className={errorClass}>
              {labels.errors.tooLong}
            </p>
          ) : null}
        </div>

        <div className="relative">
          <select
            id={`${id}-displacement`}
            name="displacement"
            value={answers.displacement}
            {...watch('displacement')}
            onChange={(event) => {
              answer('displacement', event.currentTarget.value);
            }}
            className={SELECT}
          >
            <option value="" disabled hidden />
            {displacements.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
          <ChevronDownIcon className={`${arrow} text-silver-mist`} />
          <label htmlFor={`${id}-displacement`} className={labelClass('displacement')}>
            {labels.displacement}
          </label>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-18 pt-10">
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
