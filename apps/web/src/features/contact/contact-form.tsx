'use client';

import { useId, useState, type SubmitEvent, type SyntheticEvent } from 'react';

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
    queryExample: string;
    submit: string;
    sent: string;
    newTabHint: string;
    errors: { nameRequired: string; queryRequired: string; tooLong: string };
  };
  messageTemplate: string;
};

/**
 * Grows the query field to whatever has been typed into it. Measured from a collapsed height,
 * because `scrollHeight` of a box that is already tall enough only ever reports the box.
 */
const growWithContent = (event: SyntheticEvent<HTMLTextAreaElement>) => {
  const field = event.currentTarget;
  field.style.height = 'auto';
  field.style.height = `${field.scrollHeight}px`;
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

  // Silver rather than ash for the rule: the panel behind it is glass now, and ash only cleared
  // 1.4.11 while the panel was dark enough to be a wall. No placeholder colour any more — there
  // are no placeholders left to colour.
  // A rejected field is amber rather than flame, and takes a ground of its own. Over glass,
  // flame reaches 1.72:1 against the 3:1 a control owes (1.4.11); amber on the bare panel still
  // only reached 2.93 at the foot of the form, where the picture behind is at its lightest. The
  // ground settles that, and a filled field is a better answer to "which one" than a hairline.
  const fieldClass =
    'w-full border-0 border-b border-bone-white bg-transparent px-0 py-12 text-body font-normal text-bone-white focus:border-ignition-gold focus:ring-0 aria-invalid:border-amber aria-invalid:bg-void/30 aria-invalid:px-12';
  const labelClass = 'text-nav-label font-semibold tracking-label uppercase';
  // White, not flame. At 12px over glass flame reaches 2.24:1 against a 4.5:1 bar, and this
  // is the one line a visitor has to read to get unstuck. The amber rule beside it is what
  // says which field, so nothing rests on the colour of the words.
  const errorClass = 'text-caption font-semibold text-bone-white';

  return (
    <form
      data-enter
      noValidate
      onSubmit={onSubmit}
      onInput={() => {
        setSent(false);
      }}
      // A surface of its own, because the section behind it is a photograph: the fields are a
      // bare rule each, and a 1px rule has to hold 3:1 against whatever it lands on (1.4.11) —
      // over the lit metal in the corner of that picture, nothing thin survives. Translucent
      // rather than solid so the workshop still reads through it.
      className="flex flex-col gap-30 rounded-3xl border border-bone-white/20 bg-void/20 p-24 backdrop-blur-lg md:p-30"
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
          <p id={`${id}-name-error`} className={errorClass}>
            {errorText('name')}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-6">
        <label htmlFor={`${id}-query`} className={labelClass}>
          {labels.query}
        </label>
        {/* The example used to be the placeholder, which is the one place it could not stay: it
            vanishes the moment anyone starts typing — exactly when a worked example is worth
            reading — and placeholder grey is the hardest text on the panel to keep legible. As a
            line of its own it is always there, and it is announced with the field. */}
        <p id={`${id}-query-example`} className="text-caption text-bone-white">
          {labels.queryExample}
        </p>
        <textarea
          id={`${id}-query`}
          name="query"
          // Two lines to start, then as many as the answer needs. Dragged resizing is gone with
          // it: the field is already the size of what is in it, so the handle could only ever
          // add empty space, and on a glass panel that space is a hole in the layout.
          rows={2}
          maxLength={LIMITS.query.max}
          required
          aria-invalid={errors.query ? true : undefined}
          aria-describedby={
            errors.query ? `${id}-query-example ${id}-query-error` : `${id}-query-example`
          }
          onInput={growWithContent}
          className={`${fieldClass} resize-none`}
        />
        {errors.query ? (
          <p id={`${id}-query-error`} className={errorClass}>
            {errorText('query')}
          </p>
        ) : null}
      </div>

      <button
        type="submit"
        className="mx-auto mt-12 inline-flex min-h-11 items-center justify-center gap-12 self-start rounded-3xl bg-whatsapp-fill px-24 py-12 text-nav-label font-semibold tracking-label text-bone-white uppercase transition-colors hover:bg-whatsapp-fill-hover md:mx-0"
      >
        <WhatsappIcon className="size-18" />
        {labels.submit}
        <span className="sr-only"> {labels.newTabHint}</span>
      </button>

      <p aria-live="polite" className="text-caption text-bone-white">
        {sent ? labels.sent : ''}
      </p>
    </form>
  );
}
