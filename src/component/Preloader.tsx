"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { gsap } from "gsap";

/**
 * Preloader — a roof that builds itself, then lifts off the hero
 * ------------------------------------------------------------------------------
 *
 *                          ╱‾‾‾‾‾‾‾‾‾‾‾╲          ← the roof line draws first
 *                        ╱               ╲
 *                       A ROOF                     ← the word fills from the
 *                       ───────────────────          bottom up as things load
 *                       UPVC roofing sheets  64%   ← ground line, label, count
 *
 * It is one small idea: a house. The roof line draws itself, the word fills
 * up from the ground as the page really loads, and when it is done the whole
 * panel lifts away with a gable-shaped edge, like a roof being raised, to
 * reveal the hero underneath.
 *
 * Same palette and fonts as the hero, product, FAQ, CTA and footer sections.
 *
 * LOADING
 * -------
 * The number is real. It follows how many images and videos on the page are
 * ready, and it holds at 90% until the browser's own `load` event. It never
 * jumps to 100% on a timer. Two limits keep it well behaved:
 *   - MIN_DURATION_MS: it never leaves before the drawing has finished, even
 *     on a warm cache, so the beat always plays.
 *   - MAX_DURATION_MS: it never holds the page hostage. If something is slow
 *     or broken, it lets go and shows the site anyway.
 *
 * MOTION
 * ------
 * Progress is painted straight to the DOM from one animation frame loop, so
 * the page does not re-render 60 times a second. The exit is one GSAP
 * timeline. For prefers-reduced-motion the exit is a plain fade.
 *
 * SETUP
 * -----
 * 1. `npm i gsap`
 * 2. Render it once at the very top of your layout, above everything else:
 *
 *      // app/layout.tsx
 *      <Preloader />
 *      {children}
 *
 * 3. Edit WORD and TAGLINE below.
 * 4. When it finishes it calls `onComplete` and also fires a `preloader:done`
 *    event on window, so other sections can wait for it if they need to.
 * 5. Move the font @import to your global stylesheet for production.
 */

/* ── Content ─────────────────────────────────────────────────────────────── */

const WORD = "A ROOF";
const TAGLINE = "UPVC roofing sheets";

/* ── Palette (shared with the other sections) ────────────────────────────── */

const NIGHT_TOP = "#04090f";
const NIGHT_BOTTOM = "#0d2233";
const SKY_LIGHT = "#a9dcf5";

/* ── Timing ──────────────────────────────────────────────────────────────── */

const MIN_DURATION_MS = 2400; // the drawing always plays in full
const MAX_DURATION_MS = 7000; // hard ceiling if loading stalls

// Height of the gable on the exit edge, as a share of the screen height.
const PEAK = 16;

type PreloaderProps = {
  onComplete?: () => void;
};

export default function Preloader({ onComplete }: PreloaderProps) {
  const [gone, setGone] = useState(false);

  const panelRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const roofRef = useRef<SVGPathElement>(null);
  const fillRef = useRef<HTMLSpanElement>(null);
  const countRef = useRef<HTMLSpanElement>(null);

  const shownRef = useRef(0); // progress currently painted, 0 to 1
  const finishedRef = useRef(false);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  });

  /* Paint one progress value (0 to 1) to the three things that show it. The
     roof line finishes early (first 30%), the word fills across the whole run. */
  const paint = useCallback((p: number) => {
    const v = Math.min(1, Math.max(0, p));
    shownRef.current = v;
    if (roofRef.current) roofRef.current.style.strokeDashoffset = String(1 - Math.min(1, v / 0.3));
    if (fillRef.current) fillRef.current.style.clipPath = `inset(${(1 - v) * 100}% 0 0 0)`;
    if (countRef.current) countRef.current.textContent = `${Math.round(v * 100)}%`;
  }, []);

  /* Exit: finish the fill, fade the content up, then lift the panel with a
     gable-shaped bottom edge. Runs once. */
  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;

    const done = () => {
      setGone(true);
      onCompleteRef.current?.();
      window.dispatchEvent(new Event("preloader:done"));
    };

    const panel = panelRef.current;
    const content = contentRef.current;
    if (!panel || !content) {
      done();
      return;
    }

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const prog = { p: shownRef.current };
    const edge = { b: 100 + PEAK }; // y of the panel's bottom corners, in %

    const tl = gsap.timeline({ onComplete: done });
    tlRef.current = tl;

    // A short beat with the word completely filled.
    tl.to(prog, { p: 1, duration: 0.3, ease: "power1.out", onUpdate: () => paint(prog.p) });

    if (reduce) {
      tl.to(panel, { opacity: 0, duration: 0.5, ease: "power1.out" }, "+=0.1");
      return;
    }

    tl.to(content, { y: -28, opacity: 0, duration: 0.45, ease: "power2.in" }, "+=0.2").to(
      edge,
      {
        b: 0,
        duration: 1.05,
        ease: "power3.inOut",
        onUpdate: () => {
          // The bottom edge is a gable: the middle sits PEAK% higher than the
          // corners, so the hero shows through in a roof-shaped window.
          panel.style.clipPath = `polygon(0% 0%, 100% 0%, 100% ${edge.b}%, 50% ${
            edge.b - PEAK
          }%, 0% ${edge.b}%)`;
        },
      },
      "<+0.1"
    );
  }, [paint]);

  /* Real load progress, painted from one animation frame loop. */
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const minMs = reduce ? 700 : MIN_DURATION_MS;

    // How much of the page's media is ready. Lazy images are left out, because
    // they may never load until they scroll into view.
    const measure = () => {
      const media = Array.from(
        document.querySelectorAll<HTMLImageElement | HTMLVideoElement>(
          'img:not([loading="lazy"]), video'
        )
      );
      const ready = media.filter((el) =>
        el instanceof HTMLImageElement ? el.complete : el.readyState >= 3 || !!el.error
      ).length;
      const ratio = media.length ? ready / media.length : 1;
      // Hold at 90% until the browser says the page has loaded.
      return document.readyState === "complete" ? ratio : Math.min(ratio, 0.9);
    };

    paint(0);

    const t0 = performance.now();
    let last = t0;
    let lastMeasure = -Infinity;
    let real = 0;
    let shown = 0;
    let raf = 0;
    let stopped = false;

    const loop = (now: number) => {
      if (stopped) return;
      const dt = Math.min(now - last, 64);
      last = now;

      if (now - lastMeasure > 150) {
        real = measure();
        lastMeasure = now;
      }

      const elapsed = now - t0;
      // Never ahead of what has really loaded, never ahead of the minimum run.
      const target = Math.min(real, elapsed / minMs);
      shown += (target - shown) * (1 - Math.pow(0.9, dt / 16.7));
      if (target - shown < 0.0005) shown = target;
      paint(shown);

      if ((shown >= 0.999 && real >= 1 && elapsed >= minMs) || elapsed >= MAX_DURATION_MS) {
        stopped = true;
        finish();
        return;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
    };
  }, [paint, finish]);

  /* Keep the page from scrolling while the panel is up, without letting the
     layout jump when the scrollbar disappears. */
  useEffect(() => {
    if (gone) return;
    const body = document.body;
    const gap = window.innerWidth - document.documentElement.clientWidth;
    const prev = { overflow: body.style.overflow, paddingRight: body.style.paddingRight };
    body.style.overflow = "hidden";
    if (gap > 0) body.style.paddingRight = `${gap}px`;
    return () => {
      body.style.overflow = prev.overflow;
      body.style.paddingRight = prev.paddingRight;
    };
  }, [gone]);

  useEffect(
    () => () => {
      tlRef.current?.kill();
    },
    []
  );

  if (gone) return null;

  return (
    <div className="pre-root" role="status" aria-live="polite">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Anton&family=Inter:wght@400;500&display=block');

        .pre-root {
          position: fixed;
          inset: 0;
          z-index: 9999;
        }

        /* The panel is what lifts away. It needs no clip-path until the exit. */
        .pre-panel {
          position: absolute;
          inset: 0;
          overflow: hidden;
          background: linear-gradient(180deg, ${NIGHT_TOP} 0%, ${NIGHT_BOTTOM} 100%);
          color: #fff;
          will-change: clip-path;
        }

        .pre-content {
          position: absolute;
          inset: 0;
          display: grid;
          place-items: center;
          padding: 24px;
          will-change: transform, opacity;
        }

        /* One lockup: roof, word, ground line. Its size comes from the word. */
        .pre-lockup {
          display: inline-block;
          font-size: clamp(3.4rem, 19vw, 12rem);
        }

        .pre-roof {
          display: block;
          width: 100%;
          height: 0.5em;
          overflow: visible;
        }
        .pre-roof path {
          fill: none;
          stroke: #fff;
          stroke-width: 2.5;
          stroke-linejoin: round;
          stroke-dasharray: 1;
          stroke-dashoffset: 1; /* fully undrawn until the first paint */
        }

        /* The word is two identical layers: an outline, and a filled copy on
           top that is revealed from the bottom up as loading advances. */
        .pre-word {
          position: relative;
          display: block;
          font-family: 'Anton', 'Arial Narrow', sans-serif;
          font-weight: 400;
          line-height: 0.95;
          letter-spacing: 0.02em;
          text-align: center;
          text-transform: uppercase;
          white-space: nowrap;
          user-select: none;
        }
        .pre-word-outline {
          display: block;
          color: transparent;
          -webkit-text-stroke: 1px rgba(255, 255, 255, 0.32);
        }
        .pre-word-fill {
          position: absolute;
          inset: 0;
          display: block;
          clip-path: inset(100% 0 0 0);
          background: linear-gradient(180deg, #ffffff 0%, ${SKY_LIGHT} 100%);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          -webkit-text-fill-color: transparent;
        }

        /* The ground line under the house, with the label and the count. */
        .pre-meta {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 16px;
          margin-top: clamp(10px, 1.4vw, 18px);
          padding-top: 12px;
          border-top: 1px solid rgba(255, 255, 255, 0.22);
          font: 500 clamp(0.8rem, 1.1vw, 0.95rem)/1.4 'Inter', system-ui, sans-serif;
          color: rgba(255, 255, 255, 0.78);
        }
        .pre-count { font-variant-numeric: tabular-nums; color: #fff; }

        .pre-sr {
          position: absolute;
          width: 1px;
          height: 1px;
          overflow: hidden;
          clip: rect(0 0 0 0);
          white-space: nowrap;
        }
      `}</style>

      <div ref={panelRef} className="pre-panel">
        <div ref={contentRef} className="pre-content">
          <div className="pre-lockup">
            <svg
              className="pre-roof"
              viewBox="0 0 400 80"
              preserveAspectRatio="xMidYMax meet"
              aria-hidden="true"
            >
              <path ref={roofRef} d="M4 76 L200 6 L396 76" pathLength={1} />
            </svg>

            <div className="pre-word" aria-hidden="true">
              <span className="pre-word-outline">{WORD}</span>
              <span ref={fillRef} className="pre-word-fill">
                {WORD}
              </span>
            </div>

            <div className="pre-meta" aria-hidden="true">
              <span>{TAGLINE}</span>
              <span ref={countRef} className="pre-count">
                0%
              </span>
            </div>
          </div>
        </div>
      </div>

      <span className="pre-sr">Loading</span>
    </div>
  );
}