'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';

import { SERVICE_FIGURES } from './figures';
import { ServiceWorksTable } from './service-works-table';

import type { ServiceDetail } from './service-detail';

type Props = {
  closeLabel: string;
  quoteLabel: string;
  newTabHint: string;
  /** Keyed by service id; a service without an entry shows its body alone. */
  details: Record<string, ServiceDetail>;
};

type Service = { id: string; name: string; body: string; quote: string };

/**
 * One dialog for every service card. The cards are server-rendered; this island only wires their
 * "Ver más" buttons to a native <dialog>, which brings the focus trap, Escape and focus return
 * with it. The copy comes from the card that was clicked, so no string is duplicated.
 */
export function ServiceDialog({ closeLabel, quoteLabel, newTabHint, details }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [service, setService] = useState<Service | null>(null);

  useEffect(() => {
    const dialog = ref.current;
    // Older WebKit ships <dialog> without showModal: leave the quote link in place there.
    if (typeof dialog?.showModal !== 'function') return;
    const root = document.documentElement;
    root.setAttribute('data-services-ready', '');

    const cards = [...document.querySelectorAll<HTMLElement>('[data-service-card]')];
    const open = (card: HTMLElement) => () => {
      // Paint the copy before opening, or the dialog takes its accessible name from an empty
      // heading and then jumps to its real size.
      flushSync(() => {
        setService({
          id: card.dataset.serviceId ?? '',
          name: card.dataset.serviceName ?? '',
          body: card.dataset.serviceBody ?? '',
          quote: card.dataset.serviceQuote ?? '',
        });
      });
      dialog.showModal();
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
    // (never on the panel inside it) means the visitor clicked outside. Both ends of the click
    // have to land there: selecting text and releasing past the panel is not a dismissal.
    let pressedBackdrop = false;
    const onDown = (event: MouseEvent) => {
      pressedBackdrop = event.target === dialog;
    };
    const onClick = (event: MouseEvent) => {
      if (pressedBackdrop && event.target === dialog) dialog.close();
    };
    dialog.addEventListener('mousedown', onDown);
    dialog.addEventListener('click', onClick);

    return () => {
      for (const off of listeners) off();
      dialog.removeEventListener('mousedown', onDown);
      dialog.removeEventListener('click', onClick);
      root.removeAttribute('data-services-ready');
    };
  }, []);

  const detail = service ? details[service.id] : undefined;
  const figure = detail?.figure;
  const Figure = service ? SERVICE_FIGURES[service.id] : undefined;

  return (
    <dialog
      ref={ref}
      aria-labelledby="service-dialog-title"
      onClose={() => {
        setService(null);
      }}
      className="m-auto max-h-[calc(100dvh-2rem)] w-[min(36rem,calc(100vw-2rem))] rounded-3xl bg-void p-0 text-bone-white backdrop:bg-void/80 backdrop:backdrop-blur-sm"
    >
      {/* Nothing until a card is picked: the exported HTML carries an empty dialog, not a heading
          and a dead quote link. */}
      {service && (
        <div className="flex flex-col gap-18 border border-ash-gray/30 p-24">
          <h2 id="service-dialog-title" className="text-heading-2xs font-normal">
            {service.name}
          </h2>
          <p className="text-silver-mist">{service.body}</p>
          {Figure && figure ? (
            // Loaded on demand: the figure is the heaviest thing in this dialog and the landing
            // page must not carry it. The placeholder holds the card's height so the dialog
            // doesn't jump when the chunk lands.
            <Suspense
              fallback={<div aria-hidden="true" className="aspect-3/2 w-full rounded-3xl" />}
            >
              <Figure labels={figure} />
            </Suspense>
          ) : null}
          {detail && (
            <>
              <ServiceWorksTable title={detail.title} table={detail.table} works={detail.works} />
              <p className="text-caption text-silver-mist">{detail.note}</p>
            </>
          )}
          <div className="flex flex-wrap items-center gap-18">
            <a
              href={service.quote}
              target="_blank"
              rel="nofollow noopener noreferrer"
              className="inline-flex min-h-11 items-center rounded-3xl border border-ignition-gold px-18 py-6 text-caption font-semibold tracking-label text-ignition-gold uppercase hover:bg-ignition-gold/10"
            >
              {quoteLabel}
              <span className="sr-only">
                {' '}
                {service.name} {newTabHint}
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
      )}
    </dialog>
  );
}
