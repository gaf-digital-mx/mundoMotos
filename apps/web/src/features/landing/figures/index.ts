import { lazy } from 'react';

import type { FigureLabels } from '../service-detail';
import type { ComponentType, LazyExoticComponent } from 'react';

export type ServiceFigureProps = { labels: FigureLabels };

/**
 * One figure per service, fetched the first time its dialog opens. They are the heaviest thing
 * in the dialog and nobody reading the landing page has asked for one yet, so none of this is in
 * the exported HTML or in the page's own JavaScript. A service with no entry shows no figure.
 */
export const SERVICE_FIGURES: Record<
  string,
  LazyExoticComponent<ComponentType<ServiceFigureProps>>
> = {
  tuneUp: lazy(async () => ({ default: (await import('./tune-up/figure')).TuneUpFigure })),
};
