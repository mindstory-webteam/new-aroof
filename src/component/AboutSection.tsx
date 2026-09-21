"use client";

import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/**
 * AboutSectionLedger — anchored portrait, narrative column, spec ledger
 * ---------------------------------------------------------------------
 *
 *   ┌──────────────────────────────────────────────────────────┐
 *   │  ABOUT US ✦ ──────────────────────────────  Since 1984   │
 *   │                                                          │
 *   │  ┌────────────────┐    lead line, rises word by word     │
 *   │  │                │                                      │
 *   │  │    portrait    │    body paragraph                    │
 *   │  │    (sticky)    │                                      │
 *   │  │                │    body paragraph                    │
 *   │  │        ┌───────┼──┐                                   │
 *   │  │        │ inset │  │   42        0.47        14        │
 *   │  └────────┴───────┘  │   years     mm gauge    districts │
 *   │                                                          │
 *   │  ▤ ▤ ▤ ▤ ▤ ▤ ▤  slow drifting detail strip               │
 *   └──────────────────────────────────────────────────────────┘
 *
 * HOW THIS DIFFERS FROM THE VIDEO-RAIL VERSION
 * --------------------------------------------
 * - The alternating photo/copy rows are replaced by one anchored portrait that
 *   stays put while the narrative column scrolls past it. The section reads as
 *   a single held image with text moving against it, instead of two symmetrical
 *   halves repeated twice.
 * - A small inset photo breaks the portrait's bottom-right corner. That overlap
 *   is the one deliberately loud move in the layout; everything else stays flat
 *   and quiet so it keeps its weight.
 * - The video rails are gone. In their place is a low detail strip at the
 *   bottom that drifts sideways forever — enough life at the edges without
 *   putting moving footage beside body copy.
 * - Figures are real specification data (gauge, years, districts), so they earn
 *   their rules. They count up once when reached.
 * - The heading treatment is carried over untouched: Anton, animated gradient
 *   clipped to the text, mask push-up, star, and the rule running to the meta.
 *
 * THE REVEAL SYSTEM
 * -----------------
 * One vocabulary, applied consistently rather than a different effect per
 * element:
 *   text      → masked rise from below its own baseline (heading, lead, figures)
 *   images    → a clip wipe that opens the frame, with the picture settling out
 *               of a slight zoom behind it
 *   rules     → scaleX draw from the anchored edge
 *   body copy → the quietest one, a short fade up, so it never competes
 * Everything fires once. Nothing re-runs on scroll back.
 *
 * SETUP
 * -----
 * 1. `npm i gsap`
 * 2. Fill PORTRAIT_IMAGES, INSET_IMAGE and STRIP_IMAGES.
 * 3. Move the font @import to your global stylesheet for production.
 * 4. Note this section uses `overflow-x: clip`, not `overflow: hidden` — the
 *    latter on an ancestor silently kills `position: sticky`.
 */

/* ── Content ─────────────────────────────────────────────────────────────── */

const HEADING = "About Us";
const META = "Since 1984";
const SHOW_STAR = true;
const SHOW_HEAD_RULE = true;

const LEAD =
  "A roof is the one part of a house nobody looks at until the night it matters.";

const BODY = [
  "We started with a single pressing line and a promise that a roof should outlive the person who paid for it. Four decades on, the sheets we roll still go onto homes in the same districts, fitted by families we have known across three generations of their trade.",
  "Every coil is pulled off the line and tested for salt, sun and monsoon before it earns our mark. Nothing ships on a batch average. If a sheet will not hold up on the coast, it does not leave the floor.",
];

// Specification figures. `decimals` renders fixed-point during the count.
const FIGURES = [
  { value: 42, decimals: 0, suffix: "", label: "years rolling sheet" },
  { value: 0.47, decimals: 2, suffix: "mm", label: "base gauge, minimum" },
  { value: 14, decimals: 0, suffix: "", label: "districts fitted" },
];

const PORTRAIT_IMAGES = ["/images/about-1.png", "/images/about-2.png"];
const INSET_IMAGE = "/images/about-3.png";
const STRIP_IMAGES = [
  "/images/about-1.png",
  "/images/about-2.png",
  "/images/about-3.png",
  "/images/about-1.png",
  "/images/about-2.png",
  "/images/about-3.png",
];

/* ── Palette ─────────────────────────────────────────────────────────────── */

const BG = "#FFFFFF";
const INK = "#16242e";
const MUTED = "rgba(22, 36, 46, 0.58)";
const LINE = "rgba(22, 36, 46, 0.14)";
const STAR_COLOR = "#17536f";

/* ── Motion ──────────────────────────────────────────────────────────────── */

// How far down the viewport an element has to be before it plays.
const REVEAL_START = "top 84%";
const RISE_DURATION = 1.1;
const RISE_STAGGER = 0.028; // per word in the lead
const FADE_Y = 26;
const WIPE_DURATION = 1.35;
const PHOTO_SCALE_FROM = 1.14;
const COUNT_DURATION = 1.6;

// Portrait drift as the column scrolls past it. 0 turns it off.
const PARALLAX = 7; // percent

/* ── Layout ──────────────────────────────────────────────────────────────── */

const PORTRAIT_ASPECT = "4 / 5";
const INSET_ASPECT = "1 / 1";
const STICKY_TOP = "clamp(72px, 14vh, 132px)";
const STRIP_SPEED = 46; // seconds for one full pass
const IMAGE_FILTER = "none"; // e.g. "grayscale(1) contrast(1.05)"

const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

export default function AboutSectionLedger() {
  const sectionRef = useRef<HTMLElement>(null);
  const headRef = useRef<HTMLHeadingElement>(null);
  const starRef = useRef<SVGSVGElement>(null);
  const headRuleRef = useRef<HTMLSpanElement>(null);
  const portraitRef = useRef<HTMLDivElement>(null);

  const [slide, setSlide] = useState(0);
  const [inView, setInView] = useState(false);
  const [failed, setFailed] = useState<Record<string, boolean>>({});

  useIsoLayoutEffect(() => {
    // Scoped so ctx.revert() on unmount can never reach another section's
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

      /* Heading — carried over from the previous section, unchanged. */
      const headLines = headRef.current?.querySelectorAll<HTMLElement>(".abt5-line");
      if (headLines?.length) {
        gsap.set(headLines, { yPercent: 106, opacity: 0 });
        gsap.set(starRef.current, { scale: 0, rotate: -100, transformOrigin: "50% 50%" });
        gsap.set(headRuleRef.current, { scaleX: 0, transformOrigin: "left center" });
        gsap.set(q(".abt5-meta"), { opacity: 0 });

        gsap
          .timeline({
            scrollTrigger: { trigger: headRef.current, start: REVEAL_START, once: true },
          })
          .to(headLines, {
            yPercent: 0,
            opacity: 1,
            duration: 1.15,
            ease: "power4.out",
            stagger: 0.1,
          })
          .to(starRef.current, { scale: 1, rotate: 0, duration: 0.9, ease: "back.out(1.8)" }, 0.34)
          .to(headRuleRef.current, { scaleX: 1, duration: 1.1, ease: "power3.inOut" }, 0.3)
          .to(q(".abt5-meta"), { opacity: 1, duration: 0.8, ease: "power2.out" }, 0.75);
      }

      /* Lead — same masked rise as the heading, one word at a time. */
      const words = q(".abt5-word-in");
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
            scrollTrigger: { trigger: q(".abt5-lead")[0], start: REVEAL_START, once: true },
          }
        );
      }

      /* Photo frames — clip wipe open, picture settling out of a zoom. */
      q(".abt5-wipe").forEach((frame) => {
        const inner = frame.querySelector<HTMLElement>(".abt5-wipe-inner");
        const dir = frame.dataset.wipe === "left" ? "inset(0% 100% 0% 0%)" : "inset(100% 0% 0% 0%)";
        const delay = Number(frame.dataset.delay ?? 0);

        const tl = gsap.timeline({
          scrollTrigger: { trigger: frame, start: REVEAL_START, once: true },
          delay,
        });

        tl.fromTo(
          frame,
          { clipPath: dir, webkitClipPath: dir },
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

      /* Body copy — the quiet one. */
      gsap.fromTo(
        q(".abt5-para"),
        { opacity: 0, y: FADE_Y },
        {
          opacity: 1,
          y: 0,
          duration: 1.1,
          ease: "power3.out",
          stagger: 0.14,
          scrollTrigger: { trigger: q(".abt5-narrative")[0], start: REVEAL_START, once: true },
        }
      );

      /* Figures — rule draws, number rises and counts up together. */
      const ledger = q(".abt5-ledger")[0];
      if (ledger) {
        const tl = gsap.timeline({
          scrollTrigger: { trigger: ledger, start: "top 88%", once: true },
        });

        tl.fromTo(
          q(".abt5-fig-rule"),
          { scaleX: 0, transformOrigin: "left center" },
          { scaleX: 1, duration: 0.9, ease: "power3.inOut", stagger: 0.1 }
        )
          .fromTo(
            q(".abt5-fig-num-in"),
            { yPercent: 110, opacity: 0 },
            { yPercent: 0, opacity: 1, duration: 1, ease: "power4.out", stagger: 0.1 },
            0.12
          )
          .fromTo(
            q(".abt5-fig-label"),
            { opacity: 0 },
            { opacity: 1, duration: 0.7, ease: "power2.out", stagger: 0.1 },
            0.45
          );

        q(".abt5-fig-value").forEach((el, i) => {
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

      /* Detail strip — fades in, then the CSS drift carries it. */
      gsap.fromTo(
        q(".abt5-strip"),
        { opacity: 0 },
        {
          opacity: 1,
          duration: 1.4,
          ease: "power2.out",
          scrollTrigger: { trigger: q(".abt5-strip")[0], start: "top 95%", once: true },
        }
      );

      /* Portrait drift. The only scrub in the section, and a small one. */
      if (PARALLAX > 0 && portraitRef.current) {
        gsap.fromTo(
          portraitRef.current.querySelector(".abt5-wipe-inner"),
          { yPercent: -PARALLAX / 2 },
          {
            yPercent: PARALLAX / 2,
            ease: "none",
            scrollTrigger: {
              trigger: q(".abt5-narrative")[0],
              start: "top bottom",
              end: "bottom top",
              scrub: true,
            },
          }
        );
      }
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  // Only cycle the portrait while the section is actually on screen.
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
      threshold: 0,
    });
    io.observe(section);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!inView || PORTRAIT_IMAGES.length < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(
      () => setSlide((s) => (s + 1) % PORTRAIT_IMAGES.length),
      5600
    );
    return () => window.clearInterval(id);
  }, [inView]);

  const shot = (src: string, id: string) =>
    failed[id] ? (
      <span className="abt5-missing">No image at {src}</span>
    ) : (
      <img
        src={src}
        alt=""
        loading="lazy"
        onError={() => setFailed((f) => ({ ...f, [id]: true }))}
      />
    );

  return (
    <section ref={sectionRef} className="abt5" aria-label="About us">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Anton&family=Inter:wght@400;500&display=swap');

        @keyframes abtHueShift {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        @keyframes abtStripDrift {
          from { transform: translate3d(0, 0, 0); }
          to   { transform: translate3d(-50%, 0, 0); }
        }

        /* Unchanged. It sits on the line span rather than the <h2> because
           background-clip: text paints from whichever element owns the
           background — an ancestor's gradient would not be clipped by the
           mask's overflow: hidden. */
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

        .abt5 {
          position: relative;
          background: ${BG};
          /* clip, not hidden: overflow: hidden on an ancestor disables the
             sticky portrait below. */
          overflow-x: clip;
          padding: clamp(84px, 13vh, 168px) clamp(22px, 5vw, 76px) clamp(56px, 8vh, 104px);
          color: ${INK};
        }

        .abt5-shell {
          width: min(1240px, 100%);
          margin: 0 auto;
        }

        /* ---- Head ---- */
        .abt5-head-row {
          display: flex;
          align-items: center;
          gap: clamp(14px, 2vw, 30px);
        }

        .abt5-head {
          margin: 0;
          font-weight: 400;
          font-size: clamp(2.7rem, 8.5vw, 7.4rem);
          line-height: 0.95;
          letter-spacing: 0.015em;
          flex: 0 0 auto;
        }

        /* Clips the line as it pushes up; the padding stops descenders and the
           gradient edge from being shaved. */
        .abt5-mask { display: block; overflow: hidden; padding-bottom: 0.06em; }
        .abt5-line { display: block; will-change: transform, opacity; }

        .abt5-star { flex: 0 0 auto; width: clamp(18px, 2.4vw, 34px); height: auto; }

        .abt5-head-rule {
          flex: 1 1 auto;
          height: 1px;
          background: ${LINE};
          will-change: transform;
        }

        .abt5-meta {
          flex: 0 0 auto;
          font: 500 0.82rem/1 'Inter', system-ui, sans-serif;
          letter-spacing: 0.02em;
          color: ${MUTED};
          white-space: nowrap;
        }

        /* ---- Body grid ---- */
        .abt5-narrative {
          display: grid;
          grid-template-columns: minmax(0, 0.92fr) minmax(0, 1.08fr);
          gap: clamp(34px, 6vw, 96px);
          margin-top: clamp(52px, 8vh, 108px);
          align-items: start;
        }

        /* ---- Portrait ---- */
        .abt5-anchor {
          position: sticky;
          top: ${STICKY_TOP};
        }

        .abt5-portrait {
          position: relative;
          width: 100%;
          aspect-ratio: ${PORTRAIT_ASPECT};
          overflow: hidden;
          background: #eef1f3;
          margin: 0;
        }

        .abt5-wipe-inner {
          position: absolute;
          inset: -2%;           /* bleed, so parallax never shows an edge */
          will-change: transform;
        }

        .abt5-slide {
          position: absolute;
          inset: 0;
          opacity: 0;
          transition: opacity 1100ms cubic-bezier(0.4, 0, 0.2, 1);
        }
        .abt5-slide.is-active { opacity: 1; }

        .abt5-portrait img,
        .abt5-inset img,
        .abt5-strip img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center;
          display: block;
          filter: ${IMAGE_FILTER};
        }

        /* The one loud move: the inset breaks the portrait's corner and the
           column gutter at the same time. */
        .abt5-inset {
          position: absolute;
          right: clamp(-56px, -5vw, -24px);
          bottom: clamp(-34px, -4vw, -18px);
          width: clamp(116px, 15vw, 208px);
          aspect-ratio: ${INSET_ASPECT};
          overflow: hidden;
          background: #eef1f3;
          box-shadow: 0 0 0 clamp(6px, 0.8vw, 12px) ${BG};
          z-index: 2;
        }

        .abt5-caption {
          margin: clamp(16px, 2vw, 24px) 0 0;
          font: 400 0.8rem/1.5 'Inter', system-ui, sans-serif;
          color: ${MUTED};
          max-width: 34ch;
        }

        /* ---- Copy ---- */
        .abt5-lead {
          margin: 0 0 clamp(26px, 3vw, 40px);
          font-family: 'Inter', system-ui, sans-serif;
          font-weight: 500;
          font-size: clamp(1.32rem, 2.3vw, 2.05rem);
          line-height: 1.34;
          letter-spacing: -0.012em;
          max-width: 21ch;
          text-wrap: balance;
        }

        /* Per-word mask so the rise survives any wrap point. */
        .abt5-word {
          display: inline-block;
          overflow: hidden;
          vertical-align: bottom;
          padding-bottom: 0.08em;
          margin-right: 0.26em;
        }
        .abt5-word-in { display: inline-block; will-change: transform, opacity; }

        .abt5-para {
          font-family: 'Inter', system-ui, sans-serif;
          font-weight: 400;
          font-size: clamp(1.02rem, 1.12vw, 1.16rem);
          line-height: 1.76;
          letter-spacing: 0.004em;
          color: ${INK};
          max-width: 62ch;
          margin: 0 0 clamp(18px, 2vw, 26px);
          text-wrap: pretty;
          will-change: transform, opacity;
        }
        .abt5-para:last-of-type { margin-bottom: 0; }

        /* ---- Ledger ---- */
        .abt5-ledger {
          display: grid;
          grid-template-columns: repeat(${FIGURES.length}, minmax(0, 1fr));
          gap: clamp(20px, 3vw, 48px);
          margin-top: clamp(40px, 6vw, 72px);
        }

        .abt5-fig-rule {
          display: block;
          height: 1px;
          background: ${LINE};
          margin-bottom: clamp(12px, 1.6vw, 20px);
          will-change: transform;
        }

        .abt5-fig-num {
          display: block;
          overflow: hidden;
          padding-bottom: 0.06em;
        }
        .abt5-fig-num-in {
          display: flex;
          align-items: baseline;
          gap: 0.06em;
          font-family: 'Anton', 'Arial Narrow', sans-serif;
          font-size: clamp(2.1rem, 3.6vw, 3.3rem);
          line-height: 0.92;
          letter-spacing: 0.01em;
          color: ${STAR_COLOR};
          will-change: transform, opacity;
        }
        .abt5-fig-suffix { font-size: 0.42em; letter-spacing: 0.02em; }

        .abt5-fig-label {
          margin: clamp(8px, 1vw, 12px) 0 0;
          font: 400 0.84rem/1.45 'Inter', system-ui, sans-serif;
          color: ${MUTED};
          max-width: 18ch;
        }

        /* ---- Detail strip ---- */
        .abt5-strip {
          margin-top: clamp(64px, 10vh, 132px);
          overflow: hidden;
          -webkit-mask-image: linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent);
          mask-image: linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent);
        }

        .abt5-strip-track {
          display: flex;
          width: max-content;
          gap: clamp(10px, 1.4vw, 18px);
          animation: abtStripDrift ${STRIP_SPEED}s linear infinite;
        }
        .abt5-strip:hover .abt5-strip-track { animation-play-state: paused; }

        .abt5-strip-cell {
          position: relative;
          width: clamp(148px, 18vw, 250px);
          aspect-ratio: 16 / 10;
          overflow: hidden;
          background: #eef1f3;
          flex: 0 0 auto;
        }

        .abt5-missing {
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
          .abt5 { padding: clamp(64px, 9vh, 96px) 22px clamp(44px, 6vh, 72px); }
          .abt5-narrative { grid-template-columns: 1fr; gap: clamp(40px, 7vw, 56px); }
          .abt5-anchor { position: static; }
          .abt5-portrait { aspect-ratio: 4 / 3; }
          .abt5-inset {
            right: clamp(-14px, -3vw, -8px);
            bottom: clamp(-20px, -3vw, -12px);
            width: clamp(104px, 28vw, 150px);
          }
          .abt5-lead { max-width: none; }
          .abt5-ledger { grid-template-columns: 1fr 1fr; row-gap: clamp(26px, 5vw, 36px); }
          .abt5-ledger > :last-child { grid-column: 1 / -1; }
        }

        @media (max-width: 480px) {
          .abt5-meta { display: none; }
          .abt5-ledger { grid-template-columns: 1fr; }
          .abt5-ledger > :last-child { grid-column: auto; }
        }

        /* ---- Reduced motion: everything resolves, nothing moves ---- */
        @media (prefers-reduced-motion: reduce) {
          .abt-heading { animation: none; }
          .abt5-slide { transition: none; }
          .abt5-strip-track { animation: none; }
        }
      `}</style>

      <div className="abt5-shell">
        <div className="abt5-head-row">
          <h2 ref={headRef} className="abt5-head">
            <span className="abt5-mask">
              <span className="abt-heading abt5-line">{HEADING}</span>
            </span>
          </h2>

          {/* {SHOW_STAR && (
            <svg
              ref={starRef}
              className="abt5-star"
              viewBox="0 0 24 24"
              aria-hidden="true"
              focusable="false"
            >
              <path
                d="M12 0c0 6.6 5.4 12 12 12-6.6 0-12 5.4-12 12 0-6.6-5.4-12-12-12C6.6 12 12 6.6 12 0z"
                fill={STAR_COLOR}
              />
            </svg>
          )} */}

          {SHOW_HEAD_RULE && <span className="abt5-head-rule" ref={headRuleRef} />}
          {META && <span className="abt5-meta">{META}</span>}
        </div>

        <div className="abt5-narrative">
          {/* Left: the held image */}
          <div className="abt5-anchor">
            <figure
              className="abt5-portrait abt5-wipe"
              data-wipe="up"
              ref={portraitRef}
            >
              <div className="abt5-wipe-inner">
                {PORTRAIT_IMAGES.map((src, i) => (
                  <div
                    key={`p-${i}`}
                    className={`abt5-slide${i === slide ? " is-active" : ""}`}
                    aria-hidden={i !== slide}
                  >
                    {shot(src, `p-${i}`)}
                  </div>
                ))}
              </div>
            </figure>

            {/* {INSET_IMAGE && (
              <div className="abt5-inset abt5-wipe" data-wipe="left" data-delay="0.35">
                <div className="abt5-wipe-inner">{shot(INSET_IMAGE, "inset")}</div>
              </div>
            )} */}

            {/* <p className="abt5-caption">
              The pressing floor, where every coil is checked before it is cut.
            </p> */}
          </div>

          {/* Right: the narrative and the figures */}
          <div className="abt5-column">
            <p className="abt5-lead">
              {LEAD.split(" ").map((word, i) => (
                <span className="abt5-word" key={`w-${i}`}>
                  <span className="abt5-word-in">{word}</span>
                </span>
              ))}
            </p>

            {BODY.map((para, i) => (
              <p className="abt5-para" key={`b-${i}`}>
                {para}
              </p>
            ))}

            <dl className="abt5-ledger">
              {FIGURES.map((fig, i) => (
                <div key={`f-${i}`}>
                  <span className="abt5-fig-rule" />
                  <dt className="abt5-fig-num">
                    <span className="abt5-fig-num-in">
                      <span className="abt5-fig-value">
                        {fig.value.toFixed(fig.decimals)}
                      </span>
                      {fig.suffix && <span className="abt5-fig-suffix">{fig.suffix}</span>}
                    </span>
                  </dt>
                  <dd className="abt5-fig-label">{fig.label}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        {/* Detail strip. Duplicated once so the drift loops seamlessly. */}
        <div className="abt5-strip" aria-hidden="true">
          <div className="abt5-strip-track">
            {[...STRIP_IMAGES, ...STRIP_IMAGES].map((src, i) => (
              <div className="abt5-strip-cell" key={`s-${i}`}>
                {shot(src, `s-${i % STRIP_IMAGES.length}`)}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}