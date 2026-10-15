'use client';

import { useEffect, useRef, useState } from 'react';

type Props = {
  closeLabel: string;
  quoteLabel: string;
  newTabHint: string;
};

type Service = { name: string; body: string; quote: string };

/**
 * One dialog for every service card. The cards are server-rendered; this island only wires their
 * "Ver más" buttons to a native <dialog>, which brings the focus trap, Escape and focus return
 * with it. The copy comes from the card that was clicked, so no string is duplicated.
 */
export function ServiceDialog({ closeLabel, quoteLabel, newTabHint }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [service, setService] = useState<Service | null>(null);

  useEffect(() => {
    const cards = [...document.querySelectorAll<HTMLElement>('[data-service-card]')];
    const open = (card: HTMLElement) => () => {
      setService({
        name: card.dataset.serviceName ?? '',
        body: card.dataset.serviceBody ?? '',
        quote: card.dataset.serviceQuote ?? '',
      });
      ref.current?.showModal();
    };
    const listeners = cards.flatMap((card) => {
      const button = card.querySelector<HTMLButtonElement>('[data-service-more]');
      if (!button) return [];
      const handler = open(card);
      button.addEventListener('click', handler);
      return [
        () => {
          button.removeEventListener('click', handler);
        },
      ];
    });
    // The backdrop is part of the dialog's own box, so a click landing on the element itself
    // (never on the panel inside it) means the visitor clicked outside.
    const dialog = ref.current;
    const onBackdrop = (event: MouseEvent) => {
      if (event.target === dialog) dialog?.close();
    };
    dialog?.addEventListener('click', onBackdrop);
    return () => {
      for (const off of listeners) off();
      dialog?.removeEventListener('click', onBackdrop);
    };
  }, []);

  return (
    <dialog
      ref={ref}
      aria-labelledby="service-dialog-title"
      onClose={() => {
        setService(null);
      }}
      className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-3xl bg-void p-0 text-bone-white backdrop:bg-void/80 backdrop:backdrop-blur-sm"
    >
      <div className="flex flex-col gap-18 border border-ash-gray/30 p-24">
        <h2 id="service-dialog-title" className="text-heading-2xs font-normal">
          {service?.name}
        </h2>
        <p className="text-silver-mist">{service?.body}</p>
        <div className="flex flex-wrap items-center gap-18">
          <a
            href={service?.quote ?? '#'}
            target="_blank"
            rel="nofollow noopener noreferrer"
            className="inline-flex min-h-11 items-center rounded-3xl border border-ignition-gold px-18 py-6 text-caption font-semibold tracking-label text-ignition-gold uppercase hover:bg-ignition-gold/10"
          >
            {quoteLabel}
            <span className="sr-only">
              {' '}
              {service?.name} {newTabHint}
            </span>
          </a>
          <button
            type="button"
            onClick={() => ref.current?.close()}
            className="min-h-11 text-caption font-semibold tracking-label text-silver-mist uppercase hover:text-bone-white"
          >
            {closeLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}
