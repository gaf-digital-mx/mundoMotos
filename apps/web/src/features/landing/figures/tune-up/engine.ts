import { RPM_SLOT } from '../../service-detail';

/** Where a healthy small single idles once it has been tuned. */
export const IDLE_RPM = 1400;
/** The top of the tachometer's scale, and of this bench's pull. */
export const MAX_RPM = 8000;
/** The scale is marked every thousand. */
export const RPM_STEP = 1000;

/** The throttle is the only input: everything else in the figure follows it. */
export const rpmAt = (throttle: number) => IDLE_RPM + (MAX_RPM - IDLE_RPM) * clamp(throttle);

/**
 * A four-stroke fires once every two turns of the crank, so the plug sparks at half the engine's
 * speed: 700 times a minute at idle, a little under 12 a second.
 */
export const sparksPerSecond = (rpm: number) => rpm / 120;

/** Needles and dials read better rounded to something a human would say out loud. */
export const shown = (rpm: number) => Math.round(rpm / 50) * 50;

export const clamp = (value: number, low = 0, high = 1) => Math.min(high, Math.max(low, value));

/** The fraction of the dial's sweep a speed sits at. */
export const sweepAt = (rpm: number) => clamp(rpm / MAX_RPM);

/**
 * The card's readout. The template arrives translated with a slot where the number goes, so the
 * unit can sit on either side of it.
 */
export const readoutOf = (rpm: number, template: string, locale: string) =>
  template.replace(RPM_SLOT, new Intl.NumberFormat(locale).format(shown(rpm)));
