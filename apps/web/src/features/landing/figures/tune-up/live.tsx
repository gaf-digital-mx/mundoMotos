'use client';

import * as React from 'react';

import { IsoFigure } from '@/shared/iso/react/draw';
import { follow, useInView, useLoop, useReadout, useStillness } from '@/shared/iso/react/live';

import * as ART from './art';
import { IDLE_RPM, clamp, readoutOf, rpmAt, shown, sparksPerSecond } from './engine';
import { REST, frameOf } from './frame';
import { CHAMBER_ART, TRACT } from './geometry';
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
/**
 * The opening tour: a blip and back, played once. It runs for under five seconds and then the
 * bench comes to rest, so nothing here is moving content a visitor must be given a way to stop
 * (WCAG 2.2.2). Touching the throttle ends it for good.
 */
const TOUR = 4.4;
/** The hard end of anything the figure does by itself, needle tail included. */
const AUTO_STOP = 4.9;
/** What the spark settles to once the bench is at rest: lit, rather than flashing for ever. */
const SPARK_AT_REST = '0.85';

/** The hint is written on the card, which is hidden from assistive tech; the slider points at it. */
export const HINT_ID = 'tune-up-hint';

const ease = (t: number) => {
  const u = clamp(t);
  return u * u * (3 - 2 * u);
};

function tourAt(time: number) {
  if (time < 0.6) return 0;
  if (time < 1.8) return ease((time - 0.6) / 1.2) * 0.8;
  if (time < 2.6) return 0.8;
  if (time < TOUR) return 0.8 * (1 - ease((time - 2.6) / 1.4));
  return 0;
}

const KNOB_AT = at([V.KNOB[0], V.KNOB[1], V.KNOB_TOP]);
/** The throttle control sits over the knob, in the same place at every width. */
const GRIP_STYLE: React.CSSProperties = {
  left: `${((KNOB_AT[0] / WIDTH) * 100).toFixed(2)}%`,
  top: `${((KNOB_AT[1] / HEIGHT) * 100).toFixed(2)}%`,
};

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
  const control = React.useRef<HTMLDivElement>(null);

  // The figure's state lives in refs: it writes attributes rather than re-rendering per frame.
  const target = React.useRef(0);
  const open = React.useRef(0);
  const rpm = React.useRef(IDLE_RPM);
  const flash = React.useRef(0);
  const phase = React.useRef(0);
  const held = React.useRef(false);
  const grabbed = React.useRef(0);
  const from = React.useRef(0);
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
    const touring = !touched.current && !calm && clock.current < TOUR;
    if (touring) target.current = tourAt(clock.current);

    open.current = follow(open.current, target.current, dt, OPEN_LAG, calm);
    rpm.current = follow(rpm.current, rpmAt(open.current), dt, RPM_LAG, calm);

    // An exponential follow only arrives in the limit, so "arrived" is a tolerance below what
    // the drawing can show: half a rev, on a needle that reads in fifties. Snapped once it is
    // there, or the loop would run for ever a thousandth of a rev from home.
    // Nothing the figure does on its own may outlast AUTO_STOP, which is what keeps it clear of
    // WCAG 2.2.2; a visitor's own throttle is theirs to hold open as long as they like.
    const resting =
      (!touring &&
        Math.abs(target.current - open.current) < 1e-4 &&
        Math.abs(rpmAt(open.current) - rpm.current) < 0.5) ||
      (!touched.current && clock.current >= AUTO_STOP);
    if (resting) {
      open.current = target.current;
      rpm.current = rpmAt(open.current);
    }

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
    if (spark.current) {
      spark.current.style.opacity = resting ? SPARK_AT_REST : flash.current > 0 ? '1' : '0.1';
    }
    if (tract.current) {
      tract.current.style.opacity = `${0.45 + 0.55 * open.current}`;
      tract.current.style.animationDuration = `${Math.round(1500 / (0.5 + open.current))}ms`;
    }

    show(rpm.current);
    return !resting;
  }, !still && inView);

  React.useEffect(() => {
    if (still) show(IDLE_RPM);
  }, [still, show]);

  const set = (value: number) => {
    touched.current = true;
    target.current = clamp(value);
    kick();
  };

  /** Focus alone ends the tour: a slider must not move itself while someone is operating it. */
  const take = () => {
    touched.current = true;
  };

  const onDown = (event: React.PointerEvent<HTMLDivElement>) => {
    held.current = true;
    grabbed.current = target.current;
    // Measured from where the drag started rather than from `movementX`, which WebKit only
    // reports under pointer lock: on Safari the knob would simply not turn.
    from.current = event.clientX;
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!held.current) return;
    const width = event.currentTarget.parentElement?.clientWidth;
    if (!width) return;
    // In the figure's own units, so the drag feels the same at every width and at any zoom.
    const travelled = ((event.clientX - from.current) / width) * WIDTH;
    set(grabbed.current + travelled / DRAG);
  };
  const onUp = (event: React.PointerEvent<HTMLDivElement>) => {
    held.current = false;
    event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const onKey = (event: React.KeyboardEvent<HTMLDivElement>) => {
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
      <IsoFigure width={WIDTH} height={HEIGHT} label={`${labels.title}. ${labels.alt}`}>
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
        <path
          ref={spark}
          className="iso-line"
          data-tone="lit"
          d={CHAMBER_ART.gap}
          opacity={SPARK_AT_REST}
        />
        {ART.PLUG}
        {ART.COIL}
        {ART.LEAD}
        {ART.DIAL}
        <path ref={needle} className="iso-line" data-tone="hi" d={REST.needle} />
        {ART.DIAL_HUB}
        <path
          ref={tract}
          className="iso-line tune-up-air"
          data-tone="hi"
          data-dotted=""
          data-flow=""
          d={TRACT}
        />
      </IsoFigure>
      {/* The control itself, an element of its own rather than a shape inside the drawing: ARIA
          treats the children of an `img` as presentational, and out here it can carry a target
          big enough to hit on a phone. */}
      <div
        ref={control}
        className="tune-up-grip"
        style={GRIP_STYLE}
        role="slider"
        tabIndex={0}
        aria-label={labels.control}
        aria-describedby={HINT_ID}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={0}
        aria-valuetext={readoutOf(IDLE_RPM, labels.readout, labels.locale)}
        aria-orientation="horizontal"
        onFocus={take}
        onPointerEnter={take}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onKeyDown={onKey}
      />
    </div>
  );
}
