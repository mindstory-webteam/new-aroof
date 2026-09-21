"use client";

import React, { useEffect, useLayoutEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/**
 * CtaSection — compact call to action over a GIF background
 * ------------------------------------------------------------------------------
 *
 *   ┌──────────────────────────────────────────────────────────────────────┐
 *   │▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▒▒▒▒▒░░░░                                      │
 *   │▓▓ GET THE ROOF ▓▓▓▓▓▓▓▓▒▒▒▒░░░░      (GIF shows clearly              │
 *   │▓▓ RIGHT FIRST TIME. ▓▓▓▒▒▒▒░░░░        on the right side)            │
 *   │▓▓ Send us your span and location…▓▒▒▒░░░                             │
 *   │▓▓ [ Get a quote ]  [ Call us ] ▓▒▒▒░░░                               │
 *   └──────────────────────────────────────────────────────────────────────┘
 *
 * All the copy sits on the left over a solid-to-clear overlay, so it stays
 * readable while the right side of the GIF is left almost untouched.
 *
 * GIF
 * ---
 * - Decorative: alt="" and aria-hidden, so screen readers skip it.
 * - GIFs cannot be paused from code. For visitors who prefer reduced motion,
 *   set POSTER to a still image and it is shown instead. With no POSTER, the
 *   GIF is hidden for them and the deep-blue background shows.
 * - GIFs are large. If the file is over ~3 MB, converting it to a muted
 *   looping MP4 / WebM will load far faster with the same look.
 *
 * SETUP
 * -----
 * 1. `npm i gsap`
 * 2. Set GIF_SRC (files in /public are served from the site root).
 * 3. Edit the content constants and ACTIONS below.
 * 4. Move the font @import to your global stylesheet for production.
 */

/* ── Content ─────────────────────────────────────────────────────────────── */

const HEADING = ["Get the roof", "right first time."]; // one entry per line
const SUBHEAD = "Send us your span and location and we'll suggest a profile and send a quote.";

const GIF_SRC = "/video/roof_rain_animation.gif";
const POSTER = ""; // optional still frame for reduced motion, e.g. "/video/roof_rain_still.jpg"

const ACTIONS = [
  { label: "Get a quote", href: "#contact", variant: "solid" },
  { label: "Call us", href: "tel:+910000000000", variant: "ghost" },
] as const;

/* ── Palette (shared with the product and FAQ sections) ──────────────────── */

const DEEP = "#0d2233";
const INK = "#16242e";
const ACCENT = "#17536f";

/* ── Motion ──────────────────────────────────────────────────────────────── */

const REVEAL_START = "top 80%";
const RISE_FROM = 106; // heading push-up, yPercent
const RISE_EASE = "power4.out";

/* ── Layout ──────────────────────────────────────────────────────────────── */

const PAD_X = "clamp(24px, 5vw, 96px)";
const PAD_Y = "clamp(44px, 5.5vw, 84px)";

const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

export default function CtaSection() {
  const sectionRef = useRef<HTMLElement>(null);

  /* Entrance. Scoped to the section so revert() can never touch anything else. */
  useIsoLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const root = sectionRef.current;
      if (!root) return;

      // The markup already renders in its finished state, so reduced motion
      // just skips every tween.
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

      const q = gsap.utils.selector(root);
      const lines = q(".cta-line");
      const sub = q(".cta-sub");
      const actions = q(".cta-btn");

      // Starting states are set before the trigger so nothing flashes in its
      // finished position first.
      gsap.set(lines, { yPercent: RISE_FROM, opacity: 0 });
      gsap.set(sub, { opacity: 0, y: 18 });
      gsap.set(actions, { opacity: 0, y: 18 });

      gsap
        .timeline({ scrollTrigger: { trigger: root, start: REVEAL_START, once: true } })
        .to(lines, { yPercent: 0, opacity: 1, duration: 1.15, ease: RISE_EASE, stagger: 0.12 }, 0)
        .to(sub, { opacity: 1, y: 0, duration: 0.95, ease: "power3.out" }, 0.45)
        .to(actions, { opacity: 1, y: 0, duration: 0.85, ease: "power3.out", stagger: 0.1 }, 0.6);
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="cta" aria-label="Get a quote">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Anton&family=Inter:wght@400;500;600&display=swap');

        @keyframes ctaHueShift {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        .cta {
          position: relative;
          isolation: isolate;
          box-sizing: border-box;
          display: flex;
          align-items: center;
          min-height: clamp(320px, 44vh, 440px);
          padding: ${PAD_Y} ${PAD_X};
          background: ${DEEP};
          color: #fff;
          overflow: hidden;
        }

        /* ---- GIF background ---- */
        .cta-bg {
          position: absolute;
          inset: 0;
          z-index: -3;
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center;
        }

        /* Light tint across the whole GIF so it sits in the same colour world. */
        .cta-scrim {
          position: absolute;
          inset: 0;
          z-index: -2;
          background: rgba(9, 26, 39, 0.22);
        }

        /* Left-side overlay: near-solid behind the text, fading to clear so the
           right side of the GIF stays visible. */
        .cta-overlay {
          position: absolute;
          top: 0;
          bottom: 0;
          left: 0;
          z-index: -1;
          width: min(74%, 1040px);
          background: linear-gradient(
            90deg,
            rgba(9, 26, 39, 0.95) 0%,
            rgba(9, 26, 39, 0.88) 42%,
            rgba(9, 26, 39, 0.52) 76%,
            rgba(9, 26, 39, 0) 100%
          );
        }

        /* ---- Layout: everything left-aligned in one column ---- */
        .cta-shell {
          width: 100%;
          max-width: 1320px;
          margin: 0 auto;
        }

        .cta-title {
          margin: 0;
          font-weight: 400;
          font-size: clamp(2.3rem, 5vw, 4.4rem);
          line-height: 0.98;
          letter-spacing: 0.015em;
        }
        /* Each line sits in its own mask so it can push up out of it. */
        .cta-mask { display: block; overflow: hidden; padding-bottom: 0.06em; }
        .cta-line { display: block; will-change: transform, opacity; }

        /* Same shining title treatment as the other sections, in light tones so
           it holds up on the dark overlay. The gradient lives on the innermost
           span: background-clip: text only paints from the element that owns
           the background. */
        .cta-shine {
          font-family: 'Anton', 'Arial Narrow', sans-serif;
          text-transform: uppercase;
          background: linear-gradient(90deg, #ffffff, #a9dcf5, #ffffff, #6fbfe6, #ffffff);
          background-size: 300% 100%;
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          -webkit-text-fill-color: transparent;
          display: inline-block;
          animation: ctaHueShift 6s ease-in-out infinite;
        }

        .cta-sub {
          max-width: 40ch;
          margin: clamp(14px, 1.6vw, 20px) 0 0;
          font: 400 clamp(1rem, 1.15vw, 1.1rem)/1.55 'Inter', system-ui, sans-serif;
          color: rgba(255, 255, 255, 0.92);
          will-change: transform, opacity;
        }

        .cta-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-top: clamp(18px, 2vw, 26px);
        }

        .cta-btn {
          box-sizing: border-box;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 48px;
          padding: 0 28px;
          border-radius: 999px;
          font: 600 0.98rem/1 'Inter', system-ui, sans-serif;
          text-decoration: none;
          white-space: nowrap;
          cursor: pointer;
          transition: background-color 250ms ease, color 250ms ease, border-color 250ms ease;
          will-change: transform, opacity;
        }
        .cta-btn:focus-visible { outline: 2px solid #fff; outline-offset: 4px; }

        .cta-btn--solid { background: #fff; color: ${INK}; border: 1px solid #fff; }
        .cta-btn--solid:hover { background: #dff1fa; border-color: #dff1fa; color: ${ACCENT}; }

        .cta-btn--ghost { background: transparent; color: #fff; border: 1px solid rgba(255, 255, 255, 0.6); }
        .cta-btn--ghost:hover { background: rgba(255, 255, 255, 0.14); border-color: #fff; }

        /* ---- Small screens: the overlay covers the full width ---- */
        @media (max-width: 900px) {
          .cta { min-height: 0; }
          .cta-overlay {
            width: 100%;
            background: linear-gradient(90deg, rgba(9, 26, 39, 0.9) 0%, rgba(9, 26, 39, 0.72) 100%);
          }
          .cta-title { font-size: clamp(2.3rem, 11vw, 3.4rem); }
          .cta-sub { max-width: none; }
        }
        @media (max-width: 420px) {
          .cta-actions { flex-direction: column; }
          .cta-btn { width: 100%; }
        }

        /* ---- Reduced motion: nothing shimmers; no POSTER means no GIF ---- */
        @media (prefers-reduced-motion: reduce) {
          .cta-shine { animation: none; }
          .cta-btn { transition: none; }
          .cta-bg--gif-only { display: none; }
        }
      `}</style>

      <picture>
        {POSTER ? <source media="(prefers-reduced-motion: reduce)" srcSet={POSTER} /> : null}
        <img
          className={`cta-bg${POSTER ? "" : " cta-bg--gif-only"}`}
          src={GIF_SRC}
          alt=""
          aria-hidden="true"
          loading="lazy"
          decoding="async"
        />
      </picture>
      <div className="cta-scrim" aria-hidden="true" />
      <div className="cta-overlay" aria-hidden="true" />

      <div className="cta-shell">
        <h2 className="cta-title">
          {HEADING.map((line) => (
            <span className="cta-mask" key={line}>
              <span className="cta-line">
                <span className="cta-shine">{line}</span>
              </span>
            </span>
          ))}
        </h2>

        <p className="cta-sub">{SUBHEAD}</p>

        <div className="cta-actions">
          {ACTIONS.map((a) => (
            <a key={a.label} className={`cta-btn cta-btn--${a.variant}`} href={a.href}>
              {a.label}
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}