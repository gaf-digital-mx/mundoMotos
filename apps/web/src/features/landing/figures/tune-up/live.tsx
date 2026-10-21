'use client';

import * as React from 'react';

import { FaceText, IsoFigure } from '@/shared/iso/react/draw';
import { follow, useInView, useLoop, useReadout, useStillness } from '@/shared/iso/react/live';

import * as ART from './art';
import { IDLE_RPM, clamp, readoutOf, rpmAt, shown, sparksPerSecond } from './engine';
import { REST, frameOf } from './frame';
import { CHAMBER_ART, DIAL_ART, TRACT } from './geometry';
import { HEIGHT, WIDTH, at } from './view';
import * as V from './view';

import type { FigureLabels } from '../../service-detail';

/** How far the pointer travels, in the figure's own units, to take the throttle wide open. */
const DRAG = 150;
const STEP = 0.12;
/** How long one spark stays lit. */
const FLASH = 0.07;
const OPEN_LAG = 0.18;
const RPM_LAG = 0.4;
/** The idle tour: idle, a blip, hold, and back down. */
const TOUR = 8.4;

const ease = (t: number) => {
  const u = clamp(t);
  return u * u * (3 - 2 * u);
};

function tourAt(time: number) {
  const point = time % TOUR;
  if (point < 2) return 0;
  if (point < 3.2) return ease((point - 2) / 1.2) * 0.8;
  if (point < 4.6) return 0.8;
  if (point < 6.2) return 0.8 * (1 - ease((point - 4.6) / 1.6));
  return 0;
}

const KNOB_AT = at([V.KNOB[0], V.KNOB[1], V.KNOB_TOP]);

export function TuneUpLive({ labels }: { labels: FigureLabels }) {
  const { anchor, say } = useReadout<HTMLDivElement>();
  const still = useStillness();
  const inView = useInView(anchor);

  const stem = React.useRef<SVGGElement>(null);
  const cable = React.useRef<SVGPathElement>(null);
  const index = React.useRef<SVGPathElement>(null);
  const needle = React.useRef<SVGPathElement>(null);
  const spark = React.useRef<SVGPathElement>(null);
  const tract = React.useRef<SVGPathElement>(null);
  const control = React.useRef<SVGCircleElement>(null);

  // The figure's state lives in refs: it writes attributes rather than re-rendering per frame.
  const target = React.useRef(0);
  const open = React.useRef(0);
  const rpm = React.useRef(IDLE_RPM);
  const flash = React.useRef(0);
  const phase = React.useRef(0);
  const held = React.useRef(false);
  const grabbed = React.useRef(0);
  const dragged = React.useRef(0);
  const touched = React.useRef(false);
  const clock = React.useRef(0);
  const said = React.useRef(0);

  const show = React.useCallback(
    (value: number) => {
      const rounded = shown(value);
      if (rounded === said.current) return;
      said.current = rounded;
      const text = readoutOf(value, labels.readout, labels.locale);
      say(text);
      control.current?.setAttribute('aria-valuetext', text);
    },
    [labels.readout, labels.locale, say],
  );

  const kick = useLoop((dt, calm) => {
    clock.current += dt;
    if (!touched.current && !calm) target.current = tourAt(clock.current);

    open.current = follow(open.current, target.current, dt, OPEN_LAG, calm);
    rpm.current = follow(rpm.current, rpmAt(open.current), dt, RPM_LAG, calm);

    const frame = frameOf(open.current, rpm.current);
    stem.current?.setAttribute('transform', frame.slide);
    cable.current?.setAttribute('d', frame.cable);
    index.current?.setAttribute('d', frame.index);
    needle.current?.setAttribute('d', frame.needle);
    control.current?.setAttribute('aria-valuenow', `${Math.round(open.current * 100)}`);

    // The plug fires once every two turns of the crank, so the flashes follow the speed.
    phase.current += dt * sparksPerSecond(rpm.current);
    if (phase.current >= 1) {
      phase.current %= 1;
      flash.current = FLASH;
    }
    flash.current = Math.max(0, flash.current - dt);
    if (spark.current) spark.current.style.opacity = flash.current > 0 ? '1' : '0.1';
    if (tract.current) {
      tract.current.style.opacity = `${0.45 + 0.55 * open.current}`;
      tract.current.style.animationDuration = `${Math.round(1500 / (0.5 + open.current))}ms`;
    }

    show(rpm.current);
    return true;
  }, !still && inView);

  React.useEffect(() => {
    if (still) show(IDLE_RPM);
  }, [still, show]);

  const set = (value: number) => {
    touched.current = true;
    target.current = clamp(value);
    kick();
  };

  const onDown = (event: React.PointerEvent<SVGCircleElement>) => {
    held.current = true;
    grabbed.current = target.current;
    dragged.current = 0;
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onMove = (event: React.PointerEvent<SVGCircleElement>) => {
    if (!held.current) return;
    const box = event.currentTarget.ownerSVGElement?.getBoundingClientRect();
    if (!box) return;
    // Measured in the figure's own units, so the drag feels the same at every width.
    dragged.current += event.movementX / (box.width / WIDTH);
    set(grabbed.current + dragged.current / DRAG);
  };
  const onUp = (event: React.PointerEvent<SVGCircleElement>) => {
    held.current = false;
    event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const onKey = (event: React.KeyboardEvent<SVGCircleElement>) => {
    const by =
      event.key === 'ArrowRight' || event.key === 'ArrowUp'
        ? STEP
        : event.key === 'ArrowLeft' || event.key === 'ArrowDown'
          ? -STEP
          : 0;
    const to = event.key === 'Home' ? 0 : event.key === 'End' ? 1 : null;
    if (by === 0 && to === null) return;
    event.preventDefault();
    set(to ?? target.current + by);
  };

  return (
    <div ref={anchor} className="tune-up">
      <IsoFigure width={WIDTH} height={HEIGHT} label={labels.alt}>
        {ART.BASE}
        {ART.AIRBOX}
        {ART.BOOT}
        {ART.CARB}
        <g ref={stem} transform={REST.slide}>
          {ART.STEM}
        </g>
        {ART.MANIFOLD}
        {ART.KNOB}
        <path ref={index} className="iso-line" data-tone="lit" d={REST.index} />
        <path ref={cable} className="iso-line" data-tone="mid" d={REST.cable} />
        {ART.HEAD}
        {ART.CHAMBER}
        <path ref={spark} className="iso-line" data-tone="lit" d={CHAMBER_ART.gap} opacity={0.1} />
        {ART.PLUG}
        {ART.COIL}
        {ART.LEAD}
        {ART.DIAL}
        <path ref={needle} className="iso-line" data-tone="hi" d={REST.needle} />
        {ART.DIAL_HUB}
        <FaceText transform={DIAL_ART.label} size={3.2} tone="lo" anchor="middle">
          {labels.unit}
        </FaceText>
        <path
          ref={tract}
          className="iso-line tune-up-air"
          data-tone="hi"
          data-dotted=""
          data-flow=""
          d={TRACT}
        />
        {/* The control itself: a slider over the knob, so it can be dragged or driven from the
            keyboard. Transparent, because the knob under it is already the picture of it. */}
        <circle
          ref={control}
          className="tune-up-grip"
          cx={KNOB_AT[0]}
          cy={KNOB_AT[1]}
          r={34}
          role="slider"
          tabIndex={0}
          aria-label={labels.control}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={0}
          aria-valuetext={readoutOf(IDLE_RPM, labels.readout, labels.locale)}
          aria-orientation="horizontal"
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          onKeyDown={onKey}
        />
      </IsoFigure>
    </div>
  );
}
