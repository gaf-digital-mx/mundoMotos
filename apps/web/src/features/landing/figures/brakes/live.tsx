'use client';

import { useEffect, useRef, type ReactNode } from 'react';

export type BrakePart = { id: string; name: string; note: string };

export type BrakeData = {
  parts: BrakePart[];
  /** The order the assemblies leave in; they come back in the reverse. */
  stagger: string[];
  spring: { stagger: number; stiffness: number; damping: number; substeps: number };
};

type Spring = {
  x: number;
  v: number;
  target: number;
  pending: { value: number; at: number } | null;
};

const REST = 'ensamblado · disco de Ø240';
const APART = 'desensamblado · 3 piezas';

/**
 * What moves. The drawing arrives finished from the build; this only slides whole assemblies
 * along the screen vector recorded with each item, and lights one up when its chip is picked.
 *
 * The springs are the ones the build's audit replays (same stagger, stiffness, damping and
 * substeps, and the same reversed order on the way back), so what is proved never to collide is
 * what a visitor actually sees.
 */
export function BrakeLive({ data, children }: { data: BrakeData; children: ReactNode }) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = host.current;
    if (!root) return;
    const stage = root.querySelector<HTMLElement>('[data-stage]');
    const button = root.querySelector<HTMLButtonElement>('[data-apart]');
    const label = button?.querySelector<HTMLElement>('[data-label]') ?? null;
    const readout = root.querySelector<HTMLElement>('[data-readout]');
    const liveRegion = root.querySelector<HTMLElement>('[data-live-region]');
    const chips = [...root.querySelectorAll<HTMLButtonElement>('[data-part]')];
    const moving = [...root.querySelectorAll<SVGGElement>('[data-dx]')];
    if (!stage) return;

    const { stagger, stiffness, damping, substeps } = data.spring;
    const springs = new Map<string, Spring>(
      data.stagger.map((id) => [id, { x: 0, v: 0, target: 0, pending: null }]),
    );
    const noteOf = (id: string) => data.parts.find((part) => part.id === id)?.note ?? '';
    const still = window.matchMedia('(prefers-reduced-motion: reduce)');
    let apart = false;
    let picked = '';
    let frame = 0;
    let last = 0;
    let clock = 0;

    const say = (text: string) => {
      if (readout && readout.textContent !== text) readout.textContent = text;
    };
    const announce = (text: string) => {
      if (liveRegion && liveRegion.textContent !== text) liveRegion.textContent = text;
    };
    const report = () => {
      say(picked ? noteOf(picked) : apart ? APART : REST);
    };

    const draw = () => {
      for (const node of moving) {
        const dx = Number(node.dataset.dx ?? 0);
        const dy = Number(node.dataset.dy ?? 0);
        const share = springs.get(node.dataset.piece ?? '')?.x ?? 0;
        node.setAttribute(
          'transform',
          `translate(${(dx * share).toFixed(2)} ${(dy * share).toFixed(2)})`,
        );
      }
    };

    const step = (dt: number) => {
      clock += dt;
      let busy = false;
      for (const spring of springs.values()) {
        if (spring.pending && clock >= spring.pending.at) {
          spring.target = spring.pending.value;
          spring.pending = null;
        }
        for (let index = 0; index < substeps; index += 1) {
          const h = dt / substeps;
          spring.v += ((spring.target - spring.x) * stiffness - spring.v * damping) * h;
          spring.x += spring.v * h;
        }
        if (
          spring.pending ||
          Math.abs(spring.x - spring.target) > 1e-3 ||
          Math.abs(spring.v) > 1e-3
        ) {
          busy = true;
        }
      }
      return busy;
    };

    const tick = (now: number) => {
      const dt = Math.min(0.05, last ? (now - last) / 1000 : 1 / 60);
      last = now;
      const busy = step(dt);
      draw();
      frame = busy ? requestAnimationFrame(tick) : 0;
    };

    const run = () => {
      if (frame) return;
      last = 0;
      frame = requestAnimationFrame(tick);
    };

    const toggle = () => {
      apart = !apart;
      const goal = apart ? 1 : 0;
      // Out in the order the job is done, back in the reverse: the caliper is clear of the pads
      // before they move, and home again only once they are back in it.
      const order = apart ? data.stagger : [...data.stagger].reverse();
      order.forEach((id, index) => {
        const spring = springs.get(id);
        if (!spring) return;
        if (still.matches) {
          spring.target = goal;
          spring.x = goal;
          spring.v = 0;
          spring.pending = null;
        } else {
          spring.pending = { value: goal, at: clock + index * stagger };
        }
      });
      if (label) label.textContent = apart ? 'Ensamblar' : 'Desensamblar';
      announce(apart ? 'desensamblando' : 'ensamblando');
      report();
      if (still.matches) draw();
      else run();
    };

    const pick = (id: string) => {
      picked = picked === id ? '' : id;
      for (const node of root.querySelectorAll<SVGGElement>('.it')) {
        if (picked && node.dataset.piece === picked) node.setAttribute('data-on', '');
        else node.removeAttribute('data-on');
      }
      if (picked) stage.setAttribute('data-focus', '');
      else stage.removeAttribute('data-focus');
      for (const chip of chips) {
        if (chip.dataset.part === picked) chip.setAttribute('data-on', '');
        else chip.removeAttribute('data-on');
      }
      report();
      if (picked) announce(noteOf(picked));
    };

    button?.addEventListener('click', toggle);
    const offChips = chips.map((chip) => {
      const handler = () => {
        pick(chip.dataset.part ?? '');
      };
      chip.addEventListener('click', handler);
      return () => {
        chip.removeEventListener('click', handler);
      };
    });

    draw();
    return () => {
      if (frame) cancelAnimationFrame(frame);
      button?.removeEventListener('click', toggle);
      for (const off of offChips) off();
    };
  }, [data]);

  return (
    <div ref={host} className="bk-live">
      {children}
    </div>
  );
}
