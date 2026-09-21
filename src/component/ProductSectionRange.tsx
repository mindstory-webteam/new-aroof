"use client";

import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/**
 * ProductSectionDiptych — two sheets, offset columns, spec lists
 * --------------------------------------------------------------
 *
 *   ┌──────────────────────────────────────────────────────────────┐
 *   │  — our product range                                         │
 *   │  ASA COATED UPVC                                             │
 *   │  ROOFING SHEETS.  ─────────────   3-Layer  30dB  50yr        │
 *   │  short deck paragraph                                        │
 *   ├──────────────────────────────────────────────────────────────┤
 *   │ ▪ noise absorbing ▪ impact resistant ▪ colour fast ▪ …  drift │
 *   ├──────────────────────────────────────────────────────────────┤
 *   │  ┌───────────────────┐                                       │
 *   │  │                   │        ┌───────────────────┐          │
 *   │  │   tile sheet      │        │                   │          │
 *   │  │                   │        │   trafford sheet  │          │
 *   │  └───────────────────┘        │                   │          │
 *   │  residential                  └───────────────────┘          │
 *   │  TILE UPVC SHEET              industrial                     │
 *   │  one line of copy             TRAFFORD UPVC SHEET            │
 *   │  ── profile      roman tile   one line of copy               │
 *   │  ── cover width  1,050 mm     ── profile      trapezoidal    │
 *   │  ── gauge        2.5 mm       ── cover width  1,070 mm       │
 *   └──────────────────────────────────────────────────────────────┘
 *
 * WHAT CHANGED FROM THE MOSAIC VERSION
 * ------------------------------------
 * - Five tiles become two panels. With only two products, a mosaic has to pad
 *   itself with detail shots; a diptych lets each sheet carry its own name,
 *   line of copy and spec list, which is what a buyer is actually comparing.
 * - The second column is dropped by a fixed offset so the two panels never
 *   read as a symmetrical pair. That offset is the section's one structural
 *   liberty — the grid is otherwise strict, and nothing else breaks its cell.
 * - Specs are per product, drawn as rules with the value rising into place, so
 *   the same reveal vocabulary does the comparison work that a table would.
 *
 * CARRIED OVER, UNCHANGED
 * -----------------------
 * - Anton heading with the animated gradient clipped to the text, mask push-up
 *   per line, rule running out to the figures. `.abt-heading` is the same rule
 *   as the About section, so both stay in sync.
 * - The four reveal moves and nothing else:
 *     text      → masked rise from its own baseline
 *     images    → clip wipe opening the frame, picture settling out of a zoom
 *     rules     → scaleX draw from the anchored edge
 *     body copy → a short fade up, the quietest one
 *   Everything fires once. Nothing re-runs on scroll back.
 *
 * SETUP
 * -----
 * 1. `npm i gsap`
 * 2. Fill PRODUCTS[].src.
 * 3. Move the font @import to your global stylesheet for production.
 */

/* ── Content ─────────────────────────────────────────────────────────────── */

const EYEBROW = "Our product range";
const HEAD_LINES = ["ASA Coated UPVC", "Roofing Sheets."];
const SHOW_HEAD_RULE = true;

const LEAD =
  "A-Roof's 3-layer co-extruded UPVC sheets are engineered with ASA anti-climate resin — retaining colour and strength against UV, heat, dampness, and impact for decades.";

// Headline figures. `decimals` renders fixed-point during the count;
// `suffixFull` keeps the suffix at display size instead of a superscript.
const FIGURES = [
  { value: 3, decimals: 0, suffix: "-Layer", suffixFull: true, label: "co-extruded UPVC" },
  { value: 30, decimals: 0, suffix: "dB", suffixFull: false, label: "noise reduction" },
  { value: 50, decimals: 0, suffix: "yr", suffixFull: false, label: "colour retention" },
];

const TICKER = [
  "Noise absorbing — 30dB lower than steel",
  "Impact resistant",
  "Colour fast",
  "Lightweight",
  "3-layer co-extruded",
  "UV resistant",
  "Anti-corrosive",
];

// Two products. Edit the specs to your real sheet data — the layout holds
// whether each list has three rows or five.
const PRODUCTS = [
  {
    src: "/images/pro-images/p-1.png",
    badge: "Residential",
    name: "Tile UPVC Sheet",
    note: "Classic look. Modern protection.",
    wipe: "up",
    specs: [
      { label: "Profile", value: "Roman tile" },
      { label: "Cover width", value: "1,050 mm" },
      { label: "Total thickness", value: "2.5 mm" },
      { label: "Lengths", value: "Cut to order" },
    ],
  },
  {
    src: "/images/pro-images/p-2.png",
    badge: "Industrial",
    name: "Trafford UPVC Sheet",
    note: "Built for demanding environments.",
    wipe: "down",
    specs: [
      { label: "Profile", value: "Trapezoidal" },
      { label: "Cover width", value: "1,070 mm" },
      { label: "Total thickness", value: "2.0 mm" },
      { label: "Lengths", value: "Cut to order" },
    ],
  },
];

/* ── Palette ─────────────────────────────────────────────────────────────── */

const BG = "#FFFFFF";
const INK = "#16242e";
const MUTED = "rgba(22, 36, 46, 0.58)";
const LINE = "rgba(22, 36, 46, 0.14)";
const ACCENT = "#17536f";
const TICKER_BG = "#0d1519";

/* ── Motion ──────────────────────────────────────────────────────────────── */

const REVEAL_START = "top 84%";
const RISE_DURATION = 1.1;
const RISE_STAGGER = 0.028; // per word in the lead
const FADE_Y = 26;
const WIPE_DURATION = 1.35;
const PHOTO_SCALE_FROM = 1.14;
const COUNT_DURATION = 1.6;
const TICKER_SPEED = 38; // seconds for one full pass

/* ── Layout ──────────────────────────────────────────────────────────────── */

const PANEL_ASPECT = "5 / 4";
const COLUMN_OFFSET = "clamp(48px, 9vw, 132px)"; // how far the right column drops
const IMAGE_FILTER = "none"; // e.g. "grayscale(1) contrast(1.05)"

const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

export default function ProductSectionDiptych() {
  const sectionRef = useRef<HTMLElement>(null);
  const headRef = useRef<HTMLHeadingElement>(null);
  const headRuleRef = useRef<HTMLSpanElement>(null);

  const [failed, setFailed] = useState<Record<string, boolean>>({});

  useIsoLayoutEffect(() => {
    // Scoped, so ctx.revert() on unmount can never reach another section's
    // tweens or triggers.
    const ctx = gsap.context(() => {
      const root = sectionRef.current;
      if (!root) return;

      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        // The markup already renders in its finished state, so there is
        // nothing to undo — just skip every tween.
        return;
      }

      const q = gsap.utils.selector(root);

      /* Heading — the About treatment, two lines. */
      const headLines = headRef.current?.querySelectorAll<HTMLElement>(".prd-line");
      if (headLines?.length) {
        gsap.set(headLines, { yPercent: 106, opacity: 0 });
        gsap.set(q(".prd-eyebrow-in"), { yPercent: 120, opacity: 0 });
        gsap.set(q(".prd-eyebrow-dash"), { scaleX: 0, transformOrigin: "left center" });
        gsap.set(headRuleRef.current, { scaleX: 0, transformOrigin: "left center" });

        gsap
          .timeline({
            scrollTrigger: { trigger: headRef.current, start: REVEAL_START, once: true },
          })
          .to(q(".prd-eyebrow-dash"), { scaleX: 1, duration: 0.7, ease: "power3.inOut" })
          .to(
            q(".prd-eyebrow-in"),
            { yPercent: 0, opacity: 1, duration: 0.9, ease: "power4.out" },
            0.08
          )
          .to(
            headLines,
            { yPercent: 0, opacity: 1, duration: 1.15, ease: "power4.out", stagger: 0.1 },
            0.18
          )
          .to(headRuleRef.current, { scaleX: 1, duration: 1.1, ease: "power3.inOut" }, 0.5);
      }

      /* Lead — masked rise, one word at a time. */
      const words = q(".prd-word-in");
      if (words.length) {
        gsap.fromTo(
          words,
          { yPercent: 110, opacity: 0 },
          {
            yPercent: 0,
            opacity: 1,
            duration: RISE_DURATION,
            ease: "power4.out",
            stagger: RISE_STAGGER,
            scrollTrigger: { trigger: q(".prd-lead")[0], start: REVEAL_START, once: true },
          }
        );
      }

      /* Headline figures — rule draws, number rises and counts up together. */
      const ledger = q(".prd-ledger")[0];
      if (ledger) {
        const tl = gsap.timeline({
          scrollTrigger: { trigger: ledger, start: "top 88%", once: true },
        });

        tl.fromTo(
          q(".prd-fig-rule"),
          { scaleX: 0, transformOrigin: "left center" },
          { scaleX: 1, duration: 0.9, ease: "power3.inOut", stagger: 0.1 }
        )
          .fromTo(
            q(".prd-fig-num-in"),
            { yPercent: 110, opacity: 0 },
            { yPercent: 0, opacity: 1, duration: 1, ease: "power4.out", stagger: 0.1 },
            0.12
          )
          .fromTo(
            q(".prd-fig-label"),
            { opacity: 0 },
            { opacity: 1, duration: 0.7, ease: "power2.out", stagger: 0.1 },
            0.45
          );

        q(".prd-fig-value").forEach((el, i) => {
          const spec = FIGURES[i];
          if (!spec) return;
          const counter = { n: 0 };
          tl.to(
            counter,
            {
              n: spec.value,
              duration: COUNT_DURATION,
              ease: "power2.out",
              onUpdate: () => {
                el.textContent = counter.n.toFixed(spec.decimals);
              },
            },
            0.12 + i * 0.1
          );
        });
      }

      /* Ticker — wipes open from the left, then the CSS drift carries it. */
      gsap.fromTo(
        q(".prd-ticker"),
        { clipPath: "inset(0% 100% 0% 0%)", webkitClipPath: "inset(0% 100% 0% 0%)" },
        {
          clipPath: "inset(0% 0% 0% 0%)",
          webkitClipPath: "inset(0% 0% 0% 0%)",
          duration: 1.2,
          ease: "power3.inOut",
          scrollTrigger: { trigger: q(".prd-ticker")[0], start: "top 92%", once: true },
        }
      );

      /* Product frames — clip wipe open, picture settling out of a zoom. */
      q(".prd-wipe").forEach((frame) => {
        const inner = frame.querySelector<HTMLElement>(".prd-wipe-inner");
        const dirMap: Record<string, string> = {
          left: "inset(0% 100% 0% 0%)",
          right: "inset(0% 0% 0% 100%)",
          down: "inset(0% 0% 100% 0%)",
          up: "inset(100% 0% 0% 0%)",
        };
        const from = dirMap[frame.dataset.wipe ?? "up"] ?? dirMap.up;

        const tl = gsap.timeline({
          scrollTrigger: { trigger: frame, start: REVEAL_START, once: true },
        });

        tl.fromTo(
          frame,
          { clipPath: from, webkitClipPath: from },
          {
            clipPath: "inset(0% 0% 0% 0%)",
            webkitClipPath: "inset(0% 0% 0% 0%)",
            duration: WIPE_DURATION,
            ease: "power3.inOut",
          }
        );

        if (inner) {
          tl.fromTo(
            inner,
            { scale: PHOTO_SCALE_FROM },
            { scale: 1, duration: WIPE_DURATION + 0.6, ease: "power3.out" },
            0
          );
        }
      });

      /* Each panel's copy and spec list. Triggered per panel so the offset
         column plays when it is actually reached, not when its neighbour is. */
      q(".prd-panel").forEach((panel) => {
        const pq = gsap.utils.selector(panel);
        const tl = gsap.timeline({
          scrollTrigger: { trigger: panel, start: REVEAL_START, once: true },
          delay: 0.35,
        });

        tl.fromTo(
          pq(".prd-ident"),
          { opacity: 0, y: FADE_Y },
          { opacity: 1, y: 0, duration: 1, ease: "power3.out" }
        )
          .fromTo(
            pq(".prd-spec-rule"),
            { scaleX: 0, transformOrigin: "left center" },
            { scaleX: 1, duration: 0.8, ease: "power3.inOut", stagger: 0.08 },
            0.2
          )
          .fromTo(
            pq(".prd-spec-in"),
            { yPercent: 115, opacity: 0 },
            { yPercent: 0, opacity: 1, duration: 0.9, ease: "power4.out", stagger: 0.08 },
            0.28
          );
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  const shot = (src: string, id: string) =>
    failed[id] ? (
      <span className="prd-missing">No image at {src}</span>
    ) : (
      <img
        src={src}
        alt=""
        loading="lazy"
        onError={() => setFailed((f) => ({ ...f, [id]: true }))}
      />
    );

  return (
    <section ref={sectionRef} className="prd" aria-label="Our product range">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Anton&family=Inter:wght@400;500;600&display=swap');

        @keyframes abtHueShift {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        @keyframes prdTickerDrift {
          from { transform: translate3d(0, 0, 0); }
          to   { transform: translate3d(-50%, 0, 0); }
        }

        /* Same rule as the About section. It sits on the line span rather than
           the <h2> because background-clip: text paints from whichever element
           owns the background — an ancestor's gradient would not be clipped by
           the mask's overflow: hidden. */
        .abt-heading {
          font-family: 'Anton', 'Arial Narrow', sans-serif;
          text-transform: uppercase;
          background: linear-gradient(90deg, #0d2233, #17536f, #2f8fbd, #10405a, #0d2233);
          background-size: 300% 100%;
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          animation: abtHueShift 6s ease-in-out infinite;
        }

        .prd {
          position: relative;
          background: ${BG};
          overflow-x: clip;
          padding: clamp(84px, 13vh, 168px) 0 clamp(56px, 8vh, 104px);
          color: ${INK};
        }

        .prd-shell {
          width: min(1240px, 100%);
          margin: 0 auto;
          padding: 0 clamp(22px, 5vw, 76px);
        }

        /* ---- Head ---- */
        .prd-eyebrow {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 0 0 clamp(14px, 2vw, 22px);
        }
        .prd-eyebrow-dash {
          display: block;
          width: clamp(18px, 2.4vw, 30px);
          height: 2px;
          background: ${ACCENT};
          will-change: transform;
        }
        .prd-eyebrow-mask { display: block; overflow: hidden; padding-bottom: 0.14em; }
        .prd-eyebrow-in {
          display: block;
          font: 600 0.74rem/1.2 'Inter', system-ui, sans-serif;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: ${ACCENT};
          will-change: transform, opacity;
        }

        .prd-head-row {
          display: flex;
          align-items: flex-end;
          gap: clamp(20px, 4vw, 56px);
        }

        .prd-head {
          margin: 0;
          font-weight: 400;
          font-size: clamp(2.5rem, 6.4vw, 5.6rem);
          line-height: 0.95;
          letter-spacing: 0.015em;
          flex: 0 0 auto;
        }

        /* Clips the line as it pushes up; the padding stops descenders and the
           gradient edge from being shaved. */
        .prd-mask { display: block; overflow: hidden; padding-bottom: 0.06em; }
        .prd-line { display: block; will-change: transform, opacity; }
        .prd-line--flat {
          font-family: 'Anton', 'Arial Narrow', sans-serif;
          text-transform: uppercase;
          color: ${INK};
        }

        .prd-head-rule {
          flex: 1 1 auto;
          height: 1px;
          background: ${LINE};
          margin-bottom: 0.7em;
          will-change: transform;
        }

        /* ---- Lead + headline figures ---- */
        .prd-deck {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
          gap: clamp(30px, 6vw, 88px);
          align-items: end;
          margin-top: clamp(26px, 3.5vw, 44px);
        }

        .prd-lead {
          margin: 0;
          font-family: 'Inter', system-ui, sans-serif;
          font-weight: 400;
          font-size: clamp(1rem, 1.1vw, 1.12rem);
          line-height: 1.72;
          letter-spacing: 0.004em;
          color: ${MUTED};
          max-width: 56ch;
          text-wrap: pretty;
        }

        /* Per-word mask so the rise survives any wrap point. */
        .prd-word {
          display: inline-block;
          overflow: hidden;
          vertical-align: bottom;
          padding-bottom: 0.08em;
          margin-right: 0.26em;
        }
        .prd-word-in { display: inline-block; will-change: transform, opacity; }

        .prd-ledger {
          display: grid;
          grid-template-columns: repeat(${FIGURES.length}, minmax(0, 1fr));
          gap: clamp(16px, 2.4vw, 40px);
          margin: 0;
        }

        .prd-fig-rule {
          display: block;
          height: 1px;
          background: ${LINE};
          margin-bottom: clamp(12px, 1.6vw, 20px);
          will-change: transform;
        }

        .prd-fig-num { display: block; overflow: hidden; padding-bottom: 0.06em; margin: 0; }
        .prd-fig-num-in {
          display: flex;
          align-items: baseline;
          gap: 0.02em;
          font-family: 'Anton', 'Arial Narrow', sans-serif;
          font-size: clamp(1.8rem, 3vw, 2.7rem);
          line-height: 0.92;
          letter-spacing: 0.01em;
          color: ${INK};
          will-change: transform, opacity;
        }
        .prd-fig-suffix { font-size: 0.42em; letter-spacing: 0.02em; color: ${ACCENT}; }
        .prd-fig-suffix--full { font-size: 1em; letter-spacing: 0.01em; color: ${INK}; }

        .prd-fig-label {
          margin: clamp(8px, 1vw, 12px) 0 0;
          font: 500 0.7rem/1.4 'Inter', system-ui, sans-serif;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: ${MUTED};
          max-width: 16ch;
        }

        /* ---- Ticker: full bleed, inverted ---- */
        .prd-ticker {
          margin: clamp(48px, 7vh, 92px) 0 0;
          width: 100vw;
          margin-left: calc(50% - 50vw);
          background: ${TICKER_BG};
          overflow: hidden;
          will-change: clip-path;
        }

        .prd-ticker-track {
          display: flex;
          width: max-content;
          animation: prdTickerDrift ${TICKER_SPEED}s linear infinite;
        }
        .prd-ticker:hover .prd-ticker-track { animation-play-state: paused; }

        .prd-ticker-item {
          display: flex;
          align-items: center;
          gap: clamp(14px, 2vw, 26px);
          padding: clamp(9px, 1.1vw, 13px) clamp(14px, 1.8vw, 24px);
          font: 500 0.66rem/1 'Inter', system-ui, sans-serif;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.82);
          white-space: nowrap;
        }
        .prd-ticker-dot {
          width: 3px;
          height: 3px;
          background: #2f8fbd;
          flex: 0 0 auto;
        }

        /* ---- Diptych ---- */
        .prd-diptych {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: clamp(28px, 5vw, 84px);
          margin-top: clamp(44px, 7vh, 88px);
          align-items: start;
        }

        /* The section's one structural liberty: the second column drops, so the
           pair never reads as a symmetrical split. */
        .prd-panel:nth-child(2) { margin-top: ${COLUMN_OFFSET}; }

        .prd-frame {
          position: relative;
          width: 100%;
          aspect-ratio: ${PANEL_ASPECT};
          overflow: hidden;
          background: #eef1f3;
          margin: 0;
        }

        .prd-wipe-inner { position: absolute; inset: 0; will-change: transform; }

        .prd-frame img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center;
          display: block;
          filter: ${IMAGE_FILTER};
          transition: transform 900ms cubic-bezier(0.22, 1, 0.36, 1);
        }
        .prd-panel:hover .prd-frame img { transform: scale(1.035); }

        /* ---- Identity block ---- */
        .prd-ident {
          margin-top: clamp(18px, 2.4vw, 30px);
          will-change: transform, opacity;
        }

        .prd-badge {
          display: inline-block;
          padding: 5px 10px;
          margin-bottom: clamp(10px, 1.4vw, 16px);
          font: 500 0.6rem/1 'Inter', system-ui, sans-serif;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: ${ACCENT};
          border: 1px solid ${LINE};
        }

        .prd-name {
          margin: 0;
          font: 400 clamp(1.4rem, 2.5vw, 2.15rem)/1.06 'Anton', 'Arial Narrow', sans-serif;
          letter-spacing: 0.015em;
          text-transform: uppercase;
          color: ${INK};
        }

        .prd-note {
          margin: clamp(8px, 1vw, 12px) 0 0;
          font: 400 0.95rem/1.6 'Inter', system-ui, sans-serif;
          color: ${MUTED};
          max-width: 34ch;
        }

        /* ---- Per-product spec list ---- */
        .prd-specs {
          margin: clamp(24px, 3vw, 38px) 0 0;
          display: grid;
          gap: clamp(12px, 1.4vw, 18px);
        }

        .prd-spec-rule {
          display: block;
          height: 1px;
          background: ${LINE};
          margin-bottom: clamp(9px, 1.1vw, 13px);
          will-change: transform;
        }

        .prd-spec-row {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 16px;
          overflow: hidden;
          padding-bottom: 0.1em;
        }
        .prd-spec-in {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 16px;
          width: 100%;
          will-change: transform, opacity;
        }

        .prd-spec-label {
          font: 400 0.8rem/1.4 'Inter', system-ui, sans-serif;
          letter-spacing: 0.02em;
          color: ${MUTED};
        }
        .prd-spec-value {
          font: 500 0.88rem/1.4 'Inter', system-ui, sans-serif;
          letter-spacing: 0.01em;
          color: ${INK};
          text-align: right;
        }

        .prd-missing {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 0 10%;
          font: 0.78rem/1.5 'Inter', system-ui, sans-serif;
          color: ${MUTED};
          background: #eceff2;
        }

        /* ---- Responsive ---- */
        @media (max-width: 900px) {
          .prd { padding: clamp(64px, 9vh, 96px) 0 clamp(44px, 6vh, 72px); }
          .prd-shell { padding: 0 22px; }
          .prd-head-row { display: block; }
          .prd-head-rule { display: none; }
          .prd-deck { grid-template-columns: 1fr; gap: clamp(28px, 6vw, 40px); align-items: start; }
          .prd-lead { max-width: none; }

          .prd-diptych { grid-template-columns: 1fr; gap: clamp(48px, 10vw, 72px); }
          .prd-panel:nth-child(2) { margin-top: 0; }
          .prd-frame { aspect-ratio: 4 / 3; }
          .prd-note { max-width: none; }
        }

        @media (max-width: 480px) {
          .prd-ledger { grid-template-columns: 1fr 1fr; row-gap: 26px; }
          .prd-ledger > :last-child { grid-column: 1 / -1; }
        }

        /* ---- Reduced motion: everything resolves, nothing moves ---- */
        @media (prefers-reduced-motion: reduce) {
          .abt-heading { animation: none; }
          .prd-ticker-track { animation: none; }
          .prd-frame img { transition: none; }
        }
      `}</style>

      <div className="prd-shell">
        <p className="prd-eyebrow">
          <span className="prd-eyebrow-dash" />
          <span className="prd-eyebrow-mask">
            <span className="prd-eyebrow-in">{EYEBROW}</span>
          </span>
        </p>

        <div className="prd-head-row">
          <h2 ref={headRef} className="prd-head">
            {HEAD_LINES.map((line, i) => (
              <span className="prd-mask" key={`h-${i}`}>
                <span className={`prd-line ${i === 0 ? "prd-line--flat" : "abt-heading"}`}>
                  {line}
                </span>
              </span>
            ))}
          </h2>

          {SHOW_HEAD_RULE && <span className="prd-head-rule" ref={headRuleRef} />}
        </div>

        <div className="prd-deck">
          <p className="prd-lead">
            {LEAD.split(" ").map((word, i) => (
              <span className="prd-word" key={`w-${i}`}>
                <span className="prd-word-in">{word}</span>
              </span>
            ))}
          </p>

          <dl className="prd-ledger">
            {FIGURES.map((fig, i) => (
              <div key={`f-${i}`}>
                <span className="prd-fig-rule" />
                <dt className="prd-fig-num">
                  <span className="prd-fig-num-in">
                    <span className="prd-fig-value">{fig.value.toFixed(fig.decimals)}</span>
                    {fig.suffix && (
                      <span
                        className={`prd-fig-suffix${fig.suffixFull ? " prd-fig-suffix--full" : ""}`}
                      >
                        {fig.suffix}
                      </span>
                    )}
                  </span>
                </dt>
                <dd className="prd-fig-label">{fig.label}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      {/* Ticker. Duplicated once so the drift loops seamlessly. */}
      <div className="prd-ticker" aria-hidden="true">
        <div className="prd-ticker-track">
          {[...TICKER, ...TICKER].map((item, i) => (
            <span className="prd-ticker-item" key={`t-${i}`}>
              <span className="prd-ticker-dot" />
              {item}
            </span>
          ))}
        </div>
      </div>

      <div className="prd-shell">
        <div className="prd-diptych">
          {PRODUCTS.map((p, i) => (
            <article className="prd-panel" key={`p-${i}`}>
              <figure className="prd-frame prd-wipe" data-wipe={p.wipe}>
                <div className="prd-wipe-inner">{shot(p.src, `p-${i}`)}</div>
              </figure>

              <div className="prd-ident">
                {p.badge && <span className="prd-badge">{p.badge}</span>}
                <h3 className="prd-name">{p.name}</h3>
                {p.note && <p className="prd-note">{p.note}</p>}
              </div>

              <dl className="prd-specs">
                {p.specs.map((s, j) => (
                  <div key={`s-${i}-${j}`}>
                    <span className="prd-spec-rule" />
                    <div className="prd-spec-row">
                      <span className="prd-spec-in">
                        <dt className="prd-spec-label">{s.label}</dt>
                        <dd className="prd-spec-value">{s.value}</dd>
                      </span>
                    </div>
                  </div>
                ))}
              </dl>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}