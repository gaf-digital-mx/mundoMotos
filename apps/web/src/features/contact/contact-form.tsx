'use client';

import { useId, useState, type SubmitEvent } from 'react';

import { whatsappUrl } from '@/shared/lib/contact-links';
import { WhatsappIcon } from '@/shared/ui/whatsapp-icon';

import {
  buildContactMessage,
  LIMITS,
  validateContact,
  type ContactErrors,
} from './contact-message';

type Props = {
  whatsappNumber: string;
  /** Click report without the message (ADR-0013): what visitors type never reaches the site. */
  trackUrl: string;
  labels: {
    name: string;
    query: string;
    queryPlaceholder: string;
    submit: string;
    sent: string;
    newTabHint: string;
    errors: { nameRequired: string; queryRequired: string; tooLong: string };
  };
  messageTemplate: string;
};

/**
 * Two-field inquiry form. Nothing is sent or stored by the site: on submit it opens WhatsApp with
 * the message prefilled. Strings arrive as props (no client-side i18n runtime).
 */
export function ContactForm({ whatsappNumber, trackUrl, labels, messageTemplate }: Props) {
  const id = useId();
  const [errors, setErrors] = useState<ContactErrors>({});
  const [sent, setSent] = useState(false);

  const errorText = (field: keyof ContactErrors) => {
    const error = errors[field];
    if (!error) return null;
    if (error === 'tooLong') return labels.errors.tooLong;
    return field === 'name' ? labels.errors.nameRequired : labels.errors.queryRequired;
  };

  const onSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const field = (key: string) => {
      const value = data.get(key);
      return typeof value === 'string' ? value : '';
    };
    const input = { name: field('name'), query: field('query') };
    const found = validateContact(input);
    setErrors(found);
    setSent(false);

    if (Object.keys(found).length > 0) {
      const firstInvalid = found.name ? 'name' : 'query';
      document.getElementById(`${id}-${firstInvalid}`)?.focus();
      return;
    }

    // Opens wa.me directly (the message may hold personal data, so it never goes through our
    // redirect); the click is counted by a content-free beacon.
    try {
      navigator.sendBeacon(trackUrl);
    } catch {
      // Analytics must never block the lead: old WebViews may lack sendBeacon.
    }
    const url = whatsappUrl(whatsappNumber, buildContactMessage(messageTemplate, input));
    // No 'noopener' feature string: with it, window.open always returns null and we couldn't
    // detect a blocked pop-up. Detach the opener manually instead.
    const opened = window.open(url, '_blank');
    if (opened) opened.opener = null;
    else window.location.assign(url); // pop-up blocked: continue in this tab
    setSent(true);
  };

  const fieldClass =
    'w-full border-0 border-b border-ash-gray bg-transparent px-0 py-12 text-body font-normal text-bone-white placeholder:text-ash-gray focus:border-ignition-gold focus:ring-0 aria-invalid:border-flame-orange';
  const labelClass = 'text-nav-label font-semibold tracking-label uppercase';

  return (
    <form
      noValidate
      onSubmit={onSubmit}
      onInput={() => {
        setSent(false);
      }}
      className="flex flex-col gap-30"
    >
      <div className="flex flex-col gap-6">
        <label htmlFor={`${id}-name`} className={labelClass}>
          {labels.name}
        </label>
        <input
          id={`${id}-name`}
          name="name"
          type="text"
          autoComplete="name"
          maxLength={LIMITS.name.max}
          required
          aria-invalid={errors.name ? true : undefined}
          aria-describedby={errors.name ? `${id}-name-error` : undefined}
          className={fieldClass}
        />
        {errors.name ? (
          <p id={`${id}-name-error`} className="text-caption text-flame-orange">
            {errorText('name')}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-6">
        <label htmlFor={`${id}-query`} className={labelClass}>
          {labels.query}
        </label>
        <textarea
          id={`${id}-query`}
          name="query"
          rows={4}
          maxLength={LIMITS.query.max}
          required
          placeholder={labels.queryPlaceholder}
          aria-invalid={errors.query ? true : undefined}
          aria-describedby={errors.query ? `${id}-query-error` : undefined}
          className={`${fieldClass} resize-y`}
        />
        {errors.query ? (
          <p id={`${id}-query-error`} className="text-caption text-flame-orange">
            {errorText('query')}
          </p>
        ) : null}
      </div>

      <button
        type="submit"
        className="inline-flex min-h-11 items-center justify-center gap-12 self-start rounded-3xl bg-whatsapp-fill px-24 py-12 text-nav-label font-semibold tracking-label text-bone-white uppercase transition-colors hover:bg-whatsapp-fill-hover"
      >
        <WhatsappIcon className="size-18" />
        {labels.submit}
        <span className="sr-only"> {labels.newTabHint}</span>
      </button>

      <p aria-live="polite" className="text-caption text-silver-mist">
        {sent ? labels.sent : ''}
      </p>
    </form>
  );
}
