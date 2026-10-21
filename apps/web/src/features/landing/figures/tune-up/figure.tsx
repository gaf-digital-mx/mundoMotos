'use client';

import { Plate } from '@/shared/iso/react/draw';

import { IDLE_RPM, readoutOf } from './engine';
import { TuneUpLive } from './live';
import './tune-up.css';

import type { FigureLabels } from '../../service-detail';

/**
 * The tune-up bench: a card holding the figure, its hint, its live readout and its caption.
 * Everything written on it arrives translated; the drawing itself is built in the browser when
 * the dialog opens, so the landing page never carries it.
 */
export function TuneUpFigure({ labels }: { labels: FigureLabels }) {
  return (
    <div className="iso">
      <Plate
        fig={labels.tag}
        title={labels.title}
        hint={labels.hint}
        // The resting reading, so the card is right from the first paint rather than blank until
        // the first frame.
        readout={readoutOf(IDLE_RPM, labels.readout, labels.locale)}
        keys={[
          { mark: 'dotted', label: labels.keys.air ?? '' },
          { mark: 'lit', label: labels.keys.spark ?? '' },
        ]}
        caption={labels.caption}
      >
        <TuneUpLive labels={labels} />
      </Plate>
    </div>
  );
}
