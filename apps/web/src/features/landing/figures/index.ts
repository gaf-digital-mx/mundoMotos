import { lazy } from 'react';

import type { ComponentType, LazyExoticComponent } from 'react';

/**
 * One figure per service, fetched the first time its dialog opens. They are the heaviest thing
 * in the dialog and nobody reading the landing page has asked for one yet, so none of this is in
 * the exported HTML or in the page's own JavaScript. A service with no entry shows no figure.
 *
 * Each figure carries its own copy: they are drawings with words written into them, copied in as
 * their author built them, not components this app composes.
 */
export const SERVICE_FIGURES: Record<string, LazyExoticComponent<ComponentType>> = {
  tuneUp: lazy(async () => ({ default: (await import('./engine-4t/figure')).Engine4TFigure })),
  brakes: lazy(async () => ({ default: (await import('./brakes/figure')).BrakesFigure })),
};
