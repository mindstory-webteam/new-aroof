"use client";

import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/* ── Content ─────────────────────────────────────────────────────────────── */

const HEADING = "Why A-Roof";
const META = "Seven tests it passes";
const SHOW_HEAD_RULE = true;

const LEAD =
  "A-Roof has engraved a distinct space in the market within a very short span of time.";

const INTRO =
  "Move down the rows for the test behind each one. Every number here is something somebody can hold us to, not a claim.";

const REASONS = [
  {
    tag: "Fire safety",
    title: "Engineered for",
    accentTitle: "fire safety",
    accent: "#e07a1f",
    body: "A-Roof is an upgrade on the roofing you already know, built past the constraints of ordinary sheet. Tested to the UL94-2013 standard, the material self-extinguishes rather than carrying flame across a run of roof.",
    figure: { value: 94, decimals: 0, suffix: "", label: "UL94 tested, self-extinguishing" },
    image: "/images/about-2.png",
  },
  {
    tag: "Weather & chemical resistance",
    title: "Superior corrosion",
    accentTitle: "resistance",
    accent: "#1f5fd0",
    body: "Our sheets show no chemical reaction after twenty-four hours immersed in acid, in saline below 70% concentration, or in alkali. That makes them the sheet to fit on the coast, and anywhere humidity sits on a roof all year.",
    figure: { value: 24, decimals: 0, suffix: "h", label: "acid, saline and alkali immersion" },
    image: "/images/about-1.png",
  },
  {
    tag: "Thermal performance",
    title: "Remarkable heat",
    accentTitle: "insulation",
    accent: "#e0a11f",
    body: "The ASA-PVC body carries far less heat into the room below than a metal deck of the same span, so the floor under it stays workable through the middle of the afternoon.",
    figure: { value: 35, decimals: 0, suffix: "%", label: "less heat carried than metal sheet — PLACEHOLDER" },
    image: "/images/about-2.png",
  },
  {
    tag: "Acoustic comfort",
    title: "Good sound",
    accentTitle: "insulation",
    accent: "#7a3fd0",
    body: "Under the impact of rain, the sheet absorbs rather than rings. Testing shows a marked drop in transmitted noise against a bare metal roof of the same pitch.",
    figure: { value: 30, decimals: 0, suffix: "dB", label: "rain impact noise absorbed — PLACEHOLDER" },
    image: "/images/about-1.png",
  },
  {
    tag: "UV & colour protection",
    title: "Long-lasting colour",
    accentTitle: "stability",
    accent: "#d0246b",
    body: "Our PVC/ASA sheets hold anti-UV performance for at least ten years of colour stability at ΔE ≤ 5, across swinging temperatures and hard outdoor exposure in strong sun.",
    figure: { value: 10, decimals: 0, suffix: "yr", label: "colour stability at ΔE ≤ 5" },
    image: "/images/about-2.png",
  },
  {
    tag: "Structural strength",
    title: "High loading and bearing",
    accentTitle: "capacity",
    accent: "#d02424",
    body: "The profile is shaped to carry load across the purlin, not just to look deep. It takes the weight of a fitter walking a run without deflection setting in at the crown.",
    figure: { value: 150, decimals: 0, suffix: "kg", label: "point load across span — PLACEHOLDER" },
    image: "/images/about-1.png",
  },
  {
    tag: "Installation efficiency",
    title: "Efficient and convenient",
    accentTitle: "installation",
    accent: "#17936a",
    body: "Our weatherproof ASA-PVC sheet weighs less than clay and covers an effective width of up to 1050mm, so a crew closes a roof in fewer passes and with fewer hands on the ladder.",
    figure: { value: 1050, decimals: 0, suffix: "mm", label: "effective cover width" },
    image: "/images/about-2.png",
  },
];

/* ── Palette ─────────────────────────────────────────────────────────────── */

const BG = "#FFFFFF";
const INK = "#16242e";
const MUTED = "rgba(22, 36, 46, 0.58)";
const LINE = "rgba(22, 36, 46, 0.14)";
const STAR_COLOR = "#17536f";

// Per-reason accent. Set false to run the whole section in STAR_COLOR.
const USE_ACCENTS = true;

/* ── Motion ──────────────────────────────────────────────────────────────── */

const REVEAL_START = "top 84%";
const RISE_DURATION = 1.1;
const RISE_STAGGER = 0.028;
const COUNT_DURATION = 1.4;
const PANEL_MS = 620; // expand / collapse

/* ── Interaction ─────────────────────────────────────────────────────────── */

// Hover only arms on a real pointer. Touch and stylus fall back to tap, which
// is the same handler a click uses.
const HOVER_OPEN = true;
// Intent delay: a cursor crossing the ledger on its way elsewhere should not
// deal open every row behind it.
const HOVER_DELAY = 110;
// Leaving the ledger entirely: false holds the last row open, true returns to
// OPEN_ON_LOAD. Holding it open is calmer — the section does not snap back
// while you are still reading the copy you just opened.
const CLOSE_ON_LEAVE = false;
const OPEN_ON_LOAD = 0; // index open at rest; -1 for all closed

/* ── Layout ──────────────────────────────────────────────────────────────── */

const PANEL_ASPECT = "16 / 11";
const IMAGE_FILTER = "none";

const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

export default function WhyChooseLedger() {
  const sectionRef = useRef<HTMLElement>(null);
  const headRef = useRef<HTMLHeadingElement>(null);
  const headRuleRef = useRef<HTMLSpanElement>(null);
  const valueRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const counted = useRef<Record<number, boolean>>({});
  const hoverTimer = useRef<number | null>(null);

  const [open, setOpen] = useState(OPEN_ON_LOAD);
  const [canHover, setCanHover] = useState(false);
  const [failed, setFailed] = useState<Record<string, boolean>>({});

  /* Hover is a capability, not a screen width: a laptop at 600px still has a
     mouse, and a large tablet does not. Watched rather than read once, since a
     Bluetooth mouse can arrive mid-session. */
  useEffect(() => {
    if (!HOVER_OPEN) return;
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    const sync = () => setCanHover(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(
    () => () => {
      if (hoverTimer.current !== null) window.clearTimeout(hoverTimer.current);
    },
    []
  );

  useIsoLayoutEffect(() => {
    // Scoped so ctx.revert() on unmount can never reach another section's
    // tweens or triggers.
    const ctx = gsap.context(() => {
      const root = sectionRef.current;
      if (!root) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

      const q = gsap.utils.selector(root);

      /* Heading — carried over from the About section, unchanged. */
      const headLines = headRef.current?.querySelectorAll<HTMLElement>(".wcx-line");
      if (headLines?.length) {
        gsap.set(headLines, { yPercent: 106, opacity: 0 });
        gsap.set(headRuleRef.current, { scaleX: 0, transformOrigin: "left center" });
        gsap.set(q(".wcx-meta"), { opacity: 0 });

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
          .to(headRuleRef.current, { scaleX: 1, duration: 1.1, ease: "power3.inOut" }, 0.3)
          .to(q(".wcx-meta"), { opacity: 1, duration: 0.8, ease: "power2.out" }, 0.75);
      }

      /* Lead — same masked rise, one word at a time. */
      const words = q(".wcx-word-in");
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
            scrollTrigger: { trigger: q(".wcx-lead")[0], start: REVEAL_START, once: true },
          }
        );
      }

      /* The ledger arrives as one move: the rows deal out from the top. This
         is the section's only scroll-triggered reveal. */
      gsap.fromTo(
        q(".wcx-row"),
        { opacity: 0, y: 22 },
        {
          opacity: 1,
          y: 0,
          duration: 0.9,
          ease: "power3.out",
          stagger: 0.07,
          scrollTrigger: { trigger: q(".wcx-ledger")[0], start: REVEAL_START, once: true },
        }
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  /* The figure counts when the row opens, not when you scroll past it — and
     only the first time, so sweeping back over a row does not replay it. */
  useEffect(() => {
    if (open < 0) return;
    const el = valueRefs.current[open];
    const spec = REASONS[open]?.figure;
    if (!el || !spec) return;

    if (counted.current[open] || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.textContent = spec.value.toFixed(spec.decimals);
      return;
    }

    counted.current[open] = true;
    const counter = { n: 0 };
    const tween = gsap.to(counter, {
      n: spec.value,
      duration: COUNT_DURATION,
      ease: "power2.out",
      delay: 0.15,
      onUpdate: () => {
        el.textContent = counter.n.toFixed(spec.decimals);
      },
    });
    return () => {
      tween.kill();
    };
  }, [open]);

  const clearHover = () => {
    if (hoverTimer.current !== null) {
      window.clearTimeout(hoverTimer.current);
      hoverTimer.current = null;
    }
  };

  const hoverOpen = (i: number) => {
    if (!canHover) return;
    clearHover();
    if (open === i) return;
    hoverTimer.current = window.setTimeout(() => {
      setOpen(i);
      hoverTimer.current = null;
    }, HOVER_DELAY);
  };

  // Pointer moving between rows: kill the pending open, leave the current row
  // as it is. The next row's own timer decides what happens next.
  const hoverOut = () => clearHover();

  const ledgerLeave = () => {
    clearHover();
    if (CLOSE_ON_LEAVE) setOpen(OPEN_ON_LOAD);
  };

  // Click and tap still work, and are the only route on touch. With hover
  // armed, clicking an open row keeps it open rather than fighting the cursor.
  const press = (i: number) => {
    clearHover();
    setOpen((cur) => (cur === i && !canHover ? -1 : i));
  };

  const shot = (src: string, id: string) =>
    failed[id] ? (
      <span className="wcx-missing">No image at {src}</span>
    ) : (
      <img
        src={src}
        alt=""
        loading="lazy"
        onError={() => setFailed((f) => ({ ...f, [id]: true }))}
      />
    );

  const accentOf = (i: number) => (USE_ACCENTS ? REASONS[i].accent : STAR_COLOR);

  return (
    <section ref={sectionRef} className="wcx" aria-label="Why choose A-Roof">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Anton&family=Inter:wght@400;500&display=swap');

        @keyframes wcxHueShift {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        /* Same treatment as the About heading. It sits on the line span rather
           than the <h2> because background-clip: text paints from whichever
           element owns the background. */
        .wcx-heading {
          font-family: 'Anton', 'Arial Narrow', sans-serif;
          text-transform: uppercase;
          background: linear-gradient(90deg, #0d2233, #17536f, #2f8fbd, #10405a, #0d2233);
          background-size: 300% 100%;
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          animation: wcxHueShift 6s ease-in-out infinite;
        }

        .wcx {
          position: relative;
          background: ${BG};
          overflow-x: clip;
          padding: clamp(84px, 13vh, 168px) clamp(22px, 5vw, 76px) clamp(72px, 10vh, 132px);
          color: ${INK};
        }

        .wcx-shell { width: min(1240px, 100%); margin: 0 auto; }

        /* ---- Head ---- */
        .wcx-head-row {
          display: flex;
          align-items: center;
          gap: clamp(14px, 2vw, 30px);
        }

        .wcx-head {
          margin: 0;
          font-weight: 400;
          font-size: clamp(2.7rem, 8.5vw, 7.4rem);
          line-height: 0.95;
          letter-spacing: 0.015em;
          flex: 0 0 auto;
        }

        .wcx-mask { display: block; overflow: hidden; padding-bottom: 0.06em; }
        .wcx-line { display: block; will-change: transform, opacity; }

        .wcx-head-rule {
          flex: 1 1 auto;
          height: 1px;
          background: ${LINE};
          will-change: transform;
        }

        .wcx-meta {
          flex: 0 0 auto;
          font: 500 0.82rem/1 'Inter', system-ui, sans-serif;
          letter-spacing: 0.02em;
          color: ${MUTED};
          white-space: nowrap;
        }

        /* ---- Intro band ---- */
        .wcx-intro-band {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
          gap: clamp(24px, 5vw, 80px);
          align-items: end;
          margin: clamp(46px, 7vh, 88px) 0 clamp(34px, 5vh, 56px);
        }

        .wcx-lead {
          margin: 0;
          font-family: 'Inter', system-ui, sans-serif;
          font-weight: 500;
          font-size: clamp(1.32rem, 2.3vw, 2.05rem);
          line-height: 1.34;
          letter-spacing: -0.012em;
          max-width: 22ch;
          text-wrap: balance;
        }

        .wcx-word {
          display: inline-block;
          overflow: hidden;
          vertical-align: bottom;
          padding-bottom: 0.08em;
          margin-right: 0.26em;
        }
        .wcx-word-in { display: inline-block; will-change: transform, opacity; }

        .wcx-intro {
          margin: 0;
          font: 400 clamp(1.02rem, 1.12vw, 1.16rem)/1.76 'Inter', system-ui, sans-serif;
          letter-spacing: 0.004em;
          color: ${MUTED};
          max-width: 50ch;
          text-wrap: pretty;
        }

        /* ---- Ledger ---- */
        .wcx-ledger { border-top: 1px solid ${LINE}; }

        .wcx-row {
          border-bottom: 1px solid ${LINE};
          will-change: transform, opacity;
        }

        .wcx-trigger {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          align-items: center;
          gap: clamp(16px, 3vw, 44px);
          width: 100%;
          padding: clamp(20px, 2.6vw, 34px) 0;
          background: none;
          border: 0;
          margin: 0;
          text-align: left;
          color: inherit;
          cursor: pointer;
          font: inherit;
        }
        .wcx-trigger:focus-visible {
          outline: 2px solid var(--wcx-accent);
          outline-offset: 4px;
        }

        .wcx-tag {
          display: block;
          font: 500 0.78rem/1.4 'Inter', system-ui, sans-serif;
          letter-spacing: 0.01em;
          color: ${MUTED};
          margin-bottom: clamp(6px, 0.8vw, 10px);
        }

        .wcx-title {
          margin: 0;
          font-family: 'Anton', 'Arial Narrow', sans-serif;
          font-weight: 400;
          font-size: clamp(1.44rem, 3vw, 2.6rem);
          line-height: 1.04;
          letter-spacing: 0.012em;
          text-transform: uppercase;
        }
        .wcx-title-accent {
          color: ${MUTED};
          transition: color ${PANEL_MS}ms ease;
        }
        .wcx-row.is-open .wcx-title-accent { color: var(--wcx-accent); }

        /* The mark: a plus that loses its upright when the row is open. */
        .wcx-mark {
          position: relative;
          flex: 0 0 auto;
          width: clamp(20px, 2.2vw, 28px);
          height: clamp(20px, 2.2vw, 28px);
        }
        .wcx-mark::before,
        .wcx-mark::after {
          content: "";
          position: absolute;
          inset: 50% 0 auto 0;
          height: 1.5px;
          background: ${INK};
          transform: translateY(-50%);
          transition: transform ${PANEL_MS}ms cubic-bezier(0.4, 0, 0.2, 1),
                      background-color ${PANEL_MS}ms ease;
        }
        .wcx-mark::after { transform: translateY(-50%) rotate(90deg); }
        .wcx-row.is-open .wcx-mark::before,
        .wcx-row.is-open .wcx-mark::after { background: var(--wcx-accent); }
        .wcx-row.is-open .wcx-mark::after { transform: translateY(-50%) rotate(0deg); }

        /* grid-template-rows 0fr → 1fr animates to content height without
           measuring anything in JS. */
        .wcx-panel {
          display: grid;
          grid-template-rows: 0fr;
          transition: grid-template-rows ${PANEL_MS}ms cubic-bezier(0.4, 0, 0.2, 1);
        }
        .wcx-row.is-open .wcx-panel { grid-template-rows: 1fr; }

        .wcx-panel-clip { overflow: hidden; }

        .wcx-panel-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.05fr) minmax(0, 0.95fr);
          gap: clamp(24px, 4vw, 64px);
          align-items: start;
          padding: 0 0 clamp(30px, 4vw, 52px);
          opacity: 0;
          transform: translateY(12px);
          transition: opacity ${PANEL_MS}ms ease, transform ${PANEL_MS}ms cubic-bezier(0.4, 0, 0.2, 1);
        }
        .wcx-row.is-open .wcx-panel-grid {
          opacity: 1;
          transform: none;
          transition-delay: 90ms;
        }

        .wcx-body {
          margin: 0;
          font: 400 clamp(1.02rem, 1.12vw, 1.16rem)/1.76 'Inter', system-ui, sans-serif;
          letter-spacing: 0.004em;
          color: ${INK};
          max-width: 56ch;
        }

        .wcx-fig {
          display: flex;
          align-items: baseline;
          gap: clamp(10px, 1.4vw, 16px);
          margin-top: clamp(20px, 2.4vw, 30px);
          padding-top: clamp(16px, 2vw, 24px);
          border-top: 1px solid ${LINE};
        }

        .wcx-fig-num {
          display: flex;
          align-items: baseline;
          gap: 0.06em;
          font-family: 'Anton', 'Arial Narrow', sans-serif;
          font-size: clamp(1.7rem, 2.6vw, 2.4rem);
          line-height: 0.92;
          letter-spacing: 0.01em;
          color: var(--wcx-accent);
          flex: 0 0 auto;
        }
        .wcx-fig-suffix { font-size: 0.44em; letter-spacing: 0.02em; }

        .wcx-fig-label {
          margin: 0;
          font: 400 0.84rem/1.45 'Inter', system-ui, sans-serif;
          color: ${MUTED};
          max-width: 26ch;
        }

        .wcx-shot {
          position: relative;
          width: 100%;
          aspect-ratio: ${PANEL_ASPECT};
          overflow: hidden;
          background: #eef1f3;
        }
        .wcx-shot img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center;
          display: block;
          filter: ${IMAGE_FILTER};
        }

        .wcx-missing {
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

        /* Hover affordance on a real pointer: the closed rows lift slightly
           toward their accent so the ledger reads as something you can move
           through, not a static list. */
        @media (hover: hover) and (pointer: fine) {
          .wcx-row:not(.is-open) .wcx-trigger:hover .wcx-title-accent {
            color: var(--wcx-accent);
          }
          .wcx-row:not(.is-open) .wcx-trigger:hover .wcx-mark::before,
          .wcx-row:not(.is-open) .wcx-trigger:hover .wcx-mark::after {
            background: var(--wcx-accent);
          }
        }

        /* ---- Responsive ---- */
        @media (max-width: 900px) {
          .wcx { padding: clamp(64px, 9vh, 96px) 22px clamp(56px, 8vh, 88px); }
          .wcx-intro-band { grid-template-columns: 1fr; gap: clamp(20px, 4vw, 30px); align-items: start; }
          .wcx-lead { max-width: none; }
          .wcx-panel-grid { grid-template-columns: 1fr; gap: clamp(20px, 4vw, 28px); }
          .wcx-shot { order: -1; }
        }

        @media (max-width: 480px) {
          .wcx-meta { display: none; }
          .wcx-fig { flex-direction: column; align-items: flex-start; gap: 8px; }
          .wcx-fig-label { max-width: none; }
        }

        /* ---- Reduced motion ---- */
        @media (prefers-reduced-motion: reduce) {
          .wcx-heading { animation: none; }
          .wcx-panel,
          .wcx-panel-grid,
          .wcx-mark::before,
          .wcx-mark::after,
          .wcx-title-accent { transition: none; }
        }
      `}</style>

      <div className="wcx-shell">
        <div className="wcx-head-row">
          <h2 ref={headRef} className="wcx-head">
            <span className="wcx-mask">
              <span className="wcx-heading wcx-line">{HEADING}</span>
            </span>
          </h2>

          {SHOW_HEAD_RULE && <span className="wcx-head-rule" ref={headRuleRef} />}
          {META && <span className="wcx-meta">{META}</span>}
        </div>

        <div className="wcx-intro-band">
          <p className="wcx-lead">
            {LEAD.split(" ").map((word, i) => (
              <span className="wcx-word" key={`w-${i}`}>
                <span className="wcx-word-in">{word}</span>
              </span>
            ))}
          </p>
          <p className="wcx-intro">{INTRO}</p>
        </div>

        <div className="wcx-ledger" onMouseLeave={ledgerLeave}>
          {REASONS.map((r, i) => {
            const isOpen = open === i;
            return (
              <div
                key={`row-${i}`}
                className={`wcx-row${isOpen ? " is-open" : ""}`}
                style={{ ["--wcx-accent" as string]: accentOf(i) }}
                onMouseEnter={() => hoverOpen(i)}
                onMouseLeave={hoverOut}
              >
                <button
                  type="button"
                  className="wcx-trigger"
                  aria-expanded={isOpen}
                  aria-controls={`wcx-panel-${i}`}
                  id={`wcx-trigger-${i}`}
                  onClick={() => press(i)}
                  onFocus={() => canHover && setOpen(i)}
                >
                  <span>
                    <span className="wcx-tag">{r.tag}</span>
                    <span className="wcx-title">
                      {r.title} <span className="wcx-title-accent">{r.accentTitle}</span>
                    </span>
                  </span>
                  <span className="wcx-mark" aria-hidden="true" />
                </button>

                <div
                  className="wcx-panel"
                  id={`wcx-panel-${i}`}
                  role="region"
                  aria-labelledby={`wcx-trigger-${i}`}
                >
                  <div className="wcx-panel-clip">
                    <div className="wcx-panel-grid">
                      <div>
                        <p className="wcx-body">{r.body}</p>

                        <div className="wcx-fig">
                          <span className="wcx-fig-num">
                            <span
                              className="wcx-fig-value"
                              ref={(el) => {
                                valueRefs.current[i] = el;
                              }}
                            >
                              {r.figure.value.toFixed(r.figure.decimals)}
                            </span>
                            {r.figure.suffix && (
                              <span className="wcx-fig-suffix">{r.figure.suffix}</span>
                            )}
                          </span>
                          <p className="wcx-fig-label">{r.figure.label}</p>
                        </div>
                      </div>

                      <div className="wcx-shot">{shot(r.image, `p-${i}`)}</div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}